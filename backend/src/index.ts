// backend/src/index.ts
import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { createMatchEngine, MatchEngine } from "./matchEngine";

dotenv.config();

const app = express();
app.use(express.json());

// Simple CORS for local dev (fixed variable names)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const PORT = Number(process.env.PORT || 4000);

// health route
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let matchEngine: MatchEngine;
(async () => {
  matchEngine = await createMatchEngine(wss);
})().catch((err) => {
  console.error("Failed to start match engine:", err);
  process.exit(1);
});

wss.on("connection", (socket, req) => {
  // simple client id for debug
  const clientIp = req.socket.remoteAddress;
  console.log("WS connection from", clientIp);

  // register socket with matchEngine
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
    matchEngine.unregisterClient(socket);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint ws://localhost:${PORT}/ws`);
});
