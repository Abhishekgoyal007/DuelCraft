// frontend/src/game/CharacterAnimator.js
// Layered PNG Character Animation System
// Composes multiple PNG layers (body, hair, clothes, etc.) and animates them procedurally

import Phaser from "phaser";

/**
 * ASSET SPECIFICATION:
 * All asset parts should follow these rules:
 * - Canvas size: 128x128 pixels (or 256x256 for HD)
 * - Transparent PNG background
 * - Bottom-center anchor (feet at bottom center of canvas)
 * - Consistent alignment across all parts
 * 
 * LAYER ORDER (back to front):
 * 1. shadow (optional)
 * 2. back_accessory (cape, wings, etc.)
 * 3. legs / pants
 * 4. body / torso
 * 5. top / shirt
 * 6. arms (can be split: left_arm, right_arm for rotation)
 * 7. head
 * 8. face / eyes
 * 9. hair
 * 10. hat / helmet
 * 11. front_accessory (weapon, shield)
 * 12. effects (aura, particles)
 */

// Layer rendering order
export const LAYER_ORDER = [
  "shadow",
  "back_accessory", 
  "legs",
  "body",
  "top",
  "left_arm",
  "right_arm",
  "head",
  "face",
  "eyes",
  "hair",
  "hat",
  "front_accessory",
  "weapon",
  "effect"
];

// Animation states
export const ANIM_STATE = {
  IDLE: "idle",
  WALK: "walk",
  JUMP: "jump",
  FALL: "fall",
  PUNCH: "punch",
  HEAVY: "heavy",
  HURT: "hurt",
  BLOCK: "block"
};

/**
 * CharacterAnimator - Handles layered PNG composition and procedural animation
 */
export class CharacterAnimator {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position (ground level, sprite anchored at bottom)
   * @param {string} playerId - Unique player identifier
   */
  constructor(scene, x, y, playerId) {
    this.scene = scene;
    this.playerId = playerId;
    this.baseX = x;
    this.baseY = y;
    
    // Container holds all layers
    this.container = scene.add.container(x, y);
    this.container.setDepth(200); // Above background, below HUD
    
    // Layer sprites (keyed by layer name)
    this.layers = {};
    
    // Animation state
    this.state = ANIM_STATE.IDLE;
    this.prevState = ANIM_STATE.IDLE;
    this.facingRight = true;
    
    // Animation timing
    this.animTime = 0;
    this.stateStartTime = 0;
    
    // Tweens storage (to stop them when state changes)
    this.activeTweens = [];
    
    // Physics state (synced from server)
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    
    // Character dimensions (smaller size)
    this.width = 48;
    this.height = 64;
    
    // Limb pivots for rotation animation (relative to container origin)
    this.pivots = {
      left_arm: { x: -8, y: -30 },
      right_arm: { x: 8, y: -30 },
      left_leg: { x: -6, y: -15 },
      right_leg: { x: 6, y: -15 }
    };
  }

  /**
   * Load and add layer sprites from equipped URLs
   * @param {Object} equippedUrls - Map of layer name to image URL
   * @returns {Promise} Resolves when all layers are loaded
   */
  async loadLayers(equippedUrls) {
    if (!equippedUrls || Object.keys(equippedUrls).length === 0) {
      console.warn(`[CharacterAnimator] No equipped URLs for ${this.playerId}`);
      return;
    }

    const loadPromises = [];

    // Load each layer
    for (const [layerName, url] of Object.entries(equippedUrls)) {
      if (!url) continue;
      
      const textureKey = `char_${this.playerId}_${layerName}`;
      
      // Skip if already loaded
      if (this.scene.textures.exists(textureKey)) {
        this.addLayerSprite(layerName, textureKey);
        continue;
      }

      // Load the image
      loadPromises.push(
        new Promise((resolve) => {
          this.scene.load.image(textureKey, url);
          this.scene.load.once(`filecomplete-image-${textureKey}`, () => {
            this.addLayerSprite(layerName, textureKey);
            resolve();
          });
          this.scene.load.once('loaderror', (file) => {
            if (file.key === textureKey) {
              console.warn(`[CharacterAnimator] Failed to load ${layerName}: ${url}`);
              resolve(); // Continue even on error
            }
          });
        })
      );
    }

    if (loadPromises.length > 0) {
      this.scene.load.start();
      await Promise.all(loadPromises);
    }

    // Sort layers by render order
    this.sortLayers();
    
    console.log(`[CharacterAnimator] Loaded ${Object.keys(this.layers).length} layers for ${this.playerId}`);
  }

