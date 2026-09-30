import { ELEMENTS, TARGET } from '../Constants.js';
import { SPELLS } from './Spells.js';
import { RUNE_KEYS } from '../Keys.js';

/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('./Spells.js').Spell} Spell */
/** @typedef {import('../Keys.js').RuneKey} RuneKey */

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
 * @property {Spell[]} [spells]
 * @property {Element} [element]
 * @property {CommandAbility} [command] - What a Command rune's Rune command does (AbilitySlot 0)
 */

/**
 * A Command rune's move: always the Rune command's only option, with no MP or charge cost.
 * Timing is in Battle/CommandRuneTimings.js.
 * @typedef {Object} CommandAbility
 * @property {number} mult - Damage = calc_damage(user, target) * mult, done as * (mult * 10) / 10.
 * @property {import('../Constants.js').Target} target
 * @property {boolean} [unbalances] - Leaves the user Unbalanced
 */

/** @satisfies {Record<RuneKey, Rune>} */
export const RUNES = {
  [RUNE_KEYS.NONE]: {
    id: 0,
    name: 'None',
    type: RUNE_TYPES.NONE,
  },
  [RUNE_KEYS.SOUL_EATER]: {
    id: 1,
    name: 'Soul Eater',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.DEADLY_FINGERTIPS, SPELLS.BLACK_SHADOW, SPELLS.HELL, SPELLS.JUDGEMENT],
    element: ELEMENTS.DARK,
  },
  [RUNE_KEYS.FIRE]: {
    id: 2,
    name: 'Fire',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.FLAMING_ARROWS, SPELLS.FIRESTORM, SPELLS.DANCING_FLAMES, SPELLS.EXPLOSION],
    element: ELEMENTS.FIRE,
  },
  [RUNE_KEYS.WATER]: {
    id: 3,
    name: 'Water',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.DROPS_OF_KINDNESS, SPELLS.FOG_OF_DECEPTION, SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS],
    element: ELEMENTS.WATER,
  },
  [RUNE_KEYS.WIND]: {
    id: 4,
    name: 'Wind',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.WIND_OF_SLEEP, SPELLS.THE_SHREDDING, SPELLS.HEALING_WIND, SPELLS.STORM],
    element: ELEMENTS.WIND,
  },
  [RUNE_KEYS.LIGHTNING]: {
    id: 5,
    name: 'Lightning',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.ANGRY_BLOW, SPELLS.RAINSTORM, SPELLS.RAGING_BLOW, SPELLS.BALL_OF_LIGHTNING],
    element: ELEMENTS.LIGHTNING,
  },
  [RUNE_KEYS.EARTH]: {
    id: 6,
    name: 'Earth',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.CLAY_GUARDIAN, SPELLS.VOICE_OF_EARTH, SPELLS.COPPER_FLESH, SPELLS.EARTHQUAKE],
    element: ELEMENTS.EARTH,
  },
  [RUNE_KEYS.RESURRECTION]: {
    id: 7,
    name: 'Resurrection',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.SCOLDING, SPELLS.YELL, SPELLS.SCREAM, SPELLS.CHARM_ARROW],
    element: ELEMENTS.RESURRECTION,
  },
  [RUNE_KEYS.BOAR]: {
    id: 8,
    name: 'Boar',
    type: RUNE_TYPES.COMMAND,
    command: { mult: 2, target: TARGET.ANY, unbalances: true },
  },
  [RUNE_KEYS.SHRIKE]: {
    id: 9,
    name: 'Shrike',
    type: RUNE_TYPES.COMMAND,
  },
  [RUNE_KEYS.FALCON]: {
    id: 10,
    name: 'Falcon',
    type: RUNE_TYPES.COMMAND,
    command: { mult: 3, target: TARGET.ANY },
  },
  [RUNE_KEYS.HATE]: {
    id: 11,
    name: 'Hate',
    type: RUNE_TYPES.COMMAND,
  },
  [RUNE_KEYS.TRICK]: {
    id: 12,
    name: 'Trick',
    type: RUNE_TYPES.COMMAND,
  },
  [RUNE_KEYS.CLONE]: {
    id: 13,
    name: 'Clone',
    type: RUNE_TYPES.COMMAND,
  },
  [RUNE_KEYS.DOUBLE_BEAT]: {
    id: 14,
    name: 'Double-beat',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.KILLER]: {
    id: 15,
    name: 'Killer',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.COUNTER]: {
    id: 16,
    name: 'Counter',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.SPARK]: {
    id: 17,
    name: 'Spark',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.HAZY]: {
    id: 18,
    name: 'Hazy',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.GALE]: {
    id: 19,
    name: 'Gale',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.SUNBEAM]: {
    id: 20,
    name: 'Sunbeam',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.HOLY]: {
    id: 21,
    name: 'Holy',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.FORTUNE]: {
    id: 22,
    name: 'Fortune',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.PROSPERITY]: {
    id: 23,
    name: 'Prosperity',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.CHAMPIONS]: {
    id: 24,
    name: 'Champions',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.TURTLE]: {
    id: 25,
    name: 'Turtle',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.PHERO]: {
    id: 26,
    name: 'Phero',
    type: RUNE_TYPES.PASSIVE,
  },
  [RUNE_KEYS.RAGE]: {
    id: 27,
    name: 'Rage',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.FIRESTORM, SPELLS.DANCING_FLAMES, SPELLS.EXPLOSION, SPELLS.FINAL_FLAME],
    element: ELEMENTS.FIRE,
  },
  [RUNE_KEYS.FLOWING]: {
    id: 28,
    name: 'Flowing',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.FOG_OF_DECEPTION, SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.MOTHER_OCEAN],
    element: ELEMENTS.WATER,
  },
  [RUNE_KEYS.CYCLONE]: {
    id: 29,
    name: 'Cyclone',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.THE_SHREDDING, SPELLS.HEALING_WIND, SPELLS.STORM, SPELLS.SHINING_WIND],
    element: ELEMENTS.WIND,
  },
  [RUNE_KEYS.MOTHER_EARTH]: {
    id: 30,
    name: 'Mother Earth',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.VOICE_OF_EARTH, SPELLS.COPPER_FLESH, SPELLS.EARTHQUAKE, SPELLS.GUARDIAN_EARTH],
    element: ELEMENTS.EARTH,
  },
  [RUNE_KEYS.THUNDER]: {
    id: 31,
    name: 'Thunder',
    type: RUNE_TYPES.MAGIC,
    spells: [SPELLS.RAINSTORM, SPELLS.RAGING_BLOW, SPELLS.BALL_OF_LIGHTNING, SPELLS.THUNDER_GOD],
    element: ELEMENTS.LIGHTNING,
  },
  [RUNE_KEYS.UNKNOWN]: {
    id: 32,
    name: '??????:',
    type: RUNE_TYPES.NONE,
    spells: [SPELLS.HELL],
  },
  [RUNE_KEYS.TRUE_HOLY]: {
    id: 33,
    name: 'True Holy',
    type: RUNE_TYPES.PASSIVE,
  },
};
