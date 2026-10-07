/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */


/** @param {RNG} rng @returns {SpellRandResult} */
export function angryBlowRand(rng) {
  rng.next(6);
  return { calls: 6 };
}
