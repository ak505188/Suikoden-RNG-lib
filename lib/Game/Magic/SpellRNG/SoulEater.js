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
