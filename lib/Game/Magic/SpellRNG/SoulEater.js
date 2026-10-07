/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {{ active: boolean, posX: number, velX: number, life: number, scale: number }} SoulEaterParticle */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */

import { signed32 } from './shared.js';
import { cDiv } from '../../../lib.js';
import { HELL_SLOT_SCALE, HELL_INITIAL_RESIDUAL_LOW_12 } from './Consts/HellTables.js';
import {
  BLACK_SHADOW_WIND_SLOT_SCALE,
  BLACK_SHADOW_WIND_SLOT_RESIDUAL,
  BLACK_SHADOW_WIND_SCALE_INIT,
} from './Consts/BlackShadowWindTable.js';
import {
  BLACK_SHADOW_BATS_SLOT_SCALE,
  BLACK_SHADOW_BATS_SLOT_RESIDUAL,
  BLACK_SHADOW_BATS_SCALE_INIT,
} from './Consts/BlackShadowBatsTable.js';

const HELL_CONSTANTS = {
  TICKS: 128,
  SLOT_COUNT: 40,
  RADIUS: 180,
  REF_X: -178,     // also reused as the spawn offset (both spawn AND despawn reference the
                    // same fixed point)
  SCALE_INIT: 4096,
  SCALE_INCREMENT: 131072,
}

const JUDGEMENT_CONSTANTS = {
  SETUP_BOLTS: 15,
  FIRST_ACTIVE_BOLT: 4, // the tick machine only ever spawns bolts 4..14
  SCHEDULE_RANGE: 48,
  CASE5_TICKS: 96,
  HEAD_FIRST_TICKS: [0, 6, 12, 18],
  HEAD_PERIOD: 15, // z starts at -300 and gains 20 a tick: alive 15 ticks, respawned the tick after it dies
  BOLT_PERIOD: 34, // 33 active frames of a non-looping sprite, respawned the tick after
  HEAD_CALLS: 2,
  BOLT_CALLS: 3,
}

const BLACK_SHADOW_CONSTANTS = {
  TICKS: 80,
  SLOT_COUNT: 40,
  RADIUS: 200,
  REF_X: -128,
  SCALE_INCREMENT: 0x19999,
}

/**
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function hellRand(rng) {
  const startCount = rng.count;

  /** @type {SoulEaterParticle[]} */
  const particles = [];
  for (let i = 0; i < HELL_CONSTANTS.SLOT_COUNT; i++) {
    particles.push({
      active: false,
      posX: HELL_INITIAL_RESIDUAL_LOW_12[i],
      velX: 0,
      life: 0,
      scale: HELL_SLOT_SCALE[i],
    });
  }

  let scaleAccum = HELL_CONSTANTS.SCALE_INIT;
  for (let tick = 0; tick < HELL_CONSTANTS.TICKS; tick++) {
    // scaleAccum advances by a fixed amount each tick (wrapping once its top bits exceed
    // 0x1000) - a deterministic animation-phase value, not RNG-derived.
    scaleAccum = (scaleAccum + HELL_CONSTANTS.SCALE_INCREMENT) >>> 0;
    if ((scaleAccum >>> 12) > 0x1000) {
      scaleAccum = (scaleAccum & 0xfff) | 0x1000000;
    }

    for (let i = 0; i < HELL_CONSTANTS.SLOT_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawnSoulEaterParticle(
          particle.scale, particle.posX & 0xfff, HELL_CONSTANTS.RADIUS, HELL_CONSTANTS.REF_X, rng);
      }
    }

    // EVERY slot (not gated on active) then either deactivates or survives: posX advances by
    // velocity, life decrements, and the slot's "scale" field gets OVERWRITTEN with the
    // CURRENT scaleAccum - a particle's scale field only holds its original per-slot constant
    // up until it first survives one tick; every later respawn spawns using whatever
    // scaleAccum was frozen into it on its last surviving tick, not the original constant.
    for (let i = 0; i < HELL_CONSTANTS.SLOT_COUNT; i++) {
      const particle = particles[i];
      if (particle.life < 1 || Math.abs(HELL_CONSTANTS.REF_X - Math.floor(particle.posX / 4096)) < 5) {
        particle.active = false;
      } else {
        particle.posX = signed32(particle.posX + particle.velX);
        particle.scale = scaleAccum;
        particle.life = particle.life - 1;
      }
    }
  }

  return { calls: rng.count - startCount };
}

