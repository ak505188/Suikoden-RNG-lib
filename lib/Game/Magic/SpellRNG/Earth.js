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

const GUARDIAN_EARTH_CONSTANTS = {
  PARTICLE_COUNT: 40,
  START_RANGE: 0x30,
  PASSES: 160, // all 128 ticks of phase 3 and the first 32 of phase 4
  PHASE3_TICKS: 128,
  Z_VELOCITY: -0x9600,
  Z_CUTOFF: -300,
};

/**
 * Guardian Earth (spell 33, Earth Lv5 / Mother Earth Rune, whole party; spell_guardianofearth_*):
 * seed-dependent, 380-408. Phases 0-2 have no RNG, and neither does the buff or the end handler.
 *   setup: 40 sparkle particles, each rolls its start tick = rand() % 48.
 *   epilogue sparkle pass, on every tick of phase 3 (128) and the first 32 of phase 4. The counter is
 *   already incremented when the pass runs, so a start tick s >= 1 fires on phase-3 tick s-1, and s = 0
 *   fires on phase 3's last tick (the counter was just reset to 0). Each activation is
 *   vfx_activate_and_position_particle = 2 rand(). A particle that already fired re-activates once it's
 *   inactive again.
 *   The sparkle sprite loops, so only the z cutoff ends a life: z falls 0x9600 per tick and dies on the
 *   pass that finds z>>12 < -300, 33 moves after activation, so a particle re-activates every 34 passes.
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function guardianEarthRand(rng) {
  const C = GUARDIAN_EARTH_CONSTANTS;
  const startCount = rng.count;

  const sparkles = Array.from({ length: C.PARTICLE_COUNT }, () => (
    { start: rng.next().getRNG2() % C.START_RANGE, active: false, z: 0 }
  ));
  const activate = (/** @type {typeof sparkles[number]} */ sparkle) => {
    rng.next(2);
    sparkle.active = true;
    sparkle.z = sparkle.z & 0xfff;
  };

  for (let pass = 0; pass < C.PASSES; pass++) {
    const label = pass < C.PHASE3_TICKS - 1 ? pass + 1 : (pass === C.PHASE3_TICKS - 1 ? 0 : pass - C.PHASE3_TICKS + 1);
    for (const sparkle of sparkles) {
      if (sparkle.start === label) {
        sparkle.start = -1;
        activate(sparkle);
      }
    }
    for (const sparkle of sparkles) {
      if (sparkle.start === -1 && !sparkle.active) activate(sparkle);
    }
    for (const sparkle of sparkles) {
      if (!sparkle.active) continue;
      if (Math.floor(sparkle.z / 4096) < C.Z_CUTOFF) sparkle.active = false;
      sparkle.z += C.Z_VELOCITY;
    }
  }
  return { calls: rng.count - startCount };
}
