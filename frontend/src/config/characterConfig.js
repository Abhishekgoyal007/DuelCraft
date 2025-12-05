// Character layer configuration
// Each layer has multiple options the player can choose from
// IDs correspond to sprite sheet files in /public/assets/character/

export const CHARACTER_LAYERS = {
  body: {
    name: "Body",
    options: [
      { id: 0, name: "Light", color: "#FFDBAC" },
      { id: 1, name: "Fair", color: "#F1C27D" },
      { id: 2, name: "Medium", color: "#E0AC69" },
      { id: 3, name: "Tan", color: "#C68642" },
      { id: 4, name: "Brown", color: "#8D5524" },
      { id: 5, name: "Dark", color: "#5C3317" },
    ],
  },
  eyes: {
    name: "Eyes",
    options: [
      { id: 0, name: "Normal" },
      { id: 1, name: "Happy" },
      { id: 2, name: "Angry" },
      { id: 3, name: "Sleepy" },
      { id: 4, name: "Wink" },
    ],
  },
  brows: {
    name: "Brows",
    options: [
      { id: 0, name: "Normal" },
      { id: 1, name: "Thick" },
      { id: 2, name: "Thin" },
      { id: 3, name: "Angry" },
    ],
  },
  mouth: {
    name: "Mouth",
    options: [
      { id: 0, name: "Smile" },
      { id: 1, name: "Open" },
      { id: 2, name: "Serious" },
      { id: 3, name: "Grin" },
    ],
  },
  hair: {
    name: "Hair",
    options: [
      { id: 0, name: "None" },
      { id: 1, name: "Short" },
      { id: 2, name: "Medium" },
      { id: 3, name: "Long" },
      { id: 4, name: "Spiky" },
      { id: 5, name: "Mohawk" },
    ],
  },
  tops: {
    name: "Tops",
    options: [
      { id: 0, name: "None" },
      { id: 1, name: "T-Shirt" },
      { id: 2, name: "Tank Top" },
      { id: 3, name: "Hoodie" },
      { id: 4, name: "Armor" },
    ],
  },
  bottoms: {
    name: "Bottoms",
    options: [
      { id: 0, name: "Shorts" },
      { id: 1, name: "Pants" },
      { id: 2, name: "Jeans" },
      { id: 3, name: "Armor" },
    ],
  },
  shoes: {
    name: "Shoes",
    options: [
      { id: 0, name: "None" },
      { id: 1, name: "Sneakers" },
      { id: 2, name: "Boots" },
      { id: 3, name: "Sandals" },
    ],
  },
};

// Default avatar configuration
export const DEFAULT_AVATAR = {
  body: 0,
  eyes: 0,
  brows: 0,
  mouth: 0,
  hair: 1,
  tops: 1,
  bottoms: 1,
  shoes: 1,
  hairColor: "#4a3728",
  topColor: "#3498db",
  bottomColor: "#2c3e50",
};

// Animation frames configuration
export const ANIMATIONS = {
  idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
  run: { start: 4, end: 9, frameRate: 10, repeat: -1 },
  jump: { start: 10, end: 12, frameRate: 8, repeat: 0 },
  attack: { start: 13, end: 17, frameRate: 12, repeat: 0 },
  hurt: { start: 18, end: 19, frameRate: 8, repeat: 0 },
};

// Layer render order (back to front)
export const LAYER_ORDER = [
  "body",
  "eyes", 
  "brows",
  "mouth",
  "bottoms",
  "tops",
  "shoes",
  "hair",
];
