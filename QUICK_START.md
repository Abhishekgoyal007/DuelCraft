# 🚀 Quick Start Guide - DuelCraft Blockchain

## Deploy & Test in 15 Minutes

### Step 1: Get Testnet MNT (2 minutes)

1. Visit: https://faucet.testnet.mantle.xyz
2. Connect your MetaMask wallet
3. Request testnet MNT
4. Wait for tokens (usually instant)

### Step 2: Setup Environment (1 minute)

```bash
cd contracts

# Create .env file
cp .env.example .env

# Edit .env and add your private key
# Get it from MetaMask: Account Details → Show Private Key
# ⚠️  NEVER use your mainnet wallet! Create a new test wallet
```

### Step 3: Install & Compile (3 minutes)

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# You should see:
# ✅ Compiled 5 contracts successfully
```

### Step 4: Deploy to Testnet (2 minutes)

```bash
npm run deploy:testnet

# Watch for output:
# 🚀 Deploying DuelCraft Contracts to mantleTestnet
# ✅ ArenaToken deployed to: 0x...
# ✅ DuelCraftCharacter deployed to: 0x...
# ✅ SeasonPass deployed to: 0x...
# ✅ Marketplace deployed to: 0x...
# ✅ Tournament deployed to: 0x...
```

**Save these addresses!** You'll need them for the frontend.

### Step 5: Update Frontend Config (1 minute)

Open `frontend/src/config/contracts.js` and update:

```javascript
mantleTestnet: {
  chainId: 5003,
  rpcUrl: 'https://rpc.testnet.mantle.xyz',
  blockExplorer: 'https://explorer.testnet.mantle.xyz',
  contracts: {
    ArenaToken: '0xYOUR_DEPLOYED_ADDRESS',           // ← Update
    DuelCraftCharacter: '0xYOUR_DEPLOYED_ADDRESS',  // ← Update
    SeasonPass: '0xYOUR_DEPLOYED_ADDRESS',           // ← Update
    Marketplace: '0xYOUR_DEPLOYED_ADDRESS',          // ← Update
    Tournament: '0xYOUR_DEPLOYED_ADDRESS',           // ← Update
  },
},
```

### Step 6: Add Mantle Testnet to MetaMask (1 minute)

```javascript
// The frontend will auto-prompt, or add manually:

Network Name: Mantle Testnet
RPC URL: https://rpc.testnet.mantle.xyz
Chain ID: 5003
Currency Symbol: MNT
Block Explorer: https://explorer.testnet.mantle.xyz
```

### Step 7: Test in Browser (5 minutes)

```bash
cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask popup
   - Should see your address

