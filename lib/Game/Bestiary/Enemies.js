import { ELEMENTAL_RESISTANCES } from '../Constants.js';

/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('../Constants.js').ElementalResistance} ElementalResistance */

/**
 * @typedef {Object} EnemyStatBlock
 * @property {number} HP
 * @property {number} PWR
 * @property {number} SKL
 * @property {number} DEF
 * @property {number} SPD
 * @property {number} MGC
 * @property {number} LUK
 */

/**
 * @typedef {Object} EnemyDrop
 * @property {string} item
 * @property {number} rate
 */

/**
 * @typedef {Object} EnemyEntry
 * @property {string} name
 * @property {string} [nickname]
 * @property {number} LVL
 * @property {number} bits
 * @property {number} bitsRaw
 * @property {EnemyStatBlock} stats
 * @property {EnemyDrop[]} drops
 * @property {Partial<Record<Element, ElementalResistance>>} [elements] - Only non-default entries listed.
 * @property {boolean} [instantDeathImmune]
 * @property {number} speciesFlags - Raw speciesFlags bitfield read directly from the ROM's MonsterRecord
 */

/** @satisfies {Record<string, EnemyEntry>} */
export const ENEMIES = {
  // Cave of the Past
  BANSHEE: {
    name: 'Banshee',
    LVL: 41,
    bits: 2200,
    bitsRaw: 2200,
    stats: { HP: 120, PWR: 270, SKL: 110, DEF: 40, SPD: 90, MGC: 180, LUK: 70 },
    drops: [
      { item: 'Escape Talisman', rate: 15 },
      { item: 'Graffiti', rate: 6 },
      { item: 'Landscape Painting', rate: 3 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },
  CLAY_DOLL: {
    name: 'Clay Doll',
    LVL: 44,
    bits: 1500,
    bitsRaw: 1500,
    stats: { HP: 450, PWR: 280, SKL: 35, DEF: 70, SPD: 65, MGC: 160, LUK: 35 },
    drops: [
      { item: 'Full Armor', rate: 5 },
      { item: 'Mega Medicine x3', rate: 7 },
    ],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 0,
  },
  RED_ELEMENTAL: {
    name: 'Red Elemental',
    LVL: 42,
    bits: 1300,
    bitsRaw: 1300,
    stats: { HP: 80, PWR: 250, SKL: 90, DEF: 40, SPD: 130, MGC: 150, LUK: 66 },
    drops: [{ item: 'Speed Rune Piece', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Dragon Knights Area (also: Ivy in Seek Valley, Mirage in Moravia Area)
  IVY: {
    name: 'Ivy',
    LVL: 49,
    bits: 2000,
    bitsRaw: 2000,
    stats: { HP: 250, PWR: 290, SKL: 70, DEF: 80, SPD: 110, MGC: 170, LUK: 25 },
    drops: [
      { item: 'Hex Doll', rate: 6 },
      { item: 'Peeing Boy', rate: 6 },
      { item: 'Knight Statue', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 8,
  },
  MIRAGE: {
    name: 'Mirage',
    LVL: 52,
    bits: 2400,
    bitsRaw: 2400,
    stats: { HP: 400, PWR: 330, SKL: 130, DEF: 95, SPD: 120, MGC: 175, LUK: 70 },
    drops: [{ item: 'Speed Ring', rate: 6 }],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },
  SHADOW_MAN: {
    name: 'Shadow Man',
    LVL: 50,
    bits: 2000,
    bitsRaw: 2000,
    stats: { HP: 400, PWR: 310, SKL: 150, DEF: 60, SPD: 130, MGC: 60, LUK: 90 },
    drops: [
      { item: 'Silverlet', rate: 10 },
      { item: 'Rose Brooch', rate: 10 },
    ],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },

  // Dragons Den
  BLACK_ELEMENTAL: {
    name: 'Black Elemental',
    LVL: 48,
    bits: 1600,
    bitsRaw: 1600,
    stats: { HP: 120, PWR: 270, SKL: 100, DEF: 60, SPD: 140, MGC: 240, LUK: 66 },
    drops: [{ item: 'Magic Rune Piece', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 32,
  },
  MAGIC_SHIELD: {
    name: 'Magic Shield',
    LVL: 49,
    bits: 2700,
    bitsRaw: 2700,
    stats: { HP: 190, PWR: 280, SKL: 80, DEF: 130, SPD: 100, MGC: 230, LUK: 37 },
    drops: [{ item: 'Earth Shield', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  SUNSHINE_KING: {
    name: 'Sunshine King',
    LVL: 50,
    bits: 6000,
    bitsRaw: 6000,
    stats: { HP: 1600, PWR: 340, SKL: 95, DEF: 100, SPD: 95, MGC: 280, LUK: 50 },
    drops: [
      { item: 'Window Setting #3', rate: 15 },
      { item: 'Cyclone Rune', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.RESISTANT, Resurrection: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 36,
  },

  // Dwarves Trail (also: Death Boar in Dwarves Vault)
  DEATH_BOAR: {
    name: 'Death Boar',
    LVL: 17,
    bits: 800,
    bitsRaw: 800,
    stats: { HP: 350, PWR: 182, SKL: 40, DEF: 45, SPD: 35, MGC: 10, LUK: 25 },
    drops: [
      { item: 'Fur Cape', rate: 10 },
      { item: 'Boar Rune', rate: 4 },
    ],
    elements: { Water: ELEMENTAL_RESISTANCES.WEAK, Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 0,
  },
  DWARF: {
    name: 'Dwarf',
    LVL: 21,
    bits: 400,
    bitsRaw: 400,
    stats: { HP: 300, PWR: 170, SKL: 58, DEF: 55, SPD: 56, MGC: 25, LUK: 36 },
    drops: [{ item: 'Karate Uniform', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  EAGLE_MAN: {
    name: 'Eagle Man',
    LVL: 22,
    bits: 550,
    bitsRaw: 550,
    stats: { HP: 150, PWR: 165, SKL: 75, DEF: 55, SPD: 68, MGC: 40, LUK: 40 },
    drops: [
      { item: 'Graffiti', rate: 6 },
      { item: 'Flower Painting', rate: 6 },
      { item: "Lover's Garden", rate: 2 },
    ],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 40,
  },

  // Dwarves Vault
  CRIMSON_DWARF: {
    name: 'Crimson Dwarf',
    LVL: 23,
    bits: 600,
    bitsRaw: 600,
    stats: { HP: 250, PWR: 175, SKL: 45, DEF: 35, SPD: 60, MGC: 27, LUK: 38 },
    drops: [
      { item: 'Medicine x6', rate: 12 },
      { item: 'Escape Talisman', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  DEATH_MACHINE_SWORD: {
    name: 'Death Machine (sword)',
    nickname: 'Red Machine',
    LVL: 25,
    bits: 550,
    bitsRaw: 550,
    stats: { HP: 150, PWR: 180, SKL: 40, DEF: 60, SPD: 55, MGC: 0, LUK: 0 },
    drops: [{ item: 'Steel Shield', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  DEATH_MACHINE_SPEAR: {
    name: 'Death Machine (spear)',
    nickname: 'Blue Machine',
    LVL: 25,
    bits: 400,
    bitsRaw: 400,
    stats: { HP: 170, PWR: 185, SKL: 45, DEF: 65, SPD: 50, MGC: 0, LUK: 0 },
    // Drops per bestiary (conflicts with lib/enemies.js, which listed Steel Shield rate 10
    // for this variant too); rates back-derived from bestiary percentages (~0.13%/unit).
    drops: [
      { item: 'Half Helmet', rate: 10 },
      { item: 'Trick Rune', rate: 7 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },

  // Great Forest (also: Kobold (sword) confirmed identical in Panna Yakuta Area)
  //
  // "Holly Boy" collides with a different Holly Boy on Magician's Island (lvl 3, 10 HP)
  // vs this one (lvl 5, 80 HP) — numbered by bestiary page order, where the Magician's
  // Island entry appears first. HOLLY_BOY_1 is added when we reach Magician's Island.
  HOLLY_BOY_2: {
    name: 'Holly Boy',
    LVL: 5,
    bits: 150,
    bitsRaw: 150,
    stats: { HP: 80, PWR: 100, SKL: 60, DEF: 40, SPD: 80, MGC: 20, LUK: 30 },
    drops: [
      { item: 'Graffiti', rate: 6 },
      { item: 'Flower Painting', rate: 6 },
      { item: "Lover's Garden", rate: 2 },
    ],
    elements: { Water: ELEMENTAL_RESISTANCES.RESISTANT, Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 5,
  },
  HOLLY_SPIRIT: {
    name: 'Holly Spirit',
    LVL: 21,
    bits: 500,
    bitsRaw: 500,
    stats: { HP: 350, PWR: 150, SKL: 55, DEF: 55, SPD: 65, MGC: 60, LUK: 70 },
    drops: [
      { item: 'Toe Shoes', rate: 10 },
      { item: 'Needle x4', rate: 15 },
    ],
    elements: { Water: ELEMENTAL_RESISTANCES.RESISTANT, Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 39,
  },
  KOBOLD_SWORD: {
    name: 'Kobold (sword)',
    LVL: 20,
    bits: 200,
    bitsRaw: 200,
    stats: { HP: 150, PWR: 150, SKL: 40, DEF: 48, SPD: 49, MGC: 20, LUK: 35 },
    drops: [{ item: 'Wooden Shield', rate: 7 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  KOBOLD_BOW: {
    name: 'Kobold (bow)',
    LVL: 20,
    bits: 150,
    bitsRaw: 150,
    stats: { HP: 120, PWR: 140, SKL: 35, DEF: 42, SPD: 45, MGC: 10, LUK: 35 },
    drops: [
      { item: 'Necklace', rate: 7 },
      { item: 'Medicine x6', rate: 9 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Gregminster Area 1
  BONBON: {
    name: 'BonBon',
    LVL: 5,
    bits: 70,
    bitsRaw: 70,
    stats: { HP: 18, PWR: 31, SKL: 5, DEF: 5, SPD: 16, MGC: 9, LUK: 12 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Octopus Urn', rate: 6 },
      { item: 'Celadon Urn', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 0,
  },
  CROW: {
    name: 'Crow',
    LVL: 4,
    bits: 50,
    bitsRaw: 50,
    stats: { HP: 15, PWR: 30, SKL: 70, DEF: 7, SPD: 27, MGC: 5, LUK: 24 },
    drops: [{ item: 'Bandanna', rate: 6 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },
  MOSQUITO: {
    name: 'Mosquito',
    LVL: 4,
    bits: 20,
    bitsRaw: 20,
    stats: { HP: 17, PWR: 30, SKL: 50, DEF: 6, SPD: 29, MGC: 0, LUK: 35 },
    drops: [
      { item: 'Medicine x6', rate: 5 },
      { item: 'Holy Rune', rate: 5 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 44,
  },
  RED_SOLDIER_ANT: {
    name: 'Red Soldier Ant',
    LVL: 8,
    bits: 60,
    bitsRaw: 60,
    stats: { HP: 28, PWR: 48, SKL: 18, DEF: 10, SPD: 22, MGC: 0, LUK: 3 },
    drops: [{ item: 'Pointed Hat', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  WILD_BOAR: {
    name: 'Wild Boar',
    LVL: 7,
    bits: 300,
    bitsRaw: 300,
    stats: { HP: 60, PWR: 65, SKL: 15, DEF: 19, SPD: 20, MGC: 0, LUK: 14 },
    drops: [{ item: 'Wind Rune Piece', rate: 4 }],
    speciesFlags: 0,
  },

  // Gregminster Area 2
  NINJA_MASTER: {
    name: 'Ninja Master',
    LVL: 55,
    bits: 5500,
    bitsRaw: 5500,
    stats: { HP: 400, PWR: 330, SKL: 140, DEF: 30, SPD: 170, MGC: 120, LUK: 60 },
    drops: [{ item: 'Crimson Cape', rate: 12 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 2,
  },
  ORC: {
    name: 'Orc',
    LVL: 57,
    bits: 7100,
    bitsRaw: 7000,
    stats: { HP: 1500, PWR: 340, SKL: 30, DEF: 5, SPD: 15, MGC: 30, LUK: 30 },
    drops: [
      { item: 'Graffiti', rate: 6 },
      { item: "Lover's Garden", rate: 6 },
      { item: 'Beauties of Nature', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 3,
  },
  SIMURGH: {
    name: 'Simurgh',
    LVL: 56,
    bits: 6500,
    bitsRaw: 6500,
    stats: { HP: 700, PWR: 315, SKL: 80, DEF: 45, SPD: 130, MGC: 160, LUK: 55 },
    drops: [{ item: 'Thunder Rune', rate: 8 }],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 44,
  },

  // Gregminster Palace
  COLOSSUS: {
    name: 'Colossus',
    LVL: 59,
    bits: 15000,
    bitsRaw: 15000,
    stats: { HP: 800, PWR: 350, SKL: 80, DEF: 90, SPD: 60, MGC: 100, LUK: 75 },
    drops: [
      { item: 'Mother Earth Rune', rate: 6 },
      { item: 'Power Ring', rate: 13 },
    ],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },
  EKIDONNA: {
    name: 'Ekidonna',
    LVL: 60,
    bits: 20000,
    bitsRaw: 20000,
    stats: { HP: 1000, PWR: 370, SKL: 100, DEF: 40, SPD: 90, MGC: 310, LUK: 60 },
    drops: [{ item: 'Windspun Armor', rate: 8 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 4,
  },
  IMPERIAL_GUARDS_SWORD: {
    name: 'Imperial Guards (sword)',
    LVL: 56,
    bits: 4500,
    bitsRaw: 4500,
    stats: { HP: 550, PWR: 330, SKL: 100, DEF: 130, SPD: 90, MGC: 200, LUK: 110 },
    drops: [{ item: 'Mega Medicine x3', rate: 15 }],
    speciesFlags: 3,
  },
  IMPERIAL_GUARDS_SABRE: {
    name: 'Imperial Guards (sabre)',
    LVL: 56,
    bits: 5000,
    bitsRaw: 5000,
    stats: { HP: 500, PWR: 325, SKL: 110, DEF: 130, SPD: 95, MGC: 220, LUK: 115 },
    drops: [],
    speciesFlags: 7,
  },
  PHANTOM: {
    name: 'Phantom',
    LVL: 58,
    bits: 6500,
    bitsRaw: 6500,
    stats: { HP: 550, PWR: 335, SKL: 150, DEF: 70, SPD: 120, MGC: 190, LUK: 95 },
    drops: [{ item: 'Earth Boots', rate: 12 }],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Kalekka
  DEMON_HOUND: {
    name: 'Demon Hound',
    LVL: 37,
    bits: 900,
    bitsRaw: 900,
    stats: { HP: 700, PWR: 250, SKL: 70, DEF: 60, SPD: 65, MGC: 75, LUK: 45 },
    drops: [{ item: 'Silver Necklace', rate: 7 }],
    elements: { Water: ELEMENTAL_RESISTANCES.WEAK, Fire: ELEMENTAL_RESISTANCES.INVULNERABLE, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  HAWK_MAN: {
    name: 'Hawk Man',
    LVL: 35,
    bits: 1300,
    bitsRaw: 1300,
    stats: { HP: 300, PWR: 245, SKL: 90, DEF: 55, SPD: 99, MGC: 40, LUK: 55 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Wide Urn', rate: 6 },
      { item: 'Black Urn', rate: 2 },
    ],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 40,
  },
  SHADOW: {
    name: 'Shadow',
    LVL: 36,
    bits: 2000,
    bitsRaw: 2000,
    stats: { HP: 170, PWR: 260, SKL: 120, DEF: 45, SPD: 88, MGC: 60, LUK: 90 },
    drops: [
      { item: 'Silverlet', rate: 10 },
      { item: 'Rose Brooch', rate: 10 },
    ],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },

  // Kalekka Area
  DAGON: {
    name: 'Dagon',
    LVL: 31,
    bits: 1100,
    bitsRaw: 1100,
    stats: { HP: 400, PWR: 230, SKL: 70, DEF: 50, SPD: 75, MGC: 80, LUK: 35 },
    drops: [
      { item: 'Dragon Armor', rate: 9 },
      { item: 'Water Rune', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  GRIZZLY_BEAR: {
    name: 'Grizzly Bear',
    LVL: 34,
    bits: 1200,
    bitsRaw: 1200,
    stats: { HP: 470, PWR: 280, SKL: 50, DEF: 30, SPD: 50, MGC: 35, LUK: 10 },
    drops: [{ item: 'Head Gear', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  // "Siren" collides with a different Siren in Shasarazade Fortress (lvl 53) — numbered by
  // bestiary page order, where this one (Kalekka Area) appears first. SIREN_2 is added when
  // we reach Shasarazade Fortress.
  SIREN_1: {
    name: 'Siren',
    LVL: 32,
    bits: 2000,
    bitsRaw: 2000,
    stats: { HP: 250, PWR: 260, SKL: 60, DEF: 20, SPD: 90, MGC: 160, LUK: 40 },
    drops: [{ item: 'Prosperity Rune', rate: 6 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Lepant's Mansion
  ROBOT_SOLDIER_SWORD: {
    name: 'Robot Soldier (sword)',
    LVL: 18,
    bits: 400,
    bitsRaw: 400,
    stats: { HP: 150, PWR: 135, SKL: 20, DEF: 70, SPD: 45, MGC: 0, LUK: 0 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Vase', rate: 6 },
      { item: 'Persian Lamp', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  ROBOT_SOLDIER_SPEAR: {
    name: 'Robot Soldier (spear)',
    LVL: 18,
    bits: 350,
    bitsRaw: 350,
    stats: { HP: 160, PWR: 150, SKL: 15, DEF: 65, SPD: 40, MGC: 0, LUK: 0 },
    drops: [{ item: 'Pointed Hat', rate: 9 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 3,
  },
  SLOT_MAN: {
    name: 'Slot Man',
    LVL: 19,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 200, PWR: 180, SKL: 70, DEF: 50, SPD: 80, MGC: 110, LUK: 30 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Vase', rate: 6 },
      { item: 'Persian Lamp', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 0,
  },

  // Lorimar Area
  GRAVE_MASTER: {
    name: 'Grave Master',
    LVL: 39,
    bits: 2000,
    bitsRaw: 1900,
    stats: { HP: 400, PWR: 270, SKL: 30, DEF: 80, SPD: 50, MGC: 75, LUK: 55 },
    drops: [
      { item: 'Full Helmet', rate: 10 },
      { item: 'Guard Ring', rate: 7 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 12,
  },
  // "Hell Hound" collides with a different Hell Hound in Moravia Castle (lvl 50) — numbered
  // by bestiary page order, where this one (Lorimar Area) appears first. HELL_HOUND_2 is
  // added when we reach Moravia Castle.
  HELL_HOUND_1: {
    name: 'Hell Hound',
    LVL: 37,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 300, PWR: 258, SKL: 70, DEF: 65, SPD: 70, MGC: 30, LUK: 40 },
    drops: [],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  SORCERER: {
    name: 'Sorcerer',
    LVL: 40,
    bits: 3000,
    bitsRaw: 3000,
    stats: { HP: 200, PWR: 270, SKL: 100, DEF: 30, SPD: 90, MGC: 190, LUK: 90 },
    drops: [{ item: 'Master Robe', rate: 10 }],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 36,
  },
  WHIP_WOLF: {
    name: 'Whip Wolf',
    LVL: 38,
    bits: 2500,
    bitsRaw: 2500,
    stats: { HP: 350, PWR: 240, SKL: 90, DEF: 70, SPD: 150, MGC: 75, LUK: 55 },
    drops: [{ item: 'Resurrection Rune', rate: 5 }],
    speciesFlags: 4,
  },

  // Magician's Island
  FURFUR: {
    name: 'FurFur',
    LVL: 4,
    bits: 50,
    bitsRaw: 50,
    stats: { HP: 18, PWR: 31, SKL: 5, DEF: 5, SPD: 16, MGC: 7, LUK: 5 },
    drops: [
      { item: 'Wooden Shoes', rate: 6 },
      { item: 'Medicine x6', rate: 8 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 0,
  },
  // Pair with HOLLY_BOY_2 (Great Forest) — see the note there.
  HOLLY_BOY_1: {
    name: 'Holly Boy',
    LVL: 3,
    bits: 10,
    bitsRaw: 10,
    stats: { HP: 10, PWR: 29, SKL: 5, DEF: 7, SPD: 15, MGC: 10, LUK: 70 },
    drops: [
      { item: 'Medicine x6', rate: 8 },
      { item: 'Robe', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Moravia Area (Mirage also appears here, identical to the Dragon Knights Area entry above)
  EARTH_GOLEM: {
    name: 'Earth Golem',
    LVL: 53,
    bits: 3000,
    bitsRaw: 3000,
    stats: { HP: 600, PWR: 340, SKL: 70, DEF: 110, SPD: 70, MGC: 230, LUK: 35 },
    drops: [{ item: 'Master Garb', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 4,
  },
  RABBIT_BIRD: {
    name: 'Rabbit Bird',
    LVL: 51,
    bits: 2200,
    bitsRaw: 2200,
    stats: { HP: 300, PWR: 305, SKL: 110, DEF: 50, SPD: 60, MGC: 160, LUK: 110 },
    drops: [{ item: 'Sacrificial Buddha', rate: 10 }],
    elements: { Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Moravia Castle
  // "Elite Soldier" collides with a different Elite Soldier in Shasarazade Fortress (lvl 54)
  // — numbered by bestiary page order, where this one (Moravia Castle) appears first.
  // ELITE_SOLDIER_2 is added when we reach Shasarazade Fortress.
  ELITE_SOLDIER_1: {
    name: 'Elite Soldier',
    LVL: 52,
    bits: 2800,
    bitsRaw: 2800,
    stats: { HP: 400, PWR: 340, SKL: 120, DEF: 120, SPD: 110, MGC: 190, LUK: 60 },
    drops: [{ item: 'Rage Rune', rate: 6 }],
    speciesFlags: 3,
  },
  // Pair with HELL_HOUND_1 (Lorimar Area) — see the note there.
  HELL_HOUND_2: {
    name: 'Hell Hound',
    LVL: 50,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 300, PWR: 335, SKL: 80, DEF: 80, SPD: 80, MGC: 30, LUK: 40 },
    drops: [],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  MAGUS: {
    name: 'Magus',
    LVL: 54,
    bits: 7100,
    bitsRaw: 7000,
    stats: { HP: 300, PWR: 270, SKL: 90, DEF: 50, SPD: 125, MGC: 290, LUK: 120 },
    drops: [{ item: 'Fortune Rune', rate: 6 }],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 5,
  },
  NINJA: {
    name: 'Ninja',
    LVL: 52,
    bits: 5500,
    bitsRaw: 5500,
    stats: { HP: 450, PWR: 340, SKL: 140, DEF: 70, SPD: 160, MGC: 60, LUK: 90 },
    drops: [
      { item: 'Cape Of Darkness', rate: 10 },
      { item: 'Wing Boots', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 6,
  },
  WHIP_MASTER: {
    name: 'Whip Master',
    LVL: 51,
    bits: 8000,
    bitsRaw: 8000,
    stats: { HP: 700, PWR: 320, SKL: 85, DEF: 90, SPD: 180, MGC: 175, LUK: 55 },
    drops: [
      { item: 'Hex Doll', rate: 6 },
      { item: 'Bonsai', rate: 6 },
      { item: 'Goddess Statue', rate: 2 },
    ],
    speciesFlags: 5,
  },

  // Mt. Seifu
  BANDIT_GREEN: {
    name: 'Bandit (green)',
    nickname: 'Green Bandit',
    LVL: 5,
    bits: 70,
    bitsRaw: 70,
    stats: { HP: 32, PWR: 47, SKL: 19, DEF: 3, SPD: 22, MGC: 10, LUK: 22 },
    drops: [
      { item: 'Medicine x6', rate: 7 },
      { item: 'Tunic', rate: 6 },
    ],
    speciesFlags: 4,
  },
  BANDIT_RED: {
    name: 'Bandit (red)',
    nickname: 'Red Bandit',
    LVL: 5,
    bits: 80,
    bitsRaw: 80,
    stats: { HP: 34, PWR: 49, SKL: 15, DEF: 6, SPD: 18, MGC: 14, LUK: 18 },
    drops: [],
    speciesFlags: 7,
  },
  BANDIT_YELLOW: {
    name: 'Bandit (yellow)',
    LVL: 7,
    bits: 150,
    bitsRaw: 150,
    stats: { HP: 55, PWR: 52, SKL: 20, DEF: 8, SPD: 15, MGC: 12, LUK: 16 },
    drops: [{ item: 'Shoulder Pads', rate: 9 }],
    speciesFlags: 7,
  },
  BLACK_WILD_BOAR: {
    name: 'Black Wild Boar',
    LVL: 7,
    bits: 300,
    bitsRaw: 300,
    stats: { HP: 60, PWR: 65, SKL: 15, DEF: 19, SPD: 20, MGC: 0, LUK: 20 },
    drops: [{ item: 'Wind Rune Piece', rate: 2 }],
    speciesFlags: 0,
  },
  SOLDIER_ANT: {
    name: 'Soldier Ant',
    LVL: 4,
    bits: 30,
    bitsRaw: 30,
    stats: { HP: 28, PWR: 48, SKL: 18, DEF: 10, SPD: 22, MGC: 0, LUK: 6 },
    drops: [{ item: 'Pointed Hat', rate: 9 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },

  // Mt. Tigerwolf
  GIANT_SNAIL: {
    name: 'Giant Snail',
    LVL: 9,
    bits: 250,
    bitsRaw: 250,
    stats: { HP: 120, PWR: 95, SKL: 35, DEF: 24, SPD: 22, MGC: 18, LUK: 30 },
    drops: [{ item: 'Defense Rune Piece', rate: 6 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 8,
  },
  KILLER_SLIME: {
    name: 'Killer Slime',
    LVL: 7,
    bits: 100,
    bitsRaw: 100,
    stats: { HP: 40, PWR: 72, SKL: 20, DEF: 34, SPD: 22, MGC: 55, LUK: 23 },
    drops: [{ item: 'Water Rune Piece', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 1,
  },
  SLASHER_RABBIT: {
    name: 'Slasher Rabbit',
    LVL: 6,
    bits: 70,
    bitsRaw: 70,
    stats: { HP: 60, PWR: 65, SKL: 30, DEF: 10, SPD: 29, MGC: 6, LUK: 6 },
    drops: [{ item: 'Karate Uniform', rate: 5 }],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },

  // Neclord's Castle
  DEMON_SORCERER: {
    name: 'Demon Sorcerer',
    LVL: 46,
    bits: 3500,
    bitsRaw: 3500,
    stats: { HP: 350, PWR: 320, SKL: 70, DEF: 50, SPD: 100, MGC: 290, LUK: 60 },
    drops: [
      { item: 'Wind Rune', rate: 6 },
      { item: 'Mega Medicine x3', rate: 15 },
    ],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 33,
  },
  HELL_UNICORN: {
    name: 'Hell Unicorn',
    LVL: 47,
    bits: 5000,
    bitsRaw: 5000,
    stats: { HP: 700, PWR: 380, SKL: 85, DEF: 60, SPD: 90, MGC: 265, LUK: 100 },
    drops: [{ item: 'Star Earrings', rate: 6 }],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 4,
  },
  LARVAE: {
    name: 'Larvae',
    LVL: 45,
    bits: 2000,
    bitsRaw: 2000,
    stats: { HP: 180, PWR: 260, SKL: 90, DEF: 80, SPD: 110, MGC: 100, LUK: 50 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Blue Dragon Urn', rate: 6 },
      { item: 'Fine Bone China', rate: 2 },
    ],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 37,
  },

  // Pannu Yakuta Area (Kobold (sword)/(bow) also appear here, identical to the Great Forest entries above)
  STRONG_ARM: {
    name: 'Strong Arm',
    LVL: 21,
    bits: 500,
    bitsRaw: 500,
    stats: { HP: 300, PWR: 200, SKL: 50, DEF: 60, SPD: 40, MGC: 20, LUK: 29 },
    drops: [{ item: 'Silver Ring', rate: 6 }],
    elements: { Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },
  KOBOLD_MAGE: {
    name: 'Kobold (mage)',
    LVL: 20,
    bits: 250,
    bitsRaw: 250,
    stats: { HP: 50, PWR: 100, SKL: 70, DEF: 40, SPD: 60, MGC: 130, LUK: 37 },
    drops: [
      { item: 'Guard Robe', rate: 10 },
      { item: 'Fire Rune', rate: 6 },
    ],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.INVULNERABLE,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.RESISTANT,
    },
    speciesFlags: 12,
  },

  // Pannu Yakuta (castle area; Veteran Soldier variants also appear in Kobold Village / Soniere Prison, identical)
  DEVIL_ARMOR: {
    name: 'Devil Armor',
    LVL: 27,
    bits: 1100,
    bitsRaw: 1100,
    stats: { HP: 400, PWR: 210, SKL: 40, DEF: 60, SPD: 50, MGC: 50, LUK: 40 },
    drops: [{ item: 'Mangosh', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Resurrection: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 36,
  },
  DEVIL_SHIELD: {
    name: 'Devil Shield',
    LVL: 27,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 250, PWR: 195, SKL: 56, DEF: 55, SPD: 45, MGC: 90, LUK: 30 },
    drops: [{ item: 'Chaos Shield', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Resurrection: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  VETERAN_SOLDIER_SPEAR: {
    name: 'Veteran Soldier (spear)',
    LVL: 26,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 270, PWR: 190, SKL: 55, DEF: 55, SPD: 70, MGC: 40, LUK: 45 },
    drops: [{ item: 'Leather Armor', rate: 8 }],
    speciesFlags: 3,
  },
  VETERAN_SOLDIER_BOW: {
    name: 'Veteran Soldier (bow)',
    LVL: 26,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 250, PWR: 175, SKL: 50, DEF: 45, SPD: 80, MGC: 38, LUK: 47 },
    drops: [{ item: 'Emblem', rate: 6 }],
    speciesFlags: 4,
  },
  VETERAN_SOLDIER_SABRE: {
    name: 'Veteran Soldier (sabre)',
    LVL: 26,
    bits: 700,
    bitsRaw: 700,
    stats: { HP: 260, PWR: 185, SKL: 53, DEF: 50, SPD: 80, MGC: 42, LUK: 44 },
    drops: [],
    speciesFlags: 7,
  },

  // Scarleticia Area / Scarleticia (castle) — Creeper and Mad Ivy appear identically in both
  CREEPER: {
    name: 'Creeper',
    LVL: 29,
    bits: 600,
    bitsRaw: 600,
    stats: { HP: 300, PWR: 210, SKL: 90, DEF: 25, SPD: 73, MGC: 40, LUK: 25 },
    drops: [{ item: 'Earth Rune', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  HOLLY_FAIRY: {
    name: 'Holly Fairy',
    LVL: 26,
    bits: 800,
    bitsRaw: 800,
    stats: { HP: 400, PWR: 240, SKL: 50, DEF: 35, SPD: 80, MGC: 75, LUK: 90 },
    drops: [
      { item: 'Nameless Urn', rate: 13 },
      { item: 'Magic Robe', rate: 7 },
      { item: 'Needle x4', rate: 13 },
    ],
    elements: { Water: ELEMENTAL_RESISTANCES.RESISTANT, Fire: ELEMENTAL_RESISTANCES.WEAK, Earth: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 35,
  },
  MAD_IVY: {
    name: 'Mad Ivy',
    LVL: 28,
    bits: 600,
    bitsRaw: 200,
    stats: { HP: 600, PWR: 235, SKL: 75, DEF: 25, SPD: 70, MGC: 35, LUK: 33 },
    drops: [{ item: 'Head Gear', rate: 10 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 8,
  },
  NIGHTMARE: {
    name: 'Nightmare',
    LVL: 32,
    bits: 1100,
    bitsRaw: 1100,
    stats: { HP: 150, PWR: 250, SKL: 60, DEF: 45, SPD: 90, MGC: 240, LUK: 70 },
    drops: [{ item: 'Opal', rate: 20 }],
    elements: {
      Water: ELEMENTAL_RESISTANCES.RESISTANT,
      Fire: ELEMENTAL_RESISTANCES.RESISTANT,
      Lightning: ELEMENTAL_RESISTANCES.RESISTANT,
      Earth: ELEMENTAL_RESISTANCES.RESISTANT,
      Wind: ELEMENTAL_RESISTANCES.RESISTANT,
      Resurrection: ELEMENTAL_RESISTANCES.WEAK,
    },
    speciesFlags: 12,
  },

  // Seek Valley (Ivy also appears here, identical to the Dragon Knights Area entry above)
  QUEEN_ANT: {
    name: 'Queen Ant',
    LVL: 52,
    bits: 6500,
    bitsRaw: 6500,
    stats: { HP: 800, PWR: 310, SKL: 60, DEF: 80, SPD: 110, MGC: 270, LUK: 60 },
    drops: [{ item: 'Silver Hat', rate: 5 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 0,
  },
  ROCK_BUSTER: {
    name: 'Rock Buster',
    LVL: 51,
    bits: 2500,
    bitsRaw: 2500,
    stats: { HP: 600, PWR: 300, SKL: 75, DEF: 90, SPD: 80, MGC: 240, LUK: 39 },
    drops: [
      { item: 'Taikioku Wear', rate: 10 },
      { item: 'Mega Medicine x3', rate: 15 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.RESISTANT },
    speciesFlags: 4,
  },
  WYVERN: {
    name: 'Wyvern',
    LVL: 53,
    bits: 5500,
    bitsRaw: 5500,
    stats: { HP: 1000, PWR: 320, SKL: 110, DEF: 85, SPD: 120, MGC: 260, LUK: 75 },
    drops: [{ item: 'Power Gloves', rate: 8 }],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Seika Area
  BEAST_COMMANDER: {
    name: 'Beast Commander',
    LVL: 13,
    bits: 200,
    bitsRaw: 200,
    stats: { HP: 90, PWR: 60, SKL: 30, DEF: 40, SPD: 70, MGC: 35, LUK: 60 },
    drops: [
      { item: 'Blue Ribbon', rate: 9 },
      { item: 'Phero Rune', rate: 3 },
    ],
    speciesFlags: 4,
  },
  FLYING_SQUIRREL: {
    name: 'Flying Squirrel',
    LVL: 11,
    bits: 100,
    bitsRaw: 100,
    stats: { HP: 90, PWR: 99, SKL: 40, DEF: 25, SPD: 35, MGC: 9, LUK: 30 },
    drops: [{ item: 'Holy Rune', rate: 5 }],
    elements: { Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },
  KILLER_RABBIT: {
    name: 'Killer Rabbit',
    LVL: 10,
    bits: 80,
    bitsRaw: 80,
    stats: { HP: 60, PWR: 90, SKL: 30, DEF: 15, SPD: 29, MGC: 7, LUK: 7 },
    drops: [
      { item: 'Hex Doll', rate: 6 },
      { item: 'Japanese Dish', rate: 6 },
      { item: 'Peeing Boy', rate: 2 },
    ],
    elements: { Lightning: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },
  ROC: {
    name: 'Roc',
    LVL: 14,
    bits: 70,
    bitsRaw: 70,
    stats: { HP: 110, PWR: 125, SKL: 55, DEF: 55, SPD: 60, MGC: 16, LUK: 20 },
    drops: [{ item: 'Feather', rate: 9 }],
    elements: { Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 44,
  },

  // Shasarazade Fortress
  // Pair with ELITE_SOLDIER_1 (Moravia Castle) — see the note there.
  ELITE_SOLDIER_2: {
    name: 'Elite Soldier',
    LVL: 54,
    bits: 3500,
    bitsRaw: 3500,
    stats: { HP: 550, PWR: 360, SKL: 130, DEF: 120, SPD: 130, MGC: 180, LUK: 100 },
    drops: [
      { item: 'Horned Helmet', rate: 10 },
      { item: 'Mega Medicine x3', rate: 12 },
    ],
    speciesFlags: 3,
  },
  KERBEROS: {
    name: 'Kerberos',
    LVL: 55,
    bits: 4000,
    bitsRaw: 4000,
    stats: { HP: 900, PWR: 370, SKL: 150, DEF: 70, SPD: 180, MGC: 160, LUK: 60 },
    drops: [{ item: 'Gold Necklace', rate: 8 }],
    elements: { Water: ELEMENTAL_RESISTANCES.WEAK, Fire: ELEMENTAL_RESISTANCES.INVULNERABLE, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  // Pair with SIREN_1 (Kalekka Area) — see the note there.
  SIREN_2: {
    name: 'Siren',
    LVL: 53,
    bits: 6000,
    bitsRaw: 6000,
    stats: { HP: 300, PWR: 260, SKL: 70, DEF: 45, SPD: 90, MGC: 210, LUK: 80 },
    drops: [
      { item: 'Sound Setting #3', rate: 18 },
      { item: 'Flowing Rune', rate: 6 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.RESISTANT, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 4,
  },

  // Soniere Prison (Nightmare and Veteran Soldier (bow) also appear here, identical to entries above)
  DELF: {
    name: 'Delf',
    LVL: 25,
    bits: 0,
    bitsRaw: 0,
    stats: { HP: 150, PWR: 180, SKL: 30, DEF: 85, SPD: 30, MGC: 40, LUK: 30 },
    drops: [],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },
  RED_SLIME: {
    name: 'Red Slime',
    LVL: 27,
    bits: 400,
    bitsRaw: 400,
    stats: { HP: 150, PWR: 225, SKL: 50, DEF: 55, SPD: 60, MGC: 60, LUK: 45 },
    drops: [
      { item: 'Hex Doll', rate: 6 },
      { item: 'Chinese Dish', rate: 6 },
      { item: 'Bonsai', rate: 2 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 1,
  },
  VIPERMAN: {
    name: 'Viperman',
    LVL: 30,
    bits: 900,
    bitsRaw: 900,
    stats: { HP: 200, PWR: 203, SKL: 45, DEF: 60, SPD: 70, MGC: 55, LUK: 56 },
    drops: [
      { item: 'Antitoxin x4', rate: 13 },
      { item: 'Ninja Suit', rate: 9 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Earth: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 12,
  },

  // Toran Lake Castle
  GHOST_ARMOR: {
    name: 'Ghost Armor',
    LVL: 17,
    bits: 600,
    bitsRaw: 600,
    stats: { HP: 250, PWR: 110, SKL: 30, DEF: 30, SPD: 40, MGC: 35, LUK: 27 },
    drops: [{ item: 'Brass Armor', rate: 6 }],
    elements: { Resurrection: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 36,
  },
  GIANT_SLUG: {
    name: 'Giant Slug',
    LVL: 15,
    bits: 250,
    bitsRaw: 250,
    stats: { HP: 120, PWR: 95, SKL: 35, DEF: 35, SPD: 22, MGC: 15, LUK: 26 },
    drops: [
      { item: 'Defense Rune Piece', rate: 6 },
      { item: 'Medicine x6', rate: 8 },
    ],
    elements: { Fire: ELEMENTAL_RESISTANCES.RESISTANT, Lightning: ELEMENTAL_RESISTANCES.WEAK, Wind: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 8,
  },
  OANNES: {
    name: 'Oannes',
    LVL: 16,
    bits: 200,
    bitsRaw: 200,
    stats: { HP: 200, PWR: 90, SKL: 10, DEF: 30, SPD: 45, MGC: 17, LUK: 12 },
    drops: [{ item: 'Antitoxin x4', rate: 14 }],
    elements: { Fire: ELEMENTAL_RESISTANCES.WEAK },
    speciesFlags: 5,
  },

  // Other Enemies — Empire Soldier variants, keyed by true weapon+number per the bestiary
  // (lib/enemies.js internally mislabeled two of these: its "EmpireSoldierSword" holds
  // saber #1 data, and its "EmpireSoldierL" holds bow #2 data). Sword #1, sword #2, and
  // spear #2 aren't in lib/enemies.js at all and are added fresh from the bestiary.
  EMPIRE_SOLDIER_SWORD_1: {
    name: 'Empire Soldier (sword)',
    LVL: 8,
    bits: 150,
    bitsRaw: 150,
    stats: { HP: 48, PWR: 65, SKL: 40, DEF: 7, SPD: 15, MGC: 10, LUK: 12 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_SPEAR_1: {
    name: 'Empire Soldier (spear)',
    LVL: 8,
    bits: 100,
    bitsRaw: 100,
    stats: { HP: 55, PWR: 60, SKL: 55, DEF: 7, SPD: 15, MGC: 8, LUK: 14 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_BOW_1: {
    name: 'Empire Soldier (bow)',
    LVL: 8,
    bits: 130,
    bitsRaw: 130,
    stats: { HP: 44, PWR: 60, SKL: 65, DEF: 5, SPD: 33, MGC: 9, LUK: 17 },
    drops: [],
    speciesFlags: 4,
  },
  EMPIRE_SOLDIER_SABER_1: {
    name: 'Empire Soldier (saber)',
    LVL: 8,
    bits: 140,
    bitsRaw: 140,
    stats: { HP: 50, PWR: 65, SKL: 55, DEF: 5, SPD: 25, MGC: 12, LUK: 25 },
    drops: [{ item: 'Headband', rate: 9 }],
    speciesFlags: 3,
  },
  EMPIRE_CAPTAIN: {
    name: 'Empire Captain',
    LVL: 10,
    bits: 250,
    bitsRaw: 250,
    stats: { HP: 90, PWR: 80, SKL: 45, DEF: 15, SPD: 10, MGC: 15, LUK: 26 },
    drops: [
      { item: 'Graffiti', rate: 6 },
      { item: 'Flower Painting', rate: 6 },
      { item: "Lover's Garden", rate: 2 },
    ],
    speciesFlags: 3,
  },
  // A second, distinct "Empire Captain" MonsterRecord found in the ROM (Bestiary.json),
  // not matching any existing entry's stats. Drop table and area/encounter placement are
  // unknown, so this isn't referenced from Areas.js yet.
  EMPIRE_CAPTAIN_2: {
    name: 'Empire Captain',
    LVL: 10,
    bits: 300,
    bitsRaw: 300,
    stats: { HP: 95, PWR: 75, SKL: 55, DEF: 15, SPD: 15, MGC: 17, LUK: 24 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_SWORD_2: {
    name: 'Empire Soldier (sword)',
    LVL: 12,
    bits: 160,
    bitsRaw: 160,
    stats: { HP: 58, PWR: 80, SKL: 40, DEF: 10, SPD: 15, MGC: 12, LUK: 27 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_SPEAR_2: {
    name: 'Empire Soldier (spear)',
    LVL: 12,
    bits: 110,
    bitsRaw: 110,
    stats: { HP: 65, PWR: 75, SKL: 55, DEF: 10, SPD: 15, MGC: 13, LUK: 27 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_BOW_2: {
    name: 'Empire Soldier (bow)',
    LVL: 12,
    bits: 140,
    bitsRaw: 140,
    stats: { HP: 54, PWR: 70, SKL: 65, DEF: 6, SPD: 33, MGC: 9, LUK: 29 },
    drops: [],
    speciesFlags: 4,
  },
  EMPIRE_SOLDIER_SWORD_3: {
    name: 'Empire Soldier (sword)',
    LVL: 13,
    bits: 200,
    bitsRaw: 200,
    stats: { HP: 55, PWR: 75, SKL: 40, DEF: 11, SPD: 26, MGC: 14, LUK: 24 },
    drops: [],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_SPEAR_3: {
    name: 'Empire Soldier (spear)',
    LVL: 13,
    bits: 200,
    bitsRaw: 200,
    stats: { HP: 68, PWR: 70, SKL: 55, DEF: 11, SPD: 28, MGC: 16, LUK: 24 },
    drops: [
      { item: 'Failure Urn', rate: 6 },
      { item: 'Vase', rate: 5 },
      { item: 'Blue Dragon Urn', rate: 2 },
    ],
    speciesFlags: 3,
  },
  EMPIRE_SOLDIER_SWORD_4: {
    name: 'Empire Soldier (sword)',
    LVL: 20,
    bits: 300,
    bitsRaw: 300,
    stats: { HP: 150, PWR: 120, SKL: 60, DEF: 40, SPD: 50, MGC: 35, LUK: 40 },
    drops: [{ item: 'Brass Armor', rate: 6 }],
    speciesFlags: 3,
  },
};
