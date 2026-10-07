/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */

import { spawnFireParticle } from './shared.js';

/** @param {RNG} rng @returns {SpellRandResult}*/
export function stormFangRand(rng) {
  rng.next(38);
  return { calls: 38 };
}

/** @param {RNG} rng @returns {SpellRandResult}*/
export function blazingCampRand(rng) {
  rng.next(54);
  return { calls: 54 };
}

/** @param {RNG} rng @returns {SpellRandResult}*/
export function scorchedEarthRand(rng) {
  rng.next(282);
  return { calls: 282 };
}

export const THOR_CONSTANTS = {
  SPARKS: 6,
  BOLTS: 4,
  ARRAYS: 6,
  ARCS: 20,
  PHASE2_TICKS: 128,
  TOTAL_TICKS: 128 + 80 + 64, // phases 2-4; phases 0-1 (112 ticks) have nothing
  ARC_RADIUS: 0x78,
  ARC_FIRST_TICK: 48,
  BOLT_IMPACT_MOVE: 13,
  FLASH_TICKS: 48,
  TRAIL_FIRST: 32,
  TRAIL_STEP: 3,
  TRAIL_LEAD_TICKS: 16,
  TRAIL_LEN: 10,
};

/**
 * Thor (spell 37, Lightning+Water Magic Unite, one enemy): seed-dependent (spell_thor_*). Phases are
 * 64+48+128+80+64 ticks; only the 128-tick phase 2 has a body, but the epilogue runs on all five.
 *   setup (6): one roll per spark particle's scale.
 *   phase-2 body, tick t = 0..127:
 *     bolts: 4 bolt particles; while a bolt and its impact flash are both inactive it activates for 2
 *       rand(). It flies from z=-300 at +25/tick and impacts on its 13th move for 1 rand() (the flash
 *       life, which never matters: the paired 48-tick flash always ends the first one). So all 4 activate
 *       at t=0, 60, 120 and impact at 12, 72, 132 (phase 3).
 *     trails: 6 arrays of 10 particles; array j's lead is armed at t = 32+3j. While the lead and the tail
 *       (10th) are inactive and the lead's counter is 0 it activates for 2 rand(): t=a, a+25, a+50, a+75.
 *       A lead lives 16 ticks, then costs 3 rand() (its spark); the tail flag trails the lead by 9 ticks.
 *     lightning arcs: from t=48, each of 20 line particles that is inactive respawns via
 *       spell_flamingarrow_spawn_particle(p, 0x78), 4 rand(): the same helper as Flaming Arrow.
 *   epilogue (every tick): arcs decay (lifetime < 1, or |trail_x>>12| < 5 -> inactive, else lifetime-1 and
 *     trail_x += velocity), then bolt moves/impacts, then trail leads. The arcs are the seed-dependent part.
 * @param {RNG} rng @returns {SpellRandResult}
 */
export function thorRand(rng) {
  const C = THOR_CONSTANTS;
  const startCount = rng.count;

  for (let i = 0; i < C.SPARKS; i++) rng.next();

  const bolts = Array.from({ length: C.BOLTS }, () => ({ active: false, moves: 0, flashLeft: 0 }));
  const arrays = Array.from({ length: C.ARRAYS }, () => ({
    active: false, counter: 1, armed: false, flags: /** @type {boolean[]} */ (new Array(C.TRAIL_LEN).fill(false)),
  }));
  /** @type {{ active: boolean, lifetime: number, trailX: number, velX: number }[]} */
  const arcs = Array.from({ length: C.ARCS }, () => ({ active: false, lifetime: 0, trailX: 0, velX: 0 }));

  for (let tick = 0; tick < C.TOTAL_TICKS; tick++) {
    if (tick < C.PHASE2_TICKS) {
      for (const bolt of bolts) {
        if (!bolt.active && bolt.flashLeft === 0) {
          rng.next(2);
          bolt.active = true;
          bolt.moves = 0;
        }
      }
      arrays.forEach((arr, j) => {
        if (tick === C.TRAIL_FIRST + C.TRAIL_STEP * j) {
          arr.counter = 0;
          arr.armed = true;
        }
      });
      for (const arr of arrays) {
        if (arr.armed && !arr.active && !arr.flags[C.TRAIL_LEN - 1] && arr.counter === 0) {
          rng.next(2);
          arr.active = true;
          arr.flags.fill(true);
        }
      }
      if (tick >= C.ARC_FIRST_TICK) {
        for (let i = 0; i < C.ARCS; i++) {
          if (!arcs[i].active) arcs[i] = spawnFireParticle(arcs[i].trailX, C.ARC_RADIUS, rng);
        }
      }
    }

    for (const arc of arcs) {
      if (!arc.active) continue;
      if (arc.lifetime < 1 || Math.abs(Math.floor(arc.trailX / 4096)) < 5) {
        arc.active = false;
      } else {
        arc.lifetime--;
        arc.trailX += arc.velX;
      }
    }
    for (const bolt of bolts) {
      if (bolt.active) {
        bolt.moves++;
        if (bolt.moves >= C.BOLT_IMPACT_MOVE) {
          rng.next();
          bolt.active = false;
          bolt.flashLeft = C.FLASH_TICKS;
        }
      }
      if (bolt.flashLeft > 0 && !(bolt.active && bolt.moves === 0)) bolt.flashLeft--;
    }
    for (const arr of arrays) {
      if (arr.active) {
        if (arr.counter < C.TRAIL_LEAD_TICKS) {
          arr.counter++;
        } else {
          arr.active = false;
          arr.counter = 0;
          rng.next(3);
        }
      }
      // The game copies the lead's already-updated flag, so the tail flags trail it from this tick
      arr.flags[0] = arr.active;
      for (let k = C.TRAIL_LEN - 1; k > 0; k--) arr.flags[k] = arr.flags[k - 1];
    }
  }
  return { calls: rng.count - startCount };
}
