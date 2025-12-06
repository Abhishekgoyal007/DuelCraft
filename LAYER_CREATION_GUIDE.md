# How to Create PNG Character Layers

This guide shows how to create layered PNG character sprites for the DuelCraft game.

## Overview

Characters are built from **3 transparent PNG layers** that stack on top of each other:
1. **base.png** - Body/skin (bottom layer)
2. **hair.png** - Hair, facial features (middle layer)  
3. **clothing.png** - Armor, outfit, weapons (top layer)

## Specifications

- **Size**: 64x64 pixels
- **Format**: PNG with transparency
- **Background**: Fully transparent (alpha channel)
- **Style**: Pixel art or simple 2D art
- **Anchor Point**: Characters should be centered, facing forward

## Example Structure

```
frontend/public/character-layers/
├── warrior/
│   ├── base.png     (tan/peach skin tone)
│   ├── hair.png     (brown short hair)
│   └── clothing.png (gray armor + sword)
└── mage/
    ├── base.png     (pale skin tone)
    ├── hair.png     (long purple hair)
    └── clothing.png (blue robe + staff)
```

## Creating Layers

### Tools
- **Aseprite** (recommended for pixel art)
- **GIMP** (free alternative)
- **Photoshop** (if available)
- **Piskel** (free online pixel art editor)

### Step-by-Step

1. **Create a new 64x64 canvas** with transparent background

2. **Draw the base layer** (base.png):
   - Skin tone for exposed areas (head, hands)
   - Simple body shape
   - No clothing or hair yet
   - Export as `base.png`

3. **Draw the hair layer** (hair.png):
   - Start with a copy of base.png
   - Add hair on top of the head
   - Add facial features (eyes, nose, mouth)
   - Delete the body parts (keep only hair/face additions)
   - Export as `hair.png`

4. **Draw the clothing layer** (clothing.png):
   - Add armor, robes, or outfits
   - Add weapons or accessories
   - This layer goes on top of everything
   - Export as `clothing.png`

## Quick Test Method

If you don't have image editing software, you can create simple solid color rectangles for testing:

### Warrior Example (Simple Shapes):
- **base.png**: Tan circle (head) + rectangle (body)
- **hair.png**: Brown rectangle (hair on top of head)
- **clothing.png**: Gray shapes (armor) + sword shape

### Mage Example (Simple Shapes):
- **base.png**: Pale circle (head) + oval (body)
- **hair.png**: Purple flowing shape (long hair)
- **clothing.png**: Blue robe shape + staff

## Using Online Tools

### Option 1: Piskel (Free, Browser-Based)
1. Go to https://www.piskelapp.com
2. Create new 64x64 sprite
3. Draw each layer separately
4. Export as PNG
5. Name files: base.png, hair.png, clothing.png

### Option 2: Use AI Generation
You can use AI tools like:
- DALL-E / Midjourney (with "pixel art, transparent background, 64x64" prompts)
- Remove.bg to make backgrounds transparent
- Scale to 64x64 in any image editor

## Adding New Characters

1. Create a new folder: `frontend/public/character-layers/[character-name]/`
2. Add the 3 PNG files: base.png, hair.png, clothing.png
3. Update `ArenaScene.js` preload:
   ```javascript
   const characterTypes = ['warrior', 'mage', 'rogue']; // Add 'rogue'
   ```
4. Update the mapping in `createLayeredCharacter()`:
   ```javascript
   const charTypeMap = {
     'char_warrior': 'warrior',
     'char_mage': 'mage',
     'char_rogue': 'rogue' // Add this
   };
   ```
5. Add to `CharacterCreator.jsx` PREMADE_CHARACTERS array

## Tips

- **Keep it simple**: Start with basic shapes and colors
- **Use reference**: Look at existing pixel art characters
- **Test early**: Add placeholder images first, refine later
- **Consistent style**: Match the art style across all characters
- **Readable at 64x64**: Details should be visible at small size

## Current Implementation

The game currently uses:
- **Warrior**: Gray armor, brown hair, sword
- **Mage**: Blue robes, purple hair, staff

Both need actual PNG files created to replace the procedural rendering.

## Troubleshooting

**Images not loading?**
- Check file paths match exactly: `/character-layers/warrior/base.png`
- Verify PNG files are in the correct folders
- Check browser console for 404 errors
- Clear cache and refresh

**Layers not stacking correctly?**
- Ensure PNGs have transparent backgrounds
- Check layer order: base -> hair -> clothing
- Verify all images are 64x64 pixels

**Character appears as solid block?**
- PNG transparency may not be preserved
- Re-export with "Save with transparency" option
- Use PNG-24 format, not PNG-8
