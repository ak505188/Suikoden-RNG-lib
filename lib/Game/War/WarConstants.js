/** What a war character, a unit or an enemy action is: the command categories are the first three. */
/** @typedef {typeof WAR_TYPES[keyof typeof WAR_TYPES]} WarType */
export const WAR_TYPES = /** @type {const} */ ({
  CHARGE: 'CHARGE',
  BOW: 'BOW',
  MAGIC: 'MAGIC',
  OTHER: 'OTHER',
});

/** The command menu's categories (OTHER is the Others menu), in the game's order (0..3). */
export const WAR_TYPE_ORDER = [WAR_TYPES.CHARGE, WAR_TYPES.BOW, WAR_TYPES.MAGIC, WAR_TYPES.OTHER];

/** @typedef {typeof WAR_OUTCOMES[keyof typeof WAR_OUTCOMES]} WarOutcome */
export const WAR_OUTCOMES = /** @type {const} */ ({
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
  /** Every Charge, Bow and Magic unit is used up (the game's outcome 8) */
  NO_UNITS_LEFT: 'NO_UNITS_LEFT',
});

/** @typedef {typeof THIEF_RESULTS[keyof typeof THIEF_RESULTS]} ThiefResult */
export const THIEF_RESULTS = /** @type {const} */ ({
  REVEAL: 'REVEAL',
  FAIL: 'FAIL',
  STEAL: 'STEAL',
});

/** How a scenario resolves a round: the five regular overlays share STANDARD. */
/** @typedef {typeof WAR_RESOLVERS[keyof typeof WAR_RESOLVERS]} WarResolver */
export const WAR_RESOLVERS = /** @type {const} */ ({
  STANDARD: 'STANDARD',
  TEO1: 'TEO1',
  SCA1: 'SCA1',
  TEO2: 'TEO2',
});

/**
 * The command matchup, indexed `playerType * 3 + enemyType` (Charge, Bow, Magic): what the player
 * gets against the enemy's action.
 */
export const MATCHUP = { WIN: 0, LOSE: 1, TIE: 2 };
export const MATCHUPS = [
  MATCHUP.TIE,
  MATCHUP.WIN,
  MATCHUP.LOSE, // Charge vs Charge, Bow, Magic
  MATCHUP.LOSE,
  MATCHUP.TIE,
  MATCHUP.WIN, // Bow
  MATCHUP.WIN,
  MATCHUP.LOSE,
  MATCHUP.TIE, // Magic
];
