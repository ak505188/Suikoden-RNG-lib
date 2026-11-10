import { spawnFireParticle } from './shared.js';

/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ active: boolean, lifetime: number, trailX: number, velX: number, words?: number[] }} Particle */

const CONSTANTS = {
  PARTICLE_COUNT: 20,
  TOTAL_TICKS: 96,
  RADIUS: 100,
};

const FINAL_FLAME_CONSTANTS = {
  POOL_B_SCALE_CALLS: 30,
  POOL_C_SCALE_CALLS: 30,
  POOL_D_COUNT: 30,
  POOL_D_START_BASE: 20,
  POOL_D_START_RANGE: 64,
  POOL_D_LIFE: 55, // non-looping sprite: 11 frames x 5 updates
  CASE2_LAST_TICK: 295,
  POOL_A_CALLS: 20 * 3, // case 1: 20 particles, rand % 40 + 2 position calls
  POOL_B_CALLS: 29 * 2 + 2, // case 2: 29 scheduled + the 30th activated by hand at tick 180
};

const FLAMING_ARROW_RESIDUAL_LOW_12 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 78, 2868, 99,
];

const EXPLOSION_CONSTANTS = {
  SETUP_CALLS: 70, // 20*2 (Pool B) + 30*0 (Pool C) + 15*2 (Pool A) = 70
  PHASE2_TICKS: 128,
  PHASE3_TICKS: 96,
  SETTLE_TICKS: 223, // calls 225-447: the update runs, nothing spawns
  POOL_A_COUNT: 15,
  POOL_B_COUNT: 20,
  POOL_C_COUNT: 30,
  POOL_C_RADIUS: 150,
  POOL_A_SCHEDULE_MOD: 0x60,
  POOL_B_SCHEDULE_MOD: 0x48,
  POOL_A_REFIRE_CYCLE: 55,
  POOL_B_REFIRE_CYCLE: 60,
};

const EXPLOSION_POOL_C_RESIDUAL_LOW_12 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3945, 3994, 527, 8, 128, 527, 8, 2, 527,
  10, 102,
];

/**
 * @param {RNG} rng
 * @param {number[]} [residuals] - the 20 particle structs' stale trail_x words (low 12 bits are used): what the heap held when
 *   they were allocated, which depends on the heap layout the cast runs in. Default: the baked table.
 * TODO: memoize the detailed mode like `memoizeBurn` does the plain one (`SPELL_BURNS.flamingArrows` in Behavior.js caches the start state
 * and jumps the RNG afterwards). `memoizeBurn` keys on the RNG state alone, but the detailed result also depends on the stale words, so
 * the cache key would have to include them (the heap calls it once per cast, and a search only reaches it when the heap is enabled).
 * @param {number[][]} [stale] - each struct's words 0-8 as the arena held them: also returns each struct's words as the cast leaves them
 *   (head, trail, velocity; the low 12 bits of words 0-5 stay) and the head and trail at every drawn tick
 * @returns {SpellRandResult & { trailX: number[], particles?: { words: number[], draws: Map<number, [number[], number[]]> }[] }} calls, and each
 *   particle struct's +0xc word as the cast leaves it (the next cast that allocates the same struct and does not overwrite it reads it as
 *   its stale word)
 */
