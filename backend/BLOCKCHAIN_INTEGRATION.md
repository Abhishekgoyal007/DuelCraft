# DuelCraft Backend - Blockchain Integration

## Overview

The backend blockchain service handles automated Web3 operations for DuelCraft, including match result recording, weekly reward distribution, and season pass management.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Generate Server Wallet

Create a new wallet specifically for server operations:

```javascript
// Using ethers.js to generate a wallet
const ethers = require("ethers");
const wallet = ethers.Wallet.createRandom();
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
```

**⚠️ Security Warning:** Never use a wallet with significant funds or your personal wallet. Generate a new one for server operations only.

### 3. Fund the Server Wallet

Send Mantle Sepolia testnet MNT to the server wallet address:
- Get testnet MNT from: https://faucet.sepolia.mantle.xyz
- Recommended: Keep at least 5-10 MNT for gas fees

### 4. Authorize Server Wallet

The server wallet must be authorized in the `DuelCraftCharacter` contract to record match results:

```javascript
// From the contract owner wallet (the one that deployed contracts)
// Call this on the DuelCraftCharacter contract:
await characterContract.authorizeServer(SERVER_WALLET_ADDRESS, true);
```

**Current Contract Addresses (Mantle Sepolia):**
- DuelCraftCharacter: `0x5f8B9575ABADF3A356337c2118045412A966BED9`

### 5. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your blockchain private key:

```env
BLOCKCHAIN_PRIVATE_KEY=0xyour_server_wallet_private_key_here
```

### 6. Start the Server

```bash
npm run dev
```

The blockchain service will initialize automatically and log:
```
✅ Blockchain wallet initialized: 0x...
✅ All smart contracts initialized
```

## API Endpoints

### GET /api/blockchain/info

Get blockchain service information including server wallet address and balance.

**Response:**
```json
{
  "success": true,
  "data": {
    "serverWallet": "0x...",
    "balance": "5.234",
    "network": {
      "chainId": 5003,
      "name": "Mantle Sepolia",
      "rpcUrl": "https://rpc.sepolia.mantle.xyz"
    }
  }
}
```

### POST /api/blockchain/record-match

Record match result on blockchain after a game completes.

**Request Body:**
```json
{
  "tokenId": 1,
  "didWin": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 123456
  }
}
```

### POST /api/blockchain/distribute-rewards

Distribute weekly ARENA token rewards to winners.

**Request Body:**
```json
{
  "rewards": [
    { "address": "0x...", "amount": "100" },
    { "address": "0x...", "amount": "50" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "rewardsDistributed": 2
  }
}
```

### GET /api/blockchain/character/:tokenId

Get character NFT data from blockchain.

**Response:**
```json
{
  "success": true,
  "data": {
    "characterType": "Warrior",
    "level": 5,
    "experience": 1250,
    "totalMatches": 20,
    "wins": 12,
    "losses": 8
  }
}
```

### GET /api/blockchain/character-available/:characterType

Check if a character type is available for minting.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": false
  }
}
```

### GET /api/blockchain/balance/:address

Get ARENA token balance for an address.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": "250.5"
  }
}
```

### GET /api/blockchain/season-pass/:address

Check if user has active season pass and get tier.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPass": true,
    "tier": 3
  }
}
```

## Blockchain Service Usage

### Recording Match Results

After a match completes in your match engine:

```typescript
import { blockchainService } from "./services/blockchain";

// After match ends
const winnerId = /* player with character NFT tokenId */;
const loserId = /* other player with character NFT tokenId */;

await blockchainService.recordMatchResult(winnerId, true);
await blockchainService.recordMatchResult(loserId, false);
```

### Weekly Reward Distribution

Run this weekly (e.g., via cron job):

```typescript
import { blockchainService } from "./services/blockchain";

// Calculate rewards based on performance
const rewards = [
  { address: "0x...", amount: "100" }, // Top player
  { address: "0x...", amount: "75" },  // 2nd place
  { address: "0x...", amount: "50" }   // 3rd place
];

await blockchainService.distributeWeeklyRewards(rewards);
```

### Checking Season Pass Benefits

When calculating match rewards:

```typescript
const hasPass = await blockchainService.hasActiveSeasonPass(playerAddress);
const tier = await blockchainService.getSeasonPassTier(playerAddress);

// Apply multipliers based on tier
const baseReward = 10;
const multiplier = tier === 1 ? 1.1 : tier === 2 ? 1.25 : tier === 3 ? 1.5 : tier === 4 ? 1.75 : 2.0;
const finalReward = hasPass ? baseReward * multiplier : baseReward;
```

## Smart Contract Integration

The blockchain service interacts with these contracts:

1. **ArenaToken** - ERC-20 token for in-game economy
   - Mint rewards to players
   - Check balances

2. **DuelCraftCharacter** - ERC-721 NFT for characters
   - Record match results
   - Update character stats
   - Check character availability

3. **SeasonPass** - Season pass management
   - Check active passes
   - Get tier information

4. **Marketplace** - NFT trading
   - Query listings
   - Verify ownership

5. **Tournament** - Tournament system
   - Track registrations
   - Record winners
   - Distribute prizes

## Security Best Practices

1. **Private Key Management**
   - Never commit `.env` to version control
   - Use environment variables in production
   - Rotate keys periodically
   - Monitor wallet balance

2. **Authorization**
   - Ensure server wallet is authorized in contracts
   - Implement rate limiting on blockchain endpoints
   - Validate all inputs before making transactions

3. **Gas Management**
   - Monitor wallet MNT balance
   - Set up alerts for low balance
   - Batch transactions when possible

4. **Error Handling**
   - All blockchain operations include try-catch blocks
   - Failed transactions are logged
   - Implement retry logic for critical operations

## Monitoring

### Check Server Wallet Status

```bash
curl http://localhost:4000/api/blockchain/info
```

### View Transaction History

Visit Mantle Sepolia Explorer:
```
https://explorer.sepolia.mantle.xyz/address/YOUR_SERVER_WALLET
```

## Troubleshooting

### "BLOCKCHAIN_PRIVATE_KEY not found"

Make sure `.env` file exists with the private key set.

### "Insufficient funds for intrinsic transaction cost"

Server wallet needs more MNT. Get testnet MNT from faucet.

### "Server not authorized"

Run the `authorizeServer` function from the contract owner wallet.

### Contract Initialization Errors

Ensure ABI files are present in `backend/src/contracts/abis/`.

## Development

### Updating Contract ABIs

After redeploying contracts:

1. Export new ABIs:
```bash
cd contracts
node scripts/export-abis.js
```

2. Copy to backend:
```bash
cp frontend/src/contracts/abis/*.json backend/src/contracts/abis/
```

3. Update addresses in `backend/src/contracts/addresses.ts`

### Testing Blockchain Operations

Use Postman or curl:

```bash
# Test recording a match
curl -X POST http://localhost:4000/api/blockchain/record-match \
  -H "Content-Type: application/json" \
  -d '{"tokenId": 1, "didWin": true}'
```

## Production Deployment

1. Use a dedicated production wallet
2. Store private key in secure vault (AWS Secrets Manager, Azure Key Vault)
3. Set up monitoring and alerts
4. Configure automatic MNT refilling
5. Implement rate limiting and access controls
6. Enable transaction logging and auditing

## License

MIT License - See LICENSE file for details
