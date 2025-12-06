# Minimal PNG Layer Loading Example

This is a simplified example showing how to load PNG layers and stack them in Phaser 3.

## Key Files Modified

### 1. ArenaScene.js - Preload Method
```javascript
preload() {
  // Load character layers for warrior and mage
  const characterTypes = ['warrior', 'mage'];
  const layers = ['base', 'hair', 'clothing'];
  
  characterTypes.forEach(charType => {
    layers.forEach(layer => {
      const key = `${charType}_${layer}`;
      this.load.image(key, `/character-layers/${charType}/${layer}.png`);
    });
  });
  
  console.log('[ArenaScene] Preloading character layer images...');
}
```

### 2. ArenaScene.js - Layer Stacking Method
```javascript
createLayeredCharacter(pid, characterId) {
  // Map character IDs to folder names (char_warrior -> warrior)
  const charTypeMap = {
    'char_warrior': 'warrior',
    'char_mage': 'mage'
  };
  
  const charType = charTypeMap[characterId] || 'warrior';
  const containerKey = `layered_${pid}_${characterId}`;
  
  console.log(`[ArenaScene] Creating layered character: ${charType} for player ${pid}`);
  
  // Create a render texture to combine layers
  const size = 64;
  const renderTexture = this.make.renderTexture({ width: size, height: size, add: false });
  
  // Stack layers in order: base -> hair -> clothing
  const layers = ['base', 'hair', 'clothing'];
  layers.forEach(layer => {
    const textureKey = `${charType}_${layer}`;
    if (this.textures.exists(textureKey)) {
      renderTexture.draw(textureKey, 0, 0);
      console.log(`[ArenaScene] Drew layer: ${textureKey}`);
    } else {
      console.warn(`[ArenaScene] Missing texture: ${textureKey}`);
    }
  });
  
  // Save the combined texture
  renderTexture.saveTexture(containerKey);
  renderTexture.destroy();
  
  console.log(`[ArenaScene] Created layered texture: ${containerKey}`);
  return containerKey;
}
```

### 3. ArenaScene.js - Using Layered Character
```javascript
// In handleMatchStart or wherever you create player sprites:

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
```

## Folder Structure

```
frontend/
├── public/
│   └── character-layers/
│       ├── warrior/
│       │   ├── base.png      (64x64, transparent)
│       │   ├── hair.png      (64x64, transparent)
│       │   └── clothing.png  (64x64, transparent)
│       └── mage/
│           ├── base.png      (64x64, transparent)
│           ├── hair.png      (64x64, transparent)
│           └── clothing.png  (64x64, transparent)
└── src/
    └── game/
        └── ArenaScene.js
```

## How It Works

1. **Preload Phase**: Phaser loads all 6 PNG files (3 per character)
   - `warrior_base`, `warrior_hair`, `warrior_clothing`
   - `mage_base`, `mage_hair`, `mage_clothing`

2. **Character Creation**: When a player joins with a selected character:
   - Check which character they selected (warrior or mage)
   - Create a RenderTexture (blank 64x64 canvas)
   - Draw layers in order: base → hair → clothing
   - Save as a new texture with unique key
   - Return the texture key

3. **Sprite Creation**: Use the combined texture key to create the player sprite
   - Single sprite shows all 3 layers stacked correctly
   - Can be flipped, animated, scaled like any sprite

## Adding a Third Character (Rogue Example)

1. Create folder: `frontend/public/character-layers/rogue/`
2. Add PNG files: base.png, hair.png, clothing.png

3. Update preload:
```javascript
const characterTypes = ['warrior', 'mage', 'rogue']; // Add 'rogue'
```

4. Update character map:
```javascript
const charTypeMap = {
  'char_warrior': 'warrior',
  'char_mage': 'mage',
  'char_rogue': 'rogue' // Add this line
};
```

5. Update CharacterCreator.jsx:
```javascript
const PREMADE_CHARACTERS = [
  { id: 'char_warrior', name: 'Warrior', icon: '⚔️', ... },
  { id: 'char_mage', name: 'Mage', icon: '🔮', ... },
  { id: 'char_rogue', name: 'Rogue', icon: '🗡️', ... } // Add this
];
```

## Alternative: Using Sprite Containers

If you need more flexibility (like animating individual layers), use containers:

```javascript
createLayeredCharacterContainer(pid, characterId) {
  const charType = this.getCharTypeFromId(characterId);
  const container = this.add.container(0, 0);
  
  // Add layers as separate sprites
  const base = this.add.sprite(0, 0, `${charType}_base`);
  const hair = this.add.sprite(0, 0, `${charType}_hair`);
  const clothing = this.add.sprite(0, 0, `${charType}_clothing`);
  
  container.add([base, hair, clothing]);
  container.setSize(64, 64);
  
  return container;
}
```

## Benefits of PNG Layers vs Procedural

**PNG Layers (This approach)**
- ✅ Artist-created custom graphics
- ✅ Easy to update (just replace PNG files)
- ✅ No code changes for new art
- ✅ Supports complex art styles
- ❌ Requires image files
- ❌ Larger file size

**Procedural (Previous approach)**
- ✅ No image files needed
- ✅ Smaller file size
- ✅ Easy to generate variations
- ❌ Limited art style
- ❌ Requires code changes for each character
- ❌ Time-consuming to create detailed characters

## Next Steps

1. **Create placeholder PNGs**: Use simple colored shapes for testing
2. **Test rendering**: Verify layers stack correctly in arena
3. **Add real art**: Replace placeholders with actual character art
4. **Expand characters**: Add more character types following the same pattern
5. **Add animations**: Create multiple frames per layer for walk/attack cycles