export function flamingArrowParticles(rng, residuals = FLAMING_ARROW_RESIDUAL_LOW_12, stale) {
  const startCount = rng.count;

  /** @type {Particle[]} */
  const particles = [];
  /** The head and trail of each particle at each drawn tick, with the stale words @type {Map<number, Map<number, [number[], number[]]>>} */
  const draws = new Map();
  for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
    if (stale) draws.set(i, new Map());
    particles.push({
      active: false,
      lifetime: 0,
      // (with the stale words the trail word is theirs: the residual argument is then redundant)
      trailX: stale ? stale[i][3] | 0 : residuals[i],
      velX: 0,
      ...(stale ? { words: stale[i].map((w) => w >>> 0) } : {}),
    });
  }

  for (let tick = 0; tick < CONSTANTS.TOTAL_TICKS; tick++) {
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawnFireParticle(
          particle.trailX & 0xfff,
          CONSTANTS.RADIUS,
          rng,
          particle.words,
        );
      }
    }

    if (tick == CONSTANTS.TOTAL_TICKS - 1) {
      break; // phase ends here: all particles force-deactivated, no decay step runs
    }

    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (particle.active) {
        if (particle.lifetime < 1) {
          particle.active = false;
        } else {
          const trailXInt = Math.abs(Math.floor(particle.trailX / 4096));
          if (trailXInt < 5) {
            particle.active = false;
          } else {
            particle.lifetime = particle.lifetime - 1;
            particle.trailX = particle.trailX + particle.velX;
            const words = particle.words;
            if (words) {
              for (let k = 0; k < 3; k++) {
                words[k] = (words[k] + words[6 + k]) >>> 0;
                words[3 + k] = (words[3 + k] + words[6 + k]) >>> 0;
              }
              // the head and the trail as the draw projects them, by the tick (1-based) of the draw
              draws
                .get(i)
                ?.set(tick + 1, [
                  [0, 1, 2].map((k) => (words[k] | 0) / 4096),
                  [3, 4, 5].map((k) => (words[k] | 0) / 4096),
                ]);
            }
          }
        }
      }
    }
  }

  return {
    calls: rng.count - startCount,
    trailX: particles.map((particle) => particle.trailX),
    ...(stale
      ? {
          particles: particles.map((particle, i) => ({
            words: /** @type {number[]} */ (particle.words),
            draws: /** @type {Map<number, [number[], number[]]>} */ (draws.get(i)),
          })),
        }
      : {}),
  };
}

/**
 * @param {RNG} rng
 * @param {number[]} [residuals] - see flamingArrowParticles
 * @returns {SpellRandResult}
 */
export function flamingArrowRand(rng, residuals = FLAMING_ARROW_RESIDUAL_LOW_12) {
  return { calls: flamingArrowParticles(rng, residuals).calls };
}

/** @param {RNG} rng @returns {SpellRandResult} */
export function dancingFlamesRand(rng) {
  rng.jump(150);
  return { calls: 150 };
}

/** @typedef {Number[]} PoolSchedule */
/**
 * @param {RNG} rng
 * @param {number[]} [residuals] - pool C's 30 particle structs' stale trail_x words (low 12 bits used); default: the baked table
 * @param {boolean} [settle] - also run the particle updates of the cast's remaining ticks (calls 225-447: nothing spawns, no RNG) so that
 *   `trailX` is what the cast leaves; the call count does not need them (checked: 30 of 30 pool C words equal the arena at the cast's free)
 * @returns {SpellRandResult & { trailX: number[] }} calls, and pool C's +0xc words as the cast leaves them (as `flamingArrowParticles`)
 */
