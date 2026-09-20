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

/** @typedef {typeof ACTION_TYPES[keyof typeof ACTION_TYPES]} ActionType */
export const ACTION_TYPES = /** @type {const} */ ({
  ATTACK: 'Attack',
  DEFEND: 'Defend',
  RUNE: 'Rune',
  ITEM: 'Item',
  UNITE: 'Unite'
});

/** @param {Action} DefaultAction */
export const DEFAULT_ACTION = {
  type: ACTION_TYPES.DEFEND
};

/** @typedef {typeof ATTACK_RESULTS[keyof typeof ATTACK_RESULTS]} ATTACK_RESULTS */
export const ATTACK_RESULTS = {
  HIT: 'Hit',
  MISSED: 'Missed',
  CRIT: 'Crit',
  COUNTERED: 'Countered'
};
