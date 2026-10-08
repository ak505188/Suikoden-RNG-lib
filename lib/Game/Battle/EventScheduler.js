import { shallowCloneInstance } from '../../util/clone.js';

/**
 * @typedef {Object} ScheduledEvent
 * @property {number} ownerIdx - whose +0x50 slot it runs in (combatant index)
 * @property {import('./Battle.js').EventFn} fn
 * @property {number} [actorIdx] - who the log credits its damage to (events only)
 */

/**
 * What's scheduled for later ticks: the events that run in step 2 of a tick (after the turn step,
 * before the damage commit) and the animation events that run in its animation pass. Plain data
 * (combatant indices and callbacks that take the battle they run in), so a Battle can be cloned,
 * or rebuilt in a worker, without sharing anything with the original.
 */
export default class EventScheduler {
  constructor() {
    /** @type {Map<number, ScheduledEvent[]>} tick -> callbacks */
    this.events = new Map();
    /** The earliest tick in `events` (Infinity if none), so takeDue skips the lookup on most ticks */
    this.nextEventAt = Infinity;
    /** @type {Map<number, ScheduledEvent[]>} tick -> animation-pass callbacks */
    this.animationEvents = new Map();
  }

  /** @returns {EventScheduler} an independent copy: the records are shared (they never change once queued), the lists aren't */
  clone() {
    const copy = shallowCloneInstance(this);
    copy.events = copyEvents(this.events);
    copy.nextEventAt = this.nextEventAt;
    copy.animationEvents = copyEvents(this.animationEvents);
    return copy;
  }

  /** @param {number} tick @param {ScheduledEvent} event */
  addEvent(tick, event) {
    const due = this.events.get(tick);
    if (due) due.push(event);
    else this.events.set(tick, [event]);
    if (tick < this.nextEventAt) this.nextEventAt = tick;
  }

  /** @param {number} tick @param {ScheduledEvent} event */
  addAnimationEvent(tick, event) {
    const due = this.animationEvents.get(tick);
    if (due) due.push(event);
    else this.animationEvents.set(tick, [event]);
  }

  /**
   * Removes and returns the events due at `tick`, in owner order (queue order within an owner).
   * @param {number} tick
   * @returns {ScheduledEvent[] | null} null when there are none
   */
  takeDue(tick) {
    if (tick < this.nextEventAt) return null;
    const due = this.events.get(tick);
    if (!due) return null;
    this.events.delete(tick);
    this.nextEventAt = Infinity;
    for (const t of this.events.keys()) if (t < this.nextEventAt) this.nextEventAt = t;
    due.sort((a, b) => a.ownerIdx - b.ownerIdx); // stable: queue order within an owner
    return due;
  }

  /**
   * Removes and returns the animation events due at `tick`.
   * @param {number} tick
   * @returns {ScheduledEvent[] | undefined}
   */
  takeAnimationEvents(tick) {
    const due = this.animationEvents.get(tick);
    if (due) this.animationEvents.delete(tick);
    return due;
  }

  /** The number of ticks with events scheduled (animation events don't count) */
  get size() {
    return this.events.size;
  }

  /** @returns {number} the earliest tick with an event or an animation event, Infinity if none */
  nextTick() {
    let next = this.nextEventAt;
    for (const tick of this.animationEvents.keys()) if (tick < next) next = tick;
    return next;
  }
}

/**
 * @param {Map<number, ScheduledEvent[]>} events
 * @returns {Map<number, ScheduledEvent[]>} the same records in new lists (empty between rounds)
 */
function copyEvents(events) {
  const copy = new Map();
  if (events.size) for (const [tick, due] of events) copy.set(tick, [...due]);
  return copy;
}
