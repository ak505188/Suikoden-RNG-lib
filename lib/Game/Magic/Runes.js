import { ELEMENTS } from '../Constants.js';
import { SPELLS } from './Spells.js';

/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('./Spells.js').Spell} Spell */

/** @typedef {typeof RUNE_TYPES[keyof typeof RUNE_TYPES]} RuneType */
export const RUNE_TYPES = /** @type {const} */ ({
  NONE: 'None',
  MAGIC: 'Magic',
  COMMAND: 'Command',
  PASSIVE: 'Passive',
});

/**
 * @typedef {Object} Rune
 * @property {number} id
 * @property {string} name
 * @property {RuneType} type
 * @property {Spell[]} spells
 * @property {Element} [element]
 */

/** @satisfies {Record<string, Rune>} */
export const RUNES = {
  NONE: {
    id: 0,
    name: 'None',
    type: RUNE_TYPES.NONE,
    spells: [],
  },
  SOUL_EATER: {
    id: 1,
    name: 'Soul Eater',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.DEADLY_FINGERTIPS, SPELLS.BLACK_SHADOW, SPELLS.HELL, SPELLS.JUDGEMENT],
    element: ELEMENTS.DARK,
  },
  FIRE: {
    id: 2,
    name: 'Fire',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.FLAMING_ARROWS, SPELLS.FIRESTORM, SPELLS.DANCING_FLAMES, SPELLS.EXPLOSION, SPELLS.FINAL_FLAME],
    element: ELEMENTS.FIRE,
  },
  WATER: {
    id: 3,
    name: 'Water',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.DROPS_OF_KINDNESS, SPELLS.FOG_OF_DECEPTION, SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.MOTHER_OCEAN],
    element: ELEMENTS.WATER,
  },
  WIND: {
    id: 4,
    name: 'Wind',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.WIND_OF_SLEEP, SPELLS.THE_SHREDDING, SPELLS.HEALING_WIND, SPELLS.STORM, SPELLS.SHINING_WIND],
    element: ELEMENTS.WIND,
  },
  LIGHTNING: {
    id: 5,
    name: 'Lightning',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.ANGRY_BLOW, SPELLS.RAINSTORM, SPELLS.RAGING_BLOW, SPELLS.BALL_OF_LIGHTNING, SPELLS.THUNDER_GOD],
    element: ELEMENTS.LIGHTNING,
  },
  EARTH: {
    id: 6,
    name: 'Earth',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.CLAY_GUARDIAN, SPELLS.VOICE_OF_EARTH, SPELLS.COPPER_FLESH, SPELLS.EARTHQUAKE, SPELLS.GUARDIAN_EARTH],
    element: ELEMENTS.EARTH,
  },
  RESURRECTION: {
    id: 7,
    name: 'Resurrection',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.SCOLDING, SPELLS.YELL, SPELLS.SCREAM, SPELLS.CHARM_ARROW],
    element: ELEMENTS.RESURRECTION,
  },
  BOAR: {
    id: 8,
    name: 'Boar',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  SHRIKE: {
    id: 9,
    name: 'Shrike',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  FALCON: {
    id: 10,
    name: 'Falcon',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  HATE: {
    id: 11,
    name: 'Hate',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  TRICK: {
    id: 12,
    name: 'Trick',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  CLONE: {
    id: 13,
    name: 'Clone',
    type: RUNE_TYPES.COMMAND,
    spells: [],
  },
  DOUBLE_BEAT: {
    id: 14,
    name: 'Double-beat',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  KILLER: {
    id: 15,
    name: 'Killer',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  COUNTER: {
    id: 16,
    name: 'Counter',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  SPARK: {
    id: 17,
    name: 'Spark',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  HAZY: {
    id: 18,
    name: 'Hazy',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  GALE: {
    id: 19,
    name: 'Gale',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  SUNBEAM: {
    id: 20,
    name: 'Sunbeam',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  HOLY: {
    id: 21,
    name: 'Holy',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  FORTUNE: {
    id: 22,
    name: 'Fortune',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  PROSPERITY: {
    id: 23,
    name: 'Prosperity',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  CHAMPIONS: {
    id: 24,
    name: 'Champions',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  TURTLE: {
    id: 25,
    name: 'Turtle',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  PHERO: {
    id: 26,
    name: 'Phero',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
  RAGE: {
    id: 27,
    name: 'Rage',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.FLAMING_ARROWS, SPELLS.FIRESTORM, SPELLS.DANCING_FLAMES, SPELLS.EXPLOSION, SPELLS.FINAL_FLAME],
    element: ELEMENTS.FIRE,
  },
  FLOWING: {
    id: 28,
    name: 'Flowing',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.DROPS_OF_KINDNESS, SPELLS.FOG_OF_DECEPTION, SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.MOTHER_OCEAN],
    element: ELEMENTS.WATER,
  },
  CYCLONE: {
    id: 29,
    name: 'Cyclone',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.WIND_OF_SLEEP, SPELLS.THE_SHREDDING, SPELLS.HEALING_WIND, SPELLS.STORM, SPELLS.SHINING_WIND],
    element: ELEMENTS.WIND,
  },
  MOTHER_EARTH: {
    id: 30,
    name: 'Mother Earth',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.CLAY_GUARDIAN, SPELLS.VOICE_OF_EARTH, SPELLS.COPPER_FLESH, SPELLS.EARTHQUAKE, SPELLS.GUARDIAN_EARTH],
    element: ELEMENTS.EARTH,
  },
  THUNDER: {
    id: 31,
    name: 'Thunder',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.ANGRY_BLOW, SPELLS.RAINSTORM, SPELLS.RAGING_BLOW, SPELLS.BALL_OF_LIGHTNING, SPELLS.THUNDER_GOD],
    element: ELEMENTS.THUNDER,
  },
  UNKNOWN: {
    id: 32,
    name: '??????:',
    type: RUNE_TYPES.NONE,
    element: ELEMENTS.DARK,
    spells: [],
  },
  TRUE_HOLY: {
    id: 33,
    name: 'True Holy',
    type: RUNE_TYPES.PASSIVE,
    spells: [],
  },
};
