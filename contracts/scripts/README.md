# DuelCraft Contracts Scripts

## Available Scripts

### 1. Deploy Contracts
```bash
npm run deploy:testnet   # Deploy to Mantle Testnet
npm run deploy:mainnet   # Deploy to Mantle Mainnet
```

### 2. Authorize Game Server
After deployment, authorize your backend wallet to update character stats:
```bash
node scripts/authorize-server.js
```

Make sure `GAME_SERVER_ADDRESS` is set in `.env`.

### 3. Export ABIs
Export contract ABIs to frontend:
```bash
node scripts/export-abis.js
```

This copies ABIs to `frontend/src/contracts/abis/` for use in React.

### 4. Verify Contracts
Verify contracts on Mantle explorer:
```bash
npm run verify:testnet
npm run verify:mainnet
```

---

## Manual Contract Interaction

### Using Hardhat Console

```bash
npx hardhat console --network mantleTestnet
```

Then in console:
```javascript
// Get contract
const Character = await ethers.getContractFactory("DuelCraftCharacter");
const char = await Character.attach("YOUR_DEPLOYED_ADDRESS");

// Check total supply
await char.totalSupply();

// Check if wallet owns character
const tokenId = await char.walletToCharacter("WALLET_ADDRESS");
console.log("Token ID:", tokenId.toString());

// Get character data
if (tokenId > 0) {
  const character = await char.getCharacter(tokenId);
  console.log("Character:", character);
}
```

---

## Testing Contracts

### Run Tests
```bash
npx hardhat test
```

### Run Specific Test
```bash
npx hardhat test test/DuelCraftCharacter.test.js
```

### With Gas Report
```bash
REPORT_GAS=true npx hardhat test
```

---

## Local Development

### Start Local Node
```bash
npx hardhat node
```

### Deploy to Local Node
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

## Common Tasks

### Check Contract Balance
```bash
npx hardhat run scripts/check-balance.js --network mantleTestnet
```

### Transfer Ownership
```bash
npx hardhat run scripts/transfer-ownership.js --network mantleTestnet
```

### Mint Test Tokens
```bash
npx hardhat run scripts/mint-test-tokens.js --network mantleTestnet
```

---

## Environment Variables

Required in `.env`:
```env
DEPLOYER_PRIVATE_KEY=xxx           # Wallet that deploys contracts
GAME_SERVER_ADDRESS=0x...          # Backend wallet for stat updates
MANTLE_TESTNET_RPC=https://...    # Optional, has default
MANTLE_MAINNET_RPC=https://...    # Optional, has default
ETHERSCAN_API_KEY=xxx             # For contract verification
```

---

## Troubleshooting

### "Insufficient funds"
Make sure deployer wallet has testnet MNT from faucet.

### "Nonce too high"
Reset MetaMask: Settings → Advanced → Reset Account

### "Contract not found"
Make sure you compiled contracts first: `npm run compile`

### "Invalid JSON RPC response"
Check RPC URL in hardhat.config.js
