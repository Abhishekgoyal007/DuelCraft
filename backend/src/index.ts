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
import { Player, ShopItem, MatchHistory, Asset } from "./db/models";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRouter);

// Optional blockchain routes - only load if available
try {
  const blockchainRouter = require("./blockchain").default;
  app.use("/api/blockchain", blockchainRouter);
  console.log("✅ Blockchain routes loaded");
} catch (err) {
  console.log("⚠️  Blockchain routes not available (optional)");
}

// Cash Duel routes
try {
  const cashDuelRouter = require("./routes/cashDuel").default;
  app.use("/api/cash-duel", cashDuelRouter);
  console.log("✅ Cash Duel routes loaded");
} catch (err) {
  console.log("⚠️  Cash Duel routes not available:", err);
}   

// Simple CORS for local dev (fixed variable names)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const PORT = Number(process.env.PORT || 4000);

// health route
app.get("/health", (_req, res) => {
  const dbConnected = isDBConnected();
  console.log("[Health] Check: DB connected =", dbConnected);
  return res.json({ ok: true, ts: Date.now(), db: dbConnected });
});

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
    if (!address) {
      console.log("[Profile] GET: Missing address");
      return res.status(400).json({ error: "address required" });
    }
    
    console.log("[Profile] GET: Fetching profile for", address);
    
    if (!isDBConnected()) {
      console.log("[Profile] GET: DB not connected, returning defaults");
      // Fallback: return default profile if no DB
      return res.json({ 
        ok: true, 
        avatar: null, 
        coins: 100,
        stats: { wins: 0, losses: 0, totalMatches: 0 },
        selectedCharacter: null,
        ownedSkins: [],
        equipped: {},
        ownedAssets: []
      });
    }
    
    let player = await Player.findOne({ walletAddress: address });
    
    // Auto-create player if not exists
    if (!player) {
      console.log("[Profile] GET: Player not found, creating new player");
      player = await Player.create({ 
        walletAddress: address,
        coins: 100,
        stats: { wins: 0, losses: 0, totalMatches: 0 }
      });
    }
    
    const response = { 
      ok: true, 
      avatar: player.avatar,
      coins: player.coins || 100,
      stats: player.stats || { wins: 0, losses: 0, totalMatches: 0 },
      ownedSkins: player.ownedSkins || [],
      equipped: player.equipped || {},
      ownedAssets: player.ownedAssets || [],
      selectedCharacter: player.selectedCharacter || null
    };
    
    console.log("[Profile] GET: Returning data:", {
      address,
      coins: response.coins,
      stats: response.stats,
      selectedCharacter: response.selectedCharacter
    });
    
    return res.json(response);
  } catch (err) {
    console.error("[Profile] GET: Error:", err);
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
// AVATAR ENDPOINTS (for cosmetic layering system)
// =====================

// Get player avatar cosmetics
app.get("/api/player/:wallet/avatar", async (req, res) => {
  try {
    const wallet = (req.params.wallet || "").toLowerCase();
    if (!wallet) return res.status(400).json({ error: "wallet required" });
    
    if (!isDBConnected()) {
      return res.json({ ok: true, avatar: null, equipped: null });
    }
    
    const player = await Player.findOne({ walletAddress: wallet });
    if (!player) {
      return res.json({ ok: true, avatar: null, equipped: null });
    }
    
    return res.json({
      ok: true,
      wallet: player.walletAddress,
      avatar: player.avatar,
      equipped: player.equipped
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Save player avatar cosmetics
app.post("/api/player/:wallet/avatar", async (req, res) => {
  try {
    const wallet = (req.params.wallet || "").toLowerCase();
    const { avatar } = req.body;
    
    if (!wallet) return res.status(400).json({ error: "wallet required" });
    
    if (!isDBConnected()) {
      return res.json({ ok: true, avatar });
    }
    
    // Update both avatar and equipped fields
    const updateData: any = {};
    if (avatar) {
      updateData.avatar = avatar;
      updateData.equipped = avatar; // Keep equipped in sync
    }
    
    const player = await Player.findOneAndUpdate(
      { walletAddress: wallet },
      { $set: updateData },
      { upsert: true, new: true }
    );
    
    console.log(`[Avatar] Saved avatar for ${wallet}:`, Object.keys(avatar || {}));
    
    return res.json({
      ok: true,
      wallet: player.walletAddress,
      avatar: player.avatar,
      equipped: player.equipped
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Update equipped cosmetics (alternate endpoint)
app.post("/profile/equip", async (req, res) => {
  try {
    const { address, equipped } = req.body;
    if (!address) return res.status(400).json({ error: "address required" });
    
    const walletAddress = address.toLowerCase();
    
    if (!isDBConnected()) {
      return res.json({ ok: true, equipped });
    }
    
    const player = await Player.findOneAndUpdate(
      { walletAddress },
      { $set: { equipped } },
      { upsert: true, new: true }
    );
    
    console.log(`[Profile] Updated equipped for ${walletAddress}`);
    
    return res.json({
      ok: true,
      equipped: player.equipped
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
// ASSET ENDPOINTS
// =====================

// Get all assets (optionally filtered by category)
// Now scans the filesystem for real images in /assets/* folders
app.get("/api/assets", async (req, res) => {
  try {
    const { category } = req.query;
    const fs = require('fs');
    const path = require('path');
    
    // Base path for assets in frontend public folder
    const assetsBasePath = path.join(__dirname, '../../frontend/public/assets');
    
    const allAssets: any[] = [];
    
    // Define categories and their folder paths
    const categoryFolders = [
      { id: 'body', folder: 'body' },
      { id: 'hair', folder: 'hair' },
      { id: 'eyes', folder: 'eyes' },
      { id: 'mouth', folder: 'mouth' },
      { id: 'tops', folder: 'tops' },
      { id: 'bottoms', folder: 'bottoms' },
      { id: 'shoes', folder: 'shoes' },
      { id: 'accessory', folder: 'accessory' },
      { id: 'effect', folder: 'effect' },
      { id: 'background', folder: 'background' },
    ];
    
    // Scan each category folder
    for (const cat of categoryFolders) {
      const folderPath = path.join(assetsBasePath, cat.folder);
      
      // Skip if folder doesn't exist
      if (!fs.existsSync(folderPath)) continue;
      
      // Skip if filtering by category and this isn't it
      if (category && cat.id !== category) continue;
      
      // Read all files in the folder
      const files = fs.readdirSync(folderPath);
      
      // Filter for image files only
      const imageFiles = files.filter((file: string) => 
        /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
      );
      
      // Create asset objects for each image
      imageFiles.forEach((file: string, index: number) => {
        const fileNameWithoutExt = path.parse(file).name;
        const assetId = `${cat.id}_${fileNameWithoutExt}`;
        
        allAssets.push({
          assetId,
          category: cat.id,
          name: fileNameWithoutExt.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: `${cat.id} asset`,
          url: `/assets/${cat.folder}/${file}`,
          price: 0,
          rarity: 'common',
          isDefault: true,
          isActive: true,
          sortOrder: index,
          metadata: { style: 'custom' }
        });
      });
    }
    
    return res.json({ ok: true, assets: allAssets });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Get a single asset by ID
app.get("/api/assets/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;
    
    if (!isDBConnected()) {
      const defaultAsset = getDefaultAssets().find(a => a.assetId === assetId);
      if (defaultAsset) return res.json({ ok: true, asset: defaultAsset });
      return res.status(404).json({ error: "asset not found" });
    }
    
    const asset = await Asset.findOne({ assetId });
    if (!asset) return res.status(404).json({ error: "asset not found" });
    
    return res.json({ ok: true, asset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Reseed assets (admin endpoint - clears and reseeds all assets)
app.post("/api/assets/reseed", async (req, res) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database not connected" });
    }
    
    // Clear all existing assets
    await Asset.deleteMany({});
    console.log("[DB] Cleared all assets");
    
    // Reseed with default assets
    const defaultAssets = getDefaultAssets().map(asset => ({
      ...asset,
      isActive: true,
      layerIndex: asset.sortOrder || 0,
    }));
    
    await Asset.insertMany(defaultAssets);
    console.log(`[DB] Reseeded ${defaultAssets.length} default assets`);
    
    return res.json({ ok: true, message: `Reseeded ${defaultAssets.length} assets` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Create a new asset (admin endpoint)
app.post("/api/assets", async (req, res) => {
  try {
    const { assetId, category, name, description, url, price, rarity, isDefault } = req.body;
    
    if (!assetId || !category || !name || !url) {
      return res.status(400).json({ error: "assetId, category, name, and url are required" });
    }
    
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database unavailable" });
    }
    
    // Check if asset already exists
    const existing = await Asset.findOne({ assetId });
    if (existing) {
      return res.status(400).json({ error: "asset with this ID already exists" });
    }
    
    const newAsset = new Asset({
      assetId,
      category,
      name,
      description: description || "",
      url,
      price: price || 0,
      rarity: rarity || "common",
      isDefault: isDefault ?? false,
      isActive: true,
      layerIndex: 0,
    });
    
    await newAsset.save();
    console.log(`[Assets] Created new asset: ${assetId}`);
    
    return res.json({ ok: true, asset: newAsset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Equip assets for a player
app.post("/api/player/:address/equip", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { equipped } = req.body; // { body: 'assetId', hair: 'assetId', ... }
    
    if (!equipped || typeof equipped !== 'object') {
      return res.status(400).json({ error: "equipped object required" });
    }
    
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database unavailable" });
    }
    
    const player = await Player.findOne({ walletAddress: address });
    if (!player) {
      return res.status(404).json({ error: "player not found" });
    }
    
    // Validate that player owns or can use the assets
    const validCategories = ["body", "hair", "eyes", "tops", "bottoms", "shoes", "effect"];
    const updates: any = {};
    
    for (const [category, assetId] of Object.entries(equipped)) {
      if (!validCategories.includes(category)) continue;
      if (!assetId) {
        updates[`equipped.${category}`] = null;
        continue;
      }
      
      // Check if asset exists and player can use it
      const asset = await Asset.findOne({ assetId: assetId as string, category });
      if (!asset) {
        return res.status(400).json({ error: `Invalid asset: ${assetId}` });
      }
      
      // Check ownership (default assets are free, others need to be owned)
      if (!asset.isDefault && !player.ownedAssets.includes(assetId as string)) {
        return res.status(400).json({ error: `You don't own asset: ${asset.name}` });
      }
      
      updates[`equipped.${category}`] = assetId;
    }
    
    // Apply updates
    const updatedPlayer = await Player.findOneAndUpdate(
      { walletAddress: address },
      { $set: updates },
      { new: true }
    );
    
    console.log(`[Assets] Player ${address} equipped:`, equipped);
    
    return res.json({ 
      ok: true, 
      equipped: updatedPlayer?.equipped 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Select a pre-made character
app.post("/api/player/:address/select-character", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: "characterId required" });
    }
    
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database unavailable" });
    }
    
    const player = await Player.findOne({ walletAddress: address });
    if (!player) {
      return res.status(404).json({ error: "player not found" });
    }
    
    // Save selected character
    player.selectedCharacter = characterId;
    await player.save();
    
    console.log(`[Character] Player ${address} selected character: ${characterId}`);
    
    return res.json({ 
      ok: true, 
      selectedCharacter: characterId 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// Buy an asset
app.post("/api/assets/buy", async (req, res) => {
  try {
    const { address, assetId } = req.body;
    
    if (!address || !assetId) {
      return res.status(400).json({ error: "address and assetId required" });
    }
    
    const walletAddress = address.toLowerCase();
    
    if (!isDBConnected()) {
      return res.status(503).json({ error: "database unavailable" });
    }
    
    const player = await Player.findOne({ walletAddress });
    if (!player) {
      return res.status(404).json({ error: "player not found" });
    }
    
    const asset = await Asset.findOne({ assetId, isActive: true });
    if (!asset) {
      return res.status(404).json({ error: "asset not found" });
    }
    
    // Check if already owned
    if (player.ownedAssets.includes(assetId)) {
      return res.status(400).json({ error: "asset already owned" });
    }
    
    // Check if it's a default asset (free)
    if (asset.isDefault) {
      return res.status(400).json({ error: "this asset is free and doesn't need to be purchased" });
    }
    
    // Check coins
    if (player.coins < asset.price) {
      return res.status(400).json({ 
        error: "insufficient coins", 
        required: asset.price, 
        current: player.coins 
      });
    }
    
    // Deduct coins and add asset
    player.coins -= asset.price;
    player.ownedAssets.push(assetId);
    player.purchases.push({
      itemId: assetId,
      purchasedAt: new Date(),
      price: asset.price
    });
    await player.save();
    
    console.log(`[Assets] ${walletAddress} purchased ${assetId} for ${asset.price} coins`);
    
    return res.json({ 
      ok: true, 
      asset: { assetId: asset.assetId, name: asset.name },
      newBalance: player.coins,
      ownedAssets: player.ownedAssets
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
      .select("walletAddress stats avatar coins");
    
    return res.json({ 
      ok: true, 
      leaderboard: leaderboard.map((p, idx) => ({
        rank: idx + 1,
        address: p.walletAddress,
        wins: p.stats.wins,
        losses: p.stats.losses,
        totalMatches: p.stats.totalMatches,
        winRate: p.stats.totalMatches > 0 ? (p.stats.wins / p.stats.totalMatches * 100).toFixed(1) : 0,
        avatar: p.avatar,
        coins: p.coins
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
    
    if (!address) {
      console.log("[Matches] GET: Missing address");
      return res.status(400).json({ error: "address required" });
    }
    
    console.log("[Matches] GET: Fetching match history for", address, "limit:", limit);
    
    if (!isDBConnected()) {
      console.log("[Matches] GET: DB not connected, returning empty array");
      return res.json({ ok: true, matches: [] });
    }
    
    const matches = await MatchHistory.find({
      "players.walletAddress": address
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    console.log("[Matches] GET: Found", matches.length, "matches for", address);
    
    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("[Matches] GET: Error:", err);
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
    // Hair styles
    { itemId: "hair_spiky", name: "Spiky Hair", type: "skin", category: "hair", price: 50, rarity: "uncommon", metadata: { preview: "⚡" } },
    { itemId: "hair_mohawk", name: "Mohawk", type: "skin", category: "hair", price: 75, rarity: "rare", metadata: { preview: "🦅" } },
    { itemId: "hair_curly", name: "Curly Hair", type: "skin", category: "hair", price: 60, rarity: "uncommon", metadata: { preview: "🦱" } },
    
    // Tops
    { itemId: "top_armor", name: "Battle Armor", type: "skin", category: "tops", price: 100, rarity: "epic", metadata: { preview: "🛡️" } },
    { itemId: "top_hoodie", name: "Cool Hoodie", type: "skin", category: "tops", price: 40, rarity: "common", metadata: { preview: "🧥" } },
    
    // Effects
    { itemId: "effect_fire", name: "Fire Aura", type: "effect", category: "effects", price: 200, rarity: "epic", metadata: { preview: "🔥" } },
    { itemId: "effect_ice", name: "Ice Trail", type: "effect", category: "effects", price: 200, rarity: "epic", metadata: { preview: "❄️" } },
    { itemId: "effect_lightning", name: "Lightning Spark", type: "effect", category: "effects", price: 250, rarity: "legendary", metadata: { preview: "⚡" } },
    
    // Emotes
    { itemId: "emote_dance", name: "Victory Dance", type: "skin", category: "emotes", price: 80, rarity: "rare", metadata: { preview: "💃" } },
    { itemId: "emote_taunt", name: "Taunt", type: "skin", category: "emotes", price: 50, rarity: "uncommon", metadata: { preview: "😤" } },
    { itemId: "emote_wave", name: "Wave", type: "skin", category: "emotes", price: 30, rarity: "common", metadata: { preview: "👋" } },
  ];
}

// =====================
// DEFAULT ASSETS (fallback when DB not connected)
// =====================
function getDefaultAssets(filterCategory?: string) {
  const BASE_URL = "/assets/characters"; // Will be replaced with actual CDN URLs
  
  const assets = [
    // ===== COMPLETE CHARACTER SKINS (Full body replacements) =====
    { assetId: "skin_knight_warrior", category: "body", name: "Knight Warrior", description: "Armored knight with sword and shield", url: `${BASE_URL}/knight_warrior.png`, price: 0, rarity: "legendary", isDefault: true, sortOrder: -1, metadata: { color: "#4CAF50", style: "pixel", fullSkin: true } },
    
    // ===== DEFAULT BODY TYPES (FREE) =====
    { assetId: "body_default", category: "body", name: "Default Body", description: "Standard fighter body", url: `${BASE_URL}/body_default.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { color: "#FFDBB5", style: "pixel" } },
    { assetId: "body_athletic", category: "body", name: "Athletic Body", description: "Muscular build", url: `${BASE_URL}/body_athletic.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 1, metadata: { color: "#FFDBB5", style: "pixel" } },
    { assetId: "body_slim", category: "body", name: "Slim Body", description: "Agile fighter", url: `${BASE_URL}/body_slim.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 2, metadata: { color: "#FFDBB5", style: "pixel" } },
    
    // ===== PREMIUM BODY TYPES =====
    { assetId: "body_robot", category: "body", name: "Robot Body", description: "Mechanical warrior", url: `${BASE_URL}/body_robot.png`, price: 150, rarity: "epic", isDefault: false, sortOrder: 10, metadata: { color: "#808080", style: "pixel" } },
    { assetId: "body_skeleton", category: "body", name: "Skeleton", description: "Bone fighter", url: `${BASE_URL}/body_skeleton.png`, price: 200, rarity: "epic", isDefault: false, sortOrder: 11, metadata: { color: "#FFFFFF", style: "pixel" } },
    { assetId: "body_elemental", category: "body", name: "Fire Elemental", description: "Made of flames", url: `${BASE_URL}/body_elemental.png`, price: 300, rarity: "legendary", isDefault: false, sortOrder: 12, metadata: { color: "#FF4500", style: "pixel" } },
    
    // ===== DEFAULT HAIR STYLES (FREE) =====
    { assetId: "hair_default", category: "hair", name: "Short Hair", description: "Classic short style", url: `${BASE_URL}/hair_default.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { color: "#3A3A3A", style: "pixel" } },
    { assetId: "hair_bald", category: "hair", name: "Bald", description: "Clean look", url: `${BASE_URL}/hair_bald.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 1, metadata: { color: "#FFDBB5", style: "pixel" } },
    { assetId: "hair_long", category: "hair", name: "Long Hair", description: "Flowing locks", url: `${BASE_URL}/hair_long.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 2, metadata: { color: "#3A3A3A", style: "pixel" } },
    
    // ===== PREMIUM HAIR STYLES =====
    { assetId: "hair_spiky", category: "hair", name: "Spiky Hair", description: "Anime protagonist vibes", url: `${BASE_URL}/hair_spiky.png`, price: 50, rarity: "uncommon", isDefault: false, sortOrder: 10, metadata: { color: "#FFD700", style: "pixel" } },
    { assetId: "hair_mohawk", category: "hair", name: "Mohawk", description: "Punk warrior style", url: `${BASE_URL}/hair_mohawk.png`, price: 75, rarity: "rare", isDefault: false, sortOrder: 11, metadata: { color: "#FF1493", style: "pixel" } },
    { assetId: "hair_flame", category: "hair", name: "Flame Hair", description: "Your hair is on fire!", url: `${BASE_URL}/hair_flame.png`, price: 200, rarity: "epic", isDefault: false, sortOrder: 12, metadata: { color: "#FF4500", style: "pixel" } },
    
    // ===== DEFAULT EYES (FREE) =====
    { assetId: "eyes_default", category: "eyes", name: "Normal Eyes", description: "Standard eyes", url: `${BASE_URL}/eyes_default.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { style: "pixel" } },
    { assetId: "eyes1", category: "eyes", name: "Eyes Style 1", description: "Cool eye style", url: `/assets/eyes/eyes1.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 1, metadata: { style: "pixel" } },
    { assetId: "eyes2", category: "eyes", name: "Eyes Style 2", description: "Awesome eye style", url: `/assets/eyes/eyes2.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 2, metadata: { style: "pixel" } },
    { assetId: "eyes_angry", category: "eyes", name: "Angry Eyes", description: "Intimidating stare", url: `${BASE_URL}/eyes_angry.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 3, metadata: { style: "pixel" } },
    { assetId: "eyes_happy", category: "eyes", name: "Happy Eyes", description: "Cheerful look", url: `${BASE_URL}/eyes_happy.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 4, metadata: { style: "pixel" } },
    
    // ===== PREMIUM EYES =====
    { assetId: "eyes_cyber", category: "eyes", name: "Cyber Eyes", description: "Glowing tech eyes", url: `${BASE_URL}/eyes_cyber.png`, price: 80, rarity: "rare", isDefault: false, sortOrder: 10, metadata: { color: "#00FFFF", style: "pixel" } },
    { assetId: "eyes_demon", category: "eyes", name: "Demon Eyes", description: "Fiery red gaze", url: `${BASE_URL}/eyes_demon.png`, price: 120, rarity: "epic", isDefault: false, sortOrder: 11, metadata: { color: "#FF0000", style: "pixel" } },
    
    // ===== DEFAULT TOPS (FREE) =====
    { assetId: "tops_default", category: "tops", name: "Basic Shirt", description: "Simple t-shirt", url: `${BASE_URL}/tops_default.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { color: "#4A90D9", style: "pixel" } },
    { assetId: "tops_tank", category: "tops", name: "Tank Top", description: "Show those arms", url: `${BASE_URL}/tops_tank.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 1, metadata: { color: "#FFFFFF", style: "pixel" } },
    
    // ===== PREMIUM TOPS =====
    { assetId: "tops_armor", category: "tops", name: "Battle Armor", description: "Heavy protection", url: `${BASE_URL}/tops_armor.png`, price: 100, rarity: "epic", isDefault: false, sortOrder: 10, metadata: { color: "#808080", style: "pixel" } },
    { assetId: "tops_hoodie", category: "tops", name: "Cool Hoodie", description: "Street style", url: `${BASE_URL}/tops_hoodie.png`, price: 40, rarity: "common", isDefault: false, sortOrder: 11, metadata: { color: "#333333", style: "pixel" } },
    { assetId: "tops_cape", category: "tops", name: "Hero Cape", description: "Flowing cape", url: `${BASE_URL}/tops_cape.png`, price: 150, rarity: "rare", isDefault: false, sortOrder: 12, metadata: { color: "#DC143C", style: "pixel" } },
    
    // ===== DEFAULT BOTTOMS (FREE) =====
    { assetId: "bottoms_default", category: "bottoms", name: "Basic Pants", description: "Standard pants", url: `${BASE_URL}/bottoms_default.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { color: "#3A5A9A", style: "pixel" } },
    { assetId: "bottoms_shorts", category: "bottoms", name: "Shorts", description: "Light and mobile", url: `${BASE_URL}/bottoms_shorts.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 1, metadata: { color: "#3A5A9A", style: "pixel" } },
    
    // ===== PREMIUM BOTTOMS =====
    { assetId: "bottoms_armor", category: "bottoms", name: "Armored Legs", description: "Protected legs", url: `${BASE_URL}/bottoms_armor.png`, price: 80, rarity: "rare", isDefault: false, sortOrder: 10, metadata: { color: "#808080", style: "pixel" } },
    
    // ===== EFFECTS (All Premium) =====
    { assetId: "effect_fire", category: "effect", name: "Fire Aura", description: "Surrounded by flames", url: `${BASE_URL}/effect_fire.png`, price: 200, rarity: "epic", isDefault: false, sortOrder: 0, metadata: { color: "#FF4500", style: "pixel", animated: true } },
    { assetId: "effect_ice", category: "effect", name: "Ice Crystals", description: "Frozen power", url: `${BASE_URL}/effect_ice.png`, price: 200, rarity: "epic", isDefault: false, sortOrder: 1, metadata: { color: "#00BFFF", style: "pixel", animated: true } },
    { assetId: "effect_lightning", category: "effect", name: "Lightning", description: "Electric energy", url: `${BASE_URL}/effect_lightning.png`, price: 250, rarity: "legendary", isDefault: false, sortOrder: 2, metadata: { color: "#FFD700", style: "pixel", animated: true } },
    { assetId: "effect_shadow", category: "effect", name: "Dark Shadow", description: "Mysterious aura", url: `${BASE_URL}/effect_shadow.png`, price: 180, rarity: "rare", isDefault: false, sortOrder: 3, metadata: { color: "#4B0082", style: "pixel", animated: true } },
    
    // ===== BACKGROUNDS =====
    { assetId: "bg_arena", category: "background", name: "Battle Arena", description: "Classic fighting arena", url: `${BASE_URL}/bg_arena.png`, price: 0, rarity: "common", isDefault: true, sortOrder: 0, metadata: { style: "pixel" } },
    { assetId: "bg_forest", category: "background", name: "Forest", description: "Nature battlefield", url: `${BASE_URL}/bg_forest.png`, price: 50, rarity: "uncommon", isDefault: false, sortOrder: 1, metadata: { style: "pixel" } },
    { assetId: "bg_volcano", category: "background", name: "Volcano", description: "Fiery battleground", url: `${BASE_URL}/bg_volcano.png`, price: 100, rarity: "rare", isDefault: false, sortOrder: 2, metadata: { style: "pixel" } },
  ];
  
  if (filterCategory) {
    return assets.filter(a => a.category === filterCategory);
  }
  return assets;
}

// Seed assets to database on startup
async function seedAssets() {
  if (!isDBConnected()) return;
  
  const existingCount = await Asset.countDocuments();
  if (existingCount > 0) {
    console.log(`[DB] Assets already seeded (${existingCount} assets)`);
    return;
  }
  
  const defaultAssets = getDefaultAssets().map(asset => ({
    ...asset,
    isActive: true,
    layerIndex: asset.sortOrder || 0,
  }));
  
  await Asset.insertMany(defaultAssets);
  console.log(`[DB] Seeded ${defaultAssets.length} default assets`);
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
  
  // Seed default assets
  await seedAssets();
  
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
