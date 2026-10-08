/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ active: boolean, sched: number }} PoolAParticle */
/** @typedef {{ active: boolean, posZ: number, velZ: number, life: number }} PoolCDParticle */
const CONSTANTS = {
  SETUP_CALLS: 120,
  PHASE2_TICKS: 64,
  CASE3_TICKS: 160,
  POOL_A_COUNT: 20,
  POOL_B_COUNT: 20,
  POOL_C_COUNT: 30,
  POOL_D_COUNT: 20,
  POOL_A_RADIUS: 0x50,
  POOL_CD_RADIUS: 300,
};

const WIND_OF_SLEEP_CONSTANTS = {
  SETUP_PARTICLES: 50,
  SETUP_CALLS_PER_PARTICLE: 2,
  FIRST_SPAWN_TICK: 128,
  LAST_SPAWN_TICK: 350,
  SPHERE_CALLS: 3,
  LIFE_RANGE: 180,
};

/** @param {RNG} rng */
export function shiningWindRand(rng) {
  const startCount = rng.count;

  rng.jump(CONSTANTS.SETUP_CALLS);

  /** @type {PoolAParticle[]} */
  const poolA = [];
  for (let i = 0; i < CONSTANTS.POOL_A_COUNT; i++) {
    poolA.push({ active: false, sched: 2 * i });
  }
  const poolBFired = new Array(CONSTANTS.POOL_B_COUNT).fill(false);

  const poolC = makePool(CONSTANTS.POOL_C_COUNT);
  const poolD = makePool(CONSTANTS.POOL_D_COUNT);

  for (let tick = 0; tick < CONSTANTS.PHASE2_TICKS; tick++) {
    poolCDTick(poolC, CONSTANTS.POOL_C_COUNT, true, rng);
    poolCDTick(poolD, CONSTANTS.POOL_D_COUNT, true, rng);
  }

  for (let tick = 0; tick < CONSTANTS.CASE3_TICKS; tick++) {
    // On case3's OWN final tick, its exit code clears all 3 pool-enable flags before falling
    // through to the shared epilogue - so no pool gets a chance to activate anything new that
    // tick, even though the epilogue still runs.
    const isLastTick = tick === CONSTANTS.CASE3_TICKS - 1;

    for (let i = 0; i < CONSTANTS.POOL_B_COUNT; i++) {
      if (!poolBFired[i] && tick === 2 * i) {
        rng.next();
        activatePos(CONSTANTS.POOL_A_RADIUS, 0, 0, rng);
        poolBFired[i] = true;
      }
    }

    if (!isLastTick) {
      // Pool A schedule-match: checked EVERY tick using the CURRENT sched value, regardless
      // of active state - this is what allows the resonance re-trigger. Uses tick+1 since
      // this check lives in the shared epilogue, after case 3's own body has already
      // incremented the tick counter.
      for (let i = 0; i < CONSTANTS.POOL_A_COUNT; i++) {
        const particle = poolA[i];
        if (tick + 1 === particle.sched) {
          rng.next();
          activatePos(CONSTANTS.POOL_A_RADIUS, 0, 0, rng);
          particle.active = true;
          particle.sched = 0x30;
        }
      }
      // Pool A fallback: inactive AND unscheduled (covers object 0's first fire, since
      // tick+1==0 is never true, plus every subsequent natural reactivation).
      for (let i = 0; i < CONSTANTS.POOL_A_COUNT; i++) {
        const particle = poolA[i];
        if (!particle.active && particle.sched === 0) {
          rng.next();
          activatePos(CONSTANTS.POOL_A_RADIUS, 0, 0, rng);
          particle.active = true;
          particle.sched = 0x30;
        }
      }
    }
    // Pool A decay (no rand()): sched counts down from 48, deactivating at 0.
    for (let i = 0; i < CONSTANTS.POOL_A_COUNT; i++) {
      const particle = poolA[i];
      if (particle.active) {
        particle.sched = particle.sched - 1;
        if (particle.sched < 1) {
          particle.active = false;
          particle.sched = 0;
        }
      }
    }

    poolCDTick(poolC, CONSTANTS.POOL_C_COUNT, !isLastTick, rng);
    poolCDTick(poolD, CONSTANTS.POOL_D_COUNT, !isLastTick, rng);
  }

  return { calls: rng.count - startCount };
}

