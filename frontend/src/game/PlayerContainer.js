// frontend/src/game/PlayerContainer.js
// Player Container Class for Avatar Layering System
// Manages a Phaser Container with base body + cosmetic layers

import Phaser from 'phaser';
import { getAssetInfo, getZIndex, getAnchor, loadAssetsDynamic, DEFAULT_ANCHOR } from '../utils/avatarLoader';

/**
 * LAYER ORDER (z-index, lower = further back):
 * 
 * shadow     (5)   - Ground shadow
 * body       (10)  - Base body sprite
 * bottoms    (15)  - Pants, shorts, skirts
 * shoes      (16)  - Footwear
 * tops       (20)  - Shirts, jackets, armor
 * face       (25)  - Base face (if separate)
 * eyes       (26)  - Eye cosmetics
 * mouth      (27)  - Mouth/expression
 * hair       (30)  - Hair styles
 * hat        (35)  - Hats, helmets, headgear
 * accessory  (40)  - Accessories (glasses, earrings)
 * weapon     (42)  - Held weapons
 * effect     (50)  - Auras, particles, effects
 * 
 * FLIP HANDLING:
 * When the character faces left (flipX = true), all children
 * in the container are also flipped. We handle this by setting
 * container.scaleX = -1 for left-facing.
 */

// Categories that can have cosmetics
export const COSMETIC_CATEGORIES = [
  'body',
  'bottoms', 
  'shoes',
  'tops',
  'face',
  'eyes',
  'mouth',
  'hair',
  'hat',
  'accessory',
  'weapon',
  'effect'
];

/**
 * PlayerContainer - A Phaser Container that holds a player with cosmetic layers
 */
