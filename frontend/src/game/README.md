# Avatar Layering System

This system allows players to customize their characters with layered PNG cosmetics that move with the character during gameplay.

## Overview

The avatar system consists of:
- **avatarLoader.js** - Utility for loading manifest and preloading assets
- **PlayerContainer.js** - Phaser container that manages layered cosmetics
- **useAvatar.js** - React hook for save/load from backend

## Asset Organization

```
/assets/characters/
├── manifest.json           # Asset definitions
└── layers/256/             # 256x256 PNG assets
    ├── body_default.png
    ├── hair_default.png
    ├── tops_default.png
    └── ...
```

## Manifest Format

```json
[
  {
    "id": "hair_spiky",           // Unique asset ID
    "category": "hair",           // Category for UI grouping
    "filename": "hair_spiky.png", // File in layers/256/
    "name": "Spiky Hair",         // Display name
    "anchor": { "x": 0.5, "y": 1.0 }, // Origin point (bottom-center)
    "zIndex": 30,                 // Render order (higher = in front)
    "price": 50                   // Shop price in coins
  }
]
```

## Layer Order (Z-Index)

| Z-Index | Category    | Description          |
|---------|-------------|----------------------|
| 5       | shadow      | Ground shadow        |
| 10      | body        | Base body sprite     |
| 15      | bottoms     | Pants, shorts        |
| 16      | shoes       | Footwear             |
| 20      | tops        | Shirts, armor        |
| 25      | face        | Base face            |
| 26      | eyes        | Eye cosmetics        |
| 27      | mouth       | Expression           |
| 30      | hair        | Hair styles          |
| 35      | hat         | Headgear             |
| 40      | accessory   | Glasses, jewelry     |
| 42      | weapon      | Held weapons         |
| 50      | effect      | Auras, particles     |

## Anchor System

All assets should use the same anchor point (default: `{ x: 0.5, y: 1.0 }`) so they align properly when stacked.

- `x: 0.5` = Horizontally centered
- `y: 1.0` = Origin at bottom (feet grounded)

This ensures all layers stack correctly regardless of sprite dimensions.

## Usage in Phaser Scene

```javascript
import { fetchManifest, preloadManifestAssets } from '../utils/avatarLoader';
import { PlayerContainer } from './PlayerContainer';

class ArenaScene extends Phaser.Scene {
  async create() {
    // Load manifest
    const manifest = await fetchManifest();
    
    // Preload all assets (optional - can load dynamically)
    preloadManifestAssets(this, manifest);
    await new Promise(resolve => {
      this.load.once('complete', resolve);
      this.load.start();
    });
    
    // Create player with cosmetics
    const player = new PlayerContainer(this, 400, 300, 'player1');
    
    // Apply cosmetics
    await player.applyCosmetics({
      body: 'body_default',
      hair: 'hair_spiky',
      tops: 'tops_armor',
      bottoms: 'bottoms_default'
    });
    
    // Update facing (flips all layers)
    player.setFacing(false); // Face left
    
    // Swap individual cosmetic
    await player.setCosmetic('hair', 'hair_long');
  }
}
```

## Usage in React

```jsx
import { useAvatar, saveAvatarDirect } from '../hooks/useAvatar';

function AvatarEditor({ wallet }) {
  const { avatar, loading, saveAvatar, setCosmetic } = useAvatar(wallet);
  
  const handleSelectHair = async (hairId) => {
    setCosmetic('hair', hairId);
    
    // Update Phaser in real-time
    if (window.arenaSetCosmetic) {
      window.arenaSetCosmetic('hair', hairId);
    }
  };
  
  const handleSave = async () => {
    await saveAvatar(avatar);
  };
  
  return (
    <div>
      <button onClick={() => handleSelectHair('hair_spiky')}>
        Spiky Hair
      </button>
      <button onClick={handleSave}>Save Avatar</button>
    </div>
  );
}
```

## API Endpoints

### Get Avatar
```
GET /api/player/:wallet/avatar

Response:
{
  "ok": true,
  "wallet": "0x...",
  "avatar": { "body": "body_default", "hair": "hair_spiky", ... },
  "equipped": { ... }
}
```

### Save Avatar
```
POST /api/player/:wallet/avatar
Content-Type: application/json

{
  "wallet": "0x...",
  "avatar": {
    "body": "body_default",
    "hair": "hair_spiky",
    "eyes": "eyes_default",
    "tops": "tops_armor",
    "bottoms": "bottoms_default",
    "hat": null,
    "accessory": null,
    "weapon": "weapon_sword",
    "effect": null
  }
}

Response:
{
  "ok": true,
  "wallet": "0x...",
  "avatar": { ... },
  "equipped": { ... }
}
```

## Flip Handling

When the character faces left, the entire container is flipped horizontally:

```javascript
// In PlayerContainer.setFacing()
this.container.scaleX = facingRight ? this.scale : -this.scale;
```

This automatically flips all child sprites (body, hair, accessories, etc.) together, maintaining proper visual alignment.

## Creating Assets for This System

When creating assets in Gemini/Stable Diffusion/etc:

1. **Canvas Size**: 256x256 pixels
2. **Background**: Transparent PNG
3. **Anchor Point**: Character's feet at bottom-center of canvas
4. **Consistency**: All layers should align when stacked at same position
5. **Naming**: Use format `{category}_{variant}.png` (e.g., `hair_spiky.png`)

### Prompt Template for AI Generation

```
Create a [CATEGORY] sprite for a 2D pixel art fighting game character.
- Canvas size: 256x256 pixels
- Transparent background
- Character centered horizontally
- Bottom of character at bottom of canvas (feet at y=256)
- Style: [pixel art / cartoon / anime]
- View: Front-facing or 3/4 view
- [Additional description of the specific item]
```

## Testing Checklist

- [ ] Cosmetics move with character when walking/jumping
- [ ] Flipping character flips all cosmetics correctly
- [ ] Live swap updates immediately in game
- [ ] Save persists to database
- [ ] Load restores correct cosmetics on page refresh
- [ ] Missing assets fall back gracefully (no crash)
- [ ] Z-order renders layers correctly (hair over body, etc.)
