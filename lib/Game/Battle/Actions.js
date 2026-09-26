/** @typedef {import('./Character.js').default} Character */

/**
 * @typedef {Object} Action
 * @property {ActionType} type
 * @property {number} [target]
 * @property {number} [slot]
 * @property {string} [itemId] - Item key, for type 'Item'.
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
 * What a monster AI decided this tick: UNDETERMINED (no target yet, run it again next tick),
 * NOTHING (turn skipped), ATTACK (the generic basic attack) or ABILITY (a monster-specific move,
 * resolved by Enemy.useAbility(name)).
 * @typedef {EnemyNoAction | EnemyAttackAction | EnemyAbilityAction} EnemyAction
 */
/** @typedef {{ action: typeof ACTION_TYPES.UNDETERMINED | typeof ACTION_TYPES.NOTHING }} EnemyNoAction */
/** @typedef {{ action: typeof ACTION_TYPES.ATTACK, target: Character }} EnemyAttackAction */
/** @typedef {{ action: typeof ACTION_TYPES.ABILITY, name: string, target?: Character, frames?: number }} EnemyAbilityAction */

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
