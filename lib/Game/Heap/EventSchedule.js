import { applyEvents } from './HeapPrediction.js';

/**
 * Applies an enemy move's heap events in tick-group order (from ENEMY_MOVE_EVENT_TICKS): the events of each tick group are applied
 * together, and the groups are applied in ascending tick order. Between groups, the scheduler can yield to other agents (party Attacks)
 * that produce their own events at interleaving ticks.
 *
 * Stage 2: the scheduler applies all groups immediately (flushAll). The infrastructure is here for Stage 3, where party engine Attacks
 * interleave with the enemy move.
 */
export class EventSchedule {
  /**
   * @param {import('./HeapPrediction.js').HeapState} state
   * @param {number[]} events - the flat event array from ENEMY_MOVE_EVENTS
   * @param {[number, number][]} tickGroups - from ENEMY_MOVE_EVENT_TICKS: [relTick, count] pairs
   */
  constructor(state, events, tickGroups) {
    this.state = state;
    this.events = events;
    this.tickGroups = tickGroups;
    /** @type {(number | null)[]} */
    this.ptrs = [];
    this.nextGroup = 0;
    this.eventOffset = 0;
  }

  /**
   * Apply all events whose tick group's relative tick is <= relTick.
   * @param {number} relTick
   * @returns {(number | null)[]} the accumulated allocation pointers
   */
  applyTo(relTick) {
    while (this.nextGroup < this.tickGroups.length) {
      const [t, count] = this.tickGroups[this.nextGroup];
      if (t > relTick) break;
      const groupEvents = this.events.slice(this.eventOffset, this.eventOffset + count);
      applyEvents(this.state, groupEvents, {}, this.ptrs);
      this.eventOffset += count;
      this.nextGroup++;
    }
    return this.ptrs;
  }

  /** Apply all remaining tick groups. */
  applyAll() {
    return this.applyTo(Infinity);
  }

  /** Whether all tick groups have been applied. */
  get done() {
    return this.nextGroup >= this.tickGroups.length;
  }

  /** The relative tick of the next unapplied group, or Infinity when done. */
  get nextTick() {
    return this.nextGroup < this.tickGroups.length ? this.tickGroups[this.nextGroup][0] : Infinity;
  }
}
