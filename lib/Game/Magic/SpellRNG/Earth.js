/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ stagger: number, active: boolean, x: number }} EarthquakeParticle */
const CONSTANTS = {
  SETUP_CALLS: 100,
  PARTICLE_COUNT: 20,
  PHASE2_TICKS: 128,
  PHASE3_TICKS: 64,
  RADIUS: 100,
  DECAY: -27306,   // 0xffff9556 as signed 32-bit, in 1/4096ths per tick
  THRESHOLD: -500, // real units; deactivates once position/4096 drops below this
}

const CLAY_GUARDIAN_CONSTANTS = {
  PARTICLE_COUNT: 10,
  TICKS: 96, // phase 3's sparkle loop; it also runs on that phase's last tick
  LIFE_RANGE: 60,
}

/** @returns {SpellRandResult} */
export function voiceOfEarthRand() {
  return { calls: 0 };
}

/**
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function earthquakeRand(rng) {
  const startCount = rng.count;

  rng.next(CONSTANTS.SETUP_CALLS);

  /** @type {EarthquakeParticle[]} */
  const particles = [];
  for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
    particles.push({ stagger: i * 2, active: false, x: 0 });
  }

  for (let tick = 0; tick < CONSTANTS.PHASE2_TICKS; tick++) {
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active && particle.stagger === tick) {
        const xRoll = rng.next().getRNG2();
        const xRange = (CONSTANTS.RADIUS - 1) * 2;
        const xInt = (xRoll % xRange + 1) - CONSTANTS.RADIUS;
        particle.x = xInt * 4096;
        rng.next(); // second axis, doesn't affect X
        particle.active = true;
      }
    }
    runEarthquakeEpilogue(particles, rng);
  }

  for (let tick = 0; tick < CONSTANTS.PHASE3_TICKS; tick++) {
    if (!runEarthquakeEpilogue(particles, rng)) {
      break;
    }
  }

  return { calls: rng.count - startCount };
}

/**
 * @param {EarthquakeParticle[]} particles
 * @param {RNG} rng
 * @returns {boolean}
 */
function runEarthquakeEpilogue(particles, rng) {
  let anyActive = false;
  for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
    const particle = particles[i];
    if (particle.active) {
      anyActive = true;
      rng.next(); // jitter, doesn't affect trajectory
      particle.x = particle.x + CONSTANTS.DECAY;
      if (Math.floor(particle.x / 4096) < CONSTANTS.THRESHOLD) {
        particle.active = false;
      }
    }
  }
  return anyActive;
}

/**
 * Setup, the other phases and the buff itself roll nothing. Only phase 3's sparkle loop does: each tick an
 * inactive sparkle (index order) respawns for 3 calls (2 for vfx_activate_and_position_particle, then
 * its life = rand % 60), then every sparkle with life < 1 goes inactive and the rest lose 1 life. So a
 * sparkle with life L is active L ticks and respawns the tick after, and the total follows the seed.
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function clayGuardianRand(rng) {
  const C = CLAY_GUARDIAN_CONSTANTS;
  const startCount = rng.count;

  const active = new Array(C.PARTICLE_COUNT).fill(false);
  const life = new Array(C.PARTICLE_COUNT).fill(0);

  for (let tick = 0; tick < C.TICKS; tick++) {
    for (let i = 0; i < C.PARTICLE_COUNT; i++) {
      if (active[i]) continue;
      rng.next(2); // vfx_activate_and_position_particle
      life[i] = rng.next().getRNG2() % C.LIFE_RANGE;
      active[i] = true;
    }
    for (let i = 0; i < C.PARTICLE_COUNT; i++) {
      if (life[i] < 1) active[i] = false;
      else life[i]--;
    }
  }

  return { calls: rng.count - startCount };
}
