/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ active: boolean, z: number, speed: number }} RainLine */

const RAIN_CONSTANTS = {
  SETUP_CALLS_PER_PARTY_MEMBER: 12,
  LINE_COUNT: 32,
  RAIN_TICKS: 239,
  SPAWN_CALLS: 5,
  START_Z: -300,
  SPEED_BASE: 10,
  SPEED_RANGE: 5,
};

/** @param {RNG} rng @returns {SpellRandResult} */
export function dropsOfKindnessRand(rng) {
  rng.next(18);
  return { calls: 18 };
}

/** @param {RNG} rng @param {number} partySize @returns {SpellRandResult} */
export function waterOfKindnessRand(rng, partySize) {
  const calls = partySize * 12;
  rng.next(calls);
  return { calls };
}

/**
 * Setup rolls 12 calls per party member. The rain flag then holds for 239 ticks, during which each
 * inactive one of the 32 rain lines (in index order) spawns with 5 calls: x, second axis, depth, speed
 * (rand % 5 + 10 units/tick) and a life roll the game never reads. A line starts at z = -300, gains its
 * speed every tick (the spawn tick included), and the tick it is seen with z > 0 it deactivates, so it
 * respawns the tick after.
 * @param {RNG} rng
 * @param {number} partySize
 * @returns {SpellRandResult}
 */
export function rainOfKindnessRand(rng, partySize) {
  const C = RAIN_CONSTANTS;
  const startCount = rng.count;

  rng.next(C.SETUP_CALLS_PER_PARTY_MEMBER * partySize);

  /** @type {RainLine[]} */
  const lines = [];
  for (let i = 0; i < C.LINE_COUNT; i++) {
    lines.push({ active: false, z: 0, speed: 0 });
  }

  for (let tick = 0; tick <= C.RAIN_TICKS; tick++) {
    if (tick < C.RAIN_TICKS) {
      for (const line of lines) {
        if (line.active) continue;
        rng.next(2); // x, second axis
        rng.next(); // depth
        line.speed = rng.next().getRNG2() % C.SPEED_RANGE + C.SPEED_BASE;
        rng.next(); // life, never read
        line.z = C.START_Z;
        line.active = true;
      }
    }
    for (const line of lines) {
      if (line.z > 0) {
        line.active = false;
      } else if (line.active) {
        line.z += line.speed;
      }
    }
  }

  return { calls: rng.count - startCount };
}