export class PlayerContainer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   * @param {string} playerId - Unique player ID
   * @param {Object} options - Options
   * @param {number} options.scale - Scale factor (default 1)
   * @param {number} options.depth - Container depth (default 200)
   */
  constructor(scene, x, y, playerId, options = {}) {
    this.scene = scene;
    this.playerId = playerId;
    this.scale = options.scale || 1;
    
    // Create the main container
    this.container = scene.add.container(x, y);
    this.container.setDepth(options.depth || 200);
    this.container.setScale(this.scale);
    
    // Store references to layer sprites (keyed by category)
    this.layers = {};
    
    // Current cosmetics state
    this.cosmetics = {};
    
    // Facing direction (true = right, false = left)
    this.facingRight = true;
    
    // Animation state
    this.animState = 'idle';
    this.animTime = 0;
    
    // Create idle animation tween
    this.idleTween = null;
    this.startIdleAnimation();
  }

  /**
   * Start the idle bobbing animation
   */
  startIdleAnimation() {
    if (this.idleTween) {
      this.idleTween.stop();
    }
    
    // Store base Y for reference
    this.baseY = this.container.y;
    
    // Subtle idle bob
    this.idleTween = this.scene.tweens.add({
      targets: this.container,
      y: this.baseY - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Stop idle animation (for walk/action states)
   */
  stopIdleAnimation() {
    if (this.idleTween) {
      this.idleTween.stop();
      this.container.y = this.baseY || this.container.y;
    }
  }

  /**
   * Set a cosmetic layer
   * @param {string} category - Category (hair, top, etc.)
   * @param {string} assetId - Asset ID from manifest (e.g., 'hair_2')
   * @returns {Promise} Resolves when layer is set
   */
  async setCosmetic(category, assetId) {
    if (!COSMETIC_CATEGORIES.includes(category)) {
      console.warn(`[PlayerContainer] Unknown category: ${category}`);
      return;
    }
    
    // Remove existing layer for this category
    this.clearCosmetic(category);
    
    if (!assetId) {
      delete this.cosmetics[category];
      return;
    }
    
    // Get asset info from manifest
    const info = getAssetInfo(assetId);
    
    // Load asset if not already loaded
    if (!this.scene.textures.exists(assetId)) {
      if (info) {
        await loadAssetsDynamic(this.scene, [assetId]);
      } else {
        console.warn(`[PlayerContainer] Asset not found: ${assetId}`);
        return;
      }
    }
    
    // Create the sprite
    const anchor = getAnchor(info);
    const zIndex = getZIndex(info);
    
    const sprite = this.scene.add.image(0, 0, assetId);
    sprite.setOrigin(anchor.x, anchor.y);
    sprite.setDepth(zIndex);
    
    // Add to container
    this.container.add(sprite);
    this.layers[category] = sprite;
    this.cosmetics[category] = assetId;
    
    // Sort children by depth
    this.container.sort('depth');
    
    console.log(`[PlayerContainer] Set ${category} = ${assetId}`);
  }

  /**
   * Clear a cosmetic layer
   * @param {string} category 
   */
  clearCosmetic(category) {
    if (this.layers[category]) {
      this.layers[category].destroy();
      delete this.layers[category];
    }
    delete this.cosmetics[category];
  }

  /**
   * Apply multiple cosmetics at once
   * @param {Object} cosmeticsObj - { hair: 'hair_1', top: 'top_2', ... }
   * @returns {Promise}
   */
  async applyCosmetics(cosmeticsObj) {
    if (!cosmeticsObj || typeof cosmeticsObj !== 'object') return;
    
    // Collect all asset IDs to load
    const assetIds = Object.values(cosmeticsObj).filter(Boolean);
    
    // Pre-load all assets
    await loadAssetsDynamic(this.scene, assetIds);
    
    // Apply each cosmetic
    for (const [category, assetId] of Object.entries(cosmeticsObj)) {
      if (COSMETIC_CATEGORIES.includes(category)) {
        await this.setCosmetic(category, assetId);
      }
    }
  }

  /**
   * Get current cosmetics state
   * @returns {Object}
   */
  getCosmetics() {
    return { ...this.cosmetics };
  }

  /**
   * Set facing direction
   * @param {boolean} facingRight - true = face right, false = face left
   */
  setFacing(facingRight) {
    if (this.facingRight === facingRight) return;
    
    this.facingRight = facingRight;
    // Flip entire container horizontally
    this.container.scaleX = facingRight ? this.scale : -this.scale;
  }

  /**
   * Set position
   * @param {number} x 
   * @param {number} y 
   */
  setPosition(x, y) {
    this.container.setPosition(x, y);
    this.baseY = y;
  }

  /**
   * Get current position
   * @returns {{x: number, y: number}}
   */
  getPosition() {
    return { x: this.container.x, y: this.container.y };
  }

  /**
   * Update from server state
   * @param {Object} serverState - { x, y, vx, vy, facingRight, attackState, grounded }
   */
  updateFromServer(serverState) {
    // Smooth position interpolation
    const lerpFactor = 0.3;
    if (serverState.x !== undefined) {
      this.container.x = Phaser.Math.Linear(this.container.x, serverState.x, lerpFactor);
    }
    if (serverState.y !== undefined) {
      this.container.y = Phaser.Math.Linear(this.container.y, serverState.y, lerpFactor);
      this.baseY = serverState.y;
    }
    
    // Update facing
    if (serverState.facingRight !== undefined) {
      this.setFacing(serverState.facingRight);
    }
    
    // Update animation state
    this.updateAnimationState(serverState);
  }

  /**
   * Update animation state based on server state
   * @param {Object} state 
   */
  updateAnimationState(state) {
    let newState = 'idle';
    
    if (state.attackState === 'hurt') {
      newState = 'hurt';
    } else if (state.attackState === 'punch' || state.attackState === 'heavy') {
      newState = 'attack';
    } else if (!state.grounded) {
      newState = state.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(state.vx || 0) > 10) {
      newState = 'walk';
    }
    
    if (newState !== this.animState) {
      this.animState = newState;
      this.applyAnimationState(newState);
    }
  }

  /**
   * Apply visual changes for animation state
   * @param {string} state 
   */
  applyAnimationState(state) {
    // Reset any running animation tweens
    this.scene.tweens.killTweensOf(this.container);
    
    switch (state) {
      case 'idle':
        this.container.setAngle(0);
        this.startIdleAnimation();
        break;
        
      case 'walk':
        this.stopIdleAnimation();
        // Slight bob while walking
        this.scene.tweens.add({
          targets: this.container,
          y: this.baseY - 4,
          duration: 150,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
        
      case 'jump':
        this.stopIdleAnimation();
        // Squash before jump
        this.scene.tweens.add({
          targets: this.container,
          scaleY: this.scale * 1.1,
          duration: 100,
          yoyo: true
        });
        break;
        
      case 'fall':
        this.stopIdleAnimation();
        // Stretch while falling
        this.container.scaleY = this.scale * 0.95;
        break;
        
      case 'attack': {
        this.stopIdleAnimation();
        // Quick lunge forward
        const dir = this.facingRight ? 1 : -1;
        this.scene.tweens.add({
          targets: this.container,
          x: this.container.x + (dir * 10),
          angle: dir * 5,
          duration: 80,
          yoyo: true,
          ease: 'Power2'
        });
        break;
      }
        
      case 'hurt':
        this.stopIdleAnimation();
        // Flash red and shake
        this.container.setTint(0xff4444);
        this.scene.tweens.add({
          targets: this.container,
          x: this.container.x + (Math.random() - 0.5) * 10,
          duration: 50,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            this.container.clearTint();
          }
        });
        break;
    }
  }

  /**
   * Create a fallback character when no assets are available
   * @param {Object} colors - { body, hair, shirt, pants }
   */
  createFallback(colors = {}) {
    const bodyColor = colors.body || colors.color || '#3b82f6';
    const hairColor = colors.hair || '#4a3728';
    const shirtColor = colors.shirt || bodyColor;
    const pantsColor = colors.pants || '#1e40af';
    const skinColor = colors.skin || '#ffcc99';
    
    // Create graphics for fallback character
    const g = this.scene.add.graphics();
    
    // Convert hex colors to numbers
    const toNum = (hex) => parseInt(hex.replace('#', ''), 16);
    
    // Draw at 0,0 with origin at bottom-center
    // Body/torso
    g.fillStyle(toNum(shirtColor), 1);
    g.fillRoundedRect(-12, -40, 24, 20, 3);
    
    // Head
    g.fillStyle(toNum(skinColor), 1);
    g.fillCircle(0, -48, 10);
    
    // Hair
    g.fillStyle(toNum(hairColor), 1);
    g.fillEllipse(0, -54, 16, 8);
    
    // Eyes
    g.fillStyle(0x000000, 1);
    g.fillCircle(-4, -48, 2);
    g.fillCircle(4, -48, 2);
    
    // Pants
    g.fillStyle(toNum(pantsColor), 1);
    g.fillRect(-10, -20, 9, 18);
    g.fillRect(1, -20, 9, 18);
    
    // Arms
    g.fillStyle(toNum(skinColor), 1);
    g.fillRect(-17, -38, 5, 14);
    g.fillRect(12, -38, 5, 14);
    
    // Shoes
    g.fillStyle(0x333333, 1);
    g.fillRect(-11, -3, 10, 4);
    g.fillRect(1, -3, 10, 4);
    
    // Generate texture
    const texKey = `fallback_${this.playerId}_${Date.now()}`;
    g.generateTexture(texKey, 40, 60);
    g.destroy();
    
    // Create sprite from texture
    const sprite = this.scene.add.image(0, 0, texKey);
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(10);
    
    this.container.add(sprite);
    this.layers['body'] = sprite;
  }

  /**
   * Get the Phaser container
   * @returns {Phaser.GameObjects.Container}
   */
  getContainer() {
    return this.container;
  }

  /**
   * Destroy the player container
   */
  destroy() {
    if (this.idleTween) {
      this.idleTween.stop();
    }
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
    this.layers = {};
    this.cosmetics = {};
  }
}

export default PlayerContainer;