  /**
   * Add a sprite for a layer with proper positioning
   */
  addLayerSprite(layerName, textureKey) {
    if (this.layers[layerName]) {
      this.layers[layerName].destroy();
    }

    // Layer positioning configuration (matches LayeredCharacterPreview.jsx)
    const LAYER_CONFIG = {
      background: { zIndex: 0, offsetY: 0, scale: 1.0 },
      body: { zIndex: 2, offsetY: 0, scale: 1.0 },
      bottoms: { zIndex: 3, offsetY: 10, scale: 1.0 },
      shoes: { zIndex: 3, offsetY: 15, scale: 1.0 },
      tops: { zIndex: 4, offsetY: -5, scale: 1.0 },
      mouth: { zIndex: 5, offsetY: -40, scale: 1.0 },
      eyes: { zIndex: 6, offsetY: -45, scale: 1.0 },
      hair: { zIndex: 8, offsetY: -50, scale: 1.0 },
      accessory: { zIndex: 9, offsetY: -50, scale: 1.0 },
      effect: { zIndex: 10, offsetY: -30, scale: 1.1 }
    };

    const sprite = this.scene.add.sprite(0, 0, textureKey);
    sprite.setOrigin(0.5, 1); // Bottom-center anchor
    
    // Scale down large assets to fit character size (48x64 target)
    const targetWidth = 48;
    const targetHeight = 64;
    const scaleX = targetWidth / sprite.width;
    const scaleY = targetHeight / sprite.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    // Apply layer-specific positioning
    const config = LAYER_CONFIG[layerName] || { zIndex: 5, offsetY: 0, scale: 1.0 };
    sprite.setScale(scale * config.scale);
    sprite.y = config.offsetY; // Position relative to container
    sprite.setDepth(config.zIndex);
    
    // Store layer info
    sprite.layerName = layerName;
    this.layers[layerName] = sprite;
    this.container.add(sprite);
  }

  /**
   * Sort layers by render order (depth within container)
   */
  sortLayers() {
    LAYER_ORDER.forEach((layerName, index) => {
      if (this.layers[layerName]) {
        this.layers[layerName].setDepth(index);
      }
    });
    this.container.sort('depth');
  }

