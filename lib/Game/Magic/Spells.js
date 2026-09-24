import { ELEMENTS, SIDE, TARGET } from '../Constants.js';

/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('../Constants.js').Target} Target */
/** @typedef {import('../Constants.js').Side} Side */

/**
 * @typedef {Object} Spell
 * @property {string} name
 * @property {number} id
 * @property {number} power
 * @property {Element|[Element, Element]} element
 * @property {Target} target
 * @property {Side} side
 * @property {string} description
 */

/** @satisfies {Record<string, Spell>} */
export const SPELLS = {
  // Fire Rune / Rage Rune
  FLAMING_ARROWS: {
    name: 'Flaming Arrows',
    id: 1,
    power: 100,
    element: ELEMENTS.FIRE,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '100 damage to 1 enemy',
  },
  FIRESTORM: {
    name: 'Firestorm',
    id: 2,
    power: 150,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '150 damage to all enemies',
  },
  DANCING_FLAMES: {
    name: 'Dancing Flames',
    id: 3,
    power: 400,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all enemies',
  },
  EXPLOSION: {
    name: 'Explosion',
    id: 4,
    power: 700,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },

  // Resurrection Rune
  SCOLDING: {
    name: 'Scolding',
    id: 5,
    power: 70,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '70 damage against one foe, double damage against undead',
  },
  YELL: {
    name: 'Yell',
    id: 6,
    power: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Raises one unconscious ally',
  },
  SCREAM: {
    name: 'Scream',
    id: 7,
    power: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 400 HP for all allies',
  },
  CHARM_ARROW: {
    name: 'Charm Arrow',
    id: 8,
    power: 400,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all foes, double damage against undead',
  },

  // Water Rune / Flowing Rune
  DROPS_OF_KINDNESS: {
    name: 'Drops of Kindness',
    id: 9,
    power: 0,
    element: ELEMENTS.WATER,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Fully heals one ally',
  },
  FOG_OF_DECEPTION: {
    name: 'Fog of Deception',
    id: 10,
    power: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases evade rate of all allies',
  },
  WATER_OF_KINDNESS: {
    name: 'Water of Kindness',
    id: 11,
    power: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 300 HP to all allies',
  },
  RAIN_OF_KINDNESS: {
    name: 'Rain of Kindness',
    id: 12,
    power: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies',
  },

  // Wind Rune / Cyclone Rune
  WIND_OF_SLEEP: {
    name: 'Wind of Sleep',
    id: 13,
    power: 0,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Casts sleep on all enemies',
  },
  THE_SHREDDING: {
    name: 'The Shredding',
    id: 14,
    power: 400,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '400 damage to 1 enemy',
  },
  HEALING_WIND: {
    name: 'Healing Wind',
    id: 15,
    power: 0,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Heals 1 ally',
  },
  STORM: {
    name: 'Storm',
    id: 16,
    power: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '500 damage to all enemies',
  },

  // Lightning Rune / Thunder Rune
  ANGRY_BLOW: {
    name: 'Angry Blow',
    id: 17,
    power: 150,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '150 damage to 1 enemy',
  },
  RAINSTORM: {
    name: 'Rainstorm',
    id: 18,
    power: 100,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '100 damage to all enemies',
  },
  RAGING_BLOW: {
    name: 'Raging Blow',
    id: 19,
    power: 600,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '600 damage to 1 enemy',
  },
  BALL_OF_LIGHTNING: {
    name: 'Ball of Lightning',
    id: 20,
    power: 1000,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1000 damage to 1 enemy',
  },

  // Earth Rune / Mother Earth Rune
  CLAY_GUARDIAN: {
    name: 'Clay Guardian',
    id: 21,
    power: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Increases defense 1.5x for 1 ally (does not work in the PS version)',
  },
  VOICE_OF_EARTH: {
    name: 'Voice of Earth',
    id: 22,
    power: 300,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  COPPER_FLESH: {
    name: 'Copper Flesh',
    id: 23,
    power: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Grants invincibility for 3 turns to 1 ally (no damage nor healing taken)',
  },
  EARTHQUAKE: {
    name: 'Earthquake',
    id: 24,
    power: 700,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },

  // Soul Eater
  DEADLY_FINGERTIPS: {
    name: 'Deadly Fingertips',
    id: 25,
    power: 0,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: 'Sudden death to 1 enemy (except bosses)',
  },
  BLACK_SHADOW: {
    name: 'Black Shadow',
    id: 26,
    power: 300,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  HELL: {
    name: 'Hell',
    id: 27,
    power: 0,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Sudden death to all enemies (except bosses)',
  },
  JUDGEMENT: {
    name: 'Judgement',
    id: 28,
    power: 1500,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1500 damage to 1 enemy',
  },

  // Level 5 spells (rune upgrades)
  FINAL_FLAME: {
    name: 'Final Flame',
    id: 29,
    power: 900,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },
  MOTHER_OCEAN: {
    name: 'Mother Ocean',
    id: 30,
    power: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies, including unconscious allies',
  },
  SHINING_WIND: {
    name: 'Shining Wind',
    id: 31,
    power: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: 'Heals all allies, 500 damage to all enemies',
  },
  THUNDER_GOD: {
    name: 'Thunder God',
    id: 32,
    power: 900,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },
  GUARDIAN_EARTH: {
    name: 'Guardian Earth',
    id: 33,
    power: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases defense for all allies (does not work in the PS version)',
  },

  // Magic Unite (combo spells)
  SCORCHED_EARTH: {
    name: 'Scorched Earth',
    id: 34,
    power: 1300,
    element: [ELEMENTS.FIRE, ELEMENTS.EARTH],
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '1300 damage to all enemies'
  },
  STORM_FANG: {
    name: 'Storm Fang',
    id: 35,
    power: 1000,
    element: [ELEMENTS.EARTH, ELEMENTS.WIND],
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: '1000 damage to all enemies.'
  },
  BLAZING_CAMP: {
    name: 'Blazing Camp',
    id: 36,
    power: 1500,
    element: [ELEMENTS.FIRE, ELEMENTS.LIGHTNING],
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '1500 damage to all enemies'
  },
  THOR: {
    name: 'Thor',
    id: 37,
    power: 2000,
    element: [ELEMENTS.LIGHTNING, ELEMENTS.WATER],
    target: TARGET.ANY,
    side: SIDE.BOTH,
    description: '2000 damage to 1 enemy. Revives all allies, heals all allies, removes all statuses.'
  },
  WATER_DRAGON: {
    name: 'Water Dragon',
    id: 38,
    power: 800,
    element: [ELEMENTS.WATER, ELEMENTS.WIND],
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: '800 damage to all enemies. Revives all allies, heals all allies, removes all statuses.'
  },
};
