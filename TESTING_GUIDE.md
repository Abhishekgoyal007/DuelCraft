# 🧪 DuelCraft Testing Guide

## ✅ Completed Setup
- [x] Smart contracts deployed to Mantle Sepolia Testnet
- [x] Frontend configured with contract addresses
- [x] ABIs exported and integrated
- [x] Mint NFT button added to Character Creator
- [x] Web3 wallet integration complete

## 🎮 Testing the NFT Minting Flow

### Prerequisites
1. **MetaMask Extension** installed in your browser
2. **Mantle Sepolia Testnet** added to MetaMask
3. **Test MNT** in your wallet (you have 1000 MNT)

### Step-by-Step Testing

#### 1. Access the Application
- Frontend: http://localhost:5174
- Backend: http://localhost:4000

#### 2. Connect Wallet
- Click on your wallet address in the top-right corner (if already connected)
- Or connect via the Connect button
- MetaMask should prompt you to connect
- Approve the connection

#### 3. Create Your Character
- Navigate to "Character Creator" from the Hub
- Customize your character:
  - Body type
  - Hair style
  - Eyes, brows, mouth
  - Tops, bottoms, shoes
  - Colors for hair, tops, bottoms
- Click "💾 CONFIRM" to save to backend

#### 4. Mint Your NFT
- Click the "🎨 MINT CHARACTER NFT" button
- MetaMask will prompt you to:
  - Switch to Mantle Sepolia (if on wrong network)
  - Approve the transaction
- Transaction details:
  - Gas Price: ~0.05 gwei (super cheap!)
  - Estimated cost: < $0.01
- Wait for confirmation (~2-3 seconds)

#### 5. Verify Success
- ✅ Success message appears: "🎉 Character NFT Minted Successfully!"
- Transaction hash link is displayed
- Click "View on Explorer →" to see your transaction on Mantle Explorer

#### 6. Check Your NFT
- Go to: https://explorer.sepolia.mantle.xyz
- Search for your wallet address: `0x13e1b5353892d0dbc56ce9dbb88ae660dbf1def6`
- Look under "Tokens" tab
- You should see your DuelCraft Character NFT

## 📝 What to Test

### ✅ Happy Path
- [x] Character creation works
- [x] Wallet connects properly
- [x] Network switching works
- [x] Mint transaction succeeds
- [x] Success message displays
- [x] Transaction link works

### 🔍 Edge Cases to Test
1. **Already Owns Character**: Try minting a second character
   - Expected: Error message "You already own a character NFT!"
   
2. **Wrong Network**: Try minting on Ethereum mainnet
   - Expected: Prompt to switch to Mantle Sepolia
   
3. **Cancel Transaction**: Reject the MetaMask popup
   - Expected: "Transaction cancelled" message
   
4. **No Wallet**: Try without MetaMask
   - Expected: Prompt to install wallet

## 🔗 Deployed Contract Addresses

```
ArenaToken:          0x0bdf5C856348aDaf2Ff6745ffD04EA141F0773A2
DuelCraftCharacter:  0x171613677f691aB6F6f7BCEABA3fBDd1b2A4D980
SeasonPass:          0x90535F69DB586Ff5871A991fd34773B0E5d2a424
Marketplace:         0x9121d93A2BCFDB88F67FACB4031Ff3Bf78B8d2aa
Tournament:          0x97B5107340a0E34625BCD533e0AF69231A18B338
```

## 🎯 Next Steps After Testing

### Phase 2: Complete UI Integration
1. Display NFT on Profile page
2. Add "View My NFT" button
3. Show character metadata
4. Display on-chain vs off-chain stats

### Phase 3: Economy & Tournaments
1. Implement ArenaToken claiming
2. Add Season Pass purchase
3. Create Tournament registration
4. Build Marketplace UI

## 🐛 Common Issues & Solutions

### Issue: Transaction Fails
**Solutions:**
- Check you're on Mantle Sepolia (Chain ID 5003)
- Ensure you have enough MNT for gas
- Verify you haven't already minted

### Issue: Contract Not Loading
**Solutions:**
- Refresh the page
- Clear browser cache
- Check console for errors
- Verify RPC endpoint is working

### Issue: Network Won't Switch
**Solutions:**
- Manually add Mantle Sepolia to MetaMask:
  - Network Name: Mantle Sepolia
  - RPC URL: https://rpc.sepolia.mantle.xyz
  - Chain ID: 5003
  - Currency: MNT
  - Explorer: https://explorer.sepolia.mantle.xyz

## 📊 Contract Features to Test Later

### DuelCraftCharacter Contract
- ✅ mintCharacter() - One per wallet
- ⏳ updateStats() - Server-authoritative updates
- ⏳ tokenURI() - Dynamic metadata
- ⏳ getCharacterStats() - Read stats

### ArenaToken Contract
- ⏳ claim() - Weekly rewards
- ⏳ batchMint() - Tournament prizes
- ⏳ authorizedMint() - Server minting

### SeasonPass Contract
- ⏳ purchasePass() - Buy season pass
- ⏳ claimRewards() - Claim tier rewards
- ⏳ getTier() - Check current tier

### Marketplace Contract
- ⏳ listItem() - List cosmetics for sale
- ⏳ buyItem() - Purchase items
- ⏳ rentItem() - Rent for limited time

### Tournament Contract
- ⏳ registerForTournament() - Join tournament
- ⏳ distributePrizes() - Claim winnings
- ⏳ mintChampionNFT() - Winner rewards

## 🎉 Success Criteria

You've successfully completed Phase 1 if:
- ✅ Character NFT mints successfully
- ✅ Transaction appears on Mantle Explorer
- ✅ No console errors
- ✅ UI updates with success state
- ✅ Transaction hash is visible and clickable

---

**Need Help?**
- Check browser console (F12) for errors
- Verify MetaMask is unlocked
- Ensure backend is running on port 4000
- Confirm frontend is running on port 5174
