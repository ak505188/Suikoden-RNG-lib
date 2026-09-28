/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Keys.js').UniteKey} UniteKey */

/**
 * @typedef {Object} Action
 * @property {ActionType} type
 * @property {number} [target]
 * @property {number} [slot]
 * @property {string} [itemId] - Item key, for type 'Item'.
 * @property {UniteKey} [uniteKey]
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

/** @type {readonly ActionType[]} */
export const UNBALANCED_ACTION_TYPES = [ACTION_TYPES.DEFEND, ACTION_TYPES.ITEM];

/**
 * What a monster AI decided this tick: UNDETERMINED (no target yet, run it again next tick),
 * NOTHING (turn skipped), ATTACK (the generic basic attack) or ABILITY (a monster-specific move,
 * resolved by Enemy.useAbility(name)).
 * @typedef {EnemyNoAction | EnemyAttackAction | EnemyAbilityAction} EnemyAction
 */
/** @typedef {{ action: typeof ACTION_TYPES.UNDETERMINED | typeof ACTION_TYPES.NOTHING }} EnemyNoAction */
/** @typedef {{ action: typeof ACTION_TYPES.ATTACK, target: Character }} EnemyAttackAction */
/**
 * frames: a cast's wind-up (Battle.castMagic). strike: instead, a move that runs like a basic
 * attack, starting the tick the AI picks it (Battle.resolveEnemyStrike).
 * @typedef {{ action: typeof ACTION_TYPES.ABILITY, name: string, target?: Character, frames?: number, strike?: StrikeTiming }} EnemyAbilityAction
 */

/**
 * A monster move timed like a basic attack, all from the tick it starts (t0).
 * @typedef {Object} StrikeTiming
 * @property {number} damage - t0 -> the damage roll (useAbility)
 * @property {number} recover - t0 -> its recover script starts: the other side's next actor is
 *   copied in the tick after
 * @property {number} free - t0 -> the frame its busy clears
 * @property {number} targetFree - t0 -> the frame the target's busy clears (busy from t0)
 */

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