/**
 * Black Shadow reuses Hell's exact particle-spawn formula with different constants (80
 * ticks, radius 200, reference point -128) and no scaleAccum wraparound (80 ticks never
 * reaches the threshold Hell's version wraps at). Unlike Hell, the 40-slot scale/residual
 * tables here are genuine per-savestate stale VFX-pool memory, not a fixed spell-wide
 * constant - see blackShadowWindRand/blackShadowBatsRand for the two currently-known
 * captures.
 * @param {RNG} rng
 * @param {number[]} slotScale
 * @param {number[]} slotResidual
 * @param {number} scaleInit
 * @returns {SpellRandResult}
 */
export function blackShadowRand(rng, slotScale, slotResidual, scaleInit) {
  const startCount = rng.count;

  /** @type {SoulEaterParticle[]} */
  const particles = [];
  for (let i = 0; i < BLACK_SHADOW_CONSTANTS.SLOT_COUNT; i++) {
    particles.push({
      active: false,
      posX: slotResidual[i],
      velX: 0,
      life: 0,
      scale: slotScale[i],
    });
  }

  let scaleAccum = scaleInit;
  for (let tick = 0; tick < BLACK_SHADOW_CONSTANTS.TICKS; tick++) {
    scaleAccum = (scaleAccum + BLACK_SHADOW_CONSTANTS.SCALE_INCREMENT) >>> 0;

    for (let i = 0; i < BLACK_SHADOW_CONSTANTS.SLOT_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawnSoulEaterParticle(
          particle.scale, particle.posX & 0xfff, BLACK_SHADOW_CONSTANTS.RADIUS, BLACK_SHADOW_CONSTANTS.REF_X, rng);
      }
    }

    for (let i = 0; i < BLACK_SHADOW_CONSTANTS.SLOT_COUNT; i++) {
      const particle = particles[i];
      if (particle.life < 1 || Math.abs(BLACK_SHADOW_CONSTANTS.REF_X - Math.floor(particle.posX / 4096)) < 5) {
        particle.active = false;
      } else {
        particle.posX = signed32(particle.posX + particle.velX);
        particle.scale = scaleAccum;
        particle.life = particle.life - 1;
      }
    }
  }

  return { calls: rng.count - startCount };
}

/** @param {RNG} rng */
export function blackShadowWindRand(rng) {
  return blackShadowRand(
    rng, BLACK_SHADOW_WIND_SLOT_SCALE, BLACK_SHADOW_WIND_SLOT_RESIDUAL, BLACK_SHADOW_WIND_SCALE_INIT);
}

/** @param {RNG} rng */
export function blackShadowBatsRand(rng) {
  return blackShadowRand(
    rng, BLACK_SHADOW_BATS_SLOT_SCALE, BLACK_SHADOW_BATS_SLOT_RESIDUAL, BLACK_SHADOW_BATS_SCALE_INIT);
}

/**
 * Exact port of spell_hell_spawn_particle, also reused directly by Black Shadow. The Z-axis
 * roll is consumed but never read by anything the despawn check needs, same as Flaming
 * Arrow/Shining Wind's unused axis rolls.
 * @param {number} scale
 * @param {number} residualLow12
 * @param {number} radius
 * @param {number} refX
 * @param {RNG} rng
 * @returns {SoulEaterParticle}
 */
function spawnSoulEaterParticle(scale, residualLow12, radius, refX, rng) {
  const xRoll = rng.next().getRNG2();
  const rangeN = (radius - 1) * 2;
  const xInt = (xRoll % rangeN + 1) - radius;
  rng.next(); // Z-axis roll, unused
  const velRoll = rng.next().getRNG2();
  const velScale = velRoll % 64 + 128;
  const velX = -xInt * velScale;
  // arithmetic (floor) shift, not a logical shift - scale is frequently negative once
  // reinterpreted as signed32 (see HELL_SLOT_SCALE's large entries)
  const scaleShifted = Math.floor(signed32(scale) / 4096);
  const finalOff = cDiv(xInt * scaleShifted, 4096);
  const posX = (residualLow12 & 0xfff) | signed32((finalOff + refX) * 4096);
  const lifeRoll = rng.next().getRNG2();
  const life = lifeRoll % 120;
  return { active: true, posX: signed32(posX), velX, life, scale };
}

