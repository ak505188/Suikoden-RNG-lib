import { div32ulo } from '../util/math.js';

/** @typedef {import('../rng.js').default} RNG */

/**
 * Whether a Run's escape roll succeeds. One RNG call decides it.
 * @param {number} rand
 */
export function isRun(rand) {
  return rand % 100 > 50;
}

/** @param {number} rand */
export function isCliveAppearance(rand) {
  return div32ulo(rand, div32ulo(0x7fff, 3)) === 0;
}

/** @param {number} rand */
export function isMarieDialogue(rand) {
  return div32ulo(rand, div32ulo(0x7fff, 9)) === 0;
}

/**
 * How many RNG calls the wheel takes to stop in its window (positions 0x7f to 0xa0). It advances
 * `rng` to the call that stops it, so pass a clone to keep the original.
 * @param {RNG} rng
 */
export function countWheelAttempts(rng) {
  let counter = 0;
  do {
    counter++;
    rng.next();
  } while (!isWheelStopped(div32ulo(rng.rand, 0x5a)));
  return counter - 1;
}

/** @param {number} pos */
const isWheelStopped = (pos) => pos >= 0x7f && pos <= 0xa0;

/**
 * The variance roll of a damage formula: (diff / 2 - rand % diff) / 5, truncated towards zero.
 * @param {number} atk
 * @param {number} def
 * @param {number} rand
 */
export function calculateDamageRoll(atk, def, rand) {
  const diff = atk - def;
  const r3 = rand % diff;
  let r2 = diff < 0 ? -1 : 0;
  r2 += diff;
  r2 = r2 >> 1;
  r2 = r2 - r3;
  const res = r2 / 5;
  return res < 0 ? Math.ceil(res) : Math.floor(res);
}
