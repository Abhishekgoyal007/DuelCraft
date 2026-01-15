# DuelCraft 🎮⚔️

A blockchain-powered 1v1 fighting game built with React, Node.js, and smart contracts on **Mantle Network**. Features dynamic character NFTs, dual-token economy, real-money cash duels, marketplace, tournaments, and season passes.

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
- **MNT Tokens** (Native) - Used for cash duels with real-money stakes
- Real-time balance display for all currencies

### 💸 Cash Duel System
- **Three Tiers** - Bronze (2 MNT), Silver (10 MNT), Gold (20 MNT)
- **Winner Takes 90%** - 10% platform fee on all cash duels
- **Player Protection** - Daily limits (10 duels/day), cooldowns (5 min), emergency withdrawals
- **Anti-Cheat** - Server-authorized results, banned player tracking
- **Real-time Stats** - Track earnings, win rates, total duels played

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
- WebSocket-based multiplayer matchmaking
- Phaser.js game engine with smooth animations
- Character animations: Idle, Walk, Jump, Punch, Special Attacks
- Match results automatically recorded on blockchain
- Dual game modes: Casual Arena and Cash Duels

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Frontend      │◄───────►│   Backend       │◄───────►│  Smart          │
│   (React)       │  HTTP   │   (Node.js)     │  RPC    │  Contracts      │
│   + Phaser.js   │  WS     │   + WebSocket   │         │  (Mantle)       │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
   │                           │                           │
   ├─ Character Creator        ├─ Match Engine            ├─ ArenaToken (ERC-20)
   ├─ Marketplace              ├─ Cash Duel Service       ├─ CashDuel
   ├─ Tournament               ├─ WebSocket Server        ├─ DuelCraftCharacter (NFT)
   ├─ Season Pass              ├─ Blockchain Service      ├─ SeasonPass
   ├─ Shop                     ├─ MongoDB Atlas           ├─ Marketplace
   ├─ Cash Duel                └─ RESTful API             └─ Tournament
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
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=4000
JWT_SECRET=your_jwt_secret_key_here

# Blockchain
BLOCKCHAIN_PRIVATE_KEY=0x_your_server_wallet_private_key
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz

# Cash Duel Settings
CASH_DUEL_CONTRACT=0x_deployed_cashduel_contract_address
```

**Frontend** - Already configured in `src/config/contracts.js` for Mantle Sepolia.

**Important:** Get Mantle Sepolia testnet MNT from [faucet](https://faucet.sepolia.mantle.xyz) for server wallet and testing.

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
| CashDuel | `0x00FB7A8D8b3ea3B9BaF67dbD29F6f62Cade88e8c` | Real-money duels with MNT |
| DuelCraftCharacter | `0x5f8B9575ABADF3A356337c2118045412A966BED9` | Dynamic character NFTs |
| SeasonPass | `0x7385035e4436Cc987298497555094e2d4B9b89b0` | Season pass system |
| Marketplace | `0x9edAE91e4d9Fe8B89238223CcEd674D321C0d8f7` | NFT trading platform |
| Tournament | `0xcFC6599Cb85058566261d303FDD9a7f50438D2DD` | Tournament management |

**Network Details:**
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://explorer.sepolia.mantle.xyz
- Native Token: MNT (Get from [faucet](https://faucet.sepolia.mantle.xyz))

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
- **Casual Arena** - Click "Play Now" from Hub for free matches
- Wait for matchmaking system
- Battle opponent in real-time with Phaser game engine
- Earn Arena Coins and XP
- Match results recorded on blockchain

### 3b. Cash Duels (Real Money)
- Click "Cash Duels" from Hub
- Choose tier: Bronze (2 MNT), Silver (10 MNT), Gold (20 MNT)
- Pay entry fee from your MNT balance
- System matches you with another player
- Winner takes 90% of pot (1.8x, 9x, or 18x return)
- Platform keeps 10% fee
- Track stats: earnings, win rate, duels played

**Cash Duel Limits:**
- Max 10 duels per day
- 5 minute cooldown between duels
- Server-verified results prevent cheating

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

## 🔧 Backend Services

The backend provides comprehensive blockchain integration and game services:

### Blockchain Service
- Records match results on-chain automatically
- Updates character stats (wins/losses/XP/level)
- Distributes weekly ARENA token rewards
- Checks season pass benefits and multipliers
- Manages tournament operations
- Verifies and completes cash duels

### Cash Duel Service
- Pre-registers duel intents for fast matchmaking
- Verifies on-chain duel creation and player joins
- Completes duels with server-authorized results
- Tracks player stats and history
- Enforces daily limits and cooldowns
- Manages emergency withdrawals

### Match Engine
- WebSocket-based real-time multiplayer
- Queue management for casual and cash duels
- Player pairing algorithms
- Battle result handling
- Integration with blockchain recording

**Setup Server Wallet:**
See [backend/SERVER_AUTHORIZATION.md](backend/SERVER_AUTHORIZATION.md) for complete authorization guide.

**API Endpoints:**
```
# Blockchain Service
GET  /api/blockchain/info                    # Server wallet status
POST /api/blockchain/record-match            # Record match result
POST /api/blockchain/distribute-rewards      # Weekly rewards
GET  /api/blockchain/character/:tokenId      # Get character stats
GET  /api/blockchain/balance/:address        # Check ARENA balance
GET  /api/blockchain/season-pass/:address    # Season pass status

