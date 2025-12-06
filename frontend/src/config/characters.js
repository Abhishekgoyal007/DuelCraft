// Character configuration for the game
// Add new characters here with their images and details

export const CHARACTERS = {
  char_warrior: {
    id: 'char_warrior',
    name: 'Warrior',
    icon: '⚔️',
    image: '/character-layers/warrior/warrior.png',
    description: 'Strong melee fighter',
    color: '#ff6b6b',
    stats: {
      health: 120,
      attack: 15,
      defense: 10,
      speed: 8
    }
  },
  char_mage: {
    id: 'char_mage',
    name: 'Mage',
    icon: '🔮',
    image: '/character-layers/mage/mage.png',
    description: 'Magic wielder',
    color: '#6b9eff',
    stats: {
      health: 80,
      attack: 20,
      defense: 5,
      speed: 10
    }
  },
  // Add more characters here as you create them:
  // char_rogue: { ... },
  // char_paladin: { ... },
  // etc.
};

// Get array of all characters
export const CHARACTER_LIST = Object.values(CHARACTERS);

// Get character by ID
export const getCharacter = (characterId) => {
  return CHARACTERS[characterId] || null;
};

// Get character image path
export const getCharacterImage = (characterId) => {
  const character = CHARACTERS[characterId];
  return character?.image || null;
};

// Get character name
export const getCharacterName = (characterId) => {
  const character = CHARACTERS[characterId];
  return character?.name || 'Unknown';
};