/**
 * Setup rolls each of 15 bolts' first-spawn tick (rand % 48) and a scale, 30 calls. Only case 5 (96
 * ticks) of the tick machine rolls after that: 4 pool heads spawn at ticks 0/6/12/18 and every 15 ticks
 * after (2 calls each), and bolts 4-14 spawn at their rolled tick and every 34 ticks after (3 calls each).
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function judgementRand(rng) {
  const C = JUDGEMENT_CONSTANTS;
  const startCount = rng.count;

  /** @type {number[]} */
  const boltFirst = [];
  for (let i = 0; i < C.SETUP_BOLTS; i++) {
    boltFirst.push(rng.next().getRNG2() % C.SCHEDULE_RANGE);
    rng.next(); // scale
  }

  let tickCalls = 0;
  for (let tick = 0; tick < C.CASE5_TICKS; tick++) {
    for (const first of C.HEAD_FIRST_TICKS) {
      if (tick >= first && (tick - first) % C.HEAD_PERIOD === 0) tickCalls += C.HEAD_CALLS;
    }
    for (let i = C.FIRST_ACTIVE_BOLT; i < C.SETUP_BOLTS; i++) {
      const first = boltFirst[i];
      if (tick >= first && (tick - first) % C.BOLT_PERIOD === 0) tickCalls += C.BOLT_CALLS;
    }
  }
  rng.next(tickCalls);

  return { calls: rng.count - startCount };
}

export const DEADLY_FINGERTIPS_CONSTANTS = {
  SPARKS: 30,
  // Phase 2's 80 passes, phase 3's 60, phase 4's 10 and the first 59 of phase 5 (its last tick closes the gate)
  GATED_PASSES: 80 + 60 + 10 + 59,
  TOTAL_PASSES: 80 + 60 + 10 + 59 + 1 + 60,
  VELOCITY_MOD: 5,
  VELOCITY_BASE: 5,
  LIFE_MOD: 0x46,
  Z_CUTOFF: -300,
};

/**
 * Deadly Fingertips (spell 25, Dark Lv1, one enemy): seed-dependent, 1075-1170 rand() calls
 * (spell_deadlyfingertips_*). The whole cost is a 30-spark pool, the same as the Dragon's Lightning:
 * vfx_spawn_random_arc_particle respawns any inactive line particle for 5 rand() (x, y, a point-B z, then
 * the z velocity -(r % 5 + 5) and the life r % 0x46); a spark goes inactive when its life or z>>12 < -300
 * runs out. The spawn gate is open on 209 passes: phase 2's 80 (it opens on its first tick), phase 3's 60,
 * phase 4's 10 and the first 59 of phase 5. Decay runs on every pass, but nothing spawns once the gate
 * closes. Setup, the instant-death check (it has no RNG), the hit script and the cleanup roll nothing.
 * @param {RNG} rng
 * @returns {SpellRandResult}
 */
export function deadlyFingertipsRand(rng) {
  const C = DEADLY_FINGERTIPS_CONSTANTS;
  const startCount = rng.count;

  const sparks = Array.from({ length: C.SPARKS }, () => ({ active: false, life: 0, posZ: 0, velZ: 0 }));
  for (let pass = 1; pass <= C.TOTAL_PASSES; pass++) {
    if (pass <= C.GATED_PASSES) {
      for (const spark of sparks) {
        if (spark.active) continue;
        rng.next(3);
        const velRoll = rng.next().getRNG2();
        spark.life = rng.next().getRNG2() % C.LIFE_MOD;
        spark.velZ = -((velRoll % C.VELOCITY_MOD) + C.VELOCITY_BASE) * 4096;
        spark.posZ = spark.posZ & 0xfff;
        spark.active = true;
      }
    }
    for (const spark of sparks) {
      if (spark.life < 1 || Math.floor(spark.posZ / 4096) < C.Z_CUTOFF) spark.active = false;
      if (spark.active) {
        spark.life--;
        spark.posZ += spark.velZ;
      }
    }
  }
  return { calls: rng.count - startCount };
}
