/** @typedef {keyof typeof import('../Magic/Runes.js').RUNES} RuneKey */

/**
 * Command rune timing, in frames (= battle ticks) from the user's ActionTag flip (t0, the tick
 * its Rune turn resolves). The user's script starts at t0 + 1.
 * @typedef {Object} CommandRuneTiming
 * @property {number} damage - t0 -> the damage roll (calc_damage's rand())
 * @property {number} end - t0 -> the tick the turn ends (the handler sees the user's done bit);
 *   the roll gate is left unchanged
 * @property {number} free - t0 -> the frame the user's busy clears
 * @property {number} targetFree - t0 -> the frame the target's busy clears
 */

/** @satisfies {Partial<Record<RuneKey, CommandRuneTiming>>} */
export const COMMAND_RUNE_TIMINGS = {
  FALCON: { damage: 159, end: 199, free: 231, targetFree: 191 },
};