/**
 * @param {number} n
 * @returns {PoolCDParticle[]}
 */
function makePool(n) {
  const pool = [];
  for (let i = 0; i < n; i++) {
    pool.push({ active: false, posZ: 0, velZ: 0, life: 0 });
  }
  return pool;
}

/**
 * Shared position roll (vfx_activate_and_position_particle): 2 rand() calls. Only the Z
 * axis matters for Pool C/D's despawn check; Pool A/B never read position at all, so the
 * exact X/Y/Z values are otherwise unused here - only the call count matters.
 * @param {number} _radius
 * @param {number} height
 * @param {number} residualLow12
 * @param {RNG} rng
 */
function activatePos(_radius, height, residualLow12, rng) {
  // const xRoll = rng.next().rand;
  // const xRange = (radius - 1) * 2;
  // const xOffset = (xRoll % xRange + 1) - radius;
  // rng.next(); // second internal axis, unused
  // The above isn't relevant for rand simulation, so commented out.
  // Just does 2 rand calls.
  rng.jump(2);
  return (residualLow12 & 0xfff) | (-height * 4096);
}

/**
 * @param {PoolCDParticle[]} pool
 * @param {number} count
 * @param {boolean} allowActivate
 * @param {RNG} rng
 */
function poolCDTick(pool, count, allowActivate, rng) {
  if (allowActivate) {
    for (let i = 0; i < count; i++) {
      const particle = pool[i];
      if (!particle.active) {
        particle.active = true;
        const h = (rng.next().rand % 80) + 160;
        const residual = particle.posZ & 0xfff;
        particle.posZ = activatePos(CONSTANTS.POOL_CD_RADIUS, h, residual, rng);
        rng.next(); // X velocity roll, unused (doesn't affect the Z-only despawn check)
        particle.velZ = (rng.next().rand % 1024) + 0x1e00;
        particle.life = rng.next().rand % 0xb4;
      }
    }
  }
  for (let i = 0; i < count; i++) {
    const particle = pool[i];
    if (particle.active) {
      // check BEFORE updating, using the currently-stored position (matches the decompile's
      // order exactly - not "update then check")
      if (particle.life < 1 || Math.floor(particle.posZ / 4096) > 0) {
        particle.active = false;
      } else {
        particle.posZ = particle.posZ + particle.velZ;
      }
    }
  }
}

/**
 * The particle calls only: the per-enemy Sleep rolls come after them and decide a status, so they are
 * made by the spell's effect. Setup rolls 2 calls for each of 50 particles. The spawn loop then runs on
 * machine ticks 128-350, giving every inactive particle (index order) 3 sphere-position calls and a
 * life roll of rand % 180. A particle only becomes inactive again on a life roll of exactly 0, and
 * then respawns the next tick with 4 more calls.
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function windOfSleepRand(rng) {
  const C = WIND_OF_SLEEP_CONSTANTS;
  const startCount = rng.count;

  rng.jump(C.SETUP_PARTICLES * C.SETUP_CALLS_PER_PARTICLE);

  const active = new Array(C.SETUP_PARTICLES).fill(false);
  const life = new Array(C.SETUP_PARTICLES).fill(0);

  for (let tick = C.FIRST_SPAWN_TICK; tick <= C.LAST_SPAWN_TICK + 1; tick++) {
    if (tick <= C.LAST_SPAWN_TICK) {
      for (let i = 0; i < C.SETUP_PARTICLES; i++) {
        if (active[i]) continue;
        rng.jump(C.SPHERE_CALLS);
        life[i] = rng.next().rand % C.LIFE_RANGE;
        active[i] = true;
      }
    }
    for (let i = 0; i < C.SETUP_PARTICLES; i++) {
      if (life[i] < 1) active[i] = false;
    }
  }

  return { calls: rng.count - startCount };
}
