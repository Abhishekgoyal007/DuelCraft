# DuelCraft Blockchain Integration

## 🎮 Overview

DuelCraft integrates blockchain technology on **Mantle Network** for:
- Dynamic NFT characters with customizable traits
- Dual-token economy (off-chain + on-chain)
- Season pass system
- Marketplace for cosmetic trading/renting
- Tournaments with prize pools and champion NFTs

---

## 📦 Smart Contracts

### 1. **DuelCraftCharacter.sol** - Character NFTs
- **Type**: ERC-721 (Dynamic NFT)
- **Features**:
  - Mint customized characters with visual traits
  - Update stats after matches (wins, losses, level)
  - Lock characters during tournaments
  - Dynamic metadata with on-chain stats
  - One character per wallet

### 2. **ArenaToken.sol** - Premium Currency
- **Type**: ERC-20
- **Symbol**: ARENA
- **Max Supply**: 1 billion tokens
- **Use Cases**:
  - Purchase season passes
  - Tournament entry fees
  - Marketplace transactions
  - Match rewards (authorized minting)

### 3. **SeasonPass.sol** - Battle Pass NFTs
- **Type**: ERC-721
- **Tiers**: Bronze, Silver, Gold, Platinum, Diamond
- **Benefits**:
  - XP multipliers (1.1x - 2.0x)
  - Coin multipliers (1.1x - 2.5x)
  - Exclusive cosmetics
  - Duration: 90 days per season

### 4. **Marketplace.sol** - Cosmetic Trading
- **Features**:
  - Buy/sell cosmetic NFTs
  - Rent skins (daily rate)
  - Platform fee: 2.5%
  - Anti-bot cooldown (5 minutes)
  - Royalty support

### 5. **Tournament.sol** - Competitive System
- **Features**:
  - Tournament registration with entry fees
  - Prize pool distribution (60/25/15%)
  - Champion NFT badges for top 3
  - Requires character NFT to participate

---

## 🚀 Deployment Guide

### Step 1: Install Dependencies
```bash
cd contracts
npm install
```

### Step 2: Configure Environment
Create `contracts/.env` from `.env.example`:
```env
DEPLOYER_PRIVATE_KEY=your_private_key_here
GAME_SERVER_ADDRESS=your_server_wallet_address
```

### Step 3: Compile Contracts
```bash
cd contracts
npm run compile
```

### Step 4: Deploy to Mantle Testnet
```bash
npm run deploy:testnet
```

### Step 5: Verify Contracts
```bash
npm run verify:testnet
```

### Step 6: Update Frontend Config
Copy deployed addresses from `contracts/deployments/mantleTestnet-latest.json` to:
- `frontend/src/config/contracts.js`

### Step 7: Fund Contracts
- Send ARENA tokens to backend wallet for rewards
- Authorize backend server address in Character NFT contract

---

## 💻 Frontend Integration

### Setup Web3Provider

Update `frontend/src/main.jsx`:
```jsx
import { Web3Provider } from './context/Web3Context';

<AuthProvider>
  <Web3Provider>
    <RouterProvider router={router} />
  </Web3Provider>
</AuthProvider>
```

### Use Web3 in Components
```jsx
import { useWeb3 } from '../context/Web3Context';

function MyComponent() {
  const { address, isConnected, connect, contracts } = useWeb3();
  
  // Connect wallet
  await connect();
  
  // Mint character
  const tx = await contracts.character.mintCharacter(
    'warrior',
    customization
  );
  await tx.wait();
}
```

---

## 🔧 Backend Integration

### Install Ethers.js
```bash
cd backend
npm install ethers@^6
```

### Setup Wallet
Create `backend/.env`:
```env
BLOCKCHAIN_PRIVATE_KEY=your_server_private_key
CHARACTER_NFT_ADDRESS=deployed_character_contract
ARENA_TOKEN_ADDRESS=deployed_token_contract
```

### Update Match Stats (After Match)
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.mantle.xyz');
const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);

const characterNFT = new ethers.Contract(
  process.env.CHARACTER_NFT_ADDRESS,
  characterABI,
  wallet
);

// After match ends
await characterNFT.updateMatchStats(tokenId, didWin);
```

---

## 💰 Token Economics

### Off-Chain Economy (Arena Coins)
- **Purpose**: Cosmetics only (no pay-to-win)
- **Earning**: Match wins, daily login, challenges
- **Spending**: Skin shop, accessories, emotes
- **Storage**: MongoDB (fast, no gas fees)

### On-Chain Economy (Arena Tokens)
- **Purpose**: Premium features, real value
- **Earning**: 
  - Tournament prizes
  - Seasonal rewards
  - Weekly claim (batch minting)
- **Spending**:
  - Season passes
  - Marketplace trades
  - Tournament entries

### Reward Distribution Strategy
```
Match Win → 100 Arena Coins (off-chain, instant)
          + 0.01 ARENA Tokens (on-chain, weekly claim)

