/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Keys.js').UniteKey} UniteKey */
/** @typedef {import('../Keys.js').ItemKey} ItemKey */

/**
 * @typedef {Object} Action
 * @property {ActionType} type
 * @property {number} [target]
 * @property {number} [slot]
 * @property {ItemKey} [itemKey] - for type 'Item'.
 * @property {boolean} [unused] - in a search result: this member never got a turn that round, so
 *   any of their other actions plays out the same (this is just the first of them)
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
  /**
   * A party member's placeholder: the action is chosen when their turn is dispatched (see
   * Battle.chooseAction), not at round start. Only for choices nothing reads before then: never
   * Defend (it sets `defending` at round start) or a Unite (partners are locked in together).
   */
  DEFERRED: 'Deferred',
});

/**
 * The round-start Fight / Run / Bribe / Free Will menu.
 * @typedef {typeof ROUND_COMMANDS[keyof typeof ROUND_COMMANDS]} RoundCommandType
 */
export const ROUND_COMMANDS = /** @type {const} */ ({
  FIGHT: 'Fight',
  RUN: 'Run',
  BRIBE: 'Bribe',
  FREE_WILL: 'Free Will',
});

/**
 * @typedef {Object} RoundCommand
 * @property {RoundCommandType} command
 * @property {Action[]} [actions] - Fight only: one per party-member slot
 */

/**
 * One round's plan: a RoundCommand, or a bare Action[] as shorthand for Fight.
 * @typedef {Action[] | RoundCommand} Round
 */

/** @type {readonly ActionType[]} */
export const UNBALANCED_ACTION_TYPES = [ACTION_TYPES.DEFEND, ACTION_TYPES.ITEM];

/**
 * What a monster AI decided this tick: UNDETERMINED (no target yet, run it again next tick),
 * NOTHING (turn skipped), ATTACK (the generic basic attack) or ABILITY (a monster-specific move
 * from ENEMY_MOVES).
 * @typedef {EnemyNoAction | EnemyAttackAction | EnemyAbilityAction} EnemyAction
 */
/** @typedef {{ action: typeof ACTION_TYPES.UNDETERMINED | typeof ACTION_TYPES.NOTHING }} EnemyNoAction */
/** @typedef {{ action: typeof ACTION_TYPES.ATTACK, target: Character }} EnemyAttackAction */
/** @typedef {{ action: typeof ACTION_TYPES.ABILITY, move: import('./EnemyAI.js').EnemyMove, target?: Character }} EnemyAbilityAction */

/** @param {Action} DefaultAction */
export const DEFAULT_ACTION = {
  type: ACTION_TYPES.DEFEND,
};

/** @typedef {typeof ATTACK_RESULT[keyof typeof ATTACK_RESULT]} ATTACK_RESULT */
export const ATTACK_RESULT = {
  HIT: 'Hit',
  MISSED: 'Missed',
  CRIT: 'Crit',
  COUNTERED: 'Countered',
};

/** @typedef {typeof ROLL_KINDS[keyof typeof ROLL_KINDS]} RollKind */
export const ROLL_KINDS = /** @type {const} */ ({
  HIT: 'hit',
  CRIT: 'crit',
  COUNTER: 'counter', // an enemy's 50/50 after a miss (no stat in it)
});

/**
 * One RNG roll a basic attack makes at t0, for the log: it passes when roll < chance (a counter
 * roll, chance null, passes on 1). `min` / `max` are the chances stats can reach (the clamp, after
 * Bucket / Hazy halving or Killer doubling): a roll outside them can't flip whatever the stats.
 * @typedef {Object} AttackRoll
 * @property {RollKind} kind
 * @property {number} roll - 0-99 (counter: 0 or 1)
 * @property {number | null} chance
 * @property {number | null} min
 * @property {number | null} max
 * @property {boolean} pass
 */
