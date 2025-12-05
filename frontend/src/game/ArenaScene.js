// frontend/src/game/ArenaScene.js
import Phaser from "phaser";
import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR, ANIMATIONS } from "../config/characterConfig";

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: "ArenaScene" });
    this.players = {};
    this.playerProfiles = {}; // profiles from match_start: { [playerId]: { avatar } }
    this.myPlayerId = null;
    this.inputSendInterval = 100;
    this.lastInputSend = 0;
    this.debugText = null;
    this.texturesGenerated = {};
  }

  preload() {
    // Preload placeholder/fallback assets
    // In production, you'd load actual sprite sheets here
    // this.load.spritesheet('body_0', 'assets/characters/body_0.png', { frameWidth: 48, frameHeight: 48 });
  }

  create() {
    this.cameras.main.setBackgroundColor("#8BD3FF");
    
    // Draw simple ground
    const ground = this.add.rectangle(400, 550, 800, 100, 0x228B22);
    ground.setStrokeStyle(2, 0x006400);
    
    window.handleServerState = (data) => {
      this.handleServerState(data);
    };

    this.debugText = this.add.text(10, 10, "tick: -", { font: "14px Arial", fill: "#000" }).setDepth(1000);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // smoothing factor
    this.smooth = 0.25;

    // Load player profiles from match data (sent by server in match_start)
    this.loadMatchProfiles();
  }

  loadMatchProfiles() {
    const match = window.currentMatch;
    console.log("[ArenaScene] Loading profiles from match:", match);
    
    if (match) {
      this.myPlayerId = match.playerId;
      console.log("[ArenaScene] My player ID:", this.myPlayerId);
      
      // match.players is now { [playerId]: { id, profile: { avatar } } }
      if (match.players && typeof match.players === 'object') {
        Object.keys(match.players).forEach(pid => {
          const playerInfo = match.players[pid];
          if (playerInfo?.profile?.avatar) {
            this.playerProfiles[pid] = playerInfo.profile.avatar;
            console.log("[ArenaScene] Loaded profile for", pid, ":", playerInfo.profile.avatar);
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
        
        console.log("[ArenaScene] Creating player", pid, "isMyPlayer:", isMyPlayer, "avatar:", avatar);
        
        const texKey = this.createPlayerTexture(pid, avatar, idx);
        const sprite = this.add.sprite(p.x || 100 + idx * 200, p.y || 200, texKey);
        sprite.setDisplaySize(64, 64);
        sprite.setOrigin(0.5, 1); // Anchor at feet for proper ground alignment
        
        // Add name label above player
        const name = isMyPlayer ? "YOU" : "OPP";
        const label = this.add.text(0, 0, name, { 
          font: "bold 12px Arial", 
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          backgroundColor: isMyPlayer ? "#22c55e" : "#ef4444",
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5, 1).setDepth(100);
        
        // Add health bar
        const healthBarBg = this.add.rectangle(0, 0, 50, 6, 0x333333);
        healthBarBg.setOrigin(0.5, 0.5).setDepth(99);
        
        const healthBar = this.add.rectangle(0, 0, 48, 4, isMyPlayer ? 0x22c55e : 0xef4444);
        healthBar.setOrigin(0, 0.5).setDepth(100);
        
        this.players[pid] = { 
          sprite, 
          label, 
          healthBarBg,
          healthBar,
          avatar, 
          isMyPlayer,
          facingRight: true
        };
      } else {
        const player = this.players[pid];
        const sprite = player.sprite;
        
        // Track direction for flipping
        if (p.x != null && sprite.x !== p.x) {
          player.facingRight = p.x > sprite.x;
          sprite.setFlipX(!player.facingRight);
        }
        
        // Smooth interpolation
        if (p.x != null) sprite.x = Phaser.Math.Linear(sprite.x, p.x, this.smooth);
        if (p.y != null) sprite.y = Phaser.Math.Linear(sprite.y, p.y, this.smooth);
        
        // Update UI positions
        if (player.label) {
          player.label.x = sprite.x;
          player.label.y = sprite.y - 70;
        }
        
        if (player.healthBarBg) {
          player.healthBarBg.x = sprite.x;
          player.healthBarBg.y = sprite.y - 56;
        }
        
        if (player.healthBar) {
          const healthPercent = (p.health ?? 100) / 100;
          player.healthBar.x = sprite.x - 24;
          player.healthBar.y = sprite.y - 56;
          player.healthBar.width = 48 * healthPercent;
        }
      }
    });

    // Remove stale sprites
    Object.keys(this.players).forEach((pid) => {
      if (!playersState[pid]) {
        this.players[pid].sprite.destroy();
        if (this.players[pid].label) this.players[pid].label.destroy();
        if (this.players[pid].healthBarBg) this.players[pid].healthBarBg.destroy();
        if (this.players[pid].healthBar) this.players[pid].healthBar.destroy();
        delete this.players[pid];
      }
    });
  }

  update(time, delta) {
    this.lastInputSend += delta;
    if (this.lastInputSend >= this.inputSendInterval) {
      this.lastInputSend = 0;
      const inputs = {
        left: !!this.cursors.left.isDown,
        right: !!this.cursors.right.isDown,
        up: !!this.cursors.up.isDown,
        down: !!this.cursors.down.isDown,
        dash: !!this.keyZ.isDown,
        alt: !!this.keyX.isDown
      };

      if (typeof window.sendInput === "function") {
        const payload = {
          type: "input",
          matchId: (window.currentMatch && window.currentMatch.matchId) || null,
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
