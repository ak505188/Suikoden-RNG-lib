/** @typedef {import('../../../rng.js').default} RNG */

/** @param {RNG} rng */
export function dropsOfKindnessRand(rng) {
  rng.next(18);
  return { calls: 18 };
}

// TODO: update to use party size, it's 12 x party size.
// Doesn't care if party members are alive / dead / out of battle.
/** @param {RNG} rng */
export function waterOfKindnessRand(rng) {
  rng.next(72);
  return { calls: 72 };
}
