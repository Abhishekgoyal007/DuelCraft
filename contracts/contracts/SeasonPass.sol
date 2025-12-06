// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SeasonPass
 * @dev Battle pass NFT system for DuelCraft
 * Provides non-gameplay advantages: XP boost, bonus coins, exclusive cosmetics
 */
contract SeasonPass is ERC721, Ownable {
    uint256 private _tokenIds;
    
    // Pass tiers
    enum Tier { BRONZE, SILVER, GOLD, PLATINUM, DIAMOND }
    
    // Season pass data
    struct Pass {
        uint256 seasonId;
        Tier tier;
        uint256 purchasedAt;
        uint256 expiresAt;
        bool isActive;
    }
    
    // Current season
    uint256 public currentSeason = 1;
    uint256 public seasonDuration = 90 days; // 3 months
    uint256 public seasonStartTime;
    
    // Token for purchases
    address public arenaToken;
    
    // Pass prices (in Arena Tokens, with 18 decimals)
    mapping(Tier => uint256) public passPrices;
    
    // Tier benefits (multipliers in basis points, 10000 = 1x)
    mapping(Tier => uint256) public xpMultiplier;
    mapping(Tier => uint256) public coinMultiplier;
    
    // Mapping from token ID to pass data
    mapping(uint256 => Pass) public passes;
    
    // Mapping from address to token ID (one pass per wallet per season)
    mapping(address => mapping(uint256 => uint256)) public walletToPass; // wallet => season => tokenId
    
    // Events
    event PassPurchased(address indexed buyer, uint256 indexed tokenId, Tier tier, uint256 seasonId);
    event SeasonStarted(uint256 indexed seasonId, uint256 startTime, uint256 endTime);
    event TierUpgraded(uint256 indexed tokenId, Tier oldTier, Tier newTier);
    
    constructor(address _arenaToken) ERC721("DuelCraft Season Pass", "DCPASS") Ownable(msg.sender) {
        arenaToken = _arenaToken;
        seasonStartTime = block.timestamp;
        
        // Set initial prices (example values)
        passPrices[Tier.BRONZE] = 10 * 10**18;    // 10 ARENA
        passPrices[Tier.SILVER] = 25 * 10**18;    // 25 ARENA
        passPrices[Tier.GOLD] = 50 * 10**18;      // 50 ARENA
        passPrices[Tier.PLATINUM] = 100 * 10**18; // 100 ARENA
        passPrices[Tier.DIAMOND] = 250 * 10**18;  // 250 ARENA
        
        // Set multipliers (10000 = 1.0x)
        xpMultiplier[Tier.BRONZE] = 11000;   // 1.1x XP
        xpMultiplier[Tier.SILVER] = 12500;   // 1.25x XP
        xpMultiplier[Tier.GOLD] = 15000;     // 1.5x XP
        xpMultiplier[Tier.PLATINUM] = 17500; // 1.75x XP
        xpMultiplier[Tier.DIAMOND] = 20000;  // 2.0x XP
        
        coinMultiplier[Tier.BRONZE] = 11000;   // 1.1x coins
        coinMultiplier[Tier.SILVER] = 12500;   // 1.25x coins
        coinMultiplier[Tier.GOLD] = 15000;     // 1.5x coins
        coinMultiplier[Tier.PLATINUM] = 20000; // 2.0x coins
        coinMultiplier[Tier.DIAMOND] = 25000;  // 2.5x coins
    }
    
    /**
     * @dev Purchase a season pass
     */
    function purchasePass(Tier tier) external returns (uint256) {
        require(walletToPass[msg.sender][currentSeason] == 0, "Already owns pass this season");
        require(block.timestamp < seasonStartTime + seasonDuration, "Season ended");
        
        // Transfer Arena Tokens
        uint256 price = passPrices[tier];
        require(
            IERC20(arenaToken).transferFrom(msg.sender, address(this), price),
            "Token transfer failed"
        );
        
        // Mint pass NFT
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(msg.sender, newTokenId);
        
        // Set pass data
        passes[newTokenId] = Pass({
            seasonId: currentSeason,
            tier: tier,
            purchasedAt: block.timestamp,
            expiresAt: seasonStartTime + seasonDuration,
            isActive: true
        });
        
        walletToPass[msg.sender][currentSeason] = newTokenId;
        
        emit PassPurchased(msg.sender, newTokenId, tier, currentSeason);
        
        return newTokenId;
    }
    
    /**
     * @dev Upgrade pass to higher tier (pay difference)
     */
    function upgradePass(uint256 tokenId, Tier newTier) external {
        require(ownerOf(tokenId) == msg.sender, "Not pass owner");
        Pass storage pass = passes[tokenId];
        require(pass.isActive, "Pass expired");
        require(newTier > pass.tier, "Not an upgrade");
        
        // Calculate price difference
        uint256 currentPrice = passPrices[pass.tier];
        uint256 newPrice = passPrices[newTier];
        uint256 difference = newPrice - currentPrice;
        
        // Transfer difference
        require(
            IERC20(arenaToken).transferFrom(msg.sender, address(this), difference),
            "Token transfer failed"
        );
        
        Tier oldTier = pass.tier;
        pass.tier = newTier;
        
        emit TierUpgraded(tokenId, oldTier, newTier);
    }
    
    /**
     * @dev Check if wallet has active pass for current season
     */
    function hasActivePass(address wallet) external view returns (bool) {
        uint256 tokenId = walletToPass[wallet][currentSeason];
        if (tokenId == 0) return false;
        
        Pass memory pass = passes[tokenId];
        return pass.isActive && block.timestamp < pass.expiresAt;
    }
    
    /**
     * @dev Get pass tier for wallet
     */
    function getPassTier(address wallet) external view returns (Tier) {
        uint256 tokenId = walletToPass[wallet][currentSeason];
        require(tokenId != 0, "No pass");
        return passes[tokenId].tier;
    }
    
    /**
     * @dev Get multipliers for wallet
     */
    function getMultipliers(address wallet) external view returns (uint256 xp, uint256 coins) {
        uint256 tokenId = walletToPass[wallet][currentSeason];
        if (tokenId == 0) return (10000, 10000); // 1.0x default
        
        Pass memory pass = passes[tokenId];
        if (!pass.isActive || block.timestamp >= pass.expiresAt) {
            return (10000, 10000);
        }
        
        return (xpMultiplier[pass.tier], coinMultiplier[pass.tier]);
    }
    
    /**
     * @dev Start new season (owner only)
     */
    function startNewSeason() external onlyOwner {
        currentSeason++;
        seasonStartTime = block.timestamp;
        
        emit SeasonStarted(currentSeason, seasonStartTime, seasonStartTime + seasonDuration);
    }
    
    /**
     * @dev Update pass prices (owner only)
     */
    function setPassPrice(Tier tier, uint256 price) external onlyOwner {
        passPrices[tier] = price;
    }
    
    /**
     * @dev Update multipliers (owner only)
     */
    function setMultipliers(Tier tier, uint256 xp, uint256 coins) external onlyOwner {
        xpMultiplier[tier] = xp;
        coinMultiplier[tier] = coins;
    }
    
    /**
     * @dev Withdraw accumulated tokens (owner only)
     */
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(IERC20(arenaToken).transfer(to, amount), "Transfer failed");
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}
