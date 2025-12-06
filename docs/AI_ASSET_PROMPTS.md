# AI Prompts for Generating DuelCraft Character Assets

Use these prompts with Gemini, ChatGPT (DALL-E), Midjourney, or Stable Diffusion to generate character assets that work with the DuelCraft animation system.

---

## 🎯 Key Requirements for All Prompts

Always include these specifications:
- **Transparent PNG background**
- **128x128 or 256x256 pixel canvas**
- **Character centered horizontally**
- **Feet touching bottom of canvas**
- **Facing right**
- **2D game art style** (pixel art, cartoon, or flat design)

---

## 📝 PROMPT TEMPLATES

### 1. Complete Character (Single Layer)

Use this for simple characters that animate as a single unit.

```
Create a 2D game character sprite for a fighting game.

SPECIFICATIONS:
- Canvas size: 128x128 pixels
- Transparent PNG background
- Character facing RIGHT
- Feet at bottom center of canvas
- Idle standing pose, slightly dynamic

STYLE: [Choose: pixel art / cartoon / anime / flat design]

CHARACTER: [Describe your character]
- Body type: [male/female, muscular/slim/average]
- Skin tone: [light/medium/dark/fantasy color]
- Hair: [style and color]
- Outfit: [describe clothing/armor]
- Expression: [confident/fierce/friendly]

IMPORTANT: The entire character must fit within the canvas with some padding. No parts should be cut off.
```

**Example filled prompt:**
```
Create a 2D game character sprite for a fighting game.

SPECIFICATIONS:
- Canvas size: 128x128 pixels
- Transparent PNG background
- Character facing RIGHT
- Feet at bottom center of canvas
- Idle standing pose, slightly dynamic

STYLE: Cartoon with bold outlines

CHARACTER: Medieval knight warrior
- Body type: male, athletic build
- Skin tone: light
- Hair: short brown hair visible under helmet
- Outfit: silver plate armor with blue cloth accents, no cape
- Expression: determined and battle-ready

IMPORTANT: The entire character must fit within the canvas with some padding. No parts should be cut off.
```

---

### 2. Layered Character Parts (Multiple Layers)

Generate each layer separately for better animation. Use the SAME prompt base for each layer to maintain consistency.

#### Base Prompt (use for all layers):
```
Create a 2D game character part for a layered character system.

GLOBAL SPECS (MUST follow exactly):
- Canvas: 128x128 pixels
- Transparent PNG background
- Bottom-center anchor (part positioned as if character's feet are at bottom center)
- Style: [Your chosen style]
- Character: [Brief character description for consistency]
```

#### Layer-Specific Prompts:

**BODY layer:**
```
[Base prompt]

LAYER: Body/Torso
- Show torso and basic body shape
- Include neck area
- Arms should be in T-pose or relaxed at sides
- NO head, NO legs below waist
- Skin tone: [color]
- Simple chest/torso clothing or bare if will be covered by top layer
```

**LEGS layer:**
```
[Base prompt]

LAYER: Legs and Feet
- Show legs from waist down to feet
- Include feet/shoes
- Standing pose, feet at bottom of canvas
- Pants/leg armor: [describe]
- Shoes: [describe]
```

**TOP layer:**
```
[Base prompt]

LAYER: Upper body clothing/armor
- Shirt, jacket, or armor piece
- Should fit over body layer
- Include any shoulder pieces
- Style: [describe the top]
- Color: [color]
```

**HAIR layer:**
```
[Base prompt]

LAYER: Hair only
- Hair style: [describe - length, style]
- Hair color: [color]
- Position as if on top of head (head at y=30-50 from top of 128px canvas)
- NO face, just hair
```

**WEAPON layer:**
```
[Base prompt]

LAYER: Weapon held in right hand
- Weapon type: [sword/staff/axe/etc]
- Position: held at character's right side
- Handle at approximately x=70, y=70 (right side, mid-height)
- Blade/head extending outward to the right
```

---

### 3. Pixel Art Style (Recommended for Games)

```
Create a pixel art game character sprite.

TECHNICAL SPECS:
- Resolution: 64x64 pixels (will be scaled up)
- Transparent background
- Limited color palette (16-32 colors max)
- Clean pixel edges, no anti-aliasing
- Character facing RIGHT
- Standing idle pose

CHARACTER DESIGN:
- Type: [warrior/mage/rogue/etc]
- Colors: [main colors]
- Key features: [helmet, cape, weapon, etc]

STYLE REFERENCE: Similar to games like Dead Cells, Shovel Knight, or Celeste
```

---

### 4. Anime/Chibi Style

```
Create a chibi anime game character sprite.

SPECIFICATIONS:
- Canvas: 128x128 pixels
- Transparent PNG background
- Chibi proportions (large head, small body)
- Character facing RIGHT
- Cute but battle-ready pose
- Bold black outlines
- Vibrant colors

CHARACTER:
- Type: [describe character class/role]
- Hair: [style and color]
- Outfit: [describe]
- Expression: [determined/happy/cool]
- Special feature: [glowing eyes/aura/etc - optional]
```

---

### 5. Batch Generation Prompt (for variations)

Use this to generate multiple color/style variations:

```
Create 4 variations of a 2D game character sprite.

SHARED SPECS:
- Canvas: 128x128 pixels each
- Transparent PNG background  
- Same pose and style across all
- Facing RIGHT
- Feet at bottom center

BASE CHARACTER: [describe the character design]

VARIATIONS:
1. Original colors
2. Red/fire color palette
3. Blue/ice color palette  
4. Purple/dark color palette

OUTPUT: 4 separate images in a 2x2 grid, OR 4 individual files
```

---

## 🔧 Platform-Specific Tips

### For Gemini/ChatGPT (DALL-E):
- Be very explicit about canvas size and positioning
- Request "game sprite" or "video game character" style
- May need to specify "full body visible, not cropped"

### For Midjourney:
- Add `--ar 1:1` for square aspect ratio
- Use `--style raw` for less artistic interpretation
- Add `--no background` for transparency (may not always work)
- Consider using inpainting to remove backgrounds

### For Stable Diffusion:
- Use models trained on game art (like Pixel Art or Anime models)
- Enable "transparent background" in generation settings
- Use ControlNet for consistent poses across layers
- Recommended negative prompt: `background, gradient, shadow on ground, cropped, partial`

---

## 📋 Quick Checklist Before Using Assets

- [ ] Background is fully transparent
- [ ] Canvas is exactly 128x128 or 256x256
- [ ] Character is centered horizontally
- [ ] Feet touch the bottom of canvas
- [ ] Character faces RIGHT
- [ ] No parts are cropped or cut off
- [ ] Style is consistent across all layers (if using layers)
- [ ] File is saved as PNG with alpha channel

---

## 🎨 Recommended Styles for DuelCraft

1. **Pixel Art** - Classic game feel, easy to animate, lightweight
2. **Cartoon** - Bold outlines, bright colors, expressive
3. **Flat Design** - Modern, clean, minimal gradients
4. **Anime/Chibi** - Popular, cute, appeals to wide audience

Avoid:
- Realistic/photorealistic styles (hard to animate)
- Too much detail (gets lost at game scale)
- 3D renders (inconsistent with 2D game)
