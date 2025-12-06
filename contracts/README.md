# DuelCraft Smart Contracts

Blockchain integration for DuelCraft game characters and economy.

## Contracts

### DuelCraftCharacter.sol
Dynamic NFT contract for game characters with:
- Character minting (warrior, mage, rogue, etc.)
- Dynamic metadata (level, wins, losses update on-chain)
- One character per wallet
- Server-authoritative stat updates
- Tournament locking mechanism

## Setup

1. **Install dependencies:**
```bash
cd contracts
npm install
```

2. **Create .env file:**
```bash
cp .env.example .env
```

3. **Add your private key to .env:**
```
PRIVATE_KEY=your_wallet_private_key_here
```

## Deployment

### Deploy to Mantle Testnet

```bash
npm run deploy:testnet
```

### Deploy to Mantle Mainnet

```bash
npm run deploy:mainnet
```

### Verify Contract

```bash
npm run verify -- <CONTRACT_ADDRESS>
```

## Mantle Network Info

### Testnet
- RPC: https://rpc.testnet.mantle.xyz
- Chain ID: 5003
- Explorer: https://explorer.testnet.mantle.xyz
- Faucet: https://faucet.testnet.mantle.xyz

### Mainnet
- RPC: https://rpc.mantle.xyz
- Chain ID: 5000
- Explorer: https://explorer.mantle.xyz

## Contract Addresses

After deployment, contract addresses will be displayed. Save them to `.env`:

```
CHARACTER_NFT_ADDRESS=0x...
```

## Testing

Run contract tests:
```bash
npm test
```

## Integration with Game

The character NFT contract integrates with the game backend:

1. **Minting**: Players mint characters from the Character Creator UI
2. **Updates**: Backend server updates stats after matches (authorized)
3. **Display**: NFT metadata shown in player profiles
4. **Trading**: Players can trade characters on marketplaces

## Security

- Only authorized game servers can update character stats
- One character per wallet (prevents farming)
- Tournament locking prevents stat manipulation
- Server-authoritative combat (anti-cheat)

## Gas Optimization

- Batch stat updates when possible
- Lazy minting (mint on first use)
- Efficient metadata encoding with Base64

## Future Contracts

- DuelCraftToken (ERC-20) - Game economy token
- SeasonPass (ERC-1155) - Battle pass NFTs
- Tournament (Custom) - Prize pool distribution
- Marketplace (Custom) - Skin trading