# Cash Duel Service
POST /api/cash-duel/register                 # Pre-register duel intent
POST /api/cash-duel/verify-creation          # Verify blockchain duel created
POST /api/cash-duel/verify-join              # Verify player joined duel
POST /api/cash-duel/complete                 # Complete duel with results
GET  /api/cash-duel/active                   # Get all active duels
GET  /api/cash-duel/stats/:address           # Get player stats
GET  /api/cash-duel/history/:address         # Get player duel history
GET  /api/cash-duel/details/:duelId          # Get specific duel details
```

---

## 📂 Project Structure

```
duelcraft/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/           # UI pages (Hub, Shop, Marketplace, CashDuel, etc.)
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context (Auth, Web3)
│   │   ├── game/            # Phaser game engine
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Contract addresses, character data
│   └── public/
│       └── assets/          # Character sprites, backgrounds, sounds
│
├── backend/                  # Node.js + TypeScript backend
│   ├── src/
│   │   ├── services/        # Blockchain & Cash Duel services
│   │   ├── routes/          # API route handlers
│   │   ├── db/              # MongoDB models & connection
│   │   ├── contracts/       # Contract ABIs and addresses
│   │   ├── auth.ts          # JWT authentication routes
│   │   ├── blockchain.ts    # Blockchain API routes
│   │   ├── matchEngine.ts   # PvP matchmaking & game logic
│   │   └── index.ts         # Express app + WebSocket server
│   ├── BLOCKCHAIN_INTEGRATION.md   # Setup guide
│   └── SERVER_AUTHORIZATION.md     # Server wallet auth guide
│
├── contracts/                # Smart contracts (Solidity)
│   ├── contracts/
│   │   ├── ArenaToken.sol           # ERC-20 game token
│   │   ├── CashDuel.sol             # Real-money duels
│   │   ├── DuelCraftCharacter.sol   # Dynamic NFTs
│   │   ├── SeasonPass.sol           # Season pass system
│   │   ├── Marketplace.sol          # NFT marketplace
│   │   └── Tournament.sol           # Tournament management
│   ├── scripts/
│   │   ├── deploy.js                # Deploy all contracts
│   │   ├── deploy-cashduel.js       # Deploy cash duel contract
│   │   ├── export-abis.js           # Export ABIs to frontend/backend
│   │   ├── authorize-server.js      # Authorize server wallet
│   │   └── setup-arena-tokens.js    # Initialize ARENA tokens
│   ├── deployments/                 # Deployment history
│   └── hardhat.config.js
│
└── docs/                     # Documentation
    ├── AI_ASSET_PROMPTS.md
    └── ASSET_SPECIFICATION.md
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Ethers.js v6** - Blockchain interaction library
- **Phaser 3** - HTML5 game engine for real-time combat
- **React Router** - Client-side routing
- **React Context API** - State management

### Backend
- **Node.js 18+** - JavaScript runtime
- **Express** - REST API framework
- **WebSocket (ws)** - Real-time bidirectional communication
- **MongoDB Atlas** - Cloud database for user data
- **Ethers.js v6** - Server-side blockchain interaction
- **TypeScript** - Type safety and better DX
- **JWT** - Authentication tokens

