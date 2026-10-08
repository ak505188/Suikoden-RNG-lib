/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */

/** @param {RNG} rng @returns {SpellRandResult} */
export function angryBlowRand(rng) {
  rng.jump(6);
  return { calls: 6 };
}

/** @param {RNG} rng @param {number} numLivingEnemies @returns {SpellRandResult} */
export function rainstormRand(rng, numLivingEnemies) {
  const calls = 26 + 2 * numLivingEnemies;
  rng.jump(calls);
  return { calls };
}

/** @param {RNG} rng @returns {SpellRandResult} */
export function thunderGodRand(rng) {
  rng.jump(472);
  return { calls: 472 };
}
