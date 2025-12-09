// backend/src/matchEngine.ts
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { Player, MatchHistory, Asset } from "./db/models";
import { isDBConnected } from "./db/connection";

export type EquippedAssets = {
  body?: string;
  hair?: string;
  eyes?: string;
  mouth?: string;
  tops?: string;
  bottoms?: string;
  shoes?: string;
  effect?: string;
  accessory?: string;
  background?: string;
};

export type PlayerProfile = {
  address?: string;
  avatar?: {
    body?: string;
    hair?: string;
    face?: string;
    color?: string;
  };
  equipped?: EquippedAssets;
  equippedUrls?: Record<string, string>; // assetId -> url for rendering
};

export type Client = {
  id: string;
  socket: WebSocket;
  lastSeen: number;
  status: "idle" | "in_match";
  meta?: any;
  profile?: PlayerProfile; // player's profile with avatar
};

// Combat constants
const COMBAT = {
  // Attack types
  PUNCH: {
    damage: 10,
    range: 60,
    cooldown: 400,     // ms
    knockback: 150,    // horizontal force
    knockbackY: -100,  // vertical force (upward)
    duration: 200,     // animation duration ms
  },
  HEAVY: {
    damage: 25,
    range: 75,
    cooldown: 800,
    knockback: 300,
    knockbackY: -180,
    duration: 350,
  },
  // Stun/hitstun duration when hit
  HITSTUN_DURATION: 300,
};

export type PlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  grounded: boolean;
  facingRight: boolean;
  // Combat state
  attackCooldown: number;  // timestamp when can attack again
  attackState: "none" | "punch" | "heavy" | "hurt";
  attackEndTime: number;   // when current attack/hurt animation ends
  stunEndTime: number;     // when stun ends (can't act while stunned)
  lastDamageFrom: string | null; // id of last player who dealt damage
};

export type Match = {
  id: string;
  players: [Client, Client];
  state: {
    arena: { width: number; height: number; groundY: number };
    players: Record<string, PlayerState>;
    events: GameEvent[]; // events to broadcast (hits, etc)
  };
  tick: number;
  inputs: Record<string, any>; // latest input per player id
  startedAt: number;
};

