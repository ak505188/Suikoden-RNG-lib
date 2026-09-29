/**
 * @typedef {'roundStart' | 'turn' | 'attack' | 'retarget' | 'defend' | 'unite' | 'item' | 'cast' | 'skip' | 'damage' | 'death' | 'revive' | 'roundEnd' | 'battleEnd' | 'drop'} LogType
 */

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
 * @property {string} [detail] - attack result, the spell / ability / Unite / item name, why a
 *   Defend happened, the battle status, or the item dropped
 * @property {number} [amount] - damage dealt (negative = healed)
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
    case 'roundStart': return `${prefix}--- Round ${e.round} ---`;
    case 'turn': return `${prefix}${e.actor}'s turn`;
    case 'attack': return `${prefix}${e.actor} attacks ${e.target}: ${e.detail}`;
    case 'retarget': return `${prefix}${e.actor} retargets to ${e.target}`;
    case 'defend': return `${prefix}${e.actor} defends${e.detail ? ` (${e.detail})` : ''}`;
    case 'unite': return `${prefix}${e.actor} starts ${e.detail}`;
    case 'item': return `${prefix}${e.actor} uses ${e.detail}${e.target ? ` on ${e.target}` : ''}`;
    case 'cast': return `${prefix}${e.actor} casts ${e.detail}`;
    case 'skip': return `${prefix}${e.actor} does nothing`;
    case 'damage': return e.amount < 0
      ? `${prefix}${e.actor} heals ${e.target} for ${-e.amount} (HP ${e.hp})`
      : `${prefix}${e.actor} deals ${e.amount} to ${e.target} (HP ${e.hp})`;
    case 'revive': return `${prefix}${e.target} is revived by ${e.detail}`;
    case 'death': return `${prefix}${e.target} dies`;
    case 'roundEnd': return `${prefix}--- Round ${e.round} over ---`;
    case 'battleEnd': return `${prefix}=== Battle over: ${e.detail} ===`;
    case 'drop': return `${prefix}${e.detail ? `Dropped ${e.detail}` : 'No drop'}`;
  }
}
