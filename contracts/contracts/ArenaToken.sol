// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArenaToken
 * @dev On-chain token for DuelCraft premium features, trading, and tournaments
 * This is the PREMIUM currency - used for real-value transactions
 * Off-chain "Arena Coins" are used for cosmetics (no gameplay advantage)
 */
contract ArenaToken is ERC20, ERC20Burnable, Ownable {
    // Maximum supply: 1 billion tokens (with 18 decimals)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Authorized minters (game server, reward distributor)
    mapping(address => bool) public minters;
    
    // Events
    event MinterAuthorized(address indexed minter, bool authorized);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event RewardClaimed(address indexed player, uint256 amount);
    
    constructor() ERC20("Arena Token", "ARENA") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity/rewards (10% of max)
        _mint(msg.sender, 100_000_000 * 10**18);
    }
    
    /**
     * @dev Mint tokens (only authorized minters)
     * Used for match rewards, tournament prizes, etc.
     */
    function mint(address to, uint256 amount, string memory reason) external {
        require(minters[msg.sender], "Not authorized minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }
    
    /**
     * @dev Batch mint for gas efficiency
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string memory reason
    ) external {
        require(minters[msg.sender], "Not authorized minter");
        require(recipients.length == amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i], reason);
        }
    }
    
    /**
     * @dev Authorize/revoke minter
     */
    function setMinterAuthorization(address minter, bool authorized) external onlyOwner {
        minters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }
    
    /**
     * @dev Emergency withdrawal (only owner, for stuck tokens)
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot withdraw ARENA");
        IERC20(token).transfer(to, amount);
    }
}
