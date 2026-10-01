/** @typedef {typeof LOG_TYPES[keyof typeof LOG_TYPES]} LogType */
export const LOG_TYPES = /** @type {const} */ ({
  ROUND_COMMAND: 'roundCommand',
  ROUND_START: 'roundStart',
  TURN: 'turn',
  ATTACK: 'attack',
  RETARGET: 'retarget',
  COVER: 'cover',
  FORMATION: 'formation',
  DEFEND: 'defend',
  UNITE: 'unite',
  ITEM: 'item',
  CAST: 'cast',
  SKIP: 'skip',
  DAMAGE: 'damage',
  DEATH: 'death',
  REVIVE: 'revive',
  ROUND_END: 'roundEnd',
  BATTLE_END: 'battleEnd',
  DROP: 'drop',
  EXP: 'exp',
  LEVEL_UP: 'levelUp',
});

/**
 * One thing that happened in a battle. `rng` is the RNG call count once it happened, so entries
 * line up with a live capture.
 * @typedef {Object} LogEntry
 * @property {LogType} type
 * @property {number} round
 * @property {number} tick
 * @property {number} rng
 * @property {string} [actor]
 * @property {string} [target]
 * @property {string} [detail] - the round command, attack result, the spell / ability / Unite /
 *   item name, why a Defend happened, the battle status, the item dropped, or a level-up's levels
 * @property {number} [amount] - damage dealt (negative = healed), or EXP gained
 * @property {number} [hp] - the target's HP once this damage is committed
 */

/** A battle's record of events: for reading what the sim did, and later for scoring. */
export default class ActionLog {
  constructor() {
    /** @type {LogEntry[]} */
    this.entries = [];
  }

  /** @param {LogEntry} entry */
  record(entry) {
    this.entries.push(entry);
  }

  clone() {
    const copy = new ActionLog();
    copy.entries = this.entries.map(entry => ({ ...entry }));
    return copy;
  }

  /** @param {LogType} type */
  ofType(type) {
    return this.entries.filter(entry => entry.type === type);
  }

  /** @returns {string} one line per entry */
  format() {
    return this.entries.map(formatEntry).join('\n');
  }
}

/** @param {LogEntry} e */
function formatEntry(e) {
  const prefix = `R${e.round} t${String(e.tick).padStart(4)} rng ${e.rng}  `;
  switch (e.type) {
    case LOG_TYPES.ROUND_COMMAND: return `${prefix}${e.detail}`;
    case LOG_TYPES.ROUND_START: return `${prefix}--- Round ${e.round} ---`;
    case LOG_TYPES.TURN: return `${prefix}${e.actor}'s turn`;
    case LOG_TYPES.ATTACK: return `${prefix}${e.actor} attacks ${e.target}: ${e.detail}`;
    case LOG_TYPES.RETARGET: return `${prefix}${e.actor} retargets to ${e.target}`;
    case LOG_TYPES.COVER: return `${prefix}${e.actor} covers ${e.target}`;
    case LOG_TYPES.FORMATION: return `${prefix}${e.actor} moves up: ${e.detail}`;
    case LOG_TYPES.DEFEND: return `${prefix}${e.actor} defends${e.detail ? ` (${e.detail})` : ''}`;
    case LOG_TYPES.UNITE: return `${prefix}${e.actor} starts ${e.detail}`;
    case LOG_TYPES.ITEM: return `${prefix}${e.actor} uses ${e.detail}${e.target ? ` on ${e.target}` : ''}`;
    case LOG_TYPES.CAST: return `${prefix}${e.actor} casts ${e.detail}`;
    case LOG_TYPES.SKIP: return `${prefix}${e.actor} does nothing`;
    case LOG_TYPES.DAMAGE: return e.amount < 0
      ? `${prefix}${e.actor} heals ${e.target} for ${-e.amount} (HP ${e.hp})`
      : `${prefix}${e.actor} deals ${e.amount} to ${e.target} (HP ${e.hp})`;
    case LOG_TYPES.REVIVE: return `${prefix}${e.target} is revived by ${e.detail}`;
    case LOG_TYPES.DEATH: return `${prefix}${e.target} dies`;
    case LOG_TYPES.ROUND_END: return `${prefix}--- Round ${e.round} over ---`;
    case LOG_TYPES.BATTLE_END: return `${prefix}=== Battle over: ${e.detail} ===`;
    case LOG_TYPES.DROP: return `${prefix}${e.detail ? `Dropped ${e.detail}` : 'No drop'}`;
    case LOG_TYPES.EXP: return `${prefix}${e.actor} gains ${e.amount} EXP`;
    case LOG_TYPES.LEVEL_UP: return `${prefix}${e.actor} levels up: ${e.detail}`;
  }
}
