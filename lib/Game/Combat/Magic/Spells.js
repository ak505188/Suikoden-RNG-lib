import { ELEMENTS, SIDE, TARGET } from '../Constants.js';

export const SPELLS = {
  // Fire Rune / Rage Rune
  FLAMING_ARROWS: {
    damage: 100,
    element: ELEMENTS.FIRE,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '100 damage to 1 enemy',
  },
  FIRESTORM: {
    damage: 150,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '150 damage to all enemies',
  },
  DANCING_FLAMES: {
    damage: 400,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all enemies',
  },
  EXPLOSION: {
    damage: 700,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },
  FINAL_FLAME: {
    damage: 900,
    element: ELEMENTS.FIRE,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },

  // Water Rune / Flowing Rune
  DROPS_OF_KINDNESS: {
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Fully heals one ally',
  },
  FOG_OF_DECEPTION: {
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases evade rate of all allies',
  },
  WATER_OF_KINDNESS: {
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 300 HP to all allies',
  },
  RAIN_OF_KINDNESS: {
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies',
  },
  MOTHER_OCEAN: {
    damage: 0,
    element: ELEMENTS.WATER,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Fully heals all allies, including unconscious allies',
  },

  // Wind Rune / Cyclone Rune
  WIND_OF_SLEEP: {
    damage: 0,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Casts sleep on all enemies',
  },
  THE_SHREDDING: {
    damage: 400,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '400 damage to 1 enemy',
  },
  HEALING_WIND: {
    damage: 0,
    element: ELEMENTS.WIND,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Heals 1 ally',
  },
  STORM: {
    damage: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '500 damage to all enemies',
  },
  SHINING_WIND: {
    damage: 500,
    element: ELEMENTS.WIND,
    target: TARGET.AOE,
    side: SIDE.BOTH,
    description: 'Heals all allies, 500 damage to all enemies',
  },

  // Lightning Rune / Thunder Rune
  ANGRY_BLOW: {
    damage: 150,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '150 damage to 1 enemy',
  },
  RAINSTORM: {
    damage: 100,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '100 damage to all enemies',
  },
  RAGING_BLOW: {
    damage: 600,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '600 damage to 1 enemy',
  },
  BALL_OF_LIGHTNING: {
    damage: 1000,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1000 damage to 1 enemy',
  },
  THUNDER_GOD: {
    damage: 900,
    element: ELEMENTS.LIGHTNING,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '900 damage to all enemies',
  },

  // Earth Rune / Mother Earth Rune
  CLAY_GUARDIAN: {
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Increases defense 1.5x for 1 ally (does not work in the PS version)',
  },
  VOICE_OF_EARTH: {
    damage: 300,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  COPPER_FLESH: {
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Grants invincibility for 3 turns to 1 ally (no damage nor healing taken)',
  },
  EARTHQUAKE: {
    damage: 700,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '700 damage to all enemies',
  },
  GUARDIAN_EARTH: {
    damage: 0,
    element: ELEMENTS.EARTH,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Increases defense for all allies (does not work in the PS version)',
  },

  // Resurrection Rune
  SCOLDING: {
    damage: 70,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '70 damage against one foe, double damage against undead',
  },
  YELL: {
    damage: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.ANY,
    side: SIDE.ALLY,
    description: 'Raises one unconscious ally',
  },
  SCREAM: {
    damage: 0,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ALLY,
    description: 'Heals 400 HP for all allies',
  },
  CHARM_ARROW: {
    damage: 400,
    element: ELEMENTS.RESURRECTION,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '400 damage to all foes, double damage against undead',
  },

  // Soul Eater
  DEADLY_FINGERTIPS: {
    damage: 0,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: 'Sudden death to 1 enemy (except bosses)',
  },
  BLACK_SHADOW: {
    damage: 300,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: '300 damage to all enemies',
  },
  HELL: {
    damage: 0,
    element: ELEMENTS.DARK,
    target: TARGET.AOE,
    side: SIDE.ENEMY,
    description: 'Sudden death to all enemies (except bosses)',
  },
  JUDGEMENT: {
    damage: 1500,
    element: ELEMENTS.DARK,
    target: TARGET.ANY,
    side: SIDE.ENEMY,
    description: '1500 damage to 1 enemy',
  },
};
