import { ELEMENTS, SIDE, TARGET } from '../Constants.js';

/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('../Constants.js').Target} Target */
/** @typedef {import('../Constants.js').Side} Side */

/**
 * @typedef {Object} Spell
 * @property {number} id
 * @property {number} damage
 * @property {Element|[Element, Element]} element
 * @property {Target} target
 * @property {Side} side
 * @property {string} description
 */

/** @satisfies {Record<string, Spell>} */
export const SPELLS = {
  // Fire Rune / Rage Rune
  FLAMING_ARROWS: {
    id: 1,
    damage: 100,
    element: ELEMENTS.FIRE,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '100 damage to 1 enemy',
  },
  FIRESTORM: {
    id: 2,
    damage: 150,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '150 damage to all enemies',
  },
  DANCING_FLAMES: {
    id: 3,
    damage: 400,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all enemies',
  },
  EXPLOSION: {
    id: 4,
    damage: 700,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },

  // Resurrection Rune
  SCOLDING: {
    id: 5,
    damage: 70,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '70 damage against one foe, double damage against undead',
  },
  YELL: {
    id: 6,
    damage: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Raises one unconscious ally',
  },
  SCREAM: {
    id: 7,
    damage: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 400 HP for all allies',
  },
  CHARM_ARROW: {
    id: 8,
    damage: 400,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all foes, double damage against undead',
  },

  // Water Rune / Flowing Rune
  DROPS_OF_KINDNESS: {
    id: 9,
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Fully heals one ally',
  },
  FOG_OF_DECEPTION: {
    id: 10,
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases evade rate of all allies',
  },
  WATER_OF_KINDNESS: {
    id: 11,
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 300 HP to all allies',
  },
  RAIN_OF_KINDNESS: {
    id: 12,
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies',
  },

  // Wind Rune / Cyclone Rune
  WIND_OF_SLEEP: {
    id: 13,
    damage: 0,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Casts sleep on all enemies',
  },
  THE_SHREDDING: {
    id: 14,
    damage: 400,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '400 damage to 1 enemy',
  },
  HEALING_WIND: {
    id: 15,
    damage: 0,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Heals 1 ally',
  },
  STORM: {
    id: 16,
    damage: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '500 damage to all enemies',
  },

  // Lightning Rune / Thunder Rune
  ANGRY_BLOW: {
    id: 17,
    damage: 150,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '150 damage to 1 enemy',
  },
  RAINSTORM: {
    id: 18,
    damage: 100,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '100 damage to all enemies',
  },
  RAGING_BLOW: {
    id: 19,
    damage: 600,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '600 damage to 1 enemy',
  },
  BALL_OF_LIGHTNING: {
    id: 20,
    damage: 1000,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1000 damage to 1 enemy',
  },

  // Earth Rune / Mother Earth Rune
  CLAY_GUARDIAN: {
    id: 21,
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Increases defense 1.5x for 1 ally (does not work in the PS version)',
  },
  VOICE_OF_EARTH: {
    id: 22,
    damage: 300,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  COPPER_FLESH: {
    id: 23,
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Grants invincibility for 3 turns to 1 ally (no damage nor healing taken)',
  },
  EARTHQUAKE: {
    id: 24,
    damage: 700,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },

  // Soul Eater
  DEADLY_FINGERTIPS: {
    id: 25,
    damage: 0,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: 'Sudden death to 1 enemy (except bosses)',
  },
  BLACK_SHADOW: {
    id: 26,
    damage: 300,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  HELL: {
    id: 27,
    damage: 0,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Sudden death to all enemies (except bosses)',
  },
  JUDGEMENT: {
    id: 28,
    damage: 1500,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1500 damage to 1 enemy',
  },

  // Level 5 spells (rune upgrades)
  FINAL_FLAME: {
    id: 29,
    damage: 900,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },
  MOTHER_OCEAN: {
    id: 30,
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies, including unconscious allies',
  },
  SHINING_WIND: {
    id: 31,
    damage: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: 'Heals all allies, 500 damage to all enemies',
  },
  THUNDER_GOD: {
    id: 32,
    damage: 900,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },
  GUARDIAN_EARTH: {
    id: 33,
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases defense for all allies (does not work in the PS version)',
  },

  // Magic Unite (combo spells)
  SCORCHED_EARTH: {
    id: 34,
    damage: 1300,
    element: [ELEMENTS.FIRE, ELEMENTS.EARTH],
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '1300 damage to all enemies'
  },
  STORM_FANG: {
    id: 35,
    damage: 1000,
    element: [ELEMENTS.EARTH, ELEMENTS.WIND],
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: '1000 damage to all enemies.'
  },
  BLAZING_CAMP: {
    id: 36,
    damage: 1500,
    element: [ELEMENTS.FIRE, ELEMENTS.LIGHTNING],
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '1500 damage to all enemies'
  },
  THOR: {
    id: 37,
    damage: 2000,
    element: [ELEMENTS.LIGHTNING, ELEMENTS.WATER],
    target: TARGET.ANY,
    side: SIDE.BOTH,
    description: '2000 damage to 1 enemy. Revives all allies, heals all allies, removes all statuses.'
  },
  WATER_DRAGON: {
    id: 38,
    damage: 800,
    element: [ELEMENTS.WATER, ELEMENTS.WIND],
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: '800 damage to all enemies. Revives all allies, heals all allies, removes all statuses.'
  },
};
