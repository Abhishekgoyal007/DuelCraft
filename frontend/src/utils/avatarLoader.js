// frontend/src/utils/avatarLoader.js
// Avatar Asset Loader Utility
// Handles loading manifest.json and preloading all layer assets into Phaser

/**
 * MANIFEST FORMAT:
 * [
 *   {
 *     "id": "hair_0",
 *     "category": "hair",
 *     "filename": "hair_0.png",
 *     "anchor": { "x": 0.5, "y": 0.85 },
 *     "zIndex": 10,
 *     "name": "Default Hair",
 *     "price": 0
 *   },
 *   ...
 * ]
 * 
 * ANCHOR EXPLANATION:
 * - anchor.x: 0.5 = horizontally centered
 * - anchor.y: 0.85 = origin near bottom (feet grounded)
 * - All layers use same anchor so they align when stacked
 * 
 * Z-ORDER (lower = further back):
 * 0-4: background effects
 * 5: shadow
 * 10: body/base
 * 15: bottoms/pants
 * 20: tops/shirt
 * 25: face/eyes
 * 30: hair
 * 35: hat/helmet
 * 40: front accessories
 * 50: effects/aura
 */

const MANIFEST_URL = '/assets/characters/manifest.json';
const ASSETS_BASE_URL = '/assets/characters/layers/256';

// Default z-index by category
export const CATEGORY_Z_INDEX = {
  shadow: 5,
  body: 10,
  bottoms: 15,
  shoes: 16,
  tops: 20,
  face: 25,
  eyes: 26,
  mouth: 27,
  hair: 30,
  hat: 35,
  accessory: 40,
  weapon: 42,
  effect: 50
};

// Default anchor (bottom-center, suitable for standing characters)
export const DEFAULT_ANCHOR = { x: 0.5, y: 1.0 };

/**
 * Cached manifest data
 */
let manifestCache = null;
let manifestPromise = null;

/**
 * Fetch and cache the manifest
 * @returns {Promise<Array>} Array of asset items
 */
export async function fetchManifest() {
  if (manifestCache) return manifestCache;
  
  if (manifestPromise) return manifestPromise;
  
  manifestPromise = fetch(MANIFEST_URL)
    .then(res => {
      if (!res.ok) {
        console.warn(`[AvatarLoader] Manifest not found at ${MANIFEST_URL}, using empty manifest`);
        return [];
      }
      return res.json();
    })
    .then(data => {
      manifestCache = Array.isArray(data) ? data : [];
      console.log(`[AvatarLoader] Loaded manifest with ${manifestCache.length} items`);
      return manifestCache;
    })
    .catch(err => {
      console.warn('[AvatarLoader] Failed to load manifest:', err);
      manifestCache = [];
      return manifestCache;
    });
  
  return manifestPromise;
}

/**
 * Get asset info from manifest by ID
 * @param {string} assetId 
 * @returns {Object|null}
 */
export function getAssetInfo(assetId) {
  if (!manifestCache) return null;
  return manifestCache.find(item => item.id === assetId) || null;
}

/**
 * Get all assets for a category
 * @param {string} category 
 * @returns {Array}
 */
export function getAssetsByCategory(category) {
  if (!manifestCache) return [];
  return manifestCache.filter(item => item.category === category);
}

/**
 * Get the URL for an asset
 * @param {string} filename 
 * @returns {string}
 */
export function getAssetUrl(filename) {
  return `${ASSETS_BASE_URL}/${filename}`;
}

/**
 * Preload all assets from manifest into Phaser
 * Call this in your scene's preload() method
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Array} manifest - The manifest array (or null to use cached)
 */
export function preloadManifestAssets(scene, manifest = null) {
  const items = manifest || manifestCache || [];
  
  items.forEach(item => {
    if (!item.id || !item.filename) return;
    
    const url = getAssetUrl(item.filename);
    
    // Skip if already loaded
    if (scene.textures.exists(item.id)) return;
    
    scene.load.image(item.id, url);
  });
  
  console.log(`[AvatarLoader] Queued ${items.length} assets for preload`);
}

/**
 * Load assets dynamically (after scene started)
 * @param {Phaser.Scene} scene 
 * @param {Array<string>} assetIds - Array of asset IDs to load
 * @returns {Promise} Resolves when all assets are loaded
 */
export function loadAssetsDynamic(scene, assetIds) {
  return new Promise((resolve) => {
    const toLoad = [];
    
    assetIds.forEach(assetId => {
      if (!assetId) return;
      if (scene.textures.exists(assetId)) return;
      
      const info = getAssetInfo(assetId);
      if (!info) {
        console.warn(`[AvatarLoader] Asset not in manifest: ${assetId}`);
        return;
      }
      
      const url = getAssetUrl(info.filename);
      scene.load.image(assetId, url);
      toLoad.push(assetId);
    });
    
    if (toLoad.length === 0) {
      resolve();
      return;
    }
    
    scene.load.once('complete', () => {
      console.log(`[AvatarLoader] Dynamically loaded ${toLoad.length} assets`);
      resolve();
    });
    
    scene.load.start();
  });
}

/**
 * Get z-index for an asset
 * @param {Object} assetInfo - Asset info from manifest
 * @returns {number}
 */
export function getZIndex(assetInfo) {
  if (assetInfo?.zIndex !== undefined) return assetInfo.zIndex;
  if (assetInfo?.category && CATEGORY_Z_INDEX[assetInfo.category] !== undefined) {
    return CATEGORY_Z_INDEX[assetInfo.category];
  }
  return 10; // default
}

/**
 * Get anchor for an asset
 * @param {Object} assetInfo - Asset info from manifest
 * @returns {{x: number, y: number}}
 */
export function getAnchor(assetInfo) {
  if (assetInfo?.anchor) return assetInfo.anchor;
  return DEFAULT_ANCHOR;
}

export default {
  fetchManifest,
  getAssetInfo,
  getAssetsByCategory,
  getAssetUrl,
  preloadManifestAssets,
  loadAssetsDynamic,
  getZIndex,
  getAnchor,
  CATEGORY_Z_INDEX,
  DEFAULT_ANCHOR
};
