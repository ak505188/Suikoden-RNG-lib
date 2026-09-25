/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/**
 * @typedef {Object} Action
 * @property {ActionType} type
 * @property {number} [target]
 * @property {number} [slot]
 * @property {string} [itemId] - Item key, for type 'Item'.
 */

/**
 * One resolved action, as recorded in a Battle's turn log. This is the unit
 * scoring functions operate over (a full battle's `path` is `ActionResult[]`).
 *
 * @typedef {Object} ActionResult
 * @property {number} turnIndex
 * @property {string} actor - Name of the fighter who acted.
 * @property {Action} action - The committed action that was resolved.
 * @property {number} [target] - Name of the targeted fighter, when applicable.
 * @property {number} [damage] - Damage dealt to the target, when applicable.
 * @property {number} [targetHP] - Target's HP after this action resolved.
 */

/**
 * @typedef {Object} ActionParams
 * @property {ActionType} action
 * @property {Character|Enemy} [actor]
 * @property {boolean} [wait]
 * @property {Character|Enemy} [target]
 * @property {ATTACK_RESULT} [result]
 * @property {Spell} [spell]
 */

/** @typedef {typeof ACTION_TYPES[keyof typeof ACTION_TYPES]} ActionType */
export const ACTION_TYPES = /** @type {const} */ ({
  ATTACK: 'Attack',
  DEFEND: 'Defend',
  RUNE: 'Rune',
  ITEM: 'Item',
  UNITE: 'Unite',
  MAGIC: 'Magic',
  ABILITY: 'Ability',
  COMMAND: 'Command',
  NOTHING: 'Nothing',
  UNDETERMINED: 'Undetermined',
});

/**
 * @template {Record<string, string>} T
 * @template {keyof T} K
 * @param {T} obj
 * @param {...K} keys
 * @returns {Pick<T, K>}
 */
const pick = (obj, ...keys) =>
  /** @type {Pick<T, K>} */ (Object.fromEntries(keys.map(key => [key, obj[key]])));

/** @typedef {typeof PLAYER_ACTION_TYPES[keyof typeof PLAYER_ACTION_TYPES]} PlayerActionType */
export const PLAYER_ACTION_TYPES = pick(ACTION_TYPES, 'ATTACK', 'DEFEND', 'RUNE', 'ITEM', 'UNITE');

/** @typedef {typeof ENEMY_ACTION_TYPES[keyof typeof ENEMY_ACTION_TYPES]} EnemyActionType */
export const ENEMY_ACTION_TYPES = pick(ACTION_TYPES, 'ATTACK', 'MAGIC', 'ABILITY', 'COMMAND', 'NOTHING', 'UNDETERMINED');

/** @typedef {typeof ACTION_VALIDITY[keyof typeof ACTION_VALIDITY]} ActionValidity */
export const ACTION_VALIDITY = /** @type {const} */ ({
  VALID: 'Valid',
  BUSY: 'Busy',
  INVALID: 'Invalid', // Invalid target, adjust or skip
  NO_VALID: 'No valid', // No valid targets exist, skip
  ILLEGAL: 'Illegal', // Throw error
});

export const BUSY_TYPE = /** @type {const} */ ({
  AVAILABLE: 'Available', // 0
  BUSY: 'Busy', // 1
  DELAYED: 'Delayed', // 8
  // UNITE: 9 not sure on exact mechanics here.
});

/** @param {Action} DefaultAction */
export const DEFAULT_ACTION = {
  type: ACTION_TYPES.DEFEND
};

/** @typedef {typeof ATTACK_RESULT[keyof typeof ATTACK_RESULT]} ATTACK_RESULT */
export const ATTACK_RESULT = {
  HIT: 'Hit',
  MISSED: 'Missed',
  CRIT: 'Crit',
  COUNTERED: 'Countered'
};
