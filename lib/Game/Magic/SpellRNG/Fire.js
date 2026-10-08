import { spawnFireParticle } from './shared.js';

/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ active: boolean, lifetime: number, trailX: number, velX: number }} Particle */

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
 * @returns {SpellRandResult}
 */
export function flamingArrowRand(rng) {
  const startCount = rng.count;

  /** @type {Particle[]} */
  const particles = [];
  for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
    particles.push({
      active: false,
      lifetime: 0,
      trailX: FLAMING_ARROW_RESIDUAL_LOW_12[i],
      velX: 0,
    });
  }

  for (let tick = 0; tick < CONSTANTS.TOTAL_TICKS; tick++) {
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawnFireParticle(particle.trailX & 0xfff, CONSTANTS.RADIUS, rng);
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
          }
        }
      }
    }
  }

  return { calls: rng.count - startCount };
}

/** @param {RNG} rng @returns {SpellRandResult} */
export function dancingFlamesRand(rng) {
  rng.next(150);
  return { calls: 150 };
}

/** @typedef {Number[]} PoolSchedule */
/** @param {RNG} rng @returns {SpellRandResult} */
export function explosionRand(rng) {
  const startCount = rng.count;
  const C = EXPLOSION_CONSTANTS;

  /** @type PoolSchedule */
  const poolBSchedule = [];
  for (let i = 0; i < C.POOL_B_COUNT; i++) {
    const scheduleRoll = rng.next().getRNG2();
    rng.next(); // position roll, unused for counting
    poolBSchedule.push(scheduleRoll % C.POOL_B_SCHEDULE_MOD);
  }

  /** @type PoolSchedule */
  const poolASchedule = [];
  for (let i = 0; i < C.POOL_A_COUNT; i++) {
    const scheduleRoll = rng.next().getRNG2();
    rng.next(); // position roll, unused for counting
    poolASchedule.push(scheduleRoll % C.POOL_A_SCHEDULE_MOD);
  }

  /** @type {Particle[]} */
  const poolC = [];
  for (let i = 0; i < C.POOL_C_COUNT; i++) {
    poolC.push({
      active: false,
      lifetime: 0,
      trailX: EXPLOSION_POOL_C_RESIDUAL_LOW_12[i],
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

  return { calls: rng.count - startCount };
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

  rng.next(C.POOL_B_SCALE_CALLS + C.POOL_C_SCALE_CALLS);
  let poolDFireCalls = 0;
  for (let i = 0; i < C.POOL_D_COUNT; i++) {
    const startTick = (rng.next().getRNG2() % C.POOL_D_START_RANGE) + C.POOL_D_START_BASE;
    rng.next(); // scale
    const fires = Math.floor((C.CASE2_LAST_TICK - startTick) / C.POOL_D_LIFE) + 1;
    poolDFireCalls += fires * 2;
  }

  rng.next(C.POOL_A_CALLS + C.POOL_B_CALLS + poolDFireCalls);

  return { calls: rng.count - startCount };
}
