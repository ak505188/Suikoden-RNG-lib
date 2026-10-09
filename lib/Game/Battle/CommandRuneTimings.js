import { RUNES } from '../Magic/Runes.js';

/**
 * Command rune timing, in frames (= battle ticks) from S = t0 + start, where t0 is the user's
 * ActionTag flip (the tick its Rune turn resolves). The user's script starts at t0 + 1.
 * Every Command rune first waits (no RNG) until no combatant is busy.
 * @typedef {Object} CommandRuneTiming
 * @property {number} [start] - t0 -> S, the tick the user and target go busy (default 0)
 * @property {number} damage - S -> the damage roll (calc_damage's rand())
 * @property {number} end - S -> the tick the turn ends (the handler sees the user's done bit);
 *   the roll gate is left unchanged
 * @property {number} free - S -> the frame the user's busy clears
 * @property {number} targetFree - S -> the frame the target's busy clears (a kill adds its death)
 * @property {number} [unbalanceRoll] - S -> the user's Unbalanced roll (animation opcode 40, one
 *   rand(), always lands), in the animation pass after that tick's damage commit
 */

/**
 * Keyed by Rune.id, since combatants hold the rune itself.
 * @type {Partial<Record<number, CommandRuneTiming>>}
 */
export const COMMAND_RUNE_TIMINGS = {
  [RUNES.FALCON.id]: { damage: 159, end: 199, free: 231, targetFree: 191 },
  // Live-confirmed on Pahn (12 casts). The unbalance roll lands after the turn has ended, and
  // after the next turn roll (S + 293) if anyone is left to act.
  [RUNES.BOAR.id]: {
    start: 1,
    damage: 322,
    end: 292,
    free: 344,
    targetFree: 322,
    unbalanceRoll: 344,
  },
};
