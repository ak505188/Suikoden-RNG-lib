/**
 * A committed choice for one fighter's turn. `targetId`/`spellId`/`itemId`
 * are fighter names / SPELLS keys / item keys respectively, and only apply
 * to the action types that need them (e.g. `defend` needs none of them).
 *
 * @typedef {Object} Action
 * @property {ActionType} type
 * @property {string} [targetId] - Name of the targeted fighter, for 'Attack'/'Rune'/'Item'/'Unite'.
 * @property {string} [spellId] - Key into SPELLS, for type 'Rune'.
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
 * @property {string} [target] - Name of the targeted fighter, when applicable.
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