  /**
   * Create a fallback colored rectangle character (when no assets loaded)
   * @param {Object} avatar - Avatar color config { skinColor, hairColor, shirtColor, pantsColor }
   */
  createFallbackCharacter(avatar = {}) {
    const colors = {
      skin: parseInt((avatar.skinColor || '#ffcc99').replace('#', ''), 16),
      hair: parseInt((avatar.hairColor || '#4a3728').replace('#', ''), 16),
      shirt: parseInt((avatar.shirtColor || avatar.color || '#3b82f6').replace('#', ''), 16),
      pants: parseInt((avatar.pantsColor || '#1e40af').replace('#', ''), 16)
    };

    // Clear existing layers
    Object.values(this.layers).forEach(s => s.destroy());
    this.layers = {};

    // Create simple rectangle character - SMALL SIZE (48x64 total)
    const g = this.scene.add.graphics();
    
    // Draw character centered at 0,0 with origin at bottom-center
    // Total size: 32 wide, 48 tall
    
    // Body/torso (shirt)
    g.fillStyle(colors.shirt, 1);
    g.fillRoundedRect(-12, -40, 24, 22, 4);
    
    // Head
    g.fillStyle(colors.skin, 1);
    g.fillCircle(0, -48, 10);
    
    // Hair
    g.fillStyle(colors.hair, 1);
    g.fillEllipse(0, -54, 16, 8);
    
    // Eyes
    g.fillStyle(0x000000, 1);
    g.fillCircle(-4, -48, 2);
    g.fillCircle(4, -48, 2);
    
    // Pants/legs
    g.fillStyle(colors.pants, 1);
    g.fillRect(-10, -18, 9, 18);
    g.fillRect(1, -18, 9, 18);
    
    // Arms
    g.fillStyle(colors.skin, 1);
    g.fillRect(-17, -38, 5, 16);
    g.fillRect(12, -38, 5, 16);
    
    // Shoes
    g.fillStyle(0x333333, 1);
    g.fillRect(-11, -2, 10, 4);
    g.fillRect(1, -2, 10, 4);

    // Convert to texture - use exact size needed
    const texKey = `fallback_${this.playerId}_${Date.now()}`;
    g.generateTexture(texKey, 40, 64);
    g.destroy();

    // Add as single sprite
    const sprite = this.scene.add.sprite(0, 0, texKey);
    sprite.setOrigin(0.5, 1); // Bottom-center anchor
    // DO NOT scale - the texture is already the right size
    this.layers.body = sprite;
    this.container.add(sprite);
    
    console.log(`[CharacterAnimator] Created fallback character for ${this.playerId}, size: 40x64`);
  }

  /**
   * Set character facing direction
   * @param {boolean} facingRight 
   */
  setFacing(facingRight) {
    if (this.facingRight !== facingRight) {
      this.facingRight = facingRight;
      this.container.scaleX = facingRight ? 1 : -1;
    }
  }

  /**
   * Update position
   * @param {number} x 
   * @param {number} y 
   */
  setPosition(x, y) {
    this.container.x = x;
    this.container.y = y;
    this.baseX = x;
    this.baseY = y;
  }

  /**
   * Set animation state
   * @param {string} newState - One of ANIM_STATE values
   */
  setState(newState) {
    if (this.state !== newState) {
      this.prevState = this.state;
      this.state = newState;
      this.stateStartTime = this.animTime;
      
      // Stop current tweens
      this.stopTweens();
      
      // Reset transforms
      this.resetTransforms();
      
      // Start new animation
      this.startAnimation(newState);
    }
  }

  /**
   * Stop all active tweens
   */
  stopTweens() {
    this.activeTweens.forEach(tween => {
      if (tween && tween.isPlaying) {
        tween.stop();
      }
    });
    this.activeTweens = [];
  }

  /**
   * Reset all layer transforms to default
   */
  resetTransforms() {
    Object.values(this.layers).forEach(sprite => {
      sprite.setPosition(0, 0);
      sprite.setAngle(0);
      sprite.setScale(1, 1);
      sprite.setAlpha(1);
    });
    this.container.y = this.baseY;
  }

  /**
   * Start animation for a state
   */
  startAnimation(state) {
    switch (state) {
      case ANIM_STATE.IDLE:
        this.animateIdle();
        break;
      case ANIM_STATE.WALK:
        this.animateWalk();
        break;
      case ANIM_STATE.JUMP:
        this.animateJump();
        break;
      case ANIM_STATE.FALL:
        this.animateFall();
        break;
      case ANIM_STATE.PUNCH:
        this.animatePunch();
        break;
      case ANIM_STATE.HEAVY:
        this.animateHeavy();
        break;
      case ANIM_STATE.HURT:
        this.animateHurt();
        break;
    }
  }

