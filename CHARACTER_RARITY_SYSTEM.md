# 🎨 Character Rarity System

## Overview
DuelCraft now features a **unique character NFT system** where each character type can only be minted ONCE across the entire game. This creates true rarity and exclusivity!

## How It Works

### 🔒 One Character Per Type
- Each character type (Warrior, Mage, etc.) can only be minted by **ONE player**
- Once someone mints "Warrior", no one else can mint that character
- Characters become **exclusive and valuable**

### 👤 One NFT Per Wallet
- Each wallet address can only mint **ONE character NFT** total
- Players must choose wisely which character they want to own
- Creates strategic decision-making

## Smart Contract Features

### New Functions Added:

```solidity
// Check if a character is available
function isCharacterAvailable(string characterType) returns (bool)

// Get the owner of a character type
function getCharacterTypeOwner(string characterType) returns (address)

// Mapping to track character ownership
mapping(string => address) public characterTypeOwner
```

### Minting Logic:
```solidity
function mintCharacter(string characterType, Customization custom) {
    // Check 1: User doesn't already own a character
    require(walletToCharacter[msg.sender] == 0, "Already owns a character");
    
    // Check 2: Character type is available (NEW!)
    require(characterTypeOwner[characterType] == address(0), "Character already minted");
    
    // Lock this character type to the minter
    characterTypeOwner[characterType] = msg.sender;
}
```

## Frontend Features

### 🎯 Visual Indicators:
- ✅ **Available**: Green border, can select and mint
- 🔒 **TAKEN**: Red border, grayed out, shows "CHARACTER TAKEN"
- ❌ **Already Owned**: Shows owner status below character

### 🔍 Real-Time Availability:
- Frontend checks blockchain for character availability
- Updates automatically when characters are minted
- Shows which characters are still available

### 🚫 Prevented Actions:
- Can't select taken characters
- Mint button disabled for taken characters
- Clear error messages if someone tries to mint taken character

## User Experience

### When Selecting Character:
1. **Available Character**: Normal selection, can proceed to mint
2. **Taken Character**: 
   - Red border with "🔒 TAKEN" badge
   - Grayed out and unclickable
   - Shows "❌ Already Owned" instead of description

### When Minting:
1. **Success**: Character is minted and locked to your wallet
2. **Error - Already Taken**: 
   ```
   ❌ This character is already taken!
   🔒 Someone else has minted this rare character.
   Please select a different character.
   ```
3. **Error - Already Own**: 
   ```
   ❌ You already own a character NFT!
   Each wallet can only mint ONE character.
   ```

## Deployed Contracts

### Updated Contract Addresses (Mantle Sepolia):
```
ArenaToken:          0x34fe3Be2078136293dd797f0354089FE7a3cb811
DuelCraftCharacter:  0xF574795Ee2ba41503c93528Dd84Dd98E61192015 ⭐ (with rarity)
SeasonPass:          0xB2155f1Abbf7612F9D8d901711753f86b763C1e8
Marketplace:         0x0dED5b9c5Cc1094721F607814629AC22F94Ed259
Tournament:          0xF9c906B99883Ec616D4cECcd96689800BEF0b7Ab
```

### Chain Info:
- **Network**: Mantle Sepolia Testnet
- **Chain ID**: 5003
- **RPC**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://explorer.sepolia.mantle.xyz

## Benefits

### 🎯 For Players:
- **Exclusivity**: Own a unique character no one else has
- **Rarity**: True scarcity creates value
- **Bragging Rights**: Be the ONLY Warrior/Mage owner
- **Trading Value**: Unique NFTs are more valuable in marketplace

### 🎮 For Game:
- **Strategic Choices**: Players must decide quickly
- **Community Engagement**: Creates excitement around minting
- **FOMO (Fear of Missing Out)**: Drives early adoption
- **NFT Value**: Scarcity increases secondary market value

## Adding New Characters

To add more rare characters:

1. **Add to characters.js**:
```javascript
{
  id: 'char_rogue',
  name: 'Rogue',
  icon: '🗡️',
  image: '/character-layers/rogue/rogue.png',
  description: 'Stealthy assassin',
  color: '#2d2d2d',
  stats: { health: 70, attack: 90, defense: 40, speed: 95 }
}
```

2. **Add character image**: `/public/character-layers/rogue/rogue.png`

3. **Deploy**: Character is automatically rare and exclusive!

## Technical Implementation

### Files Modified:
1. **contracts/DuelCraftCharacter.sol**
   - Added `characterTypeOwner` mapping
   - Added `isCharacterAvailable()` function
   - Added `getCharacterTypeOwner()` function
   - Updated `mintCharacter()` with rarity check

2. **frontend/src/pages/CharacterCreator.jsx**
   - Added availability checking with `useEffect`
   - Visual indicators for taken/available characters
   - Disabled minting for taken characters
   - Improved error messages

3. **frontend/src/context/Web3Context.jsx**
   - Updated to support new contract functions
   - Passes character name to mint function

## Future Enhancements

Possible additions:
- **Character Trading**: Allow players to sell rare characters in marketplace
- **Character Levels**: Increase value by leveling up
- **Achievement Badges**: Special rewards for first minters
- **Character Leaderboard**: Show rankings of rare character owners
- **Legendary Characters**: Super rare characters with < 5 total mints

---

**Created**: December 7, 2025  
**Version**: 1.0.0  
**Status**: ✅ Deployed and Active
