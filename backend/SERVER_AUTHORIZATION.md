# Server Wallet Authorization Guide

## Overview
The backend server needs authorization to call certain protected functions in the `DuelCraftCharacter` smart contract, specifically `updateMatchStats()`.

## Steps to Authorize Server Wallet

### 1. Generate Server Wallet

Run this script to generate a new wallet:

```javascript
const ethers = require("ethers");
const wallet = ethers.Wallet.createRandom();

console.log("=".repeat(60));
console.log("SERVER WALLET GENERATED");
console.log("=".repeat(60));
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("=".repeat(60));
console.log("\n⚠️  IMPORTANT:");
console.log("1. Save the private key in backend/.env");
console.log("2. NEVER commit the .env file to version control");
console.log("3. Send testnet MNT to this address from faucet");
console.log("4. Authorize this address in the contract (see below)");
console.log("=".repeat(60));
```

### 2. Fund the Wallet

Get testnet MNT from Mantle Sepolia Faucet:
- Visit: https://faucet.sepolia.mantle.xyz
- Enter your server wallet address
- Request MNT (recommended: 10 MNT)

### 3. Add Private Key to Backend .env

Edit `backend/.env`:

```env
BLOCKCHAIN_PRIVATE_KEY=0xyour_private_key_here
```

### 4. Authorize in Smart Contract

**Option A: Using Hardhat Console**

```bash
cd contracts
npx hardhat console --network mantleSepolia
```

Then in console:
```javascript
const CharacterNFT = await ethers.getContractFactory("DuelCraftCharacter");
const character = CharacterNFT.attach("0x5f8B9575ABADF3A356337c2118045412A966BED9");

// Replace with your server wallet address
const serverAddress = "0xYOUR_SERVER_WALLET_ADDRESS";

const tx = await character.authorizeServer(serverAddress, true);
await tx.wait();

console.log("✅ Server authorized!");

// Verify authorization
const isAuthorized = await character.authorizedServers(serverAddress);
console.log("Is authorized:", isAuthorized);
```

**Option B: Using Ethers Script**

Create `contracts/scripts/authorize-server.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const serverAddress = "0xYOUR_SERVER_WALLET_ADDRESS"; // Replace this
  const characterAddress = "0x5f8B9575ABADF3A356337c2118045412A966BED9";

  const CharacterNFT = await ethers.getContractFactory("DuelCraftCharacter");
  const character = CharacterNFT.attach(characterAddress);

  console.log("Authorizing server wallet:", serverAddress);
  
  const tx = await character.authorizeServer(serverAddress, true);
  await tx.wait();

  console.log("✅ Transaction confirmed!");
  
  // Verify
  const isAuthorized = await character.authorizedServers(serverAddress);
  console.log("Server authorized:", isAuthorized);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run:
```bash
cd contracts
npx hardhat run scripts/authorize-server.js --network mantleSepolia
```

**Option C: Using Frontend**

If you prefer using MetaMask with the contract owner wallet:

1. Connect with owner wallet (the one that deployed contracts)
2. Open browser console on your frontend
3. Run:

```javascript
const characterAddress = "0x5f8B9575ABADF3A356337c2118045412A966BED9";
const serverAddress = "0xYOUR_SERVER_WALLET_ADDRESS";

const abi = ["function authorizeServer(address server, bool authorized) public"];
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(characterAddress, abi, signer);

const tx = await contract.authorizeServer(serverAddress, true);
await tx.wait();
console.log("✅ Server authorized!");
```

### 5. Verify Authorization

Test the blockchain service:

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test the API
curl http://localhost:4000/api/blockchain/info
```

You should see:
```json
{
  "success": true,
  "data": {
    "serverWallet": "0xYOUR_SERVER_ADDRESS",
    "balance": "9.98",
    "network": {
      "chainId": 5003,
      "name": "Mantle Sepolia"
    }
  }
}
```

### 6. Test Match Recording

Try recording a test match result:

```bash
curl -X POST http://localhost:4000/api/blockchain/record-match \
  -H "Content-Type: application/json" \
  -d '{"tokenId": 1, "didWin": true}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 123456
  }
}
```

## Troubleshooting

### Error: "Server not authorized"
- Make sure you called `authorizeServer()` from the contract **owner** wallet
- Verify authorization: `await character.authorizedServers(serverAddress)`

### Error: "Insufficient funds"
- Server wallet needs MNT for gas
- Get more from faucet: https://faucet.sepolia.mantle.xyz

### Error: "Cannot read properties of undefined"
- Check that `BLOCKCHAIN_PRIVATE_KEY` is set in `.env`
- Make sure you copied ABI files to `backend/src/contracts/abis/`

### Server wallet address mismatch
- The address in `.env` must match the one authorized in the contract
- Regenerate address from private key: `new ethers.Wallet(privateKey).address`

## Security Checklist

- [ ] Generated dedicated wallet for server (not personal wallet)
- [ ] Added private key to `backend/.env`
- [ ] Added `.env` to `.gitignore`
- [ ] Funded server wallet with testnet MNT
- [ ] Authorized server wallet in DuelCraftCharacter contract
- [ ] Verified authorization with `authorizedServers()` call
- [ ] Tested blockchain API endpoints
- [ ] Monitored server wallet balance

## Current Contract Info

**Mantle Sepolia Testnet:**
- DuelCraftCharacter: `0x5f8B9575ABADF3A356337c2118045412A966BED9`
- ArenaToken: `0x57AC8904F597E727BD53e8E9f7A00280876F13A1`
- SeasonPass: `0x7385035e4436Cc987298497555094e2d4B9b89b0`
- Marketplace: `0x9edAE91e4d9Fe8B89238223CcEd674D321C0d8f7`
- Tournament: `0xcFC6599Cb85058566261d303FDD9a7f50438D2DD`

**Owner Wallet (for authorization):**
- The wallet that deployed these contracts
- Should be: `0x13E1b5353892d0dbC56Ce9DBB88AE660DBf1DeF6`

## Next Steps

Once server is authorized:
1. Integrate match recording into game loop
2. Setup weekly reward distribution cron job
3. Implement season pass benefit calculations
4. Add leaderboard blockchain integration
