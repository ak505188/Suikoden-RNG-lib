/** @typedef {typeof ELEMENTS[keyof typeof ELEMENTS]} Element */
export const ELEMENTS = /** @type {const} */ ({
  NONE: 'None',
  WATER: 'Water',
  FIRE: 'Fire',
  LIGHTNING: 'Lightning',
  EARTH: 'Earth',
  WIND: 'Wind',
  RESURRECTION: 'Resurrection',
  DARK: 'Dark',
});

/** @typedef {typeof TARGET[keyof typeof TARGET]} Target */
export const TARGET = /** @type {const} */ ({
  ANY: 'ANY',
  FRONT_ANY: 'Front Row Any',
  AOE: 'AOE',
});

/** @typedef {typeof SIDE[keyof typeof SIDE]} Side */
export const SIDE = /** @type {const} */ ({
  ALLY: 'Ally',
  ENEMY: 'Enemy',
  BOTH: 'Both',
});

/** @typedef {typeof RANGE[keyof typeof RANGE]} Range */
export const RANGE = /** @type {const} */ ({
  SHORT: 'Short',
  MEDIUM: 'Medium',
  LONG: 'Long',
});

/** @typedef {typeof STATUS[keyof typeof STATUS]} Status */
export const STATUS = /** @type {const} */ ({
  POISON: 'Poison',
  BALLOON: 'Balloon',
  BUCKET: 'Bucket',
  UNBALANCED: 'Unbalanced',
  SLEEP: 'Sleep',
});

/** @typedef {typeof STATS[keyof typeof STATS]} Stat */
export const STATS = /** @type {const} */ ({
  PWR: 'PWR',
  SKL: 'SKL',
  DEF: 'DEF',
  SPD: 'SPD',
  MGC: 'MGC',
  LUK: 'LUK',
  HP: 'HP',
});