export type GameEvent = {
  type: "hit" | "attack" | "death";
  attacker?: string;
  victim?: string;
  damage?: number;
  attackType?: string;
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
    
    // Check if client is in a match - handle disconnect forfeit
    const client = this.clients.get(id);
    if (client && client.status === "in_match") {
      // Find the match this client is in
      for (const [matchId, match] of this.matches.entries()) {
        const isInMatch = match.players.some(p => p.id === id);
        if (isInMatch) {
          console.log(`[matchEngine] Player ${id} disconnected mid-match, auto-forfeiting`);
          const opponent = match.players.find(p => p.id !== id);
          const winnerId = opponent ? opponent.id : null;
          this.endMatch(match, winnerId, "disconnect");
          break;
        }
      }
    }
    
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
        // Capture profile from message if provided
        if (msg.auth?.address || msg.profile) {
          client.profile = {
            address: msg.auth?.address?.toLowerCase(),
            avatar: msg.profile?.avatar,
            equipped: msg.profile?.equipped || {},
            selectedCharacter: msg.profile?.selectedCharacter,
            characterImage: msg.profile?.characterImage
          };
          console.log(`[matchEngine] Profile attached for ${id}:`, JSON.stringify(client.profile));
          
          // Store cash duel info if present
          if (msg.mode === 'cash_duel' && msg.duelId) {
            client.meta = { mode: 'cash_duel', duelId: String(msg.duelId) }; // Ensure string
            console.log(`[matchEngine] Cash duel mode for ${id}, duelId: ${msg.duelId} (type: ${typeof msg.duelId})`);
          }
          
          // Resolve equipped asset IDs to URLs for rendering, then enqueue
          this.resolveEquippedUrls(client).then(() => {
            console.log(`[matchEngine] Equipped URLs resolved for ${id}:`, client.profile?.equippedUrls);
            this.enqueueClient(client);
          }).catch(err => {
            console.warn(`[matchEngine] Failed to resolve equipped URLs for ${id}:`, err);
            this.enqueueClient(client); // Still enqueue even if URL resolution fails
          });
        } else {
          console.log(`[matchEngine] WARNING: No auth/profile in join_queue from ${id}`);
          this.enqueueClient(client);
        }
        break;
      case "join_ai":
        // Start a match against AI bot for testing
        console.log(`[matchEngine] ${id} wants to fight AI`);
        this.createAIMatch(client);
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

  // Create a match against AI bot
  createAIMatch(client: Client) {
    if (client.status !== "idle") return;
    
    // Create a fake AI client
    const aiClient: Client = {
      id: "ai_bot_" + uuidv4().slice(0, 8),
      socket: null as any, // AI doesn't have a real socket
      lastSeen: Date.now(),
      status: "in_match",
      profile: {
        address: "0xAI_BOT",
        avatar: { body: "#ff0000", hair: "#333333", face: "#ffcc99" },
        equipped: {}
      }
    };
    
    // Store AI client
    this.clients.set(aiClient.id, aiClient);
    
    // Create match
    this.createMatch(client, aiClient);
    
    console.log(`[matchEngine] AI match created: ${client.id} vs ${aiClient.id}`);
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

  // Resolve equipped asset IDs to their CDN URLs for Phaser rendering
  async resolveEquippedUrls(client: Client): Promise<void> {
    if (!client.profile?.equipped) return;
    
    const equipped = client.profile.equipped;
    const assetIds = Object.values(equipped).filter(Boolean) as string[];
    
    if (assetIds.length === 0) return;
    
    try {
      // Fetch all equipped assets in one query
      const assets = await Asset.find({ assetId: { $in: assetIds } }).lean();
      
      // Build a map of assetId -> url
      const urlMap: Record<string, string> = {};
      assets.forEach((asset: any) => {
        urlMap[asset.assetId] = asset.url;
      });
      
      // Store on client profile
      client.profile.equippedUrls = urlMap;
      
      console.log(`[matchEngine] Resolved ${Object.keys(urlMap).length} asset URLs for client`);
    } catch (err) {
      console.error("[matchEngine] Error resolving equipped URLs:", err);
    }
  }

  tryMatchFromQueue() {
    console.log(`[matchEngine] tryMatchFromQueue called, queue length: ${this.queue.length}`);
    
    // First, try to match cash duel players with the same duelId
    for (let i = 0; i < this.queue.length; i++) {
      const clientA = this.clients.get(this.queue[i]);
      if (!clientA?.meta?.duelId) continue;
      
      console.log(`[matchEngine] Found cash duel player: ${clientA.id}, duelId: ${clientA.meta.duelId}`);
      
      // Find another player with the same duelId
      for (let j = i + 1; j < this.queue.length; j++) {
        const clientB = this.clients.get(this.queue[j]);
        console.log(`[matchEngine] Comparing with player: ${clientB?.id}, duelId: ${clientB?.meta?.duelId}`);
        
        if (clientB?.meta?.duelId && String(clientB.meta.duelId) === String(clientA.meta.duelId)) {
          // Found a match! Remove both from queue
          this.queue.splice(j, 1); // Remove j first (higher index)
          this.queue.splice(i, 1); // Then i
          console.log(`[matchEngine] ✅ Cash duel match: ${clientA.id} vs ${clientB.id} (duelId: ${clientA.meta.duelId})`);
          this.createMatch(clientA, clientB);
          return this.tryMatchFromQueue(); // Recursively try again
        }
      }
    }
    
    // Regular matchmaking for non-cash duels
    while (this.queue.length >= 2) {
      const a = this.queue.shift()!;
      const b = this.queue.shift()!;
      const ca = this.clients.get(a);
      const cb = this.clients.get(b);
      if (!ca || !cb) continue;
      
      // Skip if either is waiting for cash duel opponent
      if (ca.meta?.duelId || cb.meta?.duelId) {
        // Put them back in queue
        this.queue.push(a);
        this.queue.push(b);
        break;
      }
      
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
    const leftX = 150;
    const rightX = 650;
    const groundY = 395; // y coordinate for platform surface (sprites have origin at bottom)
    const now = Date.now();

    const createPlayerState = (x: number, facingRight: boolean): PlayerState => ({
      x,
      y: groundY,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      grounded: true,
      facingRight,
      attackCooldown: 0,
      attackState: "none",
      attackEndTime: 0,
      stunEndTime: 0,
      lastDamageFrom: null,
    });

    const state = {
      arena: { width: 800, height: 500, groundY },
      players: {
        [a.id]: createPlayerState(leftX, true),   // Player A faces right
        [b.id]: createPlayerState(rightX, false), // Player B faces left
      },
      events: [] as GameEvent[],
    };

    const match: Match = {
      id,
      players: [a, b],
      state,
      tick: 0,
      inputs: {},
      startedAt: now
    };

    this.matches.set(id, match);
    console.log(`[matchEngine] match created ${id} between ${a.id} and ${b.id}`);

    // Build players info with profiles for client
    const playersInfo: Record<string, { id: string; profile?: any }> = {
      [a.id]: { id: a.id, profile: a.profile || null },
      [b.id]: { id: b.id, profile: b.profile || null }
    };

    // notify players - each player gets their own playerId so they know which one they are
    const payloadA = { 
      type: "match_start", 
      matchId: id, 
      playerId: a.id, // tells client A which player they are
      players: playersInfo,
      state: match.state 
    };
    const payloadB = { 
      type: "match_start", 
      matchId: id, 
      playerId: b.id, // tells client B which player they are
      players: playersInfo,
      state: match.state 
    };
    this.safeSend(a.socket, payloadA);
    this.safeSend(b.socket, payloadB);
  }

  safeSend(sock: WebSocket | null, payload: any) {
    if (!sock) return; // AI bots have no socket
    try {
      sock.send(JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to send payload", err);
    }
  }

  onClientInput(client: Client, msg: any) {
    // msg: { type:'input', matchId, tick, inputs: {left,right,up,attack,heavy,...} }
    if (!msg || !msg.matchId) {
      console.log(`[input] REJECTED - no matchId from ${client.id}`);
      return;
    }
    const match = this.matches.get(msg.matchId);
    if (!match) {
      console.log(`[input] REJECTED - match ${msg.matchId} not found for ${client.id}`);
      return;
    }
    
    // Verify client is in this match
    const isInMatch = match.players.some(p => p.id === client.id);
    if (!isInMatch) {
      console.log(`[input] REJECTED - client ${client.id} not in match ${msg.matchId}`);
      return;
    }
    
    // store the latest input for this client (overwrites previous)
    match.inputs[client.id] = msg.inputs || {};
    
    // Debug: log movement/attack inputs
    const inp = msg.inputs;
    if (inp?.left || inp?.right || inp?.up || inp?.attack || inp?.heavy) {
      console.log(`[input] ${client.id}: L=${inp.left} R=${inp.right} U=${inp.up} A=${inp.attack} H=${inp.heavy}`);
    }
    
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

  // Check if attacker hits defender
  checkHit(attacker: PlayerState, defender: PlayerState, range: number): boolean {
    const dx = defender.x - attacker.x;
    const dy = Math.abs(defender.y - attacker.y);
    
    // Check if defender is in front of attacker (based on facing direction)
    const inFront = attacker.facingRight ? dx > 0 : dx < 0;
    const distance = Math.abs(dx);
    
    // Hit if: in range, in front, and vertically close enough
    return inFront && distance <= range && dy <= 50;
  }

  // Process attack for a player
  processAttack(
    match: Match,
    attackerId: string, 
    defenderId: string, 
    attackType: "punch" | "heavy",
    now: number
  ): void {
    const attacker = match.state.players[attackerId];
    const defender = match.state.players[defenderId];
    
    if (!attacker || !defender) {
      console.log(`[processAttack] Missing player: attacker=${!!attacker}, defender=${!!defender}`);
      return;
    }
    
    const config = attackType === "punch" ? COMBAT.PUNCH : COMBAT.HEAVY;
    
    // Check cooldown
    if (now < attacker.attackCooldown) {
      return; // Still on cooldown, skip silently
    }
    
    // Check if attacker is stunned
    if (now < attacker.stunEndTime) {
      return; // Stunned, skip silently
    }
    
    // Check if already in an attack animation
    if (attacker.attackState !== "none" && now < attacker.attackEndTime) {
      return; // Still attacking, skip silently
    }
    
    console.log(`[processAttack] ${attackerId} performing ${attackType}!`);
    
    // Start attack animation
    attacker.attackState = attackType;
    attacker.attackEndTime = now + config.duration;
    attacker.attackCooldown = now + config.cooldown;
    
    // Add attack event for client animation
    match.state.events.push({
      type: "attack",
      attacker: attackerId,
      attackType,
    });
    
    // Check if hit connects
    if (this.checkHit(attacker, defender, config.range)) {
      // Apply damage
      defender.hp -= config.damage;
      defender.lastDamageFrom = attackerId;
      
      // Apply knockback
      const knockbackDir = attacker.facingRight ? 1 : -1;
      defender.vx += config.knockback * knockbackDir;
      defender.vy += config.knockbackY;
      defender.grounded = false;
      
      // Apply hitstun to defender
      defender.stunEndTime = now + COMBAT.HITSTUN_DURATION;
      defender.attackState = "hurt";
      defender.attackEndTime = now + COMBAT.HITSTUN_DURATION;
      
      // Add hit event
      match.state.events.push({
        type: "hit",
        attacker: attackerId,
        victim: defenderId,
        damage: config.damage,
        attackType,
      });
      
      console.log(`[combat] ${attackerId} hit ${defenderId} with ${attackType} for ${config.damage} damage`);
    }
  }

  // Simple AI behavior
  updateAIInputs(match: Match, now: number) {
    for (const player of match.players) {
      // Only process AI players (ids starting with "ai_bot_")
      if (!player.id.startsWith("ai_bot_")) continue;
      
      const aiState = match.state.players[player.id];
      const humanPlayer = match.players.find(p => !p.id.startsWith("ai_bot_"));
      if (!humanPlayer || !aiState) continue;
      
      const humanState = match.state.players[humanPlayer.id];
      if (!humanState) continue;
      
      // Calculate distance to human
      const dx = humanState.x - aiState.x;
      const distance = Math.abs(dx);
      
      // AI decision making
      const inputs: any = {
        left: false,
        right: false,
        up: false,
        attack: false,
        heavy: false
      };
      
      // Move towards player if too far
      if (distance > 100) {
        inputs.left = dx < 0;
        inputs.right = dx > 0;
      }
      // Back off if too close
      else if (distance < 50) {
        inputs.left = dx > 0;
        inputs.right = dx < 0;
      }
      
      // Attack when in range
      if (distance < 80 && distance > 30) {
        // Random attack timing
        if (Math.random() < 0.15) {
          inputs.attack = true;
        }
        // Occasionally use heavy attack
        if (Math.random() < 0.05) {
          inputs.heavy = true;
        }
      }
      
      // Jump occasionally to avoid attacks
      if (Math.random() < 0.02 && aiState.grounded) {
        inputs.up = true;
      }
      
      // Store AI inputs
      match.inputs[player.id] = inputs;
    }
  }

  tick() {
    const matchesToRemove: string[] = [];
    const now = Date.now();

    for (const [id, match] of this.matches.entries()) {
      match.tick += 1;
      
      // Clear events from previous tick
      match.state.events = [];

      const dt = this.tickIntervalMs / 1000; // seconds per tick
      const playersState = match.state.players;
      const [pA, pB] = match.players;

      // Generate AI inputs if one player is AI
      this.updateAIInputs(match, now);

      // Process each player
      for (const p of match.players) {
        const pid = p.id;
        const ps = playersState[pid];
        if (!ps) continue;

        const inputs = match.inputs[pid] || {};
        const isStunned = now < ps.stunEndTime;
        
        // Reset attack state if animation ended
        if (ps.attackState !== "none" && now >= ps.attackEndTime) {
          ps.attackState = "none";
        }

        // --- Movement (only if not stunned) ---
        if (!isStunned) {
          // Update facing direction based on movement
          if (inputs.left) ps.facingRight = false;
          if (inputs.right) ps.facingRight = true;
          
          // Horizontal velocity target
          let targetVx = 0;
          if (inputs.left) targetVx -= this.speed;
          if (inputs.right) targetVx += this.speed;
          
          // Only apply movement input if not attacking
          if (ps.attackState === "none") {
            ps.vx = targetVx;
          }
          
          // Jump handling
          if (inputs.up && ps.grounded) {
            ps.vy = -this.jumpVel;
            ps.grounded = false;
          }
        }

        // --- Physics (always applies) ---
        // Gravity
        ps.vy = (ps.vy || 0) + this.gravity * dt;

        // Integrate positions
        ps.x += ps.vx * dt;
        ps.y += ps.vy * dt;

        // Friction (more when grounded)
        ps.vx *= ps.grounded ? this.friction : 0.98;

        // Clamp to arena horizontally
        const w = match.state.arena.width;
        const half = 32;
        if (ps.x < half) ps.x = half;
        if (ps.x > w - half) ps.x = w - half;

        // Ground collision
        const groundY = match.state.arena.groundY;
        if (ps.y >= groundY) {
          ps.y = groundY;
          ps.vy = 0;
          ps.grounded = true;
        }

        // --- Attacks ---
        const opponentId = pid === pA.id ? pB.id : pA.id;
        
        // Punch attack (Z key / attack input)
        if (inputs.attack && !inputs._attackApplied) {
          console.log(`[tick] ${pid} attack button pressed, calling processAttack`);
          this.processAttack(match, pid, opponentId, "punch", now);
          inputs._attackApplied = true;
        }
        if (!inputs.attack) {
          inputs._attackApplied = false;
        }
        
        // Heavy attack (X key / heavy input)
        if (inputs.heavy && !inputs._heavyApplied) {
          console.log(`[tick] ${pid} heavy button pressed, calling processAttack`);
          this.processAttack(match, pid, opponentId, "heavy", now);
          inputs._heavyApplied = true;
        }
        if (!inputs.heavy) {
          inputs._heavyApplied = false;
        }
      }

      // Auto-face opponent when idle
      const aState = playersState[pA.id];
      const bState = playersState[pB.id];
      if (aState && bState) {
        if (aState.attackState === "none" && !match.inputs[pA.id]?.left && !match.inputs[pA.id]?.right) {
          aState.facingRight = bState.x > aState.x;
        }
        if (bState.attackState === "none" && !match.inputs[pB.id]?.left && !match.inputs[pB.id]?.right) {
          bState.facingRight = aState.x > bState.x;
        }
      }

      // Broadcast state every tick
      const update = { 
        type: "state", 
        matchId: id, 
        tick: match.tick, 
        state: match.state 
      };
      for (const player of match.players) {
        try {
          player.socket.send(JSON.stringify(update));
        } catch (err) {
          console.warn("Failed to send update to", player.id, err);
        }
      }

      // Check for match end
      if (aState && bState) {
        if (aState.hp <= 0 || bState.hp <= 0) {
          const winnerId = aState.hp > bState.hp ? pA.id : pB.id;
          
          // Add death event
          const loserId = winnerId === pA.id ? pB.id : pA.id;
          match.state.events.push({ type: "death", victim: loserId });
          
          this.endMatch(match, winnerId, "hp_depleted");
          matchesToRemove.push(id);
        }
      }
    }

    // cleanup ended matches
    for (const id of matchesToRemove) {
      this.matches.delete(id);
    }
  }

  endMatch(match: Match, winnerId: string | null, reason = "finished") {
    console.log(`[matchEngine] ending match ${match.id} winner=${winnerId} reason=${reason}`);
    
    const COINS_FOR_WIN = 20;
    const COINS_FOR_LOSS = 5;
    
    // Find winner and loser clients
    const winnerClient = match.players.find(p => p.id === winnerId);
    const loserClient = match.players.find(p => p.id !== winnerId);
    
    // Debug: Log player profiles
    console.log(`[matchEngine] Winner client profile:`, JSON.stringify(winnerClient?.profile));
    console.log(`[matchEngine] Loser client profile:`, JSON.stringify(loserClient?.profile));
    
    const winnerAddress = winnerClient?.profile?.address?.toLowerCase();
    const loserAddress = loserClient?.profile?.address?.toLowerCase();
    
    console.log(`[matchEngine] Winner address: ${winnerAddress}, Loser address: ${loserAddress}`);
    
    // Save match to DB and update player stats
    this.saveMatchResult(match, winnerId, winnerAddress, loserAddress, reason, COINS_FOR_WIN, COINS_FOR_LOSS);
    
    // Send match_end to clients with coin rewards info
    const payload = { 
      type: "match_end", 
      matchId: match.id, 
      winner: winnerId, 
      reason,
      rewards: {
        winner: { coins: COINS_FOR_WIN },
        loser: { coins: COINS_FOR_LOSS }
      }
    };
    
    for (const player of match.players) {
      try {
        player.socket.send(JSON.stringify(payload));
      } catch (err) {}
      const client = this.clients.get(player.id);
      if (client) client.status = "idle";
    }
    this.matches.delete(match.id);
  }

  async saveMatchResult(
    match: Match, 
    winnerId: string | null, 
    winnerAddress: string | undefined, 
    loserAddress: string | undefined,
    reason: string,
    coinsForWin: number,
    coinsForLoss: number
  ) {
    console.log(`[matchEngine] saveMatchResult called:`);
    console.log(`  - winnerId: ${winnerId}`);
    console.log(`  - winnerAddress: ${winnerAddress}`);
    console.log(`  - loserAddress: ${loserAddress}`);
    console.log(`  - DB connected: ${isDBConnected()}`);
    
    // Log all player profiles for debugging
    match.players.forEach((p, i) => {
      console.log(`  - Player ${i} (${p.id}): profile=${JSON.stringify(p.profile)}`);
    });
    
    if (!isDBConnected()) {
      console.log("[matchEngine] DB not connected, skipping match save");
      return;
    }

    try {
      const duration = Math.floor((Date.now() - match.startedAt) / 1000);
      const playersState = match.state.players;

      // Build players array for match history
      const playersData = match.players.map(p => ({
        walletAddress: p.profile?.address?.toLowerCase() || "",
        odlId: p.id,
        avatar: p.profile?.avatar || null,
        finalHp: playersState[p.id]?.hp || 0
      }));

      // Save match history
      await MatchHistory.create({
        matchId: match.id,
        players: playersData,
        winner: winnerAddress || null,
        loser: loserAddress || null,
        duration,
        endReason: reason as any,
        coinsAwarded: coinsForWin
      });

      // Update winner stats and coins (upsert to auto-create if missing)
      if (winnerAddress) {
        const winnerResult = await Player.findOneAndUpdate(
          { walletAddress: winnerAddress },
          { 
            $inc: { 
              coins: coinsForWin, 
              "stats.wins": 1, 
              "stats.totalMatches": 1 
            } 
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        if (winnerResult) {
          console.log(`[matchEngine] ✓ Updated winner ${winnerAddress}: coins=${winnerResult.coins}, wins=${winnerResult.stats.wins}`);
        } else {
          console.log(`[matchEngine] ✗ Winner ${winnerAddress} update failed!`);
        }
      } else {
        console.log(`[matchEngine] ✗ No winner address to update!`);
      }

      // Update loser stats and coins (upsert to auto-create if missing)
      if (loserAddress) {
        const loserResult = await Player.findOneAndUpdate(
          { walletAddress: loserAddress },
          { 
            $inc: { 
              coins: coinsForLoss, 
              "stats.losses": 1, 
              "stats.totalMatches": 1 
            } 
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        if (loserResult) {
          console.log(`[matchEngine] ✓ Updated loser ${loserAddress}: coins=${loserResult.coins}, losses=${loserResult.stats.losses}`);
        } else {
          console.log(`[matchEngine] ✗ Loser ${loserAddress} update failed!`);
        }
      } else {
        console.log(`[matchEngine] ✗ No loser address to update!`);
      }

      console.log(`[matchEngine] Match ${match.id} saved to DB`);
    } catch (err) {
      console.error("[matchEngine] Failed to save match result:", err);
    }
  }
}

export async function createMatchEngine(wss: WebSocket.Server): Promise<MatchEngine> {
  return new MatchEngine(wss);
}