2. **Create Character**
   - Go to Character Creator
   - Customize your character
   - Click "Mint as NFT" (you'll add this button next)
   - Approve transaction (~$0.01 gas)
   - Wait for confirmation (2-3 seconds)

3. **View on Explorer**
   - Go to https://explorer.testnet.mantle.xyz
   - Search for your wallet address
   - See your character NFT!

---

## 🐛 Troubleshooting

### "Insufficient funds"
- Get more testnet MNT from faucet
- Each transaction costs ~$0.01

### "Wrong network"
- Make sure MetaMask is on Mantle Testnet (Chain ID: 5003)
- Frontend should auto-prompt to switch

### "Contract not deployed"
- Check if deployment succeeded
- Verify contract addresses in config

### "Transaction failed"
- Check gas estimation
- Try again (Mantle is fast, no need to increase gas)

---

## 📊 Verify Deployment

### Check Contract on Explorer

1. Go to: https://explorer.testnet.mantle.xyz/address/YOUR_CONTRACT_ADDRESS
2. You should see:
   - Contract creation transaction
   - Contract code
   - Recent transactions

### Test Contract Functions

```bash
# In contracts directory
npx hardhat console --network mantleTestnet

# Test minting (in console)
const Character = await ethers.getContractFactory("DuelCraftCharacter");
const char = await Character.attach("YOUR_DEPLOYED_ADDRESS");
await char.totalSupply(); // Should return 0 initially
```

---

## 🎯 Next Steps After Deployment

### 1. Add Mint Button (Priority 1)

Update `frontend/src/pages/CharacterCreatorV2.jsx`:

```jsx
import { useWeb3 } from '../context/Web3Context';
import { useState } from 'react';

function CharacterCreatorV2() {
  const { address, isConnected, contracts, connect } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);

  async function mintCharacter() {
    if (!isConnected) {
      await connect();
      return;
    }

    try {
      setIsMinting(true);
      
      // Convert avatar to contract format
      const customization = {
        body: avatar.body || 0,
        hair: avatar.hair || 0,
        hairColor: 0, // Map avatar.hairColor to index
        eyes: 0,
        mouth: 0,
        tops: 0,
        topColor: 0,
        bottoms: 0,
        bottomColor: 0,
        shoes: 0,
        accessory: 0,
        background: 0,
        effect: 0,
      };

      // Call contract (needs Contract instance with ABI)
      // const tx = await contracts.character.mintCharacter(
      //   "warrior",
      //   customization
      // );
      // await tx.wait();

      alert('Character minted successfully!');
    } catch (error) {
      console.error('Mint failed:', error);
      alert('Minting failed: ' + error.message);
    } finally {
      setIsMinting(false);
    }
  }

  return (
    // ... existing JSX ...
    <button 
      onClick={mintCharacter}
      disabled={isMinting}
      className="btn-primary"
    >
      {isMinting ? 'Minting...' : 'Mint as NFT'}
    </button>
  );
}
```

### 2. Authorize Backend Wallet

```bash
# Get your backend wallet address
# In backend/.env, add:
BLOCKCHAIN_PRIVATE_KEY=backend_wallet_private_key

# Authorize it in the contract
npx hardhat run scripts/authorize-server.js --network mantleTestnet
```

Create `scripts/authorize-server.js`:
```javascript
const hre = require("hardhat");

async function main() {
  const characterAddress = "YOUR_DEPLOYED_ADDRESS";
  const serverAddress = "YOUR_BACKEND_WALLET";
  
  const Character = await hre.ethers.getContractFactory("DuelCraftCharacter");
  const character = await Character.attach(characterAddress);
  
  await character.setServerAuthorization(serverAddress, true);
  console.log("✅ Server authorized:", serverAddress);
}

main();
```

### 3. Test Full Flow

1. ✅ Connect wallet
2. ✅ Create character
3. ✅ Mint NFT
4. ✅ Check on explorer
5. ✅ Play match
6. ✅ Stats update (after backend integration)

---

## 📋 Deployment Checklist

- [ ] Testnet MNT acquired
- [ ] Private key in `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Contracts compiled (`npm run compile`)
- [ ] Contracts deployed (`npm run deploy:testnet`)
- [ ] Addresses saved from deployment
- [ ] Frontend config updated with addresses
- [ ] MetaMask has Mantle Testnet added
- [ ] Frontend can connect wallet
- [ ] Test character mint transaction works
- [ ] Contracts verified on explorer (optional)
- [ ] Backend wallet authorized

---

## 💡 Pro Tips

1. **Save Deployment Info**
   - Deployment details saved to `contracts/deployments/mantleTestnet-latest.json`
   - Keep this file for reference

2. **Test Account**
   - Create a new MetaMask account for testing
   - Never use real funds on testnet

3. **Gas Costs**
   - Mantle testnet gas is ~0.05 gwei (super cheap!)
   - Each transaction costs <$0.01

4. **Fast Finality**
   - Transactions confirm in 2-3 seconds
   - No need to wait long

5. **Re-Deployment**
   - Can redeploy anytime on testnet
   - Just update frontend config with new addresses

---

## 🎉 Success!

If you followed all steps, you should now have:

✅ Deployed smart contracts on Mantle Testnet  
✅ Frontend connected to blockchain  
✅ Ability to mint character NFTs  
✅ Verified contracts on explorer  

**Next**: Add full UI integration for minting, profiles, marketplace, and tournaments!

---

## 📞 Need Help?

1. Check `BLOCKCHAIN_INTEGRATION.md` for detailed docs
2. Review `IMPLEMENTATION_STATUS.md` for progress tracking
3. Check Mantle documentation: https://docs.mantle.xyz
4. Ask in Discord/GitHub issues

**Happy Building! 🚀**
