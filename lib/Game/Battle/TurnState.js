/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Battle.js').EventFn} EventFn */

/**
 * @typedef {Object} MagicCast
 * @property {Character | Enemy} caster
 * @property {EventFn} resolve
 * @property {number} frames - wind-up from ready to damage
 * @property {number} tail - extra ticks the turn is held after the usual end
 * @property {number | null} readyTick - when previous actions were fully resolved
 * @property {boolean} resolved
 */

/**
 * A physical Unite between its resolver succeeding and its handler ending.
 * @typedef {Object} UniteRun
 * @property {import('../Unites.js').Unite} def
 * @property {import('./UniteTimings.js').UniteTiming} timing
 * @property {number} start - S, the tick unite_gather_participants runs
 * @property {Character} initiator
 * @property {Character[]} participants - def order
 * @property {Enemy | null} target - null for an all-enemies Unite
 * @property {boolean} hit - the damage event has fired
 */

/**
 * A move that holds its user's turn until a fixed tick (a Command rune, the Dragon's moves).
 * @typedef {Object} TurnHold
 * @property {number} end - the tick the turn ends (DONE)
 * @property {number} [gate] - the roll gate it sets then; unset leaves it unchanged
 * @property {EventFn} [onEnd] - runs as the turn ends
 * @property {{ from: number, enemyIdx: number, move: import('./EnemyAI.js').EnemyMove, targetIdx: number }} [pending] -
 *   a held move still waiting for the party to idle (HeldTiming.startAfter); `from` is its earliest start
 */

/**
 * Where the current round's turn driver is: whose turn, the tick, and the move in progress. One
 * per round (Battle.resetTurn). Everything it holds is plain data, combatants by object only in
 * `magic` and `unite`, which clone() re-points at the copy's own combatants.
 */
export default class TurnState {
  constructor() {
    this.current = 0;
    this.pending = 0;
    this.rollGate = 0;
    this.tick = 0;
    /** @type {MagicCast | null} the spell or special the current actor is casting */
    this.magic = null;
    /** @type {UniteRun | null} the Unite the current actor started */
    this.unite = null;
    /** @type {TurnHold | null} a move holding the current actor's turn until a fixed tick */
    this.hold = null;
    // COPY_ACTOR's hold (see Battle.copyActor): holdFlag (+0x44) is set by a side switch at the roll
    // or a party crit; the held copy waits for the current actor's release (+0x30). Round start
    // sets release, so the round's first copy is never held.
    this.holdFlag = false;
    this.release = true;
    /** The tick the current actor's basic attack releases (its recover script starts), -1 = none */
    this.releaseAt = -1;
    /** @type {number | null} set by a turn step that's a pure wait: the first tick it could act (see skipIdleTicks) */
    this.wake = null;
    /** The last tick's steps 2-4 did nothing (no event, damage, animation or death) */
    this.quiet = false;
  }

  /**
   * @param {<T extends Combatant | null | undefined>(c: T) => T} remap - a combatant's counterpart
   *   in the copy's battle
   * @returns {TurnState} an independent copy
   */
  clone(remap) {
    // Field by field, not shallowCloneInstance (~4% slower here: a new TurnState every round) or
    // Object.assign (~1.8% slower over a long search): test/turnState.js fails if a field is missed
    const copy = new TurnState();
    copy.current = this.current;
    copy.pending = this.pending;
    copy.rollGate = this.rollGate;
    copy.tick = this.tick;
    copy.holdFlag = this.holdFlag;
    copy.release = this.release;
    copy.releaseAt = this.releaseAt;
    copy.wake = this.wake;
    copy.quiet = this.quiet;
    const { magic, unite, hold } = this;
    copy.magic = magic && { ...magic, caster: remap(magic.caster) };
    copy.unite = unite && {
      ...unite,
      initiator: remap(unite.initiator),
      participants: unite.participants.map(remap),
      target: remap(unite.target),
    };
    copy.hold = hold && { ...hold };
    return copy;
  }
}