export function explosionRand(rng, residuals = EXPLOSION_POOL_C_RESIDUAL_LOW_12, settle = false) {
  const startCount = rng.count;
  const C = EXPLOSION_CONSTANTS;

  /** @type PoolSchedule */
  const poolBSchedule = [];
  for (let i = 0; i < C.POOL_B_COUNT; i++) {
    const scheduleRoll = rng.next().rand;
    rng.next(); // position roll, unused for counting
    poolBSchedule.push(scheduleRoll % C.POOL_B_SCHEDULE_MOD);
  }

  /** @type PoolSchedule */
  const poolASchedule = [];
  for (let i = 0; i < C.POOL_A_COUNT; i++) {
    const scheduleRoll = rng.next().rand;
    rng.next(); // position roll, unused for counting
    poolASchedule.push(scheduleRoll % C.POOL_A_SCHEDULE_MOD);
  }

  /** @type {Particle[]} */
  const poolC = [];
  for (let i = 0; i < C.POOL_C_COUNT; i++) {
    poolC.push({
      active: false,
      lifetime: 0,
      trailX: residuals[i],
      velX: 0,
    });
  }

  for (let tickIdx = 0; tickIdx < C.PHASE2_TICKS; tickIdx++) {
    if (tickIdx >= 1) {
      for (let i = 0; i < C.POOL_C_COUNT; i++) {
        const particle = poolC[i];
        if (!particle.active) {
          poolC[i] = spawnFireParticle(particle.trailX & 0xfff, C.POOL_C_RADIUS, rng);
        }
      }
    }

    for (let i = 0; i < C.POOL_C_COUNT; i++) {
      const particle = poolC[i];
      if (particle.active) {
        if (particle.lifetime < 1) {
          particle.active = false;
        } else {
          const trailXInt = Math.abs(Math.floor(particle.trailX / 4096));
          if (trailXInt < 5) {
            particle.active = false;
          } else {
            particle.lifetime = particle.lifetime - 1;
            particle.trailX = particle.trailX + particle.velX;
          }
        }
      }
    }
  }

  if (settle) {
    for (let tick = 0; tick < C.SETTLE_TICKS; tick++) {
      for (const particle of poolC) {
        if (!particle.active) continue;
        if (particle.lifetime < 1 || Math.abs(Math.floor(particle.trailX / 4096)) < 5) {
          particle.active = false;
        } else {
          particle.lifetime--;
          particle.trailX += particle.velX;
        }
      }
    }
  }

  const poolARefireTick = poolASchedule.map((sched) => {
    const refireTick = sched + C.POOL_A_REFIRE_CYCLE;
    return refireTick <= C.PHASE3_TICKS - 1 ? refireTick : null;
  });

  const poolBRefireTick = poolBSchedule.map((sched) => {
    const refireTick = sched + C.POOL_B_REFIRE_CYCLE;
    return refireTick <= C.PHASE3_TICKS - 1 ? refireTick : null;
  });

  for (let tick = 0; tick < C.PHASE3_TICKS; tick++) {
    for (let i = 0; i < C.POOL_A_COUNT; i++) {
      if (poolASchedule[i] === tick) {
        rng.next(); // vfx_activate_and_position_particle: X roll
        rng.next(); // vfx_activate_and_position_particle: second-axis roll
      }
      if (poolARefireTick[i] === tick) {
        rng.next(); // vfx_activate_and_position_particle: X roll
        rng.next(); // vfx_activate_and_position_particle: second-axis roll
        rng.next(); // extra fractional-write roll (loop2 body)
      }
    }
    for (let i = 0; i < C.POOL_B_COUNT; i++) {
      if (poolBSchedule[i] === tick) {
        rng.next(); // sound-variant roll
        rng.next(); // vfx_activate_and_position_particle: X roll
        rng.next(); // vfx_activate_and_position_particle: second-axis roll
      }
      if (poolBRefireTick[i] === tick) {
        rng.next(); // sound-variant roll
        rng.next(); // vfx_activate_and_position_particle: X roll
        rng.next(); // vfx_activate_and_position_particle: second-axis roll
      }
    }
    rng.next(); // camera shake, unconditional every tick
  }

  return { calls: rng.count - startCount, trailX: poolC.map((particle) => particle.trailX) };
}

/**
 * Setup rolls 120 calls (pool B and C scale, then per pool D particle a start tick and a scale). The tick
 * machine's fixed costs are pool A (60) and pool B (60). Pool D fires at its start tick and again every
 * 55 ticks until case 2 ends at tick 295, 2 calls each, which is the only seed-dependent part.
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function finalFlameRand(rng) {
  const C = FINAL_FLAME_CONSTANTS;
  const startCount = rng.count;

  rng.jump(C.POOL_B_SCALE_CALLS + C.POOL_C_SCALE_CALLS);
  let poolDFireCalls = 0;
  for (let i = 0; i < C.POOL_D_COUNT; i++) {
    const startTick = (rng.next().rand % C.POOL_D_START_RANGE) + C.POOL_D_START_BASE;
    rng.next(); // scale
    const fires = Math.floor((C.CASE2_LAST_TICK - startTick) / C.POOL_D_LIFE) + 1;
    poolDFireCalls += fires * 2;
  }

  rng.jump(C.POOL_A_CALLS + C.POOL_B_CALLS + poolDFireCalls);

  return { calls: rng.count - startCount };
}
