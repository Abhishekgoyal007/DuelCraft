# How to Add New Characters to DuelCraft

## Quick Guide

### Step 1: Create Character Image
1. Create a pixel art image of your character (PNG format recommended)
2. Size: Ideally 64x64 or 128x128 pixels for pixel art style
3. Save as: `/public/character-layers/{character_name}/{character_name}.png`

Example:
- `/public/character-layers/warrior/warrior.png` ✅
- `/public/character-layers/mage/mage.png` (needs to be created)
- `/public/character-layers/rogue/rogue.png` (future)

### Step 2: Add Character to Config
Edit `frontend/src/config/characters.js`:

```javascript
export const CHARACTERS = {
  // ... existing characters ...
  
  char_rogue: {
    id: 'char_rogue',
    name: 'Rogue',
    icon: '🗡️',
    image: '/character-layers/rogue/rogue.png',
    description: 'Fast and agile assassin',
    color: '#6ee7b7',
    stats: {
      health: 90,
      attack: 18,
      defense: 6,
      speed: 15
    }
  },
};
```

### Step 3: That's It!
The character will automatically appear in:
- Character selection screen (`/creator`)
- Hub page (`/hub`) when selected
- Game arena (already configured)

## Current Characters

### ✅ Warrior
- **Image**: `/public/character-layers/warrior/warrior.png` ✅ EXISTS
- **ID**: `char_warrior`
- **Style**: Strong melee fighter with armor
- **Status**: READY

### ⚠️ Mage
- **Image**: `/public/character-layers/mage/mage.png` ❌ MISSING
- **ID**: `char_mage`
- **Style**: Magic wielder with robes
- **Status**: NEEDS IMAGE

## Character Image Requirements

### Best Practices:
1. **Size**: 64x64 or 128x128 pixels
2. **Format**: PNG with transparency
3. **Style**: Pixel art (8-bit style like the warrior)
4. **Colors**: Match the color scheme in the config
5. **Consistency**: Keep similar proportions across all characters

### Example Structure:
```
frontend/public/character-layers/
├── warrior/
│   └── warrior.png      ✅ EXISTS
├── mage/
│   └── mage.png         ❌ CREATE THIS
├── rogue/               (future)
│   └── rogue.png
└── paladin/             (future)
    └── paladin.png
```

## Adding More Characters (Checklist)

- [ ] Create pixel art image (64x64 or 128x128 PNG)
- [ ] Save to `/public/character-layers/{name}/{name}.png`
- [ ] Add character object to `characters.js`
- [ ] Choose appropriate stats (health, attack, defense, speed)
- [ ] Pick character color for UI
- [ ] Refresh browser - character automatically appears!

## Example: Adding "Rogue" Character

1. **Create the image**:
   - Draw a rogue character in pixel art style
   - Save as: `/public/character-layers/rogue/rogue.png`

2. **Add to config**:
```javascript
char_rogue: {
  id: 'char_rogue',
  name: 'Rogue',
  icon: '🗡️',
  image: '/character-layers/rogue/rogue.png',
  description: 'Fast and agile assassin',
  color: '#6ee7b7',
  stats: {
    health: 90,
    attack: 18,
    defense: 6,
    speed: 15
  }
},
```

3. **Done!** Character automatically appears everywhere.

## Tips

- Use the same pixel art style as the warrior for consistency
- Test character images with `imageRendering: 'pixelated'` CSS for crisp pixels
- Fallback to emoji icon if image fails to load
- Keep character descriptions short (under 30 characters)

## Need Help Creating Images?

You can:
1. Use pixel art tools like Aseprite, Piskel, or Lospec
2. Commission an artist on Fiverr/Upwork
3. Use AI tools trained on pixel art
4. Convert existing images to pixel art style

**Current Status**: You have 1/2 character images (Warrior ✅, Mage ❌)
