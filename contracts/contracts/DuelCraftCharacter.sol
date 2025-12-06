// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DuelCraftCharacter
 * @dev Dynamic NFT for DuelCraft game characters
 * Characters can be minted with specific traits and updated over time
 */
contract DuelCraftCharacter is ERC721URIStorage, Ownable {
    using Strings for uint256;
    
    uint256 private _tokenIds;
    
    // Character trait structure
    struct Character {
        string characterType; // warrior, mage, rogue, etc.
        uint256 level;
        uint256 wins;
        uint256 losses;
        uint256 totalMatches;
        uint256 mintedAt;
        bool isLocked; // Prevent updates during tournaments
    }
    
    // Character customization (visual traits)
    struct Customization {
        uint8 body;
        uint8 hair;
        uint8 hairColor; // index into color palette
        uint8 eyes;
        uint8 mouth;
        uint8 tops;
        uint8 topColor;
        uint8 bottoms;
        uint8 bottomColor;
        uint8 shoes;
        uint8 accessory;
        uint8 background;
        uint8 effect;
    }
    
    // Mapping from token ID to character data
    mapping(uint256 => Character) public characters;
    
    // Mapping from token ID to customization
    mapping(uint256 => Customization) public customizations;
    
    // Mapping from wallet address to token ID (one character per wallet for now)
    mapping(address => uint256) public walletToCharacter;
    
    // Authorized game server addresses that can update stats
    mapping(address => bool) public authorizedServers;
    
    // Events
    event CharacterMinted(address indexed owner, uint256 indexed tokenId, string characterType);
    event CharacterUpdated(uint256 indexed tokenId, uint256 level, uint256 wins, uint256 losses);
    event ServerAuthorized(address indexed server, bool authorized);
    
    constructor() ERC721("DuelCraft Character", "DUELCHAR") Ownable(msg.sender) {}
    
    /**
     * @dev Mint a new character NFT with customization
     * @param characterType Type of character (warrior, mage, etc.)
     * @param custom Character customization traits
     */
    function mintCharacter(
        string memory characterType,
        Customization memory custom
    ) public returns (uint256) {
        // Check if user already has a character (one per wallet)
        require(walletToCharacter[msg.sender] == 0, "Already owns a character");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        // Mint NFT to sender
        _safeMint(msg.sender, newTokenId);
        
        // Initialize character data
        characters[newTokenId] = Character({
            characterType: characterType,
            level: 1,
            wins: 0,
            losses: 0,
            totalMatches: 0,
            mintedAt: block.timestamp,
            isLocked: false
        });
        
        // Store customization
        customizations[newTokenId] = custom;
        
        // Map wallet to character
        walletToCharacter[msg.sender] = newTokenId;
        
        // Set token URI
        _setTokenURI(newTokenId, generateTokenURI(newTokenId));
        
        emit CharacterMinted(msg.sender, newTokenId, characterType);
        
        return newTokenId;
    }
    
    /**
     * @dev Update character customization (owner only, not locked)
     * @param tokenId Token ID
     * @param custom New customization
     */
    function updateCustomization(uint256 tokenId, Customization memory custom) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(!characters[tokenId].isLocked, "Character is locked");
        
        customizations[tokenId] = custom;
        _setTokenURI(tokenId, generateTokenURI(tokenId));
    }
    
    /**
     * @dev Get character customization
     */
    function getCustomization(uint256 tokenId) external view returns (Customization memory) {
        require(_ownerOf(tokenId) != address(0), "Character does not exist");
        return customizations[tokenId];
    }
    
    /**
     * @dev Update character stats after a match (only authorized servers)
     * @param tokenId Token ID of character
     * @param won Whether the player won
     */
    function updateMatchStats(uint256 tokenId, bool won) external {
        require(authorizedServers[msg.sender], "Not authorized server");
        require(_ownerOf(tokenId) != address(0), "Character does not exist");
        require(!characters[tokenId].isLocked, "Character is locked");
        
        Character storage char = characters[tokenId];
        
        if (won) {
            char.wins++;
        } else {
            char.losses++;
        }
        
        char.totalMatches++;
        
        // Level up every 10 wins
        if (char.wins > 0 && char.wins % 10 == 0) {
            char.level++;
        }
        
        // Update metadata
        _setTokenURI(tokenId, generateTokenURI(tokenId));
        
        emit CharacterUpdated(tokenId, char.level, char.wins, char.losses);
    }
    
    /**
     * @dev Generate dynamic metadata URI
     * @param tokenId Token ID of character
     */
    function generateTokenURI(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Character does not exist");
        
        Character memory char = characters[tokenId];
        
        // Calculate win rate
        uint256 winRate = char.totalMatches > 0 
            ? (char.wins * 100) / char.totalMatches 
            : 0;
        
        // Build JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name":"DuelCraft ',
            char.characterType,
            ' #',
            tokenId.toString(),
            '","description":"A legendary ',
            char.characterType,
            ' from the DuelCraft arena with ',
            char.wins.toString(),
            ' victories","attributes":[',
            '{"trait_type":"Character Type","value":"',
            char.characterType,
            '"},',
            '{"trait_type":"Level","value":',
            char.level.toString(),
            '},',
            '{"trait_type":"Wins","value":',
            char.wins.toString(),
            '},',
            '{"trait_type":"Losses","value":',
            char.losses.toString(),
            '},',
            '{"trait_type":"Total Matches","value":',
            char.totalMatches.toString(),
            '},',
            '{"trait_type":"Win Rate","value":"',
            winRate.toString(),
            '%"},',
            '{"trait_type":"Minted","value":',
            char.mintedAt.toString(),
            '}',
            '],"image":"https://duelcraft.game/api/character/',
            tokenId.toString(),
            '.png"}'
        ));
        
        // Encode to base64
        string memory base64Json = Base64.encode(bytes(json));
        return string(abi.encodePacked("data:application/json;base64,", base64Json));
    }
    
    /**
     * @dev Get character data by token ID
     */
    function getCharacter(uint256 tokenId) public view returns (Character memory) {
        require(_ownerOf(tokenId) != address(0), "Character does not exist");
        return characters[tokenId];
    }
    
    /**
     * @dev Get character ID by wallet address
     */
    function getCharacterByWallet(address wallet) public view returns (uint256) {
        return walletToCharacter[wallet];
    }
    
    /**
     * @dev Authorize a game server to update character stats
     */
    function setServerAuthorization(address server, bool authorized) external onlyOwner {
        authorizedServers[server] = authorized;
        emit ServerAuthorized(server, authorized);
    }
    
    /**
     * @dev Lock/unlock character (prevent updates during tournaments)
     */
    function setCharacterLock(uint256 tokenId, bool locked) external {
        require(authorizedServers[msg.sender], "Not authorized server");
        characters[tokenId].isLocked = locked;
    }
    
    /**
     * @dev Override transfer to update wallet mapping
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Update wallet mappings
        if (from != address(0)) {
            delete walletToCharacter[from];
        }
        if (to != address(0)) {
            walletToCharacter[to] = tokenId;
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }
}
