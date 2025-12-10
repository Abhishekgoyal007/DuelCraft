// Character configuration for the game
// All 20 DuelCraft Warriors

export const CHARACTERS = {
  // 1. Fire Knight
  char_ignatius: {
    id: 'char_ignatius',
    name: 'Ignatius the Inferno',
    icon: '🔥',
    image: '/character-layers/Ignatius the Inferno/warrior.png',
    description: 'Fire Knight - Explosive burst damage',
    color: '#ff4500',
    element: 'fire',
    stats: {
      health: 100,
      attack: 90,
      defense: 60,
      speed: 50
    },
    superpower: 'Inferno Burst - Creates explosion dealing AoE damage',
    // Animation frames configuration
    animations: {
      idle: {
        frames: [
          '/character-layers/Ignatius the Inferno/IDLE ANIMATION/frame1.png',
          '/character-layers/Ignatius the Inferno/IDLE ANIMATION/frame2.png',
          '/character-layers/Ignatius the Inferno/IDLE ANIMATION/frame3.png',
          '/character-layers/Ignatius the Inferno/IDLE ANIMATION/frame4.png'
        ],
        frameRate: 6, // 6 FPS for idle breathing
        loop: true
      }
    }
  },

  // 2. Ice Warrior
  char_glacius: {
    id: 'char_glacius',
    name: 'Glacius Frostbane',
    icon: '❄️',
    image: '/character-layers/Glacius Frostbane/warrior.png',
    description: 'Ice Warrior - Control & freeze enemies',
    color: '#00bfff',
    element: 'ice',
    displayScale: 1.2,
    displayOffsetX: -8, // Shift left to show axe
    stats: {
      health: 110,
      attack: 70,
      defense: 85,
      speed: 45
    },
    superpower: 'Glacier Prison - Freezes enemy for 3 seconds'
  },

  // 3. Thunder Champion
  char_thorin: {
    id: 'char_thorin',
    name: 'Thorin Stormbreaker',
    icon: '⚡',
    image: '/character-layers/Thorin Stormbreaker/warrior.png',
    description: 'Thunder Champion - Lightning strikes',
    color: '#ffd700',
    element: 'lightning',
    displayOffsetX: -5, // Shift left to show weapon
    stats: {
      health: 105,
      attack: 85,
      defense: 70,
      speed: 65
    },
    superpower: 'Lightning Strike - Massive bolt damage'
  },

  // 4. Shadow Assassin
  char_shadow: {
    id: 'char_shadow',
    name: 'Shadow Vex',
    icon: '🌑',
    image: '/character-layers/Shadow Vex/warrior.png',
    description: 'Assassin - Teleport & critical hits',
    color: '#4b0082',
    element: 'shadow',
    stats: {
      health: 75,
      attack: 95,
      defense: 40,
      speed: 95
    },
    superpower: 'Phantom Step - Teleport behind enemy, backstab crit'
  },

  // 5. Earth Guardian
  char_terra: {
    id: 'char_terra',
    name: 'Terra Stoneheart',
    icon: '🪨',
    image: '/character-layers/Terra Stoneheart/warrior.png',
    description: 'Earth Guardian - Knockdown enemies',
    color: '#8b4513',
    element: 'earth',
    displayOffsetX: -8, // Shift left to show hammer
    stats: {
      health: 130,
      attack: 75,
      defense: 95,
      speed: 30
    },
    superpower: 'Earthquake - Knocks down all nearby enemies'
  },

  // 6. Wind Dancer
  char_zephyr: {
    id: 'char_zephyr',
    name: 'Zephyr Windrider',
    icon: '💨',
    image: '/character-layers/Zephyr Windrider/warrior.png',
    description: 'Wind Dancer - Speed & tornado attacks',
    color: '#98fb98',
    element: 'wind',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 85,
      attack: 65,
      defense: 50,
      speed: 100
    },
    superpower: 'Cyclone Slash - Tornado pulling enemies in'
  },

  // 7. Light Paladin
  char_solara: {
    id: 'char_solara',
    name: 'Solara Dawnbringer',
    icon: '☀️',
    image: '/character-layers/Solara Dawnbringer/warrior.png',
    description: 'Light Paladin - Heal & damage',
    color: '#ffd93d',
    element: 'light',
    displayScale: 1.5, // Make bigger
    displayOffsetX: -10, // Shift left to show sword
    stats: {
      health: 110,
      attack: 80,
      defense: 80,
      speed: 55
    },
    superpower: 'Divine Judgement - Beam heals self + damages enemy'
  },

  // 8. Dark Sorcerer
  char_nyx: {
    id: 'char_nyx',
    name: 'Nyx Shadowmancer',
    icon: '🌙',
    image: '/character-layers/Nyx Shadowmancer/warrior.png',
    description: 'Dark Sorcerer - HP steal',
    color: '#9400d3',
    element: 'dark',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 80,
      attack: 85,
      defense: 45,
      speed: 70
    },
    superpower: 'Void Drain - Steals HP from enemy'
  },

  // 9. Berserker
  char_crimson: {
    id: 'char_crimson',
    name: 'Crimson Bloodfang',
    icon: '🩸',
    image: '/character-layers/Crimson Bloodfang/warrior.png',
    description: 'Berserker - Low HP = high damage',
    color: '#dc143c',
    element: 'blood',
    stats: {
      health: 90,
      attack: 100,
      defense: 35,
      speed: 75
    },
    superpower: 'Blood Rage - Attack increases as HP decreases'
  },

  // 10. Poison Master
  char_jade: {
    id: 'char_jade',
    name: 'Jade Serpentine',
    icon: '🐍',
    image: '/character-layers/Jade Serpentine/warrior.png',
    description: 'Poison Master - DOT damage',
    color: '#228b22',
    element: 'poison',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 90,
      attack: 70,
      defense: 55,
      speed: 80
    },
    superpower: 'Toxic Cloud - Poisons enemy, DOT for 5 seconds'
  },

  // 11. Dark Knight
  char_obsidian: {
    id: 'char_obsidian',
    name: 'Obsidian Titan',
    icon: '👹',
    image: '/character-layers/Obsidian Titan/warrior.png',
    description: 'Dark Knight - Armor piercing',
    color: '#2f2f2f',
    element: 'dark',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 115,
      attack: 88,
      defense: 75,
      speed: 40
    },
    superpower: 'Soul Shatter - Ignores 50% of enemy armor'
  },

  // 12. Ice Mage
  char_aurora: {
    id: 'char_aurora',
    name: 'Aurora Frostweaver',
    icon: '❄️',
    image: '/character-layers/Aurora Frostweaver/warrior.png',
    description: 'Ice Mage - Slow & freeze',
    color: '#87ceeb',
    element: 'ice',
    stats: {
      health: 85,
      attack: 80,
      defense: 50,
      speed: 60
    },
    superpower: 'Blizzard Storm - Slows all enemies, cold damage'
  },

  // 13. Flame Monk
  char_phoenix: {
    id: 'char_phoenix',
    name: 'Phoenix Ashborne',
    icon: '🔥',
    image: '/character-layers/Phoenix Ashborne/warrior.png',
    description: 'Flame Monk - Revive ability',
    color: '#ff6347',
    element: 'fire',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 95,
      attack: 85,
      defense: 55,
      speed: 85
    },
    superpower: 'Rebirth Flames - Revives with 30% HP once'
  },

  // 14. Tank Knight
  char_steel: {
    id: 'char_steel',
    name: 'Steel Vanguard',
    icon: '🛡️',
    image: '/character-layers/Steel Vanguard/warrior.png',
    description: 'Tank Knight - Ultimate defense',
    color: '#708090',
    element: 'metal',
    stats: {
      health: 140,
      attack: 55,
      defense: 100,
      speed: 25
    },
    superpower: 'Iron Fortress - 100% damage block for 2 seconds'
  },

  // 15. Spirit Warrior
  char_kai: {
    id: 'char_kai',
    name: 'Mystic Kai',
    icon: '👊',
    image: '/character-layers/Mystic Kai/warrior.png',
    description: 'Spirit Warrior - Energy attacks',
    color: '#40e0d0',
    element: 'spirit',
    displayScale: 1.8, // Make bigger
    stats: {
      health: 95,
      attack: 75,
      defense: 60,
      speed: 90
    },
    superpower: 'Chi Burst - Ranged energy attack + stun'
  },

  // 16. Beast Hunter
  char_ragnar: {
    id: 'char_ragnar',
    name: 'Ragnar Wolfclaw',
    icon: '🐺',
    image: '/character-layers/Ragnar Wolfclaw/warrior.png',
    description: 'Beast Hunter - Wolf summons',
    color: '#a0522d',
    element: 'beast',
    stats: {
      health: 100,
      attack: 80,
      defense: 65,
      speed: 75
    },
    superpower: 'Pack Summon - Summons wolf spirits to attack'
  },

  // 17. Tech Warrior
  char_elektra: {
    id: 'char_elektra',
    name: 'Elektra Volthart',
    icon: '⚡',
    image: '/character-layers/Elektra Volthart/warrior.png',
    description: 'Tech Warrior - Disable abilities',
    color: '#00ced1',
    element: 'lightning',
    stats: {
      health: 95,
      attack: 78,
      defense: 68,
      speed: 82
    },
    superpower: 'EMP Shock - Disables enemy abilities for 2 seconds'
  },

  // 18. Dragon Knight
  char_draco: {
    id: 'char_draco',
    name: 'Draco Scaleborn',
    icon: '🐉',
    image: '/character-layers/Draco Scaleborn/warrior.png',
    description: 'Dragon Knight - Fire breath',
    color: '#b22222',
    element: 'fire',
    displayScale: 1.0, // Compact fit
    stats: {
      health: 120,
      attack: 92,
      defense: 78,
      speed: 48
    },
    superpower: 'Dragon Breath - Cone fire attack, massive damage'
  },

  // 19. Night Archer
  char_luna: {
    id: 'char_luna',
    name: 'Luna Moonshadow',
    icon: '🌙',
    image: '/character-layers/Luna Moonshadow/warrior.png',
    description: 'Night Archer - Piercing shots',
    color: '#483d8b',
    element: 'moon',
    displayScale: 1.0, // Compact fit
    stats: {
      health: 80,
      attack: 82,
      defense: 45,
      speed: 88
    },
    superpower: 'Moonbeam Arrow - Piercing shot hits multiple enemies'
  },

  // 20. Forest Guardian
  char_gaia: {
    id: 'char_gaia',
    name: 'Gaia Naturebond',
    icon: '🌿',
    image: '/character-layers/Gaia Naturebond/warrior.png',
    description: 'Forest Guardian - Root & heal',
    color: '#32cd32',
    element: 'nature',
    displayScale: 1.0, // Compact fit
    stats: {
      health: 105,
      attack: 60,
      defense: 70,
      speed: 65
    },
    superpower: 'Entangle - Roots enemy, heals self over time'
  },

  // Keep original warrior for backwards compatibility
  char_warrior: {
    id: 'char_warrior',
    name: 'Warrior',
    icon: '⚔️',
    image: '/character-layers/warrior/warrior.png',
    description: 'Classic fighter',
    color: '#808080',
    element: 'neutral',
    displayScale: 1.0, // Compact fit
    stats: {
      health: 100,
      attack: 80,
      defense: 70,
      speed: 60
    },
    superpower: 'Warrior\'s Resolve - 15% damage boost below 25% HP'
  }
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

// Get characters by element
export const getCharactersByElement = (element) => {
  return CHARACTER_LIST.filter(char => char.element === element);
};
