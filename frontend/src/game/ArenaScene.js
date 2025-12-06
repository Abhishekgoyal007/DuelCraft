// frontend/src/game/ArenaScene.js
import Phaser from "phaser";
import { CHARACTER_LAYERS, LAYER_ORDER, DEFAULT_AVATAR } from "../config/characterConfig";
import { CharacterAnimator, ANIM_STATE } from "./CharacterAnimator";

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: "ArenaScene" });
    this.players = {};
    this.playerProfiles = {};
    this.playerAnimators = {}; // NEW: CharacterAnimator instances
    this.myPlayerId = null;
    this.inputSendInterval = 50; // Send inputs more frequently for combat
    this.lastInputSend = 0;
    this.debugText = null;
    this.matchEnded = false;
    this.matchIntroPlayed = false;
  }

  preload() {
    // Load character layers for warrior and mage
    const characterTypes = ['warrior', 'mage'];
    const layers = ['base', 'hair', 'clothing'];
    
    characterTypes.forEach(charType => {
      layers.forEach(layer => {
        const key = `${charType}_${layer}`;
        this.load.image(key, `/character-layers/${charType}/${layer}.png`);
        console.log(`[ArenaScene] Loading: ${key} from /character-layers/${charType}/${layer}.png`);
      });
    });
    
    // Add load error handler
    this.load.on('loaderror', (file) => {
      console.error(`[ArenaScene] Failed to load: ${file.key} from ${file.url}`);
    });
    
    console.log('[ArenaScene] Preloading character layer images...');
  }

  create() {
    // === BEAUTIFUL ARENA BACKGROUND (matching landing page) ===
    
    // Sky gradient background
    this.cameras.main.setBackgroundColor("#87CEEB");
    
    // Create sky gradient layers
    const skyColors = [
      { y: 0, height: 80, color: 0x87CEEB },
      { y: 80, height: 80, color: 0x98D8E8 },
      { y: 160, height: 80, color: 0xA8E8C8 },
      { y: 240, height: 60, color: 0xB8E6B8 },
      { y: 300, height: 50, color: 0x90EE90 },
    ];
    skyColors.forEach(layer => {
      this.add.rectangle(400, layer.y + layer.height/2, 800, layer.height, layer.color).setDepth(0);
    });
    
    // Animated clouds (stored for animation)
    this.clouds = [];
    const cloudPositions = [
      { x: 100, y: 40, scale: 1.0 },
      { x: 350, y: 70, scale: 1.3 },
      { x: 600, y: 30, scale: 0.9 },
      { x: 750, y: 80, scale: 1.1 },
    ];
    cloudPositions.forEach(pos => {
      const cloud = this.createCloud(pos.x, pos.y, pos.scale);
      this.clouds.push({ container: cloud, speed: 0.2 + Math.random() * 0.3 });
    });
    
    // Sparkles (animated stars)
    this.sparkles = [];
    const sparklePositions = [
      { x: 120, y: 100 }, { x: 680, y: 120 }, { x: 400, y: 60 },
      { x: 200, y: 160 }, { x: 600, y: 180 },
    ];
    sparklePositions.forEach((pos, i) => {
      const sparkle = this.add.text(pos.x, pos.y, "✦", {
        fontSize: "16px",
        color: "#FFD700"
      }).setDepth(5).setAlpha(0.3);
      this.sparkles.push({ text: sparkle, phase: i * 0.5 });
    });
    
    // Distant trees/forest silhouette
    this.createForestBackground();
    
    // Ground with grass
    this.createGround();
    
    // Arena platform
    this.createArenaPlatform();
    
    // Setup input handler
    window.handleServerState = (data) => {
      this.handleServerState(data);
    };

    // Debug text (hidden by default, press D to toggle)
    this.debugText = this.add.text(10, 10, "", { 
      font: "12px Arial", 
      fill: "#333" 
    }).setDepth(1000).setVisible(false);

    // Input keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Prevent browser from capturing these keys
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.X
    ]);

    // Click to focus hint
    this.focusHint = this.add.text(400, 250, "🎮 Click here to enable controls!", {
      font: "bold 18px Arial",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      backgroundColor: "#000000aa",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(999).setInteractive();
    
    // Hide hint when game is clicked/focused
    this.input.on('pointerdown', () => {
      if (this.focusHint) {
        this.focusHint.destroy();
        this.focusHint = null;
      }
    });

    // Smoothing
    this.smooth = 0.3;

    // Load profiles
    this.loadMatchProfiles();
    
    // Create HUD
    this.createHUD();
    
    // Animation timer for background elements
    this.bgAnimTime = 0;
    
    // Expose API for UI to update cosmetics
    window.arenaSetCosmetic = (category, assetId) => {
      this.setLocalPlayerCosmetic(category, assetId);
    };
    
    window.arenaApplyCosmetics = (cosmetics) => {
      this.applyLocalPlayerCosmetics(cosmetics);
    };
  }
  
  /**
   * Set a single cosmetic on the local player
   * @param {string} category 
   * @param {string} assetId 
   */
  setLocalPlayerCosmetic(category, assetId) {
    if (!this.myPlayerId) return;
    const animator = this.playerAnimators[this.myPlayerId];
    if (animator && animator.setCosmetic) {
      animator.setCosmetic(category, assetId);
    }
  }
  
  /**
   * Apply multiple cosmetics to local player
   * @param {Object} cosmetics 
   */
  applyLocalPlayerCosmetics(cosmetics) {
    if (!this.myPlayerId) return;
    const animator = this.playerAnimators[this.myPlayerId];
    if (animator && animator.applyCosmetics) {
      animator.applyCosmetics(cosmetics);
    }
  }

  createCloud(x, y, scale) {
    const container = this.add.container(x, y).setDepth(2);
    const cloudColor = 0xFFFFFF;
    
    // Create puffy cloud shape
    const c1 = this.add.circle(0, 0, 15 * scale, cloudColor);
    const c2 = this.add.circle(-20 * scale, 5, 12 * scale, cloudColor);
    const c3 = this.add.circle(20 * scale, 5, 12 * scale, cloudColor);
    const c4 = this.add.circle(-10 * scale, -8, 10 * scale, cloudColor);
    const c5 = this.add.circle(10 * scale, -8, 10 * scale, cloudColor);
    
    container.add([c1, c2, c3, c4, c5]);
    container.setAlpha(0.9);
    
    return container;
  }

  createForestBackground() {
    // Draw distant tree silhouettes
    const treePositions = [
      { x: 50, h: 80 }, { x: 120, h: 100 }, { x: 200, h: 70 },
      { x: 280, h: 90 }, { x: 380, h: 110 }, { x: 480, h: 85 },
      { x: 560, h: 95 }, { x: 650, h: 75 }, { x: 730, h: 105 },
    ];
    
    treePositions.forEach(tree => {
      // Tree trunk
      this.add.rectangle(tree.x, 350 - tree.h/4, 15, tree.h/2, 0x5D4E37).setDepth(8).setAlpha(0.6);
      // Tree foliage (triangle)
      const graphics = this.add.graphics().setDepth(9);
      graphics.fillStyle(0x2D5A27, 0.7);
      graphics.fillTriangle(
        tree.x, 350 - tree.h,
        tree.x - 30, 350 - tree.h/3,
        tree.x + 30, 350 - tree.h/3
      );
      graphics.fillStyle(0x3D6A37, 0.6);
      graphics.fillTriangle(
        tree.x, 350 - tree.h - 20,
        tree.x - 25, 350 - tree.h/2,
        tree.x + 25, 350 - tree.h/2
      );
    });
  }

  createGround() {
    // Main grass layer
    this.add.rectangle(400, 440, 800, 40, 0x4CAF50).setDepth(10);
    
    // Grass detail layer (darker)
    this.add.rectangle(400, 458, 800, 14, 0x388E3C).setDepth(11);
    
    // Dirt/soil layer
    this.add.rectangle(400, 475, 800, 20, 0x8B4513).setDepth(10);
    this.add.rectangle(400, 490, 800, 20, 0x654321).setDepth(10);
    
    // Animated grass tufts
    this.grassTufts = [];
    for (let i = 0; i < 40; i++) {
      const x = i * 20 + 10;
      const height = 8 + (i % 5) * 2;
      const tuft = this.add.rectangle(x, 420 - height/2, 3, height, 0x66BB6A).setDepth(12);
      this.grassTufts.push({ rect: tuft, baseY: 420 - height/2, phase: i * 0.2 });
    }
  }

  createArenaPlatform() {
    // Main fighting platform (wooden style)
    const platformY = 400;
    
    // Platform shadow
    this.add.ellipse(400, platformY + 25, 650, 30, 0x000000, 0.2).setDepth(15);
    
    // Platform base (wood)
    this.add.rectangle(400, platformY + 10, 620, 16, 0x8B4513).setDepth(16);
    this.add.rectangle(400, platformY + 2, 600, 8, 0xA0522D).setDepth(17);
    
    // Wood grain lines
    for (let i = 0; i < 6; i++) {
      const x = 150 + i * 100;
      this.add.rectangle(x, platformY + 6, 2, 14, 0x654321, 0.5).setDepth(18);
    }
    
    // Platform edge highlights
    this.add.rectangle(100, platformY + 6, 4, 18, 0x654321).setDepth(18);
    this.add.rectangle(700, platformY + 6, 4, 18, 0x654321).setDepth(18);
  }

  createHUD() {
    // === ENHANCED STYLIZED HUD ===
    const hudY = 40;
    
    // Player 1 (YOU) - Left side with premium frame
    const p1X = 140;
    this.hud = {
      p1: {
        // Outer glow
        glow: this.add.rectangle(p1X, hudY, 230, 55, 0x22c55e, 0.3).setDepth(498),
        // Main frame
        frame: this.add.rectangle(p1X, hudY, 220, 48, 0x2a2a4a).setDepth(500).setStrokeStyle(3, 0x22c55e),
        // Inner panel
        innerFrame: this.add.rectangle(p1X, hudY, 210, 40, 0x1a1a2e).setDepth(501),
        // HP bar background
        bgBar: this.add.rectangle(p1X, hudY, 200, 26, 0x333344).setDepth(502).setStrokeStyle(1, 0x444466),
        // HP bar fill
        hpBar: this.add.rectangle(42, hudY, 196, 22, 0x22c55e).setOrigin(0, 0.5).setDepth(503),
        // HP bar shine effect
        shine: this.add.rectangle(42, hudY - 6, 190, 5, 0xffffff, 0.2).setOrigin(0, 0.5).setDepth(504),
        // Player label
        label: this.add.text(48, hudY, "⚔️ YOU", { 
          font: "bold 13px Arial", 
          fill: "#22c55e",
          stroke: "#000",
          strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(505),
        // HP number
        hpText: this.add.text(232, hudY, "100", { 
          font: "bold 14px Arial", 
          fill: "#fff",
          stroke: "#000",
          strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(505),
      },
      p2: {
        // Outer glow
        glow: this.add.rectangle(660, hudY, 230, 55, 0xef4444, 0.3).setDepth(498),
        // Main frame  
        frame: this.add.rectangle(660, hudY, 220, 48, 0x2a2a4a).setDepth(500).setStrokeStyle(3, 0xef4444),
        // Inner panel
        innerFrame: this.add.rectangle(660, hudY, 210, 40, 0x1a1a2e).setDepth(501),
        // HP bar background
        bgBar: this.add.rectangle(660, hudY, 200, 26, 0x333344).setDepth(502).setStrokeStyle(1, 0x444466),
        // HP bar fill
        hpBar: this.add.rectangle(562, hudY, 196, 22, 0xef4444).setOrigin(0, 0.5).setDepth(503),
        // HP bar shine effect
        shine: this.add.rectangle(562, hudY - 6, 190, 5, 0xffffff, 0.2).setOrigin(0, 0.5).setDepth(504),
        // Enemy label
        label: this.add.text(568, hudY, "💀 ENEMY", { 
          font: "bold 13px Arial", 
          fill: "#ef4444",
          stroke: "#000",
          strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(505),
        // HP number
        hpText: this.add.text(752, hudY, "100", { 
          font: "bold 14px Arial", 
          fill: "#fff",
          stroke: "#000",
          strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(505),
      },
      // VS badge in center - make it pop
      vsBg: this.add.circle(400, hudY, 28, 0x1a1a2e).setDepth(505).setStrokeStyle(4, 0xf59e0b),
      vsGlow: this.add.circle(400, hudY, 32, 0xf59e0b, 0.3).setDepth(504),
      vs: this.add.text(400, hudY, "⚔️", { 
        font: "bold 20px Arial", 
        fill: "#f59e0b",
        stroke: "#000",
        strokeThickness: 3 
      }).setOrigin(0.5, 0.5).setDepth(506),
    };
    
    // Pulse animation on VS badge
    this.tweens.add({
      targets: [this.hud.vsGlow],
      scale: 1.2,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    // Subtle glow pulse on health bar frames
    this.tweens.add({
      targets: [this.hud.p1.glow],
      alpha: 0.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    this.tweens.add({
      targets: [this.hud.p2.glow],
      alpha: 0.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    // Controls help (styled better)
    const controlsBg = this.add.rectangle(400, 485, 360, 28, 0x1a1a2e, 0.85).setDepth(100);
    controlsBg.setStrokeStyle(2, 0x3b3b5c);
    this.add.text(400, 485, "← → Move  |  ↑ Jump  |  Z Attack  |  X Heavy", {
      font: "bold 11px Arial",
      fill: "#94a3b8",
    }).setOrigin(0.5, 0.5).setDepth(101);
  }

  loadMatchProfiles() {
    const match = window.currentMatch;
    console.log("[ArenaScene] loadMatchProfiles called with match:", match);
    if (match) {
      this.myPlayerId = match.playerId;
      this.playerSelectedCharacters = this.playerSelectedCharacters || {};
      
      if (match.players) {
        console.log("[ArenaScene] Match players:", Object.keys(match.players));
        Object.keys(match.players).forEach(pid => {
          const playerInfo = match.players[pid];
          console.log(`[ArenaScene] Player ${pid} info:`, playerInfo?.profile);
          if (playerInfo?.profile) {
            // Store avatar for fallback rendering
            if (playerInfo.profile.avatar) {
              this.playerProfiles[pid] = playerInfo.profile.avatar;
            }
            // Store selected character ID
            if (playerInfo.profile.selectedCharacter) {
              this.playerSelectedCharacters[pid] = playerInfo.profile.selectedCharacter;
              console.log(`[ArenaScene] ✅ Selected character for ${pid}:`, playerInfo.profile.selectedCharacter);
            } else {
              console.log(`[ArenaScene] ❌ No character selected for ${pid}, using default`);
            }
          }
        });
      }
    }
  }

  // Get character ID for a player
  getCharacterIdForPlayer(pid) {
    const charId = this.playerSelectedCharacters?.[pid] || 'char_warrior';
    console.log(`[ArenaScene] getCharacterIdForPlayer(${pid}) = ${charId}`, this.playerSelectedCharacters);
    return charId;
  }

  // Create layered character sprite from PNG files
  createLayeredCharacter(pid, characterId) {
    // Map character IDs to folder names (char_warrior -> warrior)
    const charTypeMap = {
      'char_warrior': 'warrior',
      'char_mage': 'mage'
    };
    
    const charType = charTypeMap[characterId] || 'warrior';
    const containerKey = `layered_${pid}_${characterId}`;
    
    console.log(`[ArenaScene] Creating layered character: ${charType} for player ${pid}`);
    
    // Check if at least the base layer exists, otherwise fall back to procedural
    const baseTextureKey = `${charType}_base`;
    if (!this.textures.exists(baseTextureKey)) {
      console.warn(`[ArenaScene] PNG layers not found for ${charType}, falling back to procedural rendering`);
      return this.createProceduralCharacter(pid, characterId);
    }
    
    // Get texture dimensions from the first available texture
    const firstTextureKey = `${charType}_base`;
    const texture = this.textures.get(firstTextureKey);
    const frame = texture.getSourceImage();
    const originalWidth = frame.width || 64;
    const originalHeight = frame.height || 64;
    
    // Target size for characters (64x64)
    const targetSize = 64;
    const scale = targetSize / Math.max(originalWidth, originalHeight);
    const finalWidth = Math.round(originalWidth * scale);
    const finalHeight = Math.round(originalHeight * scale);
    
    console.log(`[ArenaScene] Original texture: ${originalWidth}x${originalHeight}, scaling to: ${finalWidth}x${finalHeight} (scale: ${scale.toFixed(2)})`);
    
    // Create a render texture at the target size
    const renderTexture = this.make.renderTexture({ width: targetSize, height: targetSize, add: false });
    
    // Center offset for smaller images
    const offsetX = (targetSize - finalWidth) / 2;
    const offsetY = (targetSize - finalHeight) / 2;
    
    // Stack layers in order: base -> hair -> clothing
    const layers = ['base', 'hair', 'clothing'];
    let layersDrawn = 0;
    layers.forEach(layer => {
      const textureKey = `${charType}_${layer}`;
      if (this.textures.exists(textureKey)) {
        const tex = this.textures.get(textureKey);
        if (tex && tex.source && tex.source.length > 0) {
          // Create a temporary sprite to scale the texture
          const tempSprite = this.add.sprite(offsetX, offsetY, textureKey);
          tempSprite.setOrigin(0, 0);
          tempSprite.setScale(scale);
          renderTexture.draw(tempSprite, offsetX, offsetY);
          tempSprite.destroy();
          console.log(`[ArenaScene] ✓ Drew layer: ${textureKey} at scale ${scale.toFixed(2)}`);
          layersDrawn++;
        } else {
          console.warn(`[ArenaScene] ✗ Texture exists but invalid: ${textureKey}`);
        }
      } else {
        console.warn(`[ArenaScene] ✗ Missing texture: ${textureKey}`);
      }
    });
    
    // If no layers were drawn, fall back to procedural
    if (layersDrawn === 0) {
      console.warn(`[ArenaScene] No PNG layers drawn, falling back to procedural rendering`);
      renderTexture.destroy();
      return this.createProceduralCharacter(pid, characterId);
    }
    
    // Save the combined texture
    renderTexture.saveTexture(containerKey);
    renderTexture.destroy();
    
    console.log(`[ArenaScene] ✓ Created layered texture: ${containerKey} with ${layersDrawn} layers (${finalWidth}x${finalHeight})`);
    return containerKey;
  }

  // Create procedurally drawn character (warrior, mage, rogue, etc.)
  createProceduralCharacter(pid, characterId) {
    const texKey = `char_${pid}_${characterId}`;
    
    // Skip if already created
    if (this.textures.exists(texKey)) {
      return texKey;
    }
    
    const size = 64;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Character definitions with distinct visual styles
    const characters = {
      'char_warrior': {
        colors: { body: 0xD4A574, armor: 0x5A5A5A, weapon: 0x8B8B8B, accent: 0x8B4513 },
        draw: (g) => {
          // Body (centered)
          g.fillStyle(characters.char_warrior.colors.body, 1);
          g.fillEllipse(32, 42, 12, 16); // Head
          g.fillRoundedRect(26, 50, 12, 10, 2); // Neck/torso
          
          // Armor
          g.fillStyle(characters.char_warrior.colors.armor, 1);
          g.fillRoundedRect(20, 48, 24, 20, 3); // Chest plate
          g.fillRect(20, 65, 24, 3); // Belt
          
          // Helmet
          g.fillStyle(characters.char_warrior.colors.armor, 1);
          g.fillEllipse(32, 38, 14, 10); // Helmet top
          g.fillRect(26, 38, 12, 6); // Helmet bottom
          
          // Horns
          g.fillStyle(characters.char_warrior.colors.accent, 1);
          g.fillTriangle(22, 36, 20, 30, 24, 34); // Left horn
          g.fillTriangle(42, 36, 44, 30, 40, 34); // Right horn
          
          // Arms
          g.fillStyle(characters.char_warrior.colors.armor, 1);
          g.fillRoundedRect(16, 52, 6, 14, 2); // Left arm
          g.fillRoundedRect(42, 52, 6, 14, 2); // Right arm
          
          // Legs
          g.fillStyle(characters.char_warrior.colors.accent, 1);
          g.fillRoundedRect(24, 68, 7, 12, 2); // Left leg
          g.fillRoundedRect(33, 68, 7, 12, 2); // Right leg
          
          // Sword
          g.fillStyle(characters.char_warrior.colors.weapon, 1);
          g.fillRect(48, 54, 3, 16); // Blade
          g.fillStyle(characters.char_warrior.colors.accent, 1);
          g.fillRect(46, 68, 7, 3); // Handle
          
          // Shield
          g.fillStyle(characters.char_warrior.colors.armor, 1);
          g.fillEllipse(14, 58, 5, 8); // Shield
        }
      },
      'char_mage': {
        colors: { body: 0xD4A574, robe: 0x4A4AFF, staff: 0x8B4513, orb: 0x00FFFF },
        draw: (g) => {
          // Head
          g.fillStyle(characters.char_mage.colors.body, 1);
          g.fillEllipse(32, 42, 11, 14);
          
          // Wizard hat
          g.fillStyle(characters.char_mage.colors.robe, 1);
          g.fillTriangle(32, 25, 24, 42, 40, 42); // Hat cone
          g.fillEllipse(32, 42, 13, 4); // Hat brim
          
          // Robe
          g.fillStyle(characters.char_mage.colors.robe, 1);
          g.fillRoundedRect(22, 48, 20, 24, 4); // Body robe
          g.fillTriangle(22, 72, 18, 78, 26, 78); // Left sleeve
          g.fillTriangle(42, 72, 38, 78, 46, 78); // Right sleeve
          
          // Staff
          g.fillStyle(characters.char_mage.colors.staff, 1);
          g.fillRect(48, 44, 2, 24); // Staff
          g.fillStyle(characters.char_mage.colors.orb, 1);
          g.fillCircle(49, 42, 4); // Orb
          
          // Belt
          g.fillStyle(0xFFD700, 1);
          g.fillRect(24, 60, 16, 2);
        }
      },
      'char_rogue': {
        colors: { body: 0xD4A574, clothes: 0x2F4F2F, dagger: 0xC0C0C0, hood: 0x1A1A1A },
        draw: (g) => {
          // Head
          g.fillStyle(characters.char_rogue.colors.body, 1);
          g.fillEllipse(32, 44, 10, 12);
          
          // Hood
          g.fillStyle(characters.char_rogue.colors.hood, 1);
          g.fillTriangle(32, 32, 22, 44, 42, 44);
          
          // Body
          g.fillStyle(characters.char_rogue.colors.clothes, 1);
          g.fillRoundedRect(24, 50, 16, 18, 3);
          
          // Arms (slimmer)
          g.fillRoundedRect(18, 52, 5, 12, 2);
          g.fillRoundedRect(41, 52, 5, 12, 2);
          
          // Legs
          g.fillRoundedRect(26, 68, 6, 12, 2);
          g.fillRoundedRect(32, 68, 6, 12, 2);
          
          // Daggers
          g.fillStyle(characters.char_rogue.colors.dagger, 1);
          g.fillRect(16, 56, 2, 8); // Left dagger
          g.fillRect(46, 56, 2, 8); // Right dagger
        }
      },
      'char_tank': {
        colors: { body: 0xD4A574, armor: 0x8B4513, metal: 0x708090, shield: 0xCD7F32 },
        draw: (g) => {
          // Large body
          g.fillStyle(characters.char_tank.colors.body, 1);
          g.fillEllipse(32, 42, 13, 15);
          
          // Heavy armor
          g.fillStyle(characters.char_tank.colors.armor, 1);
          g.fillRoundedRect(18, 46, 28, 24, 4);
          
          // Metal plates
          g.fillStyle(characters.char_tank.colors.metal, 1);
          g.fillRect(20, 48, 24, 3);
          g.fillRect(20, 54, 24, 3);
          g.fillRect(20, 60, 24, 3);
          
          // Helmet
          g.fillStyle(characters.char_tank.colors.metal, 1);
          g.fillRect(26, 36, 12, 10);
          g.fillRect(28, 38, 8, 2); // Eye slit
          
          // Large shield
          g.fillStyle(characters.char_tank.colors.shield, 1);
          g.fillRoundedRect(10, 48, 8, 20, 3);
          
          // Legs (thick)
          g.fillStyle(characters.char_tank.colors.armor, 1);
          g.fillRoundedRect(22, 70, 9, 10, 2);
          g.fillRoundedRect(33, 70, 9, 10, 2);
        }
      },
      'char_archer': {
        colors: { body: 0xD4A574, clothes: 0x8B6914, leather: 0x654321, bow: 0x8B4513 },
        draw: (g) => {
          // Head
          g.fillStyle(characters.char_archer.colors.body, 1);
          g.fillEllipse(32, 42, 10, 13);
          
          // Leather cap
          g.fillStyle(characters.char_archer.colors.leather, 1);
          g.fillEllipse(32, 38, 12, 8);
          
          // Tunic
          g.fillStyle(characters.char_archer.colors.clothes, 1);
          g.fillRoundedRect(24, 48, 16, 20, 3);
          
          // Arms
          g.fillStyle(characters.char_archer.colors.body, 1);
          g.fillRoundedRect(18, 50, 5, 14, 2);
          g.fillRoundedRect(41, 50, 5, 14, 2);
          
          // Legs
          g.fillStyle(characters.char_archer.colors.leather, 1);
          g.fillRoundedRect(26, 68, 6, 12, 2);
          g.fillRoundedRect(34, 68, 6, 12, 2);
          
          // Bow (arc shape)
          g.lineStyle(2, characters.char_archer.colors.bow, 1);
          g.strokeCircle(48, 56, 8);
          g.lineBetween(44, 48, 44, 64); // String
          
          // Quiver
          g.fillStyle(characters.char_archer.colors.leather, 1);
          g.fillRect(38, 46, 4, 10);
        }
      },
      'char_assassin': {
        colors: { body: 0xD4A574, clothes: 0x1C1C1C, mask: 0x2A2A2A, blade: 0xFF0000 },
        draw: (g) => {
          // Head
          g.fillStyle(characters.char_assassin.colors.body, 1);
          g.fillEllipse(32, 44, 9, 11);
          
          // Mask
          g.fillStyle(characters.char_assassin.colors.mask, 1);
          g.fillRect(26, 40, 12, 8);
          g.fillStyle(0xFF0000, 1);
          g.fillRect(28, 42, 2, 2); // Left eye
          g.fillRect(34, 42, 2, 2); // Right eye
          
          // Dark cloak
          g.fillStyle(characters.char_assassin.colors.clothes, 1);
          g.fillRoundedRect(23, 50, 18, 18, 3);
          
          // Arms
          g.fillRoundedRect(17, 52, 5, 13, 2);
          g.fillRoundedRect(42, 52, 5, 13, 2);
          
          // Legs
          g.fillRoundedRect(25, 68, 7, 12, 2);
          g.fillRoundedRect(32, 68, 7, 12, 2);
          
          // Dual blades (red glow)
          g.fillStyle(characters.char_assassin.colors.blade, 1);
          g.fillRect(15, 58, 2, 10);
          g.fillRect(47, 58, 2, 10);
        }
      },
      'char_paladin': {
        colors: { body: 0xD4A574, armor: 0xFFD700, cloth: 0xFFFFFF, aura: 0xFFFF00 },
        draw: (g) => {
          // Holy aura (glowing effect)
          g.fillStyle(characters.char_paladin.colors.aura, 0.3);
          g.fillCircle(32, 50, 28);
          
          // Head
          g.fillStyle(characters.char_paladin.colors.body, 1);
          g.fillEllipse(32, 42, 11, 14);
          
          // Golden helmet
          g.fillStyle(characters.char_paladin.colors.armor, 1);
          g.fillEllipse(32, 38, 13, 10);
          g.fillRect(26, 38, 12, 6);
          
          // White cape
          g.fillStyle(characters.char_paladin.colors.cloth, 1);
          g.fillTriangle(20, 50, 14, 72, 26, 72);
          g.fillTriangle(44, 50, 38, 72, 50, 72);
          
          // Golden armor
          g.fillStyle(characters.char_paladin.colors.armor, 1);
          g.fillRoundedRect(22, 48, 20, 22, 3);
          
          // Arms
          g.fillRoundedRect(18, 52, 5, 14, 2);
          g.fillRoundedRect(41, 52, 5, 14, 2);
          
          // Legs
          g.fillStyle(characters.char_paladin.colors.cloth, 1);
          g.fillRoundedRect(24, 70, 7, 10, 2);
          g.fillRoundedRect(33, 70, 7, 10, 2);
          
          // Holy sword
          g.fillStyle(0xFFFFFF, 1);
          g.fillRect(48, 50, 3, 18);
          g.fillStyle(characters.char_paladin.colors.armor, 1);
          g.fillRect(46, 66, 7, 3);
        }
      },
      'char_ninja': {
        colors: { body: 0xD4A574, clothes: 0x4B0082, mask: 0x000000, blade: 0xC0C0C0 },
        draw: (g) => {
          // Head with mask
          g.fillStyle(characters.char_ninja.colors.body, 1);
          g.fillEllipse(32, 42, 10, 12);
          
          // Ninja mask
          g.fillStyle(characters.char_ninja.colors.mask, 1);
          g.fillRect(26, 38, 12, 10);
          g.fillStyle(0xFFFFFF, 1);
          g.fillRect(28, 41, 2, 3); // Left eye
          g.fillRect(34, 41, 2, 3); // Right eye
          
          // Purple ninja outfit
          g.fillStyle(characters.char_ninja.colors.clothes, 1);
          g.fillRoundedRect(23, 48, 18, 20, 3);
          
          // Belt
          g.fillStyle(0x000000, 1);
          g.fillRect(23, 58, 18, 2);
          
          // Arms (ready stance)
          g.fillStyle(characters.char_ninja.colors.clothes, 1);
          g.fillRoundedRect(16, 50, 6, 14, 2);
          g.fillRoundedRect(42, 50, 6, 14, 2);
          
          // Legs
          g.fillRoundedRect(25, 68, 6, 12, 2);
          g.fillRoundedRect(33, 68, 6, 12, 2);
          
          // Katana
          g.fillStyle(characters.char_ninja.colors.blade, 1);
          g.fillRect(10, 52, 2, 14);
          g.fillStyle(0x000000, 1);
          g.fillRect(9, 64, 4, 3);
          
          // Shuriken
          g.fillStyle(characters.char_ninja.colors.blade, 1);
          g.lineBetween(48, 54, 52, 58);
          g.lineBetween(48, 58, 52, 54);
        }
      },
      'char_berserker': {
        colors: { body: 0xD4A574, fur: 0x8B4513, skin: 0xCD5C5C, axe: 0x696969 },
        draw: (g) => {
          // Large muscular body
          g.fillStyle(characters.char_berserker.colors.skin, 1);
          g.fillEllipse(32, 42, 13, 15);
          
          // Wild hair/beard
          g.fillStyle(characters.char_berserker.colors.fur, 1);
          g.fillEllipse(32, 36, 16, 12); // Hair
          g.fillEllipse(32, 48, 10, 6); // Beard
          
          // Angry eyes (red)
          g.fillStyle(0xFF0000, 1);
          g.fillRect(27, 41, 3, 2);
          g.fillRect(34, 41, 3, 2);
          
          // Bare chest with scars
          g.fillStyle(characters.char_berserker.colors.skin, 1);
          g.fillRoundedRect(20, 50, 24, 18, 3);
          g.lineStyle(1, 0x8B0000, 1);
          g.lineBetween(22, 56, 28, 60); // Scar
          
          // Fur pants
          g.fillStyle(characters.char_berserker.colors.fur, 1);
          g.fillRoundedRect(22, 68, 9, 12, 2);
          g.fillRoundedRect(31, 68, 9, 12, 2);
          
          // Arms (huge)
          g.fillStyle(characters.char_berserker.colors.skin, 1);
          g.fillRoundedRect(14, 52, 7, 16, 2);
          g.fillRoundedRect(43, 52, 7, 16, 2);
          
          // Giant axe
          g.fillStyle(characters.char_berserker.colors.axe, 1);
          g.fillTriangle(48, 46, 54, 50, 52, 54); // Axe head
          g.fillRect(50, 54, 2, 12); // Handle
        }
      },
      'char_monk': {
        colors: { body: 0xD4A574, robe: 0xFF8C00, sash: 0xFFD700, chakra: 0x00FF00 },
        draw: (g) => {
          // Bald head
          g.fillStyle(characters.char_monk.colors.body, 1);
          g.fillEllipse(32, 40, 11, 13);
          
          // Meditation dots
          g.fillStyle(characters.char_monk.colors.sash, 1);
          g.fillCircle(32, 36, 2);
          
          // Orange monk robe
          g.fillStyle(characters.char_monk.colors.robe, 1);
          g.fillRoundedRect(22, 48, 20, 22, 4);
          
          // Golden sash
          g.fillStyle(characters.char_monk.colors.sash, 1);
          g.fillRect(24, 58, 16, 3);
          
          // Arms in meditation pose
          g.fillStyle(characters.char_monk.colors.body, 1);
          g.fillRoundedRect(16, 54, 6, 10, 2);
          g.fillRoundedRect(42, 54, 6, 10, 2);
          
          // Legs (crossed)
          g.fillStyle(characters.char_monk.colors.robe, 1);
          g.fillRoundedRect(20, 70, 24, 10, 3);
          
          // Chi energy (green aura)
          g.fillStyle(characters.char_monk.colors.chakra, 0.3);
          g.fillCircle(16, 58, 4);
          g.fillCircle(48, 58, 4);
        }
      },
      'char_necromancer': {
        colors: { body: 0xD4A574, robe: 0x8B008B, skull: 0xFFFFFF, magic: 0x00FF00 },
        draw: (g) => {
          // Hooded head
          g.fillStyle(characters.char_necromancer.colors.body, 1);
          g.fillEllipse(32, 42, 10, 12);
          
          // Dark purple hood
          g.fillStyle(characters.char_necromancer.colors.robe, 1);
          g.fillTriangle(32, 28, 20, 44, 44, 44);
          
          // Glowing purple eyes
          g.fillStyle(0xFF00FF, 1);
          g.fillCircle(28, 42, 2);
          g.fillCircle(36, 42, 2);
          
          // Dark robe
          g.fillStyle(characters.char_necromancer.colors.robe, 1);
          g.fillRoundedRect(20, 48, 24, 24, 4);
          
          // Tattered edges
          g.fillTriangle(20, 72, 16, 78, 24, 76);
          g.fillTriangle(44, 72, 40, 76, 48, 78);
          
          // Skeletal hands
          g.fillStyle(characters.char_necromancer.colors.skull, 1);
          g.fillEllipse(14, 58, 4, 6);
          g.fillEllipse(50, 58, 4, 6);
          
          // Skull staff
          g.fillStyle(0x4B0082, 1);
          g.fillRect(10, 46, 2, 20);
          g.fillStyle(characters.char_necromancer.colors.skull, 1);
          g.fillCircle(11, 44, 4); // Skull
          
          // Death magic (green swirl)
          g.fillStyle(characters.char_necromancer.colors.magic, 0.4);
          g.fillCircle(11, 44, 6);
        }
      },
      'char_samurai': {
        colors: { body: 0xD4A574, armor: 0xC71585, katana: 0xFFFFFF, gold: 0xFFD700 },
        draw: (g) => {
          // Head
          g.fillStyle(characters.char_samurai.colors.body, 1);
          g.fillEllipse(32, 42, 11, 13);
          
          // Samurai helmet (kabuto)
          g.fillStyle(characters.char_samurai.colors.armor, 1);
          g.fillEllipse(32, 36, 14, 8);
          g.fillRect(26, 36, 12, 6);
          
          // Helmet ornament
          g.fillStyle(characters.char_samurai.colors.gold, 1);
          g.fillCircle(32, 32, 3);
          
          // Armor plates (lamellar)
          g.fillStyle(characters.char_samurai.colors.armor, 1);
          g.fillRoundedRect(22, 48, 20, 6, 2);
          g.fillRoundedRect(22, 56, 20, 6, 2);
          g.fillRoundedRect(22, 64, 20, 6, 2);
          
          // Gold trim
          g.fillStyle(characters.char_samurai.colors.gold, 1);
          g.fillRect(22, 54, 20, 1);
          g.fillRect(22, 62, 20, 1);
          
          // Arms
          g.fillStyle(characters.char_samurai.colors.armor, 1);
          g.fillRoundedRect(18, 50, 5, 14, 2);
          g.fillRoundedRect(41, 50, 5, 14, 2);
          
          // Legs
          g.fillRoundedRect(24, 70, 7, 10, 2);
          g.fillRoundedRect(33, 70, 7, 10, 2);
          
          // Katana (curved blade)
          g.fillStyle(characters.char_samurai.colors.katana, 1);
          g.fillRect(48, 48, 2, 18);
          g.lineStyle(2, characters.char_samurai.colors.katana, 1);
          g.strokeCircle(49, 48, 3);
          g.fillStyle(characters.char_samurai.colors.gold, 1);
          g.fillRect(47, 64, 4, 3); // Handle wrap
        }
      }
    };
    
    // Get character or default to warrior
    const char = characters[characterId] || characters['char_warrior'];
    
    // Draw the character
    char.draw(graphics);
    
    // Generate texture
    graphics.generateTexture(texKey, size, size);
    graphics.destroy();
    
    console.log(`[ArenaScene] Created procedural character: ${texKey}`);
    return texKey;
  }

  // Preload equipped asset images for a player
  async preloadEquippedAssets(pid) {
    const urls = this.playerEquippedUrls?.[pid];
    if (!urls || Object.keys(urls).length === 0) {
      console.log(`[ArenaScene] No equipped URLs to preload for ${pid}`);
      return false;
    }

    const loadPromises = [];
    const loadedKeys = [];

    Object.entries(urls).forEach(([assetId, url]) => {
      if (!url) return;
      const textureKey = `asset_${pid}_${assetId}`;
      
      // Skip if already loaded
      if (this.textures.exists(textureKey)) {
        loadedKeys.push({ assetId, textureKey });
        return;
      }

      // Load the image
      loadPromises.push(
        new Promise((resolve) => {
          this.load.image(textureKey, url);
          this.load.once(`filecomplete-image-${textureKey}`, () => {
            loadedKeys.push({ assetId, textureKey });
            resolve();
          });
          this.load.once(`loaderror`, (file) => {
            if (file.key === textureKey) {
              console.warn(`[ArenaScene] Failed to load asset: ${url}`);
              resolve(); // Continue even on error
            }
          });
        })
      );
    });

    if (loadPromises.length > 0) {
      this.load.start();
      await Promise.all(loadPromises);
    }

    // Store loaded texture keys
    this.loadedAssetTextures = this.loadedAssetTextures || {};
    this.loadedAssetTextures[pid] = loadedKeys;
    
    console.log(`[ArenaScene] Preloaded ${loadedKeys.length} assets for ${pid}`);
    return loadedKeys.length > 0;
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

  // Create a layered sprite container using equipped asset images
  createAssetBasedSprite(pid, x, y) {
    const equippedUrls = this.playerEquippedUrls?.[pid];
    if (!equippedUrls || Object.keys(equippedUrls).length === 0) {
      return null;
    }

    // Layer order for rendering (back to front)
    const ASSET_LAYER_ORDER = ['background', 'body', 'bottoms', 'shoes', 'tops', 'eyes', 'mouth', 'hair', 'accessory', 'effect'];
    
    const container = this.add.container(x, y);
    container.setDepth(200);
    
    let layerIndex = 0;
    const equipped = this.playerEquipped?.[pid] || {};
    
    ASSET_LAYER_ORDER.forEach(category => {
      const assetId = equipped[category];
      if (!assetId) return;
      
      const url = equippedUrls[assetId];
      if (!url) return;
      
      const textureKey = `asset_${pid}_${assetId}`;
      
      // Check if texture is loaded
      if (this.textures.exists(textureKey)) {
        const sprite = this.add.sprite(0, -32, textureKey);
        sprite.setOrigin(0.5, 1);
        sprite.setDisplaySize(64, 64);
        sprite.setDepth(layerIndex);
        container.add(sprite);
        layerIndex++;
      } else {
        // Try to load it dynamically
        this.load.image(textureKey, url);
        this.load.once(`filecomplete-image-${textureKey}`, () => {
          const sprite = this.add.sprite(0, -32, textureKey);
          sprite.setOrigin(0.5, 1);
          sprite.setDisplaySize(64, 64);
          sprite.setDepth(layerIndex);
          container.add(sprite);
        });
        this.load.start();
      }
    });

    return container;
  }

  // Load and create a character from an image file
  loadCharacterImage(pid, imagePath, x, y, facingRight = true) {
    const textureKey = `character_${pid}`;
    
    // Check if already loaded
    if (this.textures.exists(textureKey)) {
      this.createCharacterSprite(pid, textureKey, x, y, facingRight);
      return;
    }
    
    // Load the character image
    this.load.image(textureKey, imagePath);
    this.load.once(`filecomplete-image-${textureKey}`, () => {
      console.log(`[ArenaScene] Character image loaded: ${textureKey}`);
      this.createCharacterSprite(pid, textureKey, x, y, facingRight);
    });
    this.load.once('loaderror', (file) => {
      if (file.key === textureKey) {
        console.warn(`[ArenaScene] Failed to load character image: ${imagePath}, using fallback`);
        const animator = new CharacterAnimator(this, x, y, pid);
        const avatar = this.playerProfiles[pid] || null;
        animator.createFallbackCharacter(avatar);
        
        const nameLabel = this.add.text(x, y - 80, pid === this.myPlayerId ? "YOU" : "ENEMY", { 
          font: "bold 11px Arial", 
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(300);
        
        this.players[pid] = { 
          sprite: animator.getContainer(),
          animator,
          nameLabel,
          isMyPlayer: pid === this.myPlayerId,
          isContainer: true,
          facingRight,
          loading: false
        };
      }
    });
    this.load.start();
  }

  // Create sprite from loaded character image
  createCharacterSprite(pid, textureKey, x, y, facingRight = true) {
    const sprite = this.add.sprite(x, y, textureKey);
    sprite.setOrigin(0.5, 1); // Bottom-center anchor
    sprite.setDisplaySize(64, 64); // Match character size
    sprite.setDepth(200);
    sprite.setFlipX(!facingRight); // Flip if facing left
    
    const isMyPlayer = pid === this.myPlayerId;
    
    // Add floating name label
    const nameLabel = this.add.text(x, y - 80, isMyPlayer ? "YOU" : "ENEMY", { 
      font: "bold 11px Arial", 
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(300);
    
    // Update existing player object or create new one
    this.players[pid] = { 
      sprite,
      nameLabel,
      isMyPlayer,
      isContainer: false,
      facingRight,
      isImageCharacter: true,
      loading: false
    };
    
    console.log(`[ArenaScene] Character sprite created for ${pid} at (${x}, ${y})`);
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
        
        const startX = p.x || 100 + idx * 200;
        const startY = p.y || 400;
        
        // Get selected character ID (char_warrior, char_mage, etc.)
        const characterId = this.getCharacterIdForPlayer(pid);
        console.log(`[ArenaScene] Creating character for ${pid}, type: ${characterId}`);
        
        // Create layered PNG character (base + hair + clothing)
        const texKey = this.createLayeredCharacter(pid, characterId);
        
        // Create sprite from generated texture
        const sprite = this.add.sprite(startX, startY, texKey);
        sprite.setOrigin(0.5, 1); // Bottom-center anchor
        sprite.setDisplaySize(64, 64);
        sprite.setDepth(200);
        sprite.setFlipX(!(p.facingRight ?? true));
        
        // Add floating name label
        const nameLabel = this.add.text(startX, startY - 80, isMyPlayer ? "YOU" : "ENEMY", { 
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
          isContainer: false,
          facingRight: p.facingRight ?? true
        };
      } else {
        // Update existing player
        const player = this.players[pid];
        
        // Skip updates if still loading
        if (player.loading) {
          return;
        }
        
        const animator = player.animator;
        
        if (animator) {
          // Update animator with server state (handles position, facing, and animation)
          animator.updateFromServer(p);
          
          // Update name label position
          if (player.nameLabel) {
            const pos = animator.getPosition();
            player.nameLabel.x = pos.x;
            player.nameLabel.y = pos.y - 80;
          }
        } else if (player.sprite) {
          // For image-based or simple sprite players
          const sprite = player.sprite;
          
          // Update facing direction from server
          if (p.facingRight !== undefined && p.facingRight !== player.facingRight) {
            player.facingRight = p.facingRight;
            if (player.isContainer) {
              sprite.scaleX = p.facingRight ? 1 : -1;
            } else {
              sprite.setFlipX(!p.facingRight);
            }
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
      }
    });

    // Play intro animation when both players exist
    if (Object.keys(this.players).length >= 2 && !this.matchIntroPlayed) {
      this.matchIntroPlayed = true;
      this.playMatchIntro();
    }

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

  playMatchIntro() {
    // Dim the screen briefly
    const overlay = this.add.rectangle(400, 250, 800, 500, 0x000000, 0.7);
    overlay.setDepth(900);
    
    // "READY?" text
    const readyText = this.add.text(400, 250, "READY?", {
      font: "bold 72px Arial",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(901).setScale(0.1).setAlpha(0);
    
    // Animate ready text
    this.tweens.add({
      targets: readyText,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold briefly then transition to FIGHT
        this.time.delayedCall(400, () => {
          readyText.destroy();
          
          // "FIGHT!" text
          const fightText = this.add.text(400, 250, "⚔️ FIGHT! ⚔️", {
            font: "bold 84px Arial",
            fill: "#f59e0b",
            stroke: "#000000",
            strokeThickness: 10
          }).setOrigin(0.5).setDepth(901).setScale(0.1);
          
          // Camera zoom punch effect
          this.cameras.main.zoomTo(1.05, 150, "Power2");
          
          this.tweens.add({
            targets: fightText,
            scale: 1.2,
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
              // Shake camera
              this.cameras.main.shake(150, 0.01);
              
              // Reset zoom
              this.cameras.main.zoomTo(1, 200);
              
              // Fade out fight text and overlay
              this.tweens.add({
                targets: [fightText, overlay],
                alpha: 0,
                duration: 400,
                delay: 200,
                onComplete: () => {
                  fightText.destroy();
                  overlay.destroy();
                }
              });
            }
          });
        });
      }
    });
  }
  updatePlayerVisuals(pid, serverState, player) {
    const sprite = player.sprite;
    
    // Store current state for animation
    const prevState = player.currentState || "idle";
    player.currentState = serverState.attackState || "idle";
    
    // Tint based on attack state with better colors
    if (serverState.attackState === "hurt") {
      sprite.setTint(0xff4444); // Bright red when hurt
      // Flash effect
      this.tweens.add({
        targets: sprite,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
        repeat: 2
      });
    } else if (serverState.attackState === "punch") {
      sprite.setTint(0xffdd44); // Gold tint when punching
    } else if (serverState.attackState === "heavy") {
      sprite.setTint(0xff6600); // Orange tint when heavy attacking
    } else if (serverState.attackState === "blocking") {
      sprite.setTint(0x4488ff); // Blue tint when blocking
    } else {
      sprite.clearTint();
    }
    
    // Animation effects based on state
    if (player.currentState !== prevState) {
      // Stop any existing tweens on sprite
      this.tweens.killTweensOf(sprite);
      
      if (serverState.attackState === "punch") {
        // Quick jab animation
        const dir = player.facingRight ? 1 : -1;
        this.tweens.add({
          targets: sprite,
          x: sprite.x + (dir * 15),
          scaleX: player.isContainer ? (player.facingRight ? 1.15 : -1.15) : 1.15,
          scaleY: 0.95,
          duration: 80,
          yoyo: true,
          ease: 'Power2'
        });
        // Punch swoosh
        this.createPunchEffect(sprite.x + (dir * 40), sprite.y - 30, player.facingRight);
      } else if (serverState.attackState === "heavy") {
        // Heavy attack animation - bigger swing
        const dir = player.facingRight ? 1 : -1;
        this.tweens.add({
          targets: sprite,
          x: sprite.x + (dir * 25),
          scaleX: player.isContainer ? (player.facingRight ? 1.3 : -1.3) : 1.3,
          scaleY: 0.85,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut'
        });
        // Heavy swoosh with more impact
        this.createHeavyEffect(sprite.x + (dir * 50), sprite.y - 30, player.facingRight);
      } else if (serverState.attackState === "hurt") {
        // Knockback animation
        const knockDir = player.facingRight ? -1 : 1;
        this.tweens.add({
          targets: sprite,
          x: sprite.x + (knockDir * 10),
          duration: 100,
          yoyo: true,
          ease: 'Power1'
        });
      } else {
        // Reset to normal scale
        sprite.setScale(player.isContainer ? (player.facingRight ? 1 : -1) : 1, 1);
      }
    }
    
    // Jumping animation
    if (!serverState.grounded) {
      // Squash when going up, stretch when coming down
      const squash = serverState.vy < 0 ? 0.9 : 1.1;
      const stretch = serverState.vy < 0 ? 1.1 : 0.9;
      sprite.setScale(player.isContainer ? (player.facingRight ? squash : -squash) : squash, stretch);
    }
  }

  createPunchEffect(x, y, facingRight) {
    const dir = facingRight ? 1 : -1;
    
    // Quick punch line
    const line = this.add.rectangle(x, y, 25, 4, 0xffff00);
    line.setAngle(facingRight ? -15 : 195);
    line.setDepth(400);
    line.setAlpha(0.8);
    
    this.tweens.add({
      targets: line,
      x: x + (dir * 20),
      scaleX: 1.5,
      alpha: 0,
      duration: 100,
      onComplete: () => line.destroy()
    });
    
    // Small impact particles
    for (let i = 0; i < 3; i++) {
      const particle = this.add.circle(x + (dir * 10), y + (i - 1) * 8, 3, 0xffdd00);
      particle.setDepth(400);
      this.tweens.add({
        targets: particle,
        x: particle.x + (dir * (20 + Math.random() * 15)),
        y: particle.y + (Math.random() - 0.5) * 20,
        alpha: 0,
        scale: 0.3,
        duration: 150 + Math.random() * 100,
        onComplete: () => particle.destroy()
      });
    }
  }

  createHeavyEffect(x, y, facingRight) {
    const dir = facingRight ? 1 : -1;
    
    // Big swoosh arc
    const arc = this.add.arc(x, y, 35, 
      facingRight ? -60 : 120, 
      facingRight ? 60 : 240, 
      false, 0xff6600, 0.7);
    arc.setDepth(400);
    arc.setStrokeStyle(4, 0xff9900);
    
    this.tweens.add({
      targets: arc,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => arc.destroy()
    });
    
    // Impact burst particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI - Math.PI / 2;
      const particle = this.add.star(x, y, 4, 4, 8, 0xff6600);
      particle.setDepth(400);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 40 * dir,
        y: y + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0.2,
        rotation: Math.PI,
        duration: 250,
        onComplete: () => particle.destroy()
      });
    }
    
    // Screen shake for heavy attacks
    this.cameras.main.shake(80, 0.008);
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
    
    // Screen shake - stronger for heavy hits
    const shakeIntensity = event.damage > 15 ? 0.02 : 0.01;
    this.cameras.main.shake(120, shakeIntensity);
    
    // Damage number with style
    const dmgText = this.add.text(
      victim.sprite.x + (Math.random() - 0.5) * 20, 
      victim.sprite.y - 50,
      `-${event.damage}`,
      { 
        font: "bold 24px Arial", 
        fill: event.damage > 15 ? "#ff4400" : "#ff0000",
        stroke: "#000",
        strokeThickness: 4
      }
    ).setOrigin(0.5).setDepth(600);
    
    // Animate damage number - float up and fade
    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 60,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: "Power2",
      onComplete: () => dmgText.destroy()
    });
    
    // Hit spark burst
    const sparkCount = event.damage > 15 ? 8 : 5;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2;
      const spark = this.add.star(
        victim.sprite.x, 
        victim.sprite.y - 30, 
        4, 3, 8, 
        event.damage > 15 ? 0xff6600 : 0xffff00
      );
      spark.setDepth(550);
      
      this.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * (30 + Math.random() * 20),
        y: spark.y + Math.sin(angle) * (25 + Math.random() * 15),
        scale: 0.1,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 300 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => spark.destroy()
      });
    }
    
    // Impact ring
    const ring = this.add.circle(victim.sprite.x, victim.sprite.y - 30, 10, 0xffffff, 0);
    ring.setStrokeStyle(3, 0xffffff);
    ring.setDepth(545);
    
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 200,
      ease: "Power2",
      onComplete: () => ring.destroy()
    });
  }

  showAttackEffect(event) {
    const attacker = this.players[event.attacker];
    if (!attacker) return;
    
    const dir = attacker.facing === 'right' ? 1 : -1;
    const x = attacker.sprite.x + (dir * 40);
    const y = attacker.sprite.y - 30;
    
    // Slash visual effect
    const isHeavy = event.attackType === 'heavy';
    const slashColor = isHeavy ? 0xff6600 : 0x88ccff;
    
    // Create slash arc
    const slash = this.add.graphics();
    slash.setDepth(550);
    
    const arcRadius = isHeavy ? 50 : 35;
    const startAngle = dir > 0 ? -0.8 : Math.PI + 0.8;
    const endAngle = dir > 0 ? 0.8 : Math.PI - 0.8;
    
    slash.lineStyle(isHeavy ? 8 : 5, slashColor, 1);
    slash.beginPath();
    slash.arc(x - dir * 20, y, arcRadius, startAngle, endAngle, dir < 0);
    slash.strokePath();
    
    // Fade out slash
    this.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 150,
      ease: "Power2",
      onComplete: () => slash.destroy()
    });
    
    // Speed lines
    for (let i = 0; i < 5; i++) {
      const line = this.add.rectangle(
        x - dir * 30 + Math.random() * 20,
        y - 10 + Math.random() * 20,
        isHeavy ? 30 : 20,
        2,
        slashColor
      );
      line.setDepth(545);
      line.setRotation(dir > 0 ? -0.3 : Math.PI + 0.3);
      
      this.tweens.add({
        targets: line,
        x: line.x + dir * 40,
        alpha: 0,
        scaleX: 2,
        duration: 100 + Math.random() * 100,
        ease: "Power2",
        onComplete: () => line.destroy()
      });
    }
    
    // Attacker lunge animation
    if (attacker.sprite) {
      const originalX = attacker.sprite.x;
      this.tweens.add({
        targets: attacker.sprite,
        x: originalX + dir * 15,
        duration: 50,
        yoyo: true,
        ease: "Power1"
      });
      
      // Slight rotation for attack swing
      this.tweens.add({
        targets: attacker.sprite,
        angle: dir * 8,
        duration: 80,
        yoyo: true,
        ease: "Power2"
      });
    }
  }

  showDeathEffect(event) {
    const victim = this.players[event.victim];
    if (!victim) return;
    
    // Dramatic death effect
    this.cameras.main.shake(200, 0.03);
    this.cameras.main.flash(200, 255, 100, 100);
    
    // KO text
    const koText = this.add.text(400, 250, "💀 K.O.! 💀", {
      font: "bold 48px Arial",
      fill: "#ff0000",
      stroke: "#000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(700).setScale(0.1);
    
    this.tweens.add({
      targets: koText,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut"
    });
    
    // Explosion particles around victim
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const particle = this.add.circle(
        victim.sprite.x,
        victim.sprite.y - 30,
        8 + Math.random() * 8,
        [0xff0000, 0xff6600, 0xffff00][Math.floor(Math.random() * 3)]
      );
      particle.setDepth(600);
      
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * (80 + Math.random() * 40),
        y: particle.y + Math.sin(angle) * (60 + Math.random() * 30),
        scale: 0,
        alpha: 0,
        duration: 600 + Math.random() * 300,
        ease: "Power3",
        onComplete: () => particle.destroy()
      });
    }
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
      const targetWidth = 196 * hpPercent;
      const currentHp = Math.max(0, Math.ceil(myState.hp));
      
      // Smooth HP bar animation
      this.tweens.add({
        targets: this.hud.p1.hpBar,
        width: targetWidth,
        duration: 200,
        ease: "Power2"
      });
      
      // Update color based on HP
      const newColor = hpPercent > 0.5 ? 0x22c55e : hpPercent > 0.25 ? 0xeab308 : 0xef4444;
      this.hud.p1.hpBar.fillColor = newColor;
      
      // Shake frame when HP is low
      if (hpPercent <= 0.25 && hpPercent > 0) {
        this.hud.p1.frame.setStrokeStyle(3, 0xef4444);
        if (!this.hud.p1.lowHpPulse) {
          this.hud.p1.lowHpPulse = this.tweens.add({
            targets: this.hud.p1.glow,
            alpha: 0.5,
            duration: 300,
            yoyo: true,
            repeat: -1
          });
        }
      } else if (this.hud.p1.lowHpPulse) {
        this.hud.p1.lowHpPulse.stop();
        this.hud.p1.lowHpPulse = null;
        this.hud.p1.frame.setStrokeStyle(3, 0x22c55e);
      }
      
      if (this.hud.p1.hpText) {
        this.hud.p1.hpText.setText(`${currentHp}`);
        // Flash text red when taking damage
        const prevHp = this.hud.p1.lastHp || 100;
        if (currentHp < prevHp) {
          this.tweens.add({
            targets: this.hud.p1.hpText,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: "Power2"
          });
        }
        this.hud.p1.lastHp = currentHp;
      }
    }
    
    if (oppState && this.hud.p2) {
      const hpPercent = Math.max(0, oppState.hp) / (oppState.maxHp || 100);
      const targetWidth = 196 * hpPercent;
      const currentHp = Math.max(0, Math.ceil(oppState.hp));
      
      // Smooth HP bar animation
      this.tweens.add({
        targets: this.hud.p2.hpBar,
        width: targetWidth,
        duration: 200,
        ease: "Power2"
      });
      
      // Color - inverted for enemy (red is healthy)
      const newColor = hpPercent > 0.5 ? 0xef4444 : hpPercent > 0.25 ? 0xeab308 : 0x22c55e;
      this.hud.p2.hpBar.fillColor = newColor;
      
      if (this.hud.p2.hpText) {
        this.hud.p2.hpText.setText(`${currentHp}`);
        // Flash when enemy takes damage (satisfying feedback)
        const prevHp = this.hud.p2.lastHp || 100;
        if (currentHp < prevHp) {
          this.tweens.add({
            targets: this.hud.p2.hpText,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: "Power2"
          });
        }
        this.hud.p2.lastHp = currentHp;
      }
    }
  }

  destroyPlayer(pid) {
    const player = this.players[pid];
    if (!player) return;
    
    // Destroy animator if exists
    if (player.animator) {
      player.animator.destroy();
    } else {
      player.sprite?.destroy();
    }
    
    player.nameLabel?.destroy();
    delete this.players[pid];
    delete this.playerAnimators[pid];
  }

  update(time, delta) {
    if (this.matchEnded) return;
    
    // Update all character animators
    Object.values(this.playerAnimators).forEach(animator => {
      animator.update(delta);
    });
    
    // === ANIMATE BACKGROUND ELEMENTS ===
    this.bgAnimTime += delta * 0.001;
    
    // Animate clouds (move right, wrap around)
    if (this.clouds) {
      this.clouds.forEach(cloud => {
        cloud.container.x += cloud.speed;
        if (cloud.container.x > 850) {
          cloud.container.x = -50;
        }
      });
    }
    
    // Animate sparkles (twinkle effect)
    if (this.sparkles) {
      this.sparkles.forEach(sparkle => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(this.bgAnimTime * 2 + sparkle.phase));
        const scale = 0.8 + 0.4 * Math.abs(Math.sin(this.bgAnimTime * 2 + sparkle.phase));
        sparkle.text.setAlpha(alpha).setScale(scale);
      });
    }
    
    // Animate grass tufts (gentle sway)
    if (this.grassTufts) {
      this.grassTufts.forEach(tuft => {
        const sway = Math.sin(this.bgAnimTime * 3 + tuft.phase) * 2;
        tuft.rect.setAngle(sway);
      });
    }
    
    // Toggle debug with D key
    if (Phaser.Input.Keyboard.JustDown(this.keyD)) {
      this.debugText.setVisible(!this.debugText.visible);
    }
    
    // === INPUT HANDLING ===
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

      // Debug log when attacking
      if (inputs.attack || inputs.heavy) {
        console.log("[ArenaScene] Attack inputs:", inputs.attack, inputs.heavy);
      }

      if (typeof window.sendInput === "function") {
        const matchId = window.currentMatch?.matchId;
        const playerId = window.currentMatch?.playerId;
        
        if (!matchId) {
          console.warn("[ArenaScene] No matchId! window.currentMatch =", window.currentMatch);
        }
        
        const payload = {
          type: "input",
          matchId: matchId || null,
          tick: Date.now(),
          inputs
        };
        
        // Debug: log occasional input with match info
        if (inputs.attack || inputs.heavy || inputs.left || inputs.right || inputs.up) {
          console.log(`[ArenaScene] Sending input (match=${matchId}, player=${playerId}):`, JSON.stringify(inputs));
        }
        
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
    if (window.arenaSetCosmetic) delete window.arenaSetCosmetic;
    if (window.arenaApplyCosmetics) delete window.arenaApplyCosmetics;
  }
}
