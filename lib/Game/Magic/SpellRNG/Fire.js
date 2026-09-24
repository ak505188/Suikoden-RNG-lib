/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */
/** @typedef {{ active: boolean, lifetime: number, trailX: number, velX: number }} Particle */

import { cDiv } from '../../../lib.js';

const CONSTANTS = {
  PARTICLE_COUNT: 20,
  TOTAL_TICKS: 96,
  RADIUS: 100,
}

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
}

const EXPLOSION_POOL_C_RESIDUAL_LOW_12 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  3945, 3994, 527, 8, 128, 527, 8, 2, 527, 10, 102,
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
      velX: 0
    });
  }

  for (let tick = 0; tick < CONSTANTS.TOTAL_TICKS; tick++) {
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawnFireParticle(particle.trailX & 0xfff, CONSTANTS.RADIUS, rng)
      }
    }

    if (tick == CONSTANTS.TOTAL_TICKS - 1) {
      break // phase ends here: all particles force-deactivated, no decay step runs
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

/**
 * @param {number} residualLow12
 * @param {number} radius
 * @param {RNG} rng
 * @returns {Particle}
 */
function spawnFireParticle(residualLow12, radius, rng) {
  const xRoll = rng.next().getRNG2();
  const xRange = (radius - 1) * 2;
  const xOffset = (xRoll % xRange + 1) - radius;

  rng.next(); // Z coordinate, not modeled

  const velRoll = rng.next().getRNG2();
  const velScale = velRoll % 64 + 128;
  const velX = -xOffset * velScale;
  const q = cDiv(xOffset * 5, 6);
  const trailX = (residualLow12 & 0xfff) | (q * 4096);
  const lifetimeRoll = rng.next().getRNG2();
  const lifetime = lifetimeRoll % 100;
  return { active: true, lifetime, trailX, velX };
}

/** @param {RNG} _rng @returns {SpellRandResult} */
export function firestormRand(_rng) {
  return { calls: 0 };
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
    poolC.push({ active: false, lifetime: 0, trailX: EXPLOSION_POOL_C_RESIDUAL_LOW_12[i], velX: 0 });
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

  const poolARefireTick = poolASchedule.map(sched => {
    const refireTick = sched + C.POOL_A_REFIRE_CYCLE;
    return refireTick <= C.PHASE3_TICKS - 1 ? refireTick : null;
  });

  const poolBRefireTick = poolBSchedule.map(sched => {
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
