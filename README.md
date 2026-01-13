# DuelCraft 🎮⚔️

A blockchain-powered 1v1 fighting game built with React, Node.js, and smart contracts on **Mantle Network**. Features dynamic character NFTs, dual-token economy, marketplace, tournaments, and season passes.

![Mantle Network](https://img.shields.io/badge/Mantle-Testnet-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)
![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

---

## 🌟 Features

### 🎨 Character System
- **Dynamic Character NFTs** - Mint unique Warrior or Mage characters as NFTs
- **Character Rarity** - Each character type can only be minted once globally on the blockchain
- **Stat Tracking** - Level, XP, wins, losses, total matches stored on-chain
- **Visual Customization** - Body colors, hairstyles, outfits, effects

### 💰 Dual Token Economy
- **Arena Coins** (Off-chain) - Earned from matches, used in cosmetics shop
- **ARENA Tokens** (On-chain ERC-20) - Used for NFT marketplace, tournaments, season passes
- Real-time balance display for both currencies

### 🏪 Marketplace
- Buy and sell cosmetic NFTs with ARENA tokens
- Rent items with flexible daily rates (1, 7, 30 days)
- Browse by categories: Skins, Effects, Emotes, Accessories
- List your own NFTs with custom pricing

### 🏆 Tournament System
- Weekly tournaments with entry fees
- Prize pool distribution: 60% / 25% / 15%
- Single elimination brackets
- Hall of Champions tracking top players
- Champion NFT badges for winners

### 🎟️ Season Pass
5-tier system with increasing rewards:
- **Bronze** (10 ARENA): 1.1x XP, 1.1x Coins
- **Silver** (25 ARENA): 1.25x XP, 1.5x Coins
- **Gold** (50 ARENA): 1.5x XP, 1.75x Coins
- **Platinum** (100 ARENA): 1.75x XP, 2.0x Coins
- **Diamond** (250 ARENA): 2.0x XP, 2.5x Coins

### 🛒 Cosmetics Shop
- Purchase items with Arena Coins
- Rarity tiers: Common → Legendary
- Categories: Bodies, Hair, Eyes, Tops, Effects, Emotes
- Owned items tracking

### ⚔️ Real-time PvP Combat
- WebSocket-based multiplayer
- Phaser.js game engine
- Character animations: Idle, Walk, Jump, Punch
- Match result recording on blockchain

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Frontend      │◄───────►│   Backend       │◄───────►│  Smart          │
│   (React)       │         │   (Node.js)     │         │  Contracts      │
│                 │         │                 │         │  (Mantle)       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
   │                           │                           │
   ├─ Character Creator        ├─ Match Engine            ├─ ArenaToken
   ├─ Marketplace              ├─ WebSocket Server        ├─ DuelCraftCharacter
   ├─ Tournament               ├─ Blockchain Service      ├─ SeasonPass
   ├─ Season Pass              ├─ MongoDB Atlas           ├─ Marketplace
   ├─ Shop                     └─ RESTful API             └─ Tournament
   └─ Hub
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask wallet
- Mantle Sepolia testnet MNT ([Get from faucet](https://faucet.sepolia.mantle.xyz))

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd duelcraft
```

### 2. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Smart Contracts
cd ../contracts
npm install
```

### 3. Configure Environment Variables

**Backend `.env`:**
```env
MONGODB_URI=your_mongodb_connection_string
PORT=4000
JWT_SECRET=your_jwt_secret
BLOCKCHAIN_PRIVATE_KEY=0x_your_server_wallet_private_key
```

**Frontend** - Update `src/config/contracts.js` if needed (already configured for Mantle Sepolia).

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173  
Backend runs on: http://localhost:4000

---

## 📜 Smart Contracts (Mantle Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| ArenaToken | `0x57AC8904F597E727BD53e8E9f7A00280876F13A1` | ERC-20 game token |
| DuelCraftCharacter | `0x5f8B9575ABADF3A356337c2118045412A966BED9` | Dynamic character NFTs |
| SeasonPass | `0x7385035e4436Cc987298497555094e2d4B9b89b0` | Season pass system |
| Marketplace | `0x9edAE91e4d9Fe8B89238223CcEd674D321C0d8f7` | NFT trading platform |
| Tournament | `0xcFC6599Cb85058566261d303FDD9a7f50438D2DD` | Tournament management |

**Network Details:**
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://explorer.sepolia.mantle.xyz

---

## 🎮 How to Play

### 1. Connect Wallet
- Open DuelCraft in browser
- Click "Connect Wallet"
- Approve MetaMask connection
- Switch to Mantle Sepolia network if prompted

### 2. Mint Character NFT
- Go to "Create Fighter"
- Choose Warrior or Mage (if available)
- Customize appearance
- Click "Mint Character NFT"
- Confirm MetaMask transaction
- Character type becomes globally unavailable

### 3. Play Matches
- Click "Play Now" from Hub
- Wait for matchmaking
- Battle opponent in real-time
- Earn Arena Coins and XP
- Match results recorded on blockchain

### 4. Use Marketplace
- Browse NFT listings
- Buy items with ARENA tokens
- List your own NFTs for sale/rent
- Manage active listings

### 5. Join Tournament
- Visit Tournament page
- Check entry fee and prize pool
- Register with ARENA tokens
- Wait for tournament start
- Compete in bracket matches

### 6. Purchase Season Pass
- Go to Season Pass page
- Choose tier (Bronze-Diamond)
- Approve ARENA tokens
- Confirm purchase
- Earn bonus XP and Coins

---

## 🔧 Backend Blockchain Service

The backend automatically:
- Records match results on blockchain
- Updates character stats (wins/losses/XP)
- Distributes weekly ARENA token rewards
- Checks season pass benefits
- Manages tournament operations

**Setup Server Wallet:**
See `backend/SERVER_AUTHORIZATION.md` for complete guide.

**API Endpoints:**
```
GET  /api/blockchain/info                    # Server wallet status
POST /api/blockchain/record-match            # Record match result
POST /api/blockchain/distribute-rewards      # Weekly rewards
GET  /api/blockchain/character/:tokenId      # Get character stats
GET  /api/blockchain/balance/:address        # Check ARENA balance
GET  /api/blockchain/season-pass/:address    # Season pass status
```

---

## 📂 Project Structure

```
duelcraft/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/           # UI pages (Hub, Shop, Marketplace, etc.)
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context (Auth, Web3)
│   │   ├── game/            # Phaser game engine
│   │   └── config/          # Contract addresses, character data
│   └── public/
│       └── assets/          # Character sprites, backgrounds
│
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── services/        # Blockchain service
│   │   ├── db/              # MongoDB models
│   │   ├── contracts/       # Contract ABIs and addresses
│   │   ├── auth.ts          # Authentication routes
│   │   ├── blockchain.ts    # Blockchain API routes
│   │   ├── matchEngine.ts   # PvP matchmaking
│   │   └── index.ts         # Express app + WebSocket server
│   └── BLOCKCHAIN_INTEGRATION.md  # Setup guide
│
├── contracts/                # Smart contracts
│   ├── contracts/
│   │   ├── ArenaToken.sol
│   │   ├── DuelCraftCharacter.sol
│   │   ├── SeasonPass.sol
│   │   ├── Marketplace.sol
│   │   └── Tournament.sol
│   ├── scripts/
│   │   ├── deploy.js        # Deployment script
│   │   └── export-abis.js   # Export ABIs to frontend/backend
│   └── hardhat.config.js
│
└── BLOCKCHAIN_COMPLETE.md    # Complete feature documentation
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Ethers.js v6** - Blockchain interaction
- **Phaser 3** - Game engine
- **React Router** - Navigation

### Backend
- **Node.js + Express** - REST API
- **WebSocket (ws)** - Real-time multiplayer
- **MongoDB Atlas** - Database
- **Ethers.js v6** - Blockchain service
- **TypeScript** - Type safety

### Smart Contracts
- **Solidity 0.8.20** - Contract language
- **Hardhat** - Development framework
- **OpenZeppelin** - Security libraries
- **Mantle Network** - Deployment network

---

## 🔐 Security

### Smart Contracts
- ✅ OpenZeppelin audited contracts
- ✅ Server authorization for protected functions
- ✅ Owner-only administrative functions
- ✅ Character rarity enforcement

### Backend
- ✅ JWT authentication
- ✅ Input validation
- ✅ Private key in environment variables
- ✅ Error handling and logging

### Frontend
- ✅ MetaMask wallet connection
- ✅ Network validation
- ✅ Transaction confirmation prompts
- ✅ Token approval flows

---

## 📊 Gas Estimates (Mantle Sepolia)

| Operation | Estimated Gas Cost |
|-----------|-------------------|
| Mint Character NFT | ~0.001 MNT |
| Record Match Result | ~0.0005 MNT |
| Buy from Marketplace | ~0.0008 MNT |
| Purchase Season Pass | ~0.0007 MNT |
| Register for Tournament | ~0.0006 MNT |

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Character NFT minting
- [x] Match engine with WebSocket
- [x] Character rarity system
- [x] Shop and marketplace
- [x] Tournament system
- [x] Season pass

### Phase 2: Backend Integration 🔄
- [x] Blockchain service setup
- [x] API endpoints
- [ ] Server wallet authorization (in progress)
- [ ] Match result recording
- [ ] Weekly reward distribution

### Phase 3: Enhancement 📋
- [ ] Weekly reward claiming UI
- [ ] Leaderboard blockchain integration
- [ ] Tournament bracket automation
- [ ] Advanced character customization
- [ ] Mobile responsiveness

### Phase 4: Mainnet 🚀
- [ ] Audit smart contracts
- [ ] Deploy to Mantle Mainnet
- [ ] Production backend setup
- [ ] Marketing and launch

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open Pull Request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🔗 Links

- **Mantle Network:** https://mantle.xyz
- **Mantle Docs:** https://docs.mantle.xyz
- **Faucet:** https://faucet.sepolia.mantle.xyz
- **Explorer:** https://explorer.sepolia.mantle.xyz

---

## 🙏 Acknowledgments

- Built on **Mantle Network** for scalable blockchain gaming
- **OpenZeppelin** for secure smart contract libraries
- **Phaser** community for game engine support
- **React** and **Vite** teams for excellent developer tools

---

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check `BLOCKCHAIN_COMPLETE.md` for full feature documentation
- See `backend/BLOCKCHAIN_INTEGRATION.md` for setup guides

---

**Ready to battle? Join DuelCraft and become a blockchain champion!** ⚔️🎮

---

*Last updated: January 13, 2026*
