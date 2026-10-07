/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */

/** @param {RNG} rng @returns {SpellRandResult}*/
export function stormFangRand(rng) {
  rng.next(38);
  return { calls: 38 };
}

/** @param {RNG} rng @returns {SpellRandResult}*/
export function blazingCampRand(rng) {
  rng.next(54);
  return { calls: 54 };
}
