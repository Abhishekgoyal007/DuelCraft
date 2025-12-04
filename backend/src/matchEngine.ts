// backend/src/matchEngine.ts
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

export type Client = {
  id: string;
  socket: WebSocket;
  lastSeen: number;
  status: "idle" | "in_match";
  meta?: any;
};

export type Match = {
  id: string;
  players: [Client, Client];
  state: any;
  tick: number;
};

export class MatchEngine {
  wss: WebSocket.Server;
  clients: Map<string, Client> = new Map();
  queue: string[] = [];
  matches: Map<string, Match> = new Map();
  tickIntervalMs = 100; // 10 ticks per second

  constructor(wss: WebSocket.Server) {
    this.wss = wss;
    setInterval(() => this.tick(), this.tickIntervalMs);
  }

  registerClient(socket: WebSocket) {
    const id = uuidv4();
    const client: Client = { id, socket, lastSeen: Date.now(), status: "idle" };
    (socket as any).__clientId = id;
    this.clients.set(id, client);
    console.log(`[matchEngine] client registered: ${id} (total clients: ${this.clients.size})`);

    // send welcome
    socket.send(JSON.stringify({ type: "welcome", id }));
  }

  unregisterClient(socket: WebSocket) {
    const id = (socket as any).__clientId;
    if (!id) return;
    this.clients.delete(id);
    const qpos = this.queue.indexOf(id);
    if (qpos >= 0) this.queue.splice(qpos, 1);
    console.log(`[matchEngine] client unregistered: ${id}`);
    // TODO: handle match removal if player was in a match
  }

  handleMessage(socket: WebSocket, msg: any) {
    const id = (socket as any).__clientId;
    const client = this.clients.get(id);
    if (!client) return;

    client.lastSeen = Date.now();

    // LOG the incoming message for debugging
    try {
      console.log(`[matchEngine] received from ${id}:`, msg);
    } catch (e) {
      console.log("[matchEngine] received malformed message");
    }

    switch (msg.type) {
      case "join_queue":
        this.enqueueClient(client);
        break;
      case "create_private":
        this.createPrivateMatch(client, msg.opponentId);
        break;
      case "input":
        this.onClientInput(client, msg);
        break;
      default:
        socket.send(JSON.stringify({ type: "error", message: "unknown type" }));
    }
  }

  enqueueClient(client: Client) {
    if (client.status !== "idle") return;
    if (!this.queue.includes(client.id)) this.queue.push(client.id);
    console.log(`[matchEngine] enqueue: ${client.id}. queue length=${this.queue.length}`);
    this.tryMatchFromQueue();
  }

  tryMatchFromQueue() {
    while (this.queue.length >= 2) {
      const a = this.queue.shift()!;
      const b = this.queue.shift()!;
      const ca = this.clients.get(a);
      const cb = this.clients.get(b);
      if (!ca || !cb) continue;
      this.createMatch(ca, cb);
    }
  }

  createPrivateMatch(client: Client, opponentId?: string) {
    if (!opponentId) return;
    const opp = this.clients.get(opponentId);
    if (!opp) {
      client.socket.send(JSON.stringify({ type: "error", message: "opponent not found" }));
      return;
    }
    this.createMatch(client, opp);
  }

  createMatch(a: Client, b: Client) {
    a.status = "in_match";
    b.status = "in_match";
    const id = uuidv4();
    const match: Match = { id, players: [a, b], state: this.initialState(), tick: 0 };
    this.matches.set(id, match);
    console.log(`[matchEngine] match created ${id} between ${a.id} and ${b.id}`);

    // notify players
    const payload = { type: "match_start", matchId: id, players: [a.id, b.id], state: match.state };
    a.socket.send(JSON.stringify(payload));
    b.socket.send(JSON.stringify(payload));
  }

  initialState() {
    return {
      arena: { width: 800, height: 300 },
      players: {}
    };
  }

  onClientInput(client: Client, msg: any) {
    // store inputs for server tick loop in a future impl
    client.socket.send(JSON.stringify({ type: "input_ack", tick: msg.tick || 0 }));
  }

  tick() {
    for (const [id, match] of this.matches.entries()) {
      match.tick += 1;
      const update = { type: "state", matchId: id, tick: match.tick, state: match.state };
      for (const p of match.players) {
        try {
          p.socket.send(JSON.stringify(update));
        } catch (err) {
          console.warn("Failed to send update to", p.id, err);
        }
      }
    }
  }
}

export async function createMatchEngine(wss: WebSocket.Server): Promise<MatchEngine> {
  return new MatchEngine(wss);
}