  /**
   * Idle animation - gentle breathing/bob
   */
  animateIdle() {
    // Whole body gentle bob
    const tween = this.scene.tweens.add({
      targets: this.container,
      y: this.baseY - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.activeTweens.push(tween);

    // Arms slight sway
    if (this.layers.left_arm) {
      const armTween = this.scene.tweens.add({
        targets: this.layers.left_arm,
        angle: -3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.activeTweens.push(armTween);
    }
    if (this.layers.right_arm) {
      const armTween = this.scene.tweens.add({
        targets: this.layers.right_arm,
        angle: 3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 100
      });
      this.activeTweens.push(armTween);
    }
  }

  /**
   * Walk animation - bob + leg movement
   */
  animateWalk() {
    // Body bob (faster than idle)
    const bobTween = this.scene.tweens.add({
      targets: this.container,
      y: this.baseY - 5,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut'
    });
    this.activeTweens.push(bobTween);

    // Leg swing (if separate layers exist)
    if (this.layers.left_leg && this.layers.right_leg) {
      const leftLegTween = this.scene.tweens.add({
        targets: this.layers.left_leg,
        angle: 20,
        y: -2,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      const rightLegTween = this.scene.tweens.add({
        targets: this.layers.right_leg,
        angle: -20,
        y: -2,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 200
      });
      this.activeTweens.push(leftLegTween, rightLegTween);
    }

    // Arm swing
    if (this.layers.left_arm && this.layers.right_arm) {
      const leftArmTween = this.scene.tweens.add({
        targets: this.layers.left_arm,
        angle: -25,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      const rightArmTween = this.scene.tweens.add({
        targets: this.layers.right_arm,
        angle: 25,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 200
      });
      this.activeTweens.push(leftArmTween, rightArmTween);
    }

    // If no separate limbs, do a squash/stretch on whole body
    if (!this.layers.left_leg) {
      const squashTween = this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.05,
        scaleY: 0.95,
        duration: 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.activeTweens.push(squashTween);
    }
  }

  /**
   * Jump animation - squash then stretch
   */
  animateJump() {
    // Initial squash
    this.scene.tweens.add({
      targets: this.container,
      scaleY: 0.85,
      scaleX: 1.15,
      duration: 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Stretch upward
        const stretchTween = this.scene.tweens.add({
          targets: this.container,
          scaleY: 1.15,
          scaleX: 0.9,
          duration: 150,
          ease: 'Quad.easeOut'
        });
        this.activeTweens.push(stretchTween);
      }
    });

    // Arms up
    if (this.layers.left_arm) {
      const armTween = this.scene.tweens.add({
        targets: this.layers.left_arm,
        angle: -45,
        y: -10,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.activeTweens.push(armTween);
    }
    if (this.layers.right_arm) {
      const armTween = this.scene.tweens.add({
        targets: this.layers.right_arm,
        angle: 45,
        y: -10,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.activeTweens.push(armTween);
    }
  }

  /**
   * Fall animation
   */
  animateFall() {
    const tween = this.scene.tweens.add({
      targets: this.container,
      scaleY: 1.1,
      scaleX: 0.95,
      duration: 100,
      ease: 'Quad.easeIn'
    });
    this.activeTweens.push(tween);

    // Arms spread
    if (this.layers.left_arm) {
      this.layers.left_arm.setAngle(-30);
    }
    if (this.layers.right_arm) {
      this.layers.right_arm.setAngle(30);
    }
  }

  /**
   * Punch animation - quick forward thrust
   */
  animatePunch() {
    // Forward lunge
    const lungeTween = this.scene.tweens.add({
      targets: this.container,
      x: this.baseX + (this.facingRight ? 15 : -15),
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.activeTweens.push(lungeTween);

    // Punch arm forward
    if (this.layers.right_arm) {
      const armTween = this.scene.tweens.add({
        targets: this.layers.right_arm,
        angle: this.facingRight ? -60 : 60,
        x: this.facingRight ? 20 : -20,
        y: -15,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      this.activeTweens.push(armTween);
    }

    // Body lean
    const leanTween = this.scene.tweens.add({
      targets: this.container,
      angle: this.facingRight ? 8 : -8,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.activeTweens.push(leanTween);

    // Squash effect
    const squashTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.1,
      scaleY: 0.95,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.activeTweens.push(squashTween);
  }

  /**
   * Heavy attack animation - bigger windup and follow through
   */
  animateHeavy() {
    // Windup (pull back)
    this.scene.tweens.add({
      targets: this.container,
      x: this.baseX - (this.facingRight ? 10 : -10),
      angle: this.facingRight ? -15 : 15,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Smash forward
        const smashTween = this.scene.tweens.add({
          targets: this.container,
          x: this.baseX + (this.facingRight ? 25 : -25),
          angle: this.facingRight ? 20 : -20,
          scaleX: 1.2,
          scaleY: 0.85,
          duration: 100,
          ease: 'Quad.easeOut',
          yoyo: true,
          hold: 50
        });
        this.activeTweens.push(smashTween);
      }
    });

    // Both arms swing
    if (this.layers.left_arm && this.layers.right_arm) {
      this.scene.tweens.add({
        targets: [this.layers.left_arm, this.layers.right_arm],
        angle: this.facingRight ? -90 : 90,
        duration: 250,
        ease: 'Back.easeOut',
        yoyo: true
      });
    }
  }

  /**
   * Hurt animation - recoil and flash
   */
  animateHurt() {
    // Knockback
    const knockTween = this.scene.tweens.add({
      targets: this.container,
      x: this.baseX - (this.facingRight ? 20 : -20),
      duration: 100,
      ease: 'Quad.easeOut'
    });
    this.activeTweens.push(knockTween);

    // Flash red
    Object.values(this.layers).forEach(sprite => {
      sprite.setTint(0xff4444);
    });
    
    // Flash effect
    const flashTween = this.scene.tweens.add({
      targets: Object.values(this.layers),
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        Object.values(this.layers).forEach(sprite => {
          sprite.clearTint();
          sprite.setAlpha(1);
        });
      }
    });
    this.activeTweens.push(flashTween);

    // Squash from impact
    const squashTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.85,
      scaleY: 1.15,
      angle: this.facingRight ? -10 : 10,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.activeTweens.push(squashTween);
  }

  /**
   * Update animation based on physics state from server
   * Call this every frame with server state
   * @param {Object} serverState - { x, y, vx, vy, grounded, attackState, facingRight }
   */
  updateFromServer(serverState) {
    if (!serverState) return;

    // Update position smoothly
    const targetX = serverState.x;
    const targetY = serverState.y;
    this.container.x = Phaser.Math.Linear(this.container.x, targetX, 0.3);
    this.container.y = Phaser.Math.Linear(this.container.y, targetY, 0.3);
    this.baseX = targetX;
    this.baseY = targetY;

    // Update facing
    if (serverState.facingRight !== undefined) {
      this.setFacing(serverState.facingRight);
    }

    // Store physics for animation decisions
    this.vx = serverState.vx || 0;
    this.vy = serverState.vy || 0;
    this.grounded = serverState.grounded !== false;

    // Determine animation state from server state
    let newState = ANIM_STATE.IDLE;

    if (serverState.attackState === "hurt") {
      newState = ANIM_STATE.HURT;
    } else if (serverState.attackState === "punch") {
      newState = ANIM_STATE.PUNCH;
    } else if (serverState.attackState === "heavy") {
      newState = ANIM_STATE.HEAVY;
    } else if (!this.grounded) {
      newState = this.vy < 0 ? ANIM_STATE.JUMP : ANIM_STATE.FALL;
    } else if (Math.abs(this.vx) > 20) {
      newState = ANIM_STATE.WALK;
    }

    this.setState(newState);
  }

  /**
   * Manual update (called every frame)
   * @param {number} delta - Frame delta time in ms
   */
  update(delta) {
    this.animTime += delta;
  }

  /**
   * Get container for external use (e.g., adding name labels)
   */
  getContainer() {
    return this.container;
  }

  /**
   * Get current position
   */
  getPosition() {
    return { x: this.container.x, y: this.container.y };
  }

  /**
   * Destroy the animator and all resources
   */
  destroy() {
    this.stopTweens();
    Object.values(this.layers).forEach(sprite => sprite.destroy());
    this.container.destroy();
  }
}

export default CharacterAnimator;
