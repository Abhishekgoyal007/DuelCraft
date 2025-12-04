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
  inputs: Record<string, any>; // latest input per player id
  startedAt: number;
};

export class MatchEngine {
  wss: WebSocket.Server;
  clients: Map<string, Client> = new Map();
  queue: string[] = [];
  matches: Map<string, Match> = new Map();
  tickIntervalMs = 100; // 10 ticks/sec
  speed = 220; // horizontal speed px/s
  gravity = 900; // px/s^2
  jumpVel = 360; // initial jump velocity px/s (upwards)
  friction = 0.85;

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

    // welcome payload
    socket.send(JSON.stringify({ type: "welcome", id }));
  }

  unregisterClient(socket: WebSocket) {
    const id = (socket as any).__clientId;
    if (!id) return;
    this.clients.delete(id);
    const qpos = this.queue.indexOf(id);
    if (qpos >= 0) this.queue.splice(qpos, 1);
    console.log(`[matchEngine] client unregistered: ${id}`);
  }

  handleMessage(socket: WebSocket, msg: any) {
    const id = (socket as any).__clientId;
    const client = this.clients.get(id);
    if (!client) return;

    client.lastSeen = Date.now();
    try {
      // For compact log
      console.log(`[matchEngine] received from ${id}:`, msg.type || msg);
    } catch (e) {}

    switch (msg.type) {
      case "join_queue":
        this.enqueueClient(client);
        break;
      case "leave_queue":
        this.leaveQueue(client);
        break;
      case "create_private":
        this.createPrivateMatch(client, msg.opponentId);
        break;
      case "input":
        this.onClientInput(client, msg);
        break;
      case "forfeit":
        this.forfeit(client, msg.matchId);
        break;
      default:
        client.socket.send(JSON.stringify({ type: "error", message: "unknown type" }));
    }
  }

  enqueueClient(client: Client) {
    if (client.status !== "idle") return;
    if (!this.queue.includes(client.id)) this.queue.push(client.id);
    console.log(`[matchEngine] enqueue: ${client.id}. queue length=${this.queue.length}`);
    this.tryMatchFromQueue();
  }

  leaveQueue(client: Client) {
    const idx = this.queue.indexOf(client.id);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      console.log(`[matchEngine] ${client.id} left queue`);
    }
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

    // initial positions (left / right)
    const leftX = 120;
    const rightX = 680;
    const groundY = 250; // y coordinate representing ground level

    const state = {
      arena: { width: 800, height: 300, groundY },
      players: {
        [a.id]: { x: leftX, y: groundY, vx: 0, vy: 0, hp: 100, grounded: true },
        [b.id]: { x: rightX, y: groundY, vx: 0, vy: 0, hp: 100, grounded: true }
      }
    };

    const match: Match = {
      id,
      players: [a, b],
      state,
      tick: 0,
      inputs: {},
      startedAt: Date.now()
    };

    this.matches.set(id, match);
    console.log(`[matchEngine] match created ${id} between ${a.id} and ${b.id}`);

    // notify players
    const payload = { type: "match_start", matchId: id, players: [a.id, b.id], state: match.state };
    this.safeSend(a.socket, payload);
    this.safeSend(b.socket, payload);
  }

  safeSend(sock: WebSocket, payload: any) {
    try {
      sock.send(JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to send payload", err);
    }
  }

  onClientInput(client: Client, msg: any) {
    // msg: { type:'input', matchId, tick, inputs: {left,right,up,dash,...} }
    if (!msg || !msg.matchId) return;
    const match = this.matches.get(msg.matchId);
    if (!match) return;
    // store the latest input for this client (overwrites previous)
    match.inputs[client.id] = msg.inputs || {};
    // acknowledge quickly
    this.safeSend(client.socket, { type: "input_ack", tick: msg.tick || 0 });
  }

  forfeit(client: Client, matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;
    // opponent wins
    const opponent = match.players.find((p) => p.id !== client.id);
    const winnerId = opponent ? opponent.id : null;
    this.endMatch(match, winnerId, "forfeit");
  }

  tick() {
    const matchesToRemove: string[] = [];

    for (const [id, match] of this.matches.entries()) {
      match.tick += 1;

      const dt = this.tickIntervalMs / 1000; // seconds per tick
      const playersState = match.state.players;

      // apply inputs & integrate
      for (const p of match.players) {
        const pid = p.id;
        const ps = playersState[pid];
        if (!ps) continue;

        const inputs = match.inputs[pid] || {};

        // Horizontal velocity target
        let targetVx = 0;
        if (inputs.left) targetVx -= this.speed;
        if (inputs.right) targetVx += this.speed;
        ps.vx = targetVx;

        // Jump handling: trigger jump only when grounded AND input.up true,
        // use a simple flag to avoid repeated jumps while holding up — rely on client to send true only when held.
        if (inputs.up && ps.grounded) {
          ps.vy = -this.jumpVel;
          ps.grounded = false;
        }

        // gravity integrate
        ps.vy = (ps.vy || 0) + this.gravity * dt;

        // integrate positions
        ps.x += ps.vx * dt;
        ps.y += ps.vy * dt;

        // friction for horizontal
        ps.vx *= this.friction;

        // clamp to arena horizontally
        const w = match.state.arena.width;
        const half = 24; // approximate half-width of player
        if (ps.x < half) ps.x = half;
        if (ps.x > w - half) ps.x = w - half;

        // ground collision
        const groundY = match.state.arena.groundY != null ? match.state.arena.groundY : 250;
        if (ps.y >= groundY) {
          ps.y = groundY;
          ps.vy = 0;
          ps.grounded = true;
        }
      }

      // Simple attack/dash logic (unchanged)
      const [pA, pB] = match.players;
      const aState = playersState[pA.id];
      const bState = playersState[pB.id];
      const dist = Math.abs(aState.x - bState.x);
      const attackRange = 48;
      const aInputs = match.inputs[pA.id] || {};
      const bInputs = match.inputs[pB.id] || {};
      if (dist <= attackRange) {
        if (aInputs.dash && !aInputs._applied) {
          bState.hp -= 8;
          aInputs._applied = true;
        }
        if (bInputs.dash && !bInputs._applied) {
          aState.hp -= 8;
          bInputs._applied = true;
        }
      }

      // Broadcast state every tick
      const update = { type: "state", matchId: id, tick: match.tick, state: match.state };
      for (const player of match.players) {
        try {
          player.socket.send(JSON.stringify(update));
        } catch (err) {
          console.warn("Failed to send update to", player.id, err);
        }
      }

      // Check for match end
      const aHp = aState.hp;
      const bHp = bState.hp;
      if (aHp <= 0 || bHp <= 0) {
        const winnerId = aHp > bHp ? pA.id : pB.id;
        this.endMatch(match, winnerId, "hp_depleted");
        matchesToRemove.push(id);
      }
    }

    // cleanup ended matches
    for (const id of matchesToRemove) {
      this.matches.delete(id);
    }
  }

  endMatch(match: Match, winnerId: string | null, reason = "finished") {
    console.log(`[matchEngine] ending match ${match.id} winner=${winnerId} reason=${reason}`);
    const payload = { type: "match_end", matchId: match.id, winner: winnerId, reason };
    for (const player of match.players) {
      try {
        player.socket.send(JSON.stringify(payload));
      } catch (err) {}
      const client = this.clients.get(player.id);
      if (client) client.status = "idle";
    }
    this.matches.delete(match.id);
  }
}

export async function createMatchEngine(wss: WebSocket.Server): Promise<MatchEngine> {
  return new MatchEngine(wss);
}
