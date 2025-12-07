# 🐛 Debugging Guide - Character Minting

## What to Check in Browser Console

Open browser DevTools (F12) and go to Console tab. You should see these logs:

### 1. **On Page Load:**
```
[CharacterCreator] Checking character availability...
[CharacterCreator] Warrior available: true
[CharacterCreator] Mage available: true
[CharacterCreator] Final availability: {char_warrior: true, char_mage: true}
```

### 2. **When Clicking Mint Button:**
```
[CharacterCreator] Mint clicked! {selectedCharacter: 'char_warrior', isConnected: true, isCorrectChain: true}
[CharacterCreator] Starting mint process...
[CharacterCreator] Minting character: Warrior
[CharacterCreator] Calling mintCharacter with: {characterName: 'Warrior', customization: {...}}
[Web3Context] mintCharacter called with: {characterType: 'Warrior', avatarData: {...}}
[Web3Context] Sending transaction with: {characterType: 'Warrior', customization: {...}}
[Web3Context] Transaction sent: 0x123...
[Web3Context] Waiting for confirmation...
[Web3Context] Transaction confirmed: {...}
[CharacterCreator] Mint successful! {success: true, txHash: '0x123...'}
[CharacterCreator] Mint process finished
```

### 3. **If Error Occurs:**
```
[CharacterCreator] Mint error: Error: ...
[CharacterCreator] Error details: {message: '...', code: ..., reason: '...', data: ...}
```

## Common Issues & Solutions

### Issue 1: "Nothing happens when clicking mint button"

**Check Console For:**
- `[CharacterCreator] Mint clicked!` - If you DON'T see this, button click handler is not firing
- Check if `selectedCharacter` is set
- Check if `isConnected` is true
- Check if `isCorrectChain` is true

**Solution:**
- Make sure you've selected a character (green border)
- Make sure wallet is connected (MetaMask)
- Make sure you're on Mantle Sepolia testnet (Chain ID 5003)

### Issue 2: "Transaction fails immediately"

**Check Console For:**
- `[Web3Context] Missing contracts or signer` - Contracts not initialized
- `Already owns a character` - Wallet already minted an NFT
- `Character already minted` - Someone else took this character

**Solution:**
- Refresh page to reinitialize contracts
- Try different wallet if you already own one
- Select different character if taken

### Issue 3: "Availability check not working"

**Check Console For:**
- `[CharacterCreator] Skipping availability check: {hasContracts: false, isConnected: false}`

**Solution:**
- Connect wallet first
- Refresh page after connecting
- Check network is Mantle Sepolia

### Issue 4: "MetaMask opens but transaction fails"

**Check MetaMask For:**
- Insufficient MNT for gas fees
- Wrong network selected
- Transaction data looks incorrect

**Solution:**
- Get testnet MNT from Mantle faucet
- Switch to Mantle Sepolia in MetaMask
- Check contract address is correct

## Testing Steps

### Test 1: First Mint (Should Work)
1. Connect wallet (fresh wallet that hasn't minted)
2. Switch to Mantle Sepolia testnet
3. Select "Warrior" character
4. Click "Save Character" (optional)
5. Click "🎨 MINT CHARACTER NFT"
6. Approve transaction in MetaMask
7. Wait for confirmation
8. Should see "✓ NFT MINTED!" and transaction link

### Test 2: Second Mint (Should Fail - Already Owns)
1. Use same wallet from Test 1
2. Try to mint "Mage" character
3. Should get error: "You already own a character NFT!"

### Test 3: Same Character (Should Fail - Already Taken)
1. Use NEW wallet (different from Test 1)
2. Try to mint "Warrior" (same as Test 1)
3. Should see red border and "🔒 TAKEN" badge
4. Mint button should say "🔒 CHARACTER TAKEN"
5. If you somehow click it, should get error: "This character is already taken!"

### Test 4: Different Character (Should Work)
1. Use NEW wallet (different from Test 1)
2. Mint "Mage" character
3. Should work successfully

## Expected UI States

### Character Card - Available
```
✅ Green border when selected
✅ Normal colors (not grayed out)
✅ Shows character description
✅ Has checkmark badge when selected
✅ Clickable
```

### Character Card - Taken
```
🔒 Red border
🔒 "TAKEN" badge in top-right
🔒 Grayed out (filter: grayscale)
🔒 Shows "❌ Already Owned" instead of description
🔒 Not clickable (cursor: not-allowed)
```

### Mint Button - Available Character
```
🎨 Purple-to-pink gradient
🎨 Text: "🎨 MINT CHARACTER NFT"
🎨 Clickable
```

### Mint Button - Taken Character
```
🔒 Gray background
🔒 Text: "🔒 CHARACTER TAKEN"
🔒 Not clickable (disabled)
```

### Mint Button - While Minting
```
⏳ Yellow gradient
⏳ Text: "⏳ MINTING..."
⏳ Not clickable (disabled)
```

### Mint Button - After Success
```
✓ Green gradient with pulse animation
✓ Text: "✓ NFT MINTED!"
✓ Shows success box below with transaction link
```

## Contract Addresses

**Mantle Sepolia Testnet:**
- DuelCraftCharacter: `0xF574795Ee2ba41503c93528Dd84Dd98E61192015`
- Chain ID: `5003`
- RPC: `https://rpc.sepolia.mantle.xyz`
- Explorer: `https://explorer.sepolia.mantle.xyz`

## Quick Fixes

### If console logs show nothing:
- Hard refresh page (Ctrl+Shift+R)
- Clear browser cache
- Check if frontend is running (`npm run dev`)

### If wallet won't connect:
- Unlock MetaMask
- Make sure MetaMask is installed
- Try different browser

### If network is wrong:
- Open MetaMask
- Click network dropdown
- Add Mantle Sepolia if not there:
  - Network Name: Mantle Sepolia
  - RPC URL: https://rpc.sepolia.mantle.xyz
  - Chain ID: 5003
  - Currency: MNT
  - Explorer: https://explorer.sepolia.mantle.xyz

---

**Last Updated**: December 7, 2025
**Status**: Debugging active