### Smart Contracts
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development and testing framework
- **OpenZeppelin** - Audited security libraries
- **Mantle Network** - Layer-2 blockchain deployment
- **ERC-20** - Fungible token standard (ARENA)
- **ERC-721** - Non-fungible token standard (Characters)

---

## 🔐 Security

### Smart Contracts
- ✅ OpenZeppelin audited contract libraries
- ✅ Server authorization for protected functions
- ✅ Owner-only administrative functions
- ✅ Character rarity enforcement (one mint per type)
- ✅ ReentrancyGuard on all money transfers
- ✅ Pausable emergency stops
- ✅ Daily limits and cooldowns for cash duels
- ✅ Anti-cheat: server-verified battle results

### Backend
- ✅ JWT authentication for user sessions
- ✅ Input validation on all API endpoints
- ✅ Private keys stored in environment variables (never committed)
- ✅ Error handling and comprehensive logging
- ✅ Rate limiting on sensitive endpoints
- ✅ CORS configured for production

### Frontend
- ✅ MetaMask wallet connection
- ✅ Network validation (Mantle Sepolia)
- ✅ Transaction confirmation prompts
- ✅ Token approval flows
- ✅ Input sanitization
- ✅ Error boundaries for crash recovery

### Cash Duel Protection
- ✅ Maximum 10 duels per day per player
- ✅ 5-minute cooldown between duels
- ✅ Emergency withdrawal for stuck funds
- ✅ Banned player tracking
- ✅ Server-only result completion
- ✅ Automatic refunds on cancellation

---

## 📊 Gas Estimates (Mantle Sepolia)

| Operation | Estimated Gas Cost |
|-----------|-------------------|
| Mint Character NFT | ~0.001 MNT |
| Create Cash Duel | Entry Fee (2/10/20 MNT) + ~0.0003 MNT gas |
| Join Cash Duel | Entry Fee + ~0.0003 MNT gas |
| Record Match Result | ~0.0005 MNT (server pays) |
| Buy from Marketplace | ~0.0008 MNT |
| Purchase Season Pass | ~0.0007 MNT |
| Register for Tournament | ~0.0006 MNT |

**Note:** Mantle Network offers significantly lower gas fees compared to Ethereum mainnet.

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Character NFT minting with dynamic stats
- [x] Match engine with WebSocket real-time multiplayer
- [x] Character rarity system (globally unique types)
- [x] Shop and marketplace with ARENA tokens
- [x] Tournament system with prize pools
- [x] Season pass with multipliers

### Phase 2: Backend Integration ✅
- [x] Blockchain service setup and API
- [x] Server wallet authorization
- [x] Match result recording on-chain
- [x] Cash Duel contract deployment
- [x] Cash Duel backend service
- [x] Real-money betting system

### Phase 3: Current Features 🚀
- [x] Cash Duel UI with tier selection
- [x] Player stats and history tracking
- [x] Daily limits and cooldown enforcement
- [x] Emergency withdrawal system
- [x] Anti-cheat measures
- [ ] Weekly reward distribution UI
- [ ] Leaderboard integration

### Phase 4: Enhancement 📋
- [ ] Tournament bracket automation
- [ ] Advanced character abilities
- [ ] Mobile responsive design
- [ ] More cash duel tiers
- [ ] Referral system
- [ ] Achievement badges

### Phase 5: Mainnet Launch 🎯
- [ ] Full security audit of all contracts
- [ ] Deploy to Mantle Mainnet
- [ ] Production infrastructure setup
- [ ] Community testing period
- [ ] Marketing campaign
- [ ] Official launch

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
- Check [backend/BLOCKCHAIN_INTEGRATION.md](backend/BLOCKCHAIN_INTEGRATION.md) for blockchain setup
- See [backend/SERVER_AUTHORIZATION.md](backend/SERVER_AUTHORIZATION.md) for server wallet auth
- Review contract documentation in [contracts/README.md](contracts/README.md)

**Common Issues:**
- **"Wrong network"** - Switch MetaMask to Mantle Sepolia (Chain ID: 5003)
- **"Insufficient funds"** - Get MNT from [faucet](https://faucet.sepolia.mantle.xyz)
- **"Transaction failed"** - Check gas limits and wallet balance
- **"Character type unavailable"** - That character was already minted globally
- **"Daily limit reached"** - Wait until next day for more cash duels

---

**Ready to battle? Join DuelCraft and become a blockchain champion!** ⚔️🎮💰

---

*Last updated: January 15, 2026*
