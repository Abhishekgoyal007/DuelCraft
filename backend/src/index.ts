// backend/src/index.ts
import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { createMatchEngine, MatchEngine } from "./matchEngine";
import cors from "cors";
import bodyParser from "body-parser";
import authRouter from "./auth";
import { connectDB, isDBConnected } from "./db/connection";
import { Player, ShopItem, MatchHistory } from "./db/models";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRouter);   

// Simple CORS for local dev (fixed variable names)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const PORT = Number(process.env.PORT || 4000);

// health route
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now(), db: isDBConnected() }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let matchEngine: MatchEngine;

// =====================
// PROFILE ENDPOINTS (MongoDB)
// =====================

// Get profile
app.get("/profile", async (req, res) => {
  try {
    const address = ((req.query.address as string) || "").toLowerCase();
    if (!address) return res.status(400).json({ error: "address required" });
    
    if (!isDBConnected()) {
      // Fallback: return empty profile if no DB
      return res.json({ ok: true, avatar: null, coins: 100 });
    }
    
    let player = await Player.findOne({ walletAddress: address });
    
    // Auto-create player if not exists
    if (!player) {
      player = await Player.create({ walletAddress: address });
    }
    
    return res.json({ 
      ok: true, 
      avatar: player.avatar,
      coins: player.coins,
      stats: player.stats,
      ownedSkins: player.ownedSkins
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Save/update profile
app.post("/profile", async (req, res) => {
  try {
    const { address, avatar } = req.body;
    if (!address) return res.status(400).json({ error: "address required" });
    
    const walletAddress = address.toLowerCase();
    
    if (!isDBConnected()) {
      // Fallback: just acknowledge if no DB
      return res.json({ ok: true, avatar });
    }
    
    const player = await Player.findOneAndUpdate(
      { walletAddress },
      { $set: { avatar } },
      { upsert: true, new: true }
    );
    
    return res.json({ 
      ok: true, 
      avatar: player.avatar,
      coins: player.coins 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// =====================
// SHOP ENDPOINTS
// =====================

// Get shop catalog
app.get("/shop", async (req, res) => {
  try {
    if (!isDBConnected()) {
      // Return default items if no DB
      return res.json({ ok: true, items: getDefaultShopItems() });
    }
    
    const items = await ShopItem.find({ isActive: true }).sort({ price: 1 });
    return res.json({ ok: true, items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Purchase item (SERVER VALIDATES - don't trust client!)
app.post("/shop/purchase", async (req, res) => {
  try {
    const { address, itemId } = req.body;
    if (!address || !itemId) {
      return res.status(400).json({ error: "address and itemId required" });
    }
    
    const walletAddress = address.toLowerCase();
    
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database unavailable" });
    }
    
    // Get player and item
    const player = await Player.findOne({ walletAddress });
    if (!player) {
      return res.status(404).json({ error: "player not found" });
    }
    
    const item = await ShopItem.findOne({ itemId, isActive: true });
    if (!item) {
      return res.status(404).json({ error: "item not found" });
    }
    
    // Check if already owned
    if (player.ownedSkins.includes(itemId)) {
      return res.status(400).json({ error: "item already owned" });
    }
    
    // Check limited stock
    if (item.limitedStock != null && item.soldCount >= item.limitedStock) {
      return res.status(400).json({ error: "item out of stock" });
    }
    
    // SERVER VALIDATES: Check coins balance
    if (player.coins < item.price) {
      return res.status(400).json({ error: "insufficient coins", required: item.price, current: player.coins });
    }
    
    // Deduct coins and add item
    player.coins -= item.price;
    player.ownedSkins.push(itemId);
    player.purchases.push({
      itemId,
      purchasedAt: new Date(),
      price: item.price
    });
    await player.save();
    
    // Update sold count
    item.soldCount += 1;
    await item.save();
    
    console.log(`[Shop] ${walletAddress} purchased ${itemId} for ${item.price} coins`);
    
    return res.json({ 
      ok: true, 
      purchase: { itemId, price: item.price },
      newBalance: player.coins,
      ownedSkins: player.ownedSkins
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// =====================
// LEADERBOARD ENDPOINTS
// =====================

app.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    if (!isDBConnected()) {
      return res.json({ ok: true, leaderboard: [] });
    }
    
    // Aggregate wins by player
    const leaderboard = await Player.find()
      .sort({ "stats.wins": -1, "stats.totalMatches": -1 })
      .limit(limit)
      .select("walletAddress stats avatar");
    
    return res.json({ 
      ok: true, 
      leaderboard: leaderboard.map((p, idx) => ({
        rank: idx + 1,
        address: p.walletAddress,
        wins: p.stats.wins,
        losses: p.stats.losses,
        totalMatches: p.stats.totalMatches,
        winRate: p.stats.totalMatches > 0 ? (p.stats.wins / p.stats.totalMatches * 100).toFixed(1) : 0,
        avatar: p.avatar
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Get match history for a player
app.get("/matches", async (req, res) => {
  try {
    const address = ((req.query.address as string) || "").toLowerCase();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    if (!address) return res.status(400).json({ error: "address required" });
    
    if (!isDBConnected()) {
      return res.json({ ok: true, matches: [] });
    }
    
    const matches = await MatchHistory.find({
      "players.walletAddress": address
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return res.json({ ok: true, matches });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// =====================
// WALLET AUTH ENDPOINTS
// =====================

// Get nonce for wallet signature
app.get("/auth/nonce", async (req, res) => {
  try {
    const address = ((req.query.address as string) || "").toLowerCase();
    if (!address) return res.status(400).json({ error: "address required" });
    
    if (!isDBConnected()) {
      // Generate random nonce without DB
      const nonce = Math.random().toString(36).substring(2, 15);
      return res.json({ ok: true, nonce, message: `Sign this message to verify your wallet: ${nonce}` });
    }
    
    // Find or create player, return their nonce
    let player = await Player.findOne({ walletAddress: address });
    if (!player) {
      player = await Player.create({ walletAddress: address });
    }
    
    return res.json({ 
      ok: true, 
      nonce: player.nonce,
      message: `Sign this message to verify your wallet ownership for DuelCraft: ${player.nonce}`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Verify wallet signature
app.post("/auth/verify", async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      return res.status(400).json({ error: "address and signature required" });
    }
    
    const walletAddress = address.toLowerCase();
    
    if (!isDBConnected()) {
      // Can't verify without DB, just acknowledge
      return res.json({ ok: true, verified: false, message: "DB unavailable" });
    }
    
    const player = await Player.findOne({ walletAddress });
    if (!player) {
      return res.status(404).json({ error: "player not found" });
    }
    
    // Verify signature using ethers
    const { ethers } = await import("ethers");
    const message = `Sign this message to verify your wallet ownership for DuelCraft: ${player.nonce}`;
    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress) {
        return res.status(401).json({ error: "signature verification failed" });
      }
    } catch {
      return res.status(401).json({ error: "invalid signature" });
    }
    
    // Regenerate nonce after successful verification (prevents replay)
    player.nonce = Math.random().toString(36).substring(2, 15);
    await player.save();
    
    console.log(`[Auth] Wallet verified: ${walletAddress}`);
    
    return res.json({ ok: true, verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// =====================
// DEFAULT SHOP ITEMS (fallback)
// =====================
function getDefaultShopItems() {
  return [
    { itemId: "skin_gold", name: "Golden Warrior", type: "skin", price: 50, rarity: "rare", metadata: { color: "#FFD700" } },
    { itemId: "skin_purple", name: "Purple Haze", type: "skin", price: 30, rarity: "uncommon", metadata: { color: "#9B59B6" } },
    { itemId: "skin_fire", name: "Fire Spirit", type: "skin", price: 100, rarity: "epic", metadata: { color: "#E74C3C" } },
    { itemId: "skin_ice", name: "Ice Crystal", type: "skin", price: 75, rarity: "rare", metadata: { color: "#3498DB" } },
    { itemId: "face_cool", name: "Cool Shades", type: "face", price: 25, rarity: "common", metadata: { face: "😎" } },
  ];
}

// =====================
// SEED SHOP ITEMS (run once)
// =====================
async function seedShopItems() {
  if (!isDBConnected()) return;
  
  const existingCount = await ShopItem.countDocuments();
  if (existingCount > 0) return; // Already seeded
  
  const defaultItems = getDefaultShopItems().map(item => ({
    ...item,
    description: `A ${item.rarity} ${item.type}`,
    category: item.type,
    isActive: true,
    isNFT: false,
    soldCount: 0
  }));
  
  await ShopItem.insertMany(defaultItems);
  console.log("[DB] Seeded default shop items");
}

// =====================
// STARTUP
// =====================
// STARTUP
// =====================

wss.on("connection", (socket, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log("WS connection from", clientIp);

  // Wait for matchEngine to be ready
  if (!matchEngine) {
    console.warn("matchEngine not ready, closing connection");
    socket.close();
    return;
  }

  matchEngine.registerClient(socket);

  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      matchEngine.handleMessage(socket, msg);
    } catch (err) {
      console.warn("Invalid message", err);
    }
  });

  socket.on("close", () => {
    if (matchEngine) matchEngine.unregisterClient(socket);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

// Start server and initialize
(async () => {
  // Connect to MongoDB
  await connectDB();
  
  // Seed default shop items
  await seedShopItems();
  
  // Initialize match engine
  matchEngine = await createMatchEngine(wss);
  
  // Start listening AFTER everything is ready
  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint ws://localhost:${PORT}/ws`);
  });
})().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
