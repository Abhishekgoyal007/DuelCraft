// frontend/src/game/ArenaScene.js
import Phaser from "phaser";
import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR } from "../config/characterConfig";

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: "ArenaScene" });
    this.players = {};
    this.playerProfiles = {};
    this.myPlayerId = null;
    this.inputSendInterval = 50; // Send inputs more frequently for combat
    this.lastInputSend = 0;
    this.debugText = null;
    this.matchEnded = false;
  }

  preload() {
    // Preload sound effects (optional)
    // this.load.audio('punch', 'assets/sounds/punch.mp3');
    // this.load.audio('hit', 'assets/sounds/hit.mp3');
  }

  create() {
    // Arena background
    this.cameras.main.setBackgroundColor("#87CEEB");
    
    // Sky gradient
    this.add.rectangle(400, 100, 800, 200, 0x87CEEB);
    
    // Mountains in background
    this.add.triangle(100, 380, 0, 380, 100, 280, 200, 380, 0x6B8E23).setAlpha(0.5);
    this.add.triangle(300, 380, 150, 380, 300, 230, 450, 380, 0x556B2F).setAlpha(0.5);
    this.add.triangle(600, 380, 450, 380, 600, 260, 750, 380, 0x6B8E23).setAlpha(0.5);
    
    // Ground
    this.add.rectangle(400, 450, 800, 100, 0x228B22);
    this.add.rectangle(400, 490, 800, 20, 0x1a6b1a);
    
    // Platform line
    this.add.rectangle(400, 420, 700, 4, 0x8B4513);
    
    // Setup input handler
    window.handleServerState = (data) => {
      this.handleServerState(data);
    };

    // Debug text
    this.debugText = this.add.text(10, 10, "tick: -", { 
      font: "12px Arial", 
      fill: "#333" 
    }).setDepth(1000);

    // Input keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Smoothing
    this.smooth = 0.3;

    // Load profiles
    this.loadMatchProfiles();
    
    // Create HUD
    this.createHUD();
  }

  createHUD() {
    // Player 1 HP (left side)
    this.hud = {
      p1: {
        bgBar: this.add.rectangle(150, 30, 250, 25, 0x333333, 0.8).setOrigin(0, 0.5).setDepth(500),
        hpBar: this.add.rectangle(152, 30, 246, 21, 0x22c55e).setOrigin(0, 0.5).setDepth(501),
        label: this.add.text(155, 30, "YOU: 100", { 
          font: "bold 14px Arial", 
          fill: "#fff" 
        }).setOrigin(0, 0.5).setDepth(502),
      },
      p2: {
        bgBar: this.add.rectangle(450, 30, 250, 25, 0x333333, 0.8).setOrigin(0, 0.5).setDepth(500),
        hpBar: this.add.rectangle(452, 30, 246, 21, 0xef4444).setOrigin(0, 0.5).setDepth(501),
        label: this.add.text(455, 30, "OPP: 100", { 
          font: "bold 14px Arial", 
          fill: "#fff" 
        }).setOrigin(0, 0.5).setDepth(502),
      },
      vs: this.add.text(400, 30, "VS", { 
        font: "bold 16px Arial", 
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 2 
      }).setOrigin(0.5, 0.5).setDepth(503),
    };
    
    // Controls help
    this.add.text(400, 480, "← → Move | ↑ Jump | Z Punch | X Heavy Attack", {
      font: "11px Arial",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(100);
  }

  loadMatchProfiles() {
    const match = window.currentMatch;
    if (match) {
      this.myPlayerId = match.playerId;
      if (match.players) {
        Object.keys(match.players).forEach(pid => {
          const playerInfo = match.players[pid];
          if (playerInfo?.profile?.avatar) {
            this.playerProfiles[pid] = playerInfo.profile.avatar;
          }
        });
      }
    }
  }

  // Get color for a layer based on avatar settings
  getLayerColor(layerKey, avatar) {
    // Use avatar colors if available, otherwise use layer defaults
    if (layerKey === 'hair' && avatar?.hairColor) {
      return Phaser.Display.Color.HexStringToColor(avatar.hairColor).color;
    }
    if (layerKey === 'tops' && avatar?.topsColor) {
      return Phaser.Display.Color.HexStringToColor(avatar.topsColor).color;
    }
    if (layerKey === 'bottoms' && avatar?.bottomsColor) {
      return Phaser.Display.Color.HexStringToColor(avatar.bottomsColor).color;
    }
    
    // Default colors
    const defaultColors = {
      body: 0xFFDBB5,      // Skin tone
      eyes: 0x4A90D9,      // Blue eyes
      brows: 0x3A3A3A,     // Dark brows
      mouth: 0xE87777,     // Pink/red mouth
      hair: 0x3A3A3A,      // Dark hair
      tops: 0x4A90D9,      // Blue shirt
      bottoms: 0x3A5A9A,   // Dark blue pants
      shoes: 0x2A2A2A,     // Dark shoes
    };
    
    return defaultColors[layerKey] || 0xCCCCCC;
  }

  // Create a layered character texture
  createLayeredTexture(pid, avatar) {
    const texKey = `player_${pid}_${Date.now()}`;
    const size = 64;
    
    // Merge with defaults
    const finalAvatar = { ...DEFAULT_AVATAR, ...avatar };
    
    console.log("[ArenaScene] Creating layered texture for", pid, "avatar:", finalAvatar);
    
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Draw each layer in order
    LAYER_ORDER.forEach(layerKey => {
      const layerConfig = CHARACTER_LAYERS[layerKey];
      if (!layerConfig) return;
      
      const optionId = finalAvatar[layerKey];
      if (optionId === undefined || optionId === null) return;
      
      const option = layerConfig.options.find(o => o.id === optionId);
      if (!option) return;
      
      const color = this.getLayerColor(layerKey, finalAvatar);
      
      // Draw based on layer type
      this.drawLayerPart(graphics, layerKey, option, color, size);
    });
    
    graphics.generateTexture(texKey, size, size);
    graphics.destroy();
    
    return texKey;
  }

  // Draw a specific layer part
  drawLayerPart(graphics, layerKey, option, color, size) {
    const centerX = size / 2;
    const centerY = size / 2;
    
    graphics.fillStyle(color, 1);
    
    switch (layerKey) {
      case 'body': {
        // Draw body (main torso and head)
        graphics.fillCircle(centerX, centerY - 10, 14); // Head
        graphics.fillRoundedRect(centerX - 10, centerY + 2, 20, 20, 4); // Torso
        // Arms
        graphics.fillRoundedRect(centerX - 18, centerY + 4, 8, 16, 3);
        graphics.fillRoundedRect(centerX + 10, centerY + 4, 8, 16, 3);
        // Legs
        graphics.fillRoundedRect(centerX - 8, centerY + 20, 7, 14, 3);
        graphics.fillRoundedRect(centerX + 1, centerY + 20, 7, 14, 3);
        break;
      }
        
      case 'eyes': {
        // Draw eyes based on option
        const eyeY = centerY - 12;
        if (option.id === 0) { // Normal
          graphics.fillCircle(centerX - 5, eyeY, 3);
          graphics.fillCircle(centerX + 5, eyeY, 3);
        } else if (option.id === 1) { // Narrow
          graphics.fillRoundedRect(centerX - 7, eyeY - 1, 5, 3, 1);
          graphics.fillRoundedRect(centerX + 2, eyeY - 1, 5, 3, 1);
        } else if (option.id === 2) { // Wide
          graphics.fillCircle(centerX - 5, eyeY, 4);
          graphics.fillCircle(centerX + 5, eyeY, 4);
        } else if (option.id === 3) { // Angry
          graphics.fillStyle(color, 1);
          graphics.fillTriangle(centerX - 8, eyeY - 2, centerX - 2, eyeY, centerX - 8, eyeY + 2);
          graphics.fillTriangle(centerX + 8, eyeY - 2, centerX + 2, eyeY, centerX + 8, eyeY + 2);
        }
        break;
      }
        
      case 'brows': {
        // Draw eyebrows
        const browY = centerY - 18;
        if (option.id === 0) { // Normal
          graphics.fillRect(centerX - 8, browY, 6, 2);
          graphics.fillRect(centerX + 2, browY, 6, 2);
        } else if (option.id === 1) { // Thick
          graphics.fillRect(centerX - 8, browY - 1, 6, 3);
          graphics.fillRect(centerX + 2, browY - 1, 6, 3);
        } else if (option.id === 2) { // Angry
          graphics.fillRect(centerX - 8, browY + 2, 6, 2);
          graphics.fillRect(centerX + 2, browY, 6, 2);
        }
        break;
      }
        
      case 'mouth': {
        // Draw mouth
        const mouthY = centerY - 4;
        if (option.id === 0) { // Smile
          graphics.fillRoundedRect(centerX - 4, mouthY, 8, 3, 1);
        } else if (option.id === 1) { // Frown
          graphics.fillRoundedRect(centerX - 4, mouthY + 2, 8, 3, 1);
        } else if (option.id === 2) { // Open
          graphics.fillCircle(centerX, mouthY + 2, 4);
        } else if (option.id === 3) { // Grin
          graphics.fillRoundedRect(centerX - 6, mouthY, 12, 4, 2);
        }
        break;
      }
        
      case 'hair': {
        // Draw hair
        const hairY = centerY - 24;
        if (option.id === 0) { // Short
          graphics.fillRoundedRect(centerX - 12, hairY, 24, 10, 4);
        } else if (option.id === 1) { // Long
          graphics.fillRoundedRect(centerX - 14, hairY, 28, 8, 4);
          graphics.fillRoundedRect(centerX - 14, hairY + 6, 6, 20, 2);
          graphics.fillRoundedRect(centerX + 8, hairY + 6, 6, 20, 2);
        } else if (option.id === 2) { // Spiky
          graphics.fillTriangle(centerX - 10, hairY + 8, centerX - 6, hairY - 4, centerX - 2, hairY + 8);
          graphics.fillTriangle(centerX - 4, hairY + 8, centerX, hairY - 6, centerX + 4, hairY + 8);
          graphics.fillTriangle(centerX + 2, hairY + 8, centerX + 6, hairY - 4, centerX + 10, hairY + 8);
        } else if (option.id === 3) { // Bald - no hair
          // Draw nothing
        } else if (option.id === 4) { // Mohawk
          graphics.fillRoundedRect(centerX - 3, hairY - 6, 6, 14, 2);
        } else if (option.id === 5) { // Curly
          graphics.fillCircle(centerX - 8, hairY + 4, 6);
          graphics.fillCircle(centerX, hairY + 2, 6);
          graphics.fillCircle(centerX + 8, hairY + 4, 6);
          graphics.fillCircle(centerX - 4, hairY - 2, 5);
          graphics.fillCircle(centerX + 4, hairY - 2, 5);
        }
        break;
      }
        
      case 'tops': {
        // Draw shirt/top (over body)
        if (option.id !== 0) { // Skip if "None"
          graphics.fillRoundedRect(centerX - 11, centerY + 1, 22, 20, 3);
          // Sleeves
          graphics.fillRoundedRect(centerX - 18, centerY + 3, 8, 10, 2);
          graphics.fillRoundedRect(centerX + 10, centerY + 3, 8, 10, 2);
        }
        break;
      }
        
      case 'bottoms': {
        // Draw pants/bottoms
        if (option.id !== 0) { // Skip if "None"
          graphics.fillRoundedRect(centerX - 9, centerY + 19, 18, 6, 2);
          graphics.fillRoundedRect(centerX - 9, centerY + 23, 8, 12, 2);
          graphics.fillRoundedRect(centerX + 1, centerY + 23, 8, 12, 2);
        }
        break;
      }
        
      case 'shoes': {
        // Draw shoes
        const shoeY = centerY + 32;
        if (option.id === 0) { // Sneakers
          graphics.fillRoundedRect(centerX - 10, shoeY, 9, 5, 2);
          graphics.fillRoundedRect(centerX + 1, shoeY, 9, 5, 2);
        } else if (option.id === 1) { // Boots
          graphics.fillRoundedRect(centerX - 10, shoeY - 4, 9, 9, 2);
          graphics.fillRoundedRect(centerX + 1, shoeY - 4, 9, 9, 2);
        } else if (option.id === 2) { // Sandals
          graphics.fillRect(centerX - 9, shoeY + 2, 8, 3);
          graphics.fillRect(centerX + 1, shoeY + 2, 8, 3);
        }
        break;
      }
    }
  }

  // Legacy texture creator for backwards compatibility
  createPlayerTexture(pid, avatar, idx) {
    // If avatar has layer data, use layered texture
    if (avatar && (avatar.body !== undefined || avatar.hair !== undefined)) {
      return this.createLayeredTexture(pid, avatar);
    }
    
    // Legacy: simple colored shape
    const texKey = `player_${pid}_${Date.now()}`;
    const defaultColors = ["#66c2ff", "#ff6b6b", "#6ee7b7", "#ffb86b"];
    const color = avatar?.color || defaultColors[idx % defaultColors.length];
    const isRound = avatar?.bodyShape === "round";
    
    const size = 48;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    
    graphics.fillStyle(colorNum, 1);
    if (isRound) {
      graphics.fillCircle(size / 2, size / 2, size / 2);
    } else {
      graphics.fillRoundedRect(0, 0, size, size, 8);
    }
    
    graphics.generateTexture(texKey, size, size);
    graphics.destroy();
    
    return texKey;
  }

  handleServerState(data) {
    if (!data || data.type !== "state") return;

    if (this.debugText && data.tick != null) {
      this.debugText.setText(`tick: ${data.tick}`);
    }

    const playersState = (data.state && data.state.players) || {};
    const ids = Object.keys(playersState);

    ids.forEach((pid, idx) => {
      const p = playersState[pid];
      if (!this.players[pid]) {
        // Get avatar from profiles loaded from match_start
        const avatar = this.playerProfiles[pid] || null;
        const isMyPlayer = pid === this.myPlayerId;
        
        console.log("[ArenaScene] Creating player", pid, "isMyPlayer:", isMyPlayer);
        
        const texKey = this.createPlayerTexture(pid, avatar, idx);
        const sprite = this.add.sprite(p.x || 100 + idx * 200, p.y || 400, texKey);
        sprite.setDisplaySize(64, 64);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(200);
        
        // Set initial facing
        if (p.facingRight !== undefined) {
          sprite.setFlipX(!p.facingRight);
        }
        
        // Add floating name label
        const nameLabel = this.add.text(sprite.x, sprite.y - 80, isMyPlayer ? "YOU" : "ENEMY", { 
          font: "bold 11px Arial", 
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(300);
        
        this.players[pid] = { 
          sprite, 
          nameLabel,
          avatar, 
          isMyPlayer,
          facingRight: p.facingRight ?? true
        };
      } else {
        const player = this.players[pid];
        const sprite = player.sprite;
        
        // Update facing direction from server
        if (p.facingRight !== undefined) {
          player.facingRight = p.facingRight;
          sprite.setFlipX(!p.facingRight);
        }
        
        // Smooth interpolation
        if (p.x != null) sprite.x = Phaser.Math.Linear(sprite.x, p.x, this.smooth);
        if (p.y != null) sprite.y = Phaser.Math.Linear(sprite.y, p.y, this.smooth);
        
        // Update attack state visuals
        this.updatePlayerVisuals(pid, p, player);
        
        // Update floating UI positions
        if (player.nameLabel) {
          player.nameLabel.x = sprite.x;
          player.nameLabel.y = sprite.y - 80;
        }
      }
    });

    // Process game events (hits, attacks)
    if (data.state.events) {
      data.state.events.forEach(event => this.handleGameEvent(event));
    }

    // Update HUD
    this.updateHUD(playersState);

    // Remove stale sprites
    Object.keys(this.players).forEach((pid) => {
      if (!playersState[pid]) {
        this.destroyPlayer(pid);
      }
    });
  }

  updatePlayerVisuals(pid, serverState, player) {
    const sprite = player.sprite;
    
    // Tint based on attack state
    if (serverState.attackState === "hurt") {
      sprite.setTint(0xff6666); // Red tint when hurt
    } else if (serverState.attackState === "punch") {
      sprite.setTint(0xffff66); // Yellow tint when punching
    } else if (serverState.attackState === "heavy") {
      sprite.setTint(0xff9933); // Orange tint when heavy attacking
    } else {
      sprite.clearTint();
    }
    
    // Scale effect for attacks
    if (serverState.attackState === "punch") {
      sprite.setScale(1.1, 0.95);
    } else if (serverState.attackState === "heavy") {
      sprite.setScale(1.2, 0.9);
    } else {
      sprite.setScale(1, 1);
    }
  }

  handleGameEvent(event) {
    switch (event.type) {
      case "hit":
        this.showHitEffect(event);
        break;
      case "attack":
        this.showAttackEffect(event);
        break;
      case "death":
        this.showDeathEffect(event);
        break;
    }
  }

  showHitEffect(event) {
    const victim = this.players[event.victim];
    if (!victim) return;
    
    // Screen shake
    this.cameras.main.shake(100, 0.01);
    
    // Damage number
    const dmgText = this.add.text(
      victim.sprite.x, 
      victim.sprite.y - 40,
      `-${event.damage}`,
      { 
        font: "bold 20px Arial", 
        fill: "#ff0000",
        stroke: "#000",
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(600);
    
    // Animate damage number
    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 50,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => dmgText.destroy()
    });
    
    // Hit spark effect
    const spark = this.add.circle(victim.sprite.x, victim.sprite.y - 30, 15, 0xffff00);
    spark.setDepth(550);
    this.tweens.add({
      targets: spark,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => spark.destroy()
    });
  }

  showAttackEffect(event) {
    const attacker = this.players[event.attacker];
    if (!attacker) return;
    
    // Attack swoosh effect
    const dir = attacker.facingRight ? 1 : -1;
    const swooshX = attacker.sprite.x + (dir * 40);
    
    const swoosh = this.add.ellipse(swooshX, attacker.sprite.y - 30, 30, 15, 
      event.attackType === "heavy" ? 0xff6600 : 0xffffaa, 0.7);
    swoosh.setDepth(400);
    
    this.tweens.add({
      targets: swoosh,
      x: swooshX + (dir * 30),
      scaleX: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => swoosh.destroy()
    });
  }

  showDeathEffect(event) {
    const victim = this.players[event.victim];
    if (!victim) return;
    
    // Big screen shake
    this.cameras.main.shake(300, 0.02);
    
    // Flash
    this.cameras.main.flash(200, 255, 255, 255);
  }

  updateHUD(playersState) {
    const ids = Object.keys(playersState);
    if (ids.length < 2) return;
    
    // Sort so my player is always p1
    const myId = this.myPlayerId;
    const oppId = ids.find(id => id !== myId) || ids[1];
    
    const myState = playersState[myId];
    const oppState = playersState[oppId];
    
    if (myState && this.hud.p1) {
      const hpPercent = Math.max(0, myState.hp) / (myState.maxHp || 100);
      this.hud.p1.hpBar.width = 246 * hpPercent;
      this.hud.p1.hpBar.fillColor = hpPercent > 0.5 ? 0x22c55e : hpPercent > 0.25 ? 0xeab308 : 0xef4444;
      this.hud.p1.label.setText(`YOU: ${Math.max(0, Math.ceil(myState.hp))}`);
    }
    
    if (oppState && this.hud.p2) {
      const hpPercent = Math.max(0, oppState.hp) / (oppState.maxHp || 100);
      this.hud.p2.hpBar.width = 246 * hpPercent;
      this.hud.p2.hpBar.fillColor = hpPercent > 0.5 ? 0xef4444 : hpPercent > 0.25 ? 0xeab308 : 0x22c55e;
      this.hud.p2.label.setText(`OPP: ${Math.max(0, Math.ceil(oppState.hp))}`);
    }
  }

  destroyPlayer(pid) {
    const player = this.players[pid];
    if (!player) return;
    
    player.sprite?.destroy();
    player.nameLabel?.destroy();
    delete this.players[pid];
  }

  update(time, delta) {
    if (this.matchEnded) return;
    
    this.lastInputSend += delta;
    if (this.lastInputSend >= this.inputSendInterval) {
      this.lastInputSend = 0;
      
      const inputs = {
        left: !!this.cursors.left.isDown,
        right: !!this.cursors.right.isDown,
        up: !!this.cursors.up.isDown || !!this.keySpace.isDown,
        attack: !!this.keyZ.isDown,
        heavy: !!this.keyX.isDown
      };

      if (typeof window.sendInput === "function") {
        const payload = {
          type: "input",
          matchId: window.currentMatch?.matchId || null,
          tick: Date.now(),
          inputs
        };
        try {
          window.sendInput(payload);
        } catch {
          // ignore
        }
      }
    }
  }

  shutdown() {
    if (window.handleServerState) delete window.handleServerState;
  }
}
