# DuelCraft Character Asset Specification

## Overview
This document defines the format for character assets that can be loaded, composed, and animated in the DuelCraft arena game.

## Asset Requirements

### Image Format
- **Format**: PNG with transparent background
- **Canvas Size**: 128×128 pixels (standard) or 256×256 (HD)
- **Color Mode**: RGBA (32-bit with alpha channel)
- **Anchor Point**: Bottom-center (feet at bottom center of canvas)

### Layer System
Characters are composed of multiple layered PNG files that stack on top of each other.

#### Layer Order (back to front)
| Order | Layer Name | Description | Required |
|-------|------------|-------------|----------|
| 1 | `shadow` | Drop shadow under character | Optional |
| 2 | `back_accessory` | Cape, wings, backpack | Optional |
| 3 | `legs` | Pants, legs, shoes combined | Required |
| 4 | `body` | Torso/body base | Required |
| 5 | `top` | Shirt, armor, clothing top | Optional |
| 6 | `left_arm` | Left arm (for rotation animation) | Optional |
| 7 | `right_arm` | Right arm (for rotation animation) | Optional |
| 8 | `head` | Head/face base | Optional (can be part of body) |
| 9 | `face` | Facial features | Optional |
| 10 | `eyes` | Eyes, expressions | Optional |
| 11 | `hair` | Hair style | Optional |
| 12 | `hat` | Hat, helmet, headwear | Optional |
| 13 | `front_accessory` | Shield, held items | Optional |
| 14 | `weapon` | Sword, staff, etc. | Optional |
| 15 | `effect` | Aura, glow, particles | Optional |

### Alignment Rules
1. **Ground Line**: The character's feet should touch y=120 (for 128px canvas) or y=240 (for 256px canvas)
2. **Center**: Character should be horizontally centered (x=64 for 128px, x=128 for 256px)
3. **Consistency**: ALL layers must use the same canvas size and alignment
4. **Facing**: Default pose should face RIGHT

### Naming Convention
```
{character_name}_{layer_name}.png

Examples:
knight_body.png
knight_hair.png
knight_top.png
knight_weapon.png
```

## Asset Categories in Database

### Body Types (skin tones + body shapes)
- `body_light_male`
- `body_light_female`
- `body_medium_male`
- `body_medium_female`
- `body_dark_male`
- `body_dark_female`

### Hair Styles
- `hair_short_black`
- `hair_short_brown`
- `hair_long_blonde`
- `hair_spiky_red`
- etc.

### Tops (Shirts/Armor)
- `top_tshirt_red`
- `top_armor_iron`
- `top_hoodie_blue`
- etc.

### Bottoms (Pants/Legs)
- `legs_jeans_blue`
- `legs_shorts_black`
- `legs_armor_iron`
- etc.

### Accessories
- `hat_cap_red`
- `hat_helmet_knight`
- `weapon_sword_basic`
- `weapon_staff_magic`
- `back_cape_red`
- `effect_aura_fire`

## JSON Manifest Format

```json
{
  "id": "knight_warrior",
  "name": "Knight Warrior",
  "category": "skin",
  "rarity": "common",
  "price": 100,
  "layers": {
    "body": "/assets/characters/knight/body.png",
    "top": "/assets/characters/knight/armor.png",
    "legs": "/assets/characters/knight/legs.png",
    "hair": "/assets/characters/knight/hair.png",
    "weapon": "/assets/characters/knight/sword.png"
  },
  "preview": "/assets/characters/knight/preview.png",
  "tags": ["medieval", "warrior", "armor"]
}
```

## Player Equipped Format

When a player equips assets, their profile stores:

```json
{
  "equipped": {
    "body": "asset_id_body_light_male",
    "hair": "asset_id_hair_short_black",
    "top": "asset_id_top_armor_iron",
    "legs": "asset_id_legs_armor_iron",
    "weapon": "asset_id_weapon_sword_basic"
  }
}
```

The server resolves these IDs to URLs before sending to the arena:

```json
{
  "equippedUrls": {
    "body": "https://cdn.example.com/assets/body_light_male.png",
    "hair": "https://cdn.example.com/assets/hair_short_black.png",
    "top": "https://cdn.example.com/assets/top_armor_iron.png",
    "legs": "https://cdn.example.com/assets/legs_armor_iron.png",
    "weapon": "https://cdn.example.com/assets/weapon_sword_basic.png"
  }
}
```

## Animation Support

### Simple Mode (Single Layer)
If you have a single complete character image:
- Name it `skin` or `body`
- The animator will use procedural transforms (translate, rotate, scale)

### Advanced Mode (Separate Limbs)
For better animation quality, provide separate limb layers:
- `left_arm`, `right_arm` - Can rotate for walking/attacking
- `left_leg`, `right_leg` - Can rotate for walking
- Each limb should be positioned correctly relative to the body

### Animation States
The CharacterAnimator supports these states:
- `idle` - Gentle breathing/bob
- `walk` - Leg swing + body bob
- `jump` - Squash/stretch upward
- `fall` - Stretch downward
- `punch` - Quick forward thrust
- `heavy` - Wind up + smash
- `hurt` - Knockback + flash

## Sample Asset Pack Structure

```
/public/assets/characters/
├── starter_pack/
│   ├── body_male_light.png
│   ├── body_female_light.png
│   ├── hair_short_black.png
│   ├── hair_long_brown.png
│   ├── top_tshirt_blue.png
│   ├── top_tshirt_red.png
│   ├── legs_jeans.png
│   └── preview/
│       └── starter_preview.png
├── knight_pack/
│   ├── body.png
│   ├── armor_top.png
│   ├── armor_legs.png
│   ├── helmet.png
│   ├── sword.png
│   ├── cape.png
│   └── preview/
│       └── knight_preview.png
└── wizard_pack/
    ├── body.png
    ├── robe_top.png
    ├── robe_legs.png
    ├── hat.png
    ├── staff.png
    ├── effect_magic_aura.png
    └── preview/
        └── wizard_preview.png
```
