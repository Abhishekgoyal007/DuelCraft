// backend/src/auth.ts
import { Router } from "express";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { getAddress } from "ethers";
import { Player } from "./db/models";
import { isDBConnected } from "./db/connection";

const router = Router();

// simple in-memory store: address -> nonce
const nonces: Record<string, string> = {};

// JWT secret (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-please-change";
const JWT_EXPIRES = "7d";

function normalizeAddress(addr?: string) {
  if (!addr) return null;
  try {
    return getAddress(addr); // ethers v6
  } catch (e) {
    return null;
  }
}

// GET /auth/nonce?address=0x...
router.get("/nonce", (req, res) => {
  const address = normalizeAddress(String(req.query.address || ""));
  if (!address) return res.status(400).json({ error: "invalid address" });
  const nonce = randomBytes(16).toString("hex");
  nonces[address] = nonce;
  return res.json({ nonce });
});

// POST /auth/login { address, signature }
router.post("/login", async (req, res) => {
  const { address: rawAddress, signature } = req.body || {};
  const address = normalizeAddress(rawAddress);
  if (!address || !signature) return res.status(400).json({ error: "address+signature required" });

  const nonce = nonces[address];
  if (!nonce) return res.status(400).json({ error: "no nonce for address" });

  const message = `DuelCraft login: ${nonce}`;
  let recovered: string | null = null;
  try {
    // verify signature using ethers v6 helper via verifyMessage dynamic import
    // import here to avoid top-level heavy import if you prefer
    const { verifyMessage } = await import("ethers");
    recovered = verifyMessage(message, signature);
  } catch (e) {
    return res.status(400).json({ error: "signature verification failed" });
  }

  if (recovered && normalizeAddress(recovered) === address) {
    // Ensure player exists in DB (create if not)
    if (isDBConnected()) {
      try {
        const existing = await Player.findOne({ walletAddress: address.toLowerCase() });
        if (!existing) {
          await Player.create({ walletAddress: address.toLowerCase() });
          console.log(`[auth] Created new player: ${address.toLowerCase()}`);
        }
      } catch (err) {
        console.error("[auth] Failed to ensure player exists:", err);
      }
    }
    
    const user = { address, createdAt: Date.now() };
    const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    delete nonces[address];
    return res.json({ token, user });
  } else {
    return res.status(401).json({ error: "invalid signature" });
  }
});

export default router;
