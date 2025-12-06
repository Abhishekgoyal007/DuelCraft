# Character Layers

This folder contains PNG layers for each character type.

## Structure
- Each character has its own folder (warrior, mage, etc.)
- Each folder contains PNG layers that stack on top of each other:
  - `base.png` - Body/skin (bottom layer)
  - `hair.png` - Hair/head features (middle layer)
  - `clothing.png` - Armor/outfit (top layer)

## Layer Size
All layers should be **64x64 pixels** with transparent backgrounds.

## Adding New Characters
1. Create a new folder with the character name
2. Add base.png, hair.png, and clothing.png files
3. Update the PREMADE_CHARACTERS array to include the new character ID

## Note
The placeholder files in warrior/ and mage/ folders need to be replaced with actual PNG artwork.
You can use any graphics editor (Photoshop, GIMP, Aseprite) to create 64x64 pixel sprites.
