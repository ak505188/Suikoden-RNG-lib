/**
 * A move's damage multiplier as an integer ratio, applied to a finished damage roll (after the
 * max(..., 1) floor): a float like 4/3 can truncate one short.
 * @typedef {{ readonly mul: number, readonly div: number }} DamageMultiplier
 */

/** @type {DamageMultiplier} */
export const NO_MULT = Object.freeze({ mul: 1, div: 1 });
/** @type {DamageMultiplier} */
export const CRIT_MULT = Object.freeze({ mul: 3, div: 1 });

/**
 * @param {number} damage - a finished roll, at least 1
 * @param {DamageMultiplier} mult
 * @returns {number}
 */
export const applyMultiplier = (damage, mult) =>
  mult === NO_MULT ? damage : Math.trunc((damage * mult.mul) / mult.div);