Tournament Prize → 100-1000 ARENA (on-chain, immediate)

Season Pass → XP/Coin multipliers (benefits only)
```

---

## 🎯 Gas Optimization Tips

1. **Batch Operations**
   - Claim rewards weekly, not per-match
   - Use Merkle trees for airdrops

2. **Efficient Storage**
   - Pack struct variables
   - Use uint8 for small numbers
   - Avoid string concatenation

3. **Lazy Minting**
   - Mint character NFTs on-demand
   - Don't pre-mint skins

4. **Mantle Benefits**
   - Gas price: 0.05 gwei (super cheap)
   - Fast finality: ~1-2 seconds
   - EVM compatible: works with existing tools

---

## 🔒 Security Considerations

### Anti-Cheat Measures
- **Server-Authoritative Combat**: All match results verified by backend
- **Authorized Minters**: Only backend wallet can mint rewards
- **Character Locking**: Prevent stat updates during tournaments
- **Purchase Cooldown**: 5-minute limit on marketplace buys

### Access Control
```solidity
// Only authorized game server can update stats
mapping(address => bool) public authorizedServers;

modifier onlyAuthorized() {
    require(authorizedServers[msg.sender], "Not authorized");
    _;
}
```

### Rate Limiting
- Marketplace cooldown prevents bot farming
- One character per wallet (prevent smurfing)
- Tournament entry requires NFT ownership

---

## 📊 Testing Strategy

### Local Testing (Hardhat)
```bash
cd contracts
npx hardhat test
npx hardhat node # Local blockchain
```

### Testnet Testing
1. Deploy to Mantle Testnet
2. Get test MNT from faucet
3. Test full flow:
   - Mint character
   - Play matches
   - Buy season pass
   - List item on marketplace
   - Enter tournament

### Integration Testing
- Test backend ↔ blockchain communication
- Verify reward distribution
- Test concurrent users

---

## 🎮 User Flow Examples

### 1. First-Time User
```
1. Connect wallet (MetaMask)
2. Switch to Mantle Testnet (auto-prompt)
3. Create character (customize)
4. Sign mint transaction
5. Play matches (stats update on-chain weekly)
```

### 2. Tournament Participant
```
1. Own character NFT ✓
2. Pay entry fee (10 ARENA)
3. Compete in bracket
4. Top 3 receive:
   - Prize money (ARENA tokens)
   - Champion NFT badge
```

### 3. Marketplace Trader
```
1. List skin for 50 ARENA
2. Buyer pays (2.5% fee → platform)
3. Seller receives 48.75 ARENA
4. NFT transfers automatically
```

---

## 🐛 Common Issues & Solutions

### "Wrong Network" Error
```javascript
await switchToMantleNetwork(true); // Switch to testnet
```

### "Already owns a character"
- Each wallet limited to one character
- Transfer existing NFT if you want to start fresh

### "Not authorized server"
```bash
# Authorize backend wallet in contract
npx hardhat run scripts/authorize-server.js --network mantleTestnet
```

### Transaction Stuck/Pending
- Mantle has fast finality (~2 seconds)
- If stuck >30 seconds, check RPC connection
- Try `await tx.wait(5)` for 5 confirmations

---

## 📚 Resources

- **Mantle Docs**: https://docs.mantle.xyz
- **Mantle Testnet Explorer**: https://explorer.testnet.mantle.xyz
- **Mantle Faucet**: https://faucet.testnet.mantle.xyz
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts
- **Ethers.js**: https://docs.ethers.org/v6

---

## 🚀 Next Steps

1. **MVP (Week 1-2)**
   - [x] Deploy contracts to testnet
   - [ ] Add mint button to character creator
   - [ ] Test full minting flow
   - [ ] Update backend to track on-chain stats

2. **Economy (Week 3-4)**
   - [ ] Implement reward claiming
   - [ ] Add season pass purchase page
   - [ ] Create marketplace UI
   - [ ] Test full economy flow

3. **Tournaments (Week 5-6)**
   - [ ] Build tournament registration UI
   - [ ] Implement bracket system
   - [ ] Add champion NFT display
   - [ ] Launch first test tournament

4. **Mainnet Launch**
   - [ ] Security audit (recommended)
   - [ ] Deploy to Mantle Mainnet
   - [ ] Fund reward pool
   - [ ] Marketing campaign

---

## 💡 Pro Tips

1. **Use Testnet First**: Always test on Mantle Testnet before mainnet
2. **Batch Claims**: Let users claim weekly rewards in one transaction
3. **Gas Estimates**: Always estimate gas before transactions
4. **Error Handling**: Show user-friendly messages for contract errors
5. **Transaction Receipts**: Store tx hashes for transparency

---

## 📞 Support

- **GitHub Issues**: Report bugs
- **Discord**: Join DuelCraft community
- **Documentation**: Check this README

---

**Built with ❤️ on Mantle Network**
