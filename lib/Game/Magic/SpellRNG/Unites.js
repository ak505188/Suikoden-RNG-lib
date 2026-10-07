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

export const WATER_DRAGON_CONSTANTS = {
  SETUP_CALLS: 30 * 3 + 20 * 2 + 80 * 2 + 12, // scales and start frames
  P1: 30,
  P2: 20,
  P3: 80,
  BOLTS: 12,
  PASSES: 64 + 64 + 128 + 64 + 64,
  GATE1_FIRST: 64,
  GATE2_FIRST: 128,
  GATE_LAST: 318,
  PHASE2_FIRST: 128,
  PHASE2_TICKS: 128,
  BOLT_FIRST_TICK: 48,
  BOLT_STEP: 5,
  P1_LIFE_MOD: 180,
  P2_HEIGHT_MOD: 200,
  P2_LIFE_MOD: 180,
  P2_VEL_MOD: 0x400,
  P2_VEL_BASE: 0x1e00,
  P3_LIFE_MOD: 96,
};

/**
 * Water Dragon (spell 38, Wind+Water Magic Unite, all enemies): seed-dependent, ~3000 rand() calls
 * (spell_waterdragon_*). Phases are 64+64+128+64+64 ticks; the shared epilogue runs on every phase and
 * only phase 2 has a body. Everything below is rolled in this order inside one tick:
 *   setup: 302 = 30 x 3 + 20 x 2 + 80 x 2 + 12 x 1.
 *   phase-2 body: 12 bolts, bolt k activates at tick 48+5k (2 rand()); their impacts roll nothing.
 *   epilogue, per pool, in order (a pool respawns any particle that is inactive while its gate is open):
 *     P1, 30 particles, gate = epilogue passes 64..318: 4 rand() (height, 2 in the activate helper, then
 *       life = rand() % 180). Life counts down once per active pass and the particle goes inactive when
 *       it reads < 1, so the period is life + 1.
 *     P2, 20 particles, gate = 128..318: 5 rand() (height % 200, 2 in the helper, z velocity
 *       % 0x400 + 0x1e00, life % 180). The life never counts down; the particle ends when z>>12 > 0 (it
 *       starts at -height, moves by its velocity each pass, carrying the low 12 bits of z from one life to
 *       the next), or at once if life < 1.
 *     P3, 80 particles, gate = 64..318: 4 rand() as P1 with life % 96.
 *   The gates close on phase 3's last pass (318), so phase 4 rolls nothing.
 * @param {RNG} rng @returns {SpellRandResult}
 */
export function waterDragonRand(rng) {
  const C = WATER_DRAGON_CONSTANTS;
  const startCount = rng.count;
  const roll = () => rng.next().getRNG2();

  rng.next(C.SETUP_CALLS);
  const pool1 = Array.from({ length: C.P1 }, () => ({ active: false, life: 0 }));
  const pool3 = Array.from({ length: C.P3 }, () => ({ active: false, life: 0 }));
  const pool2 = Array.from({ length: C.P2 }, () => ({ active: false, life: 0, z: 0, vel: 0 }));

  /** Re-spawns what's inactive (4 rand(), life last), then ticks every life down */
  const runCountdownPool = (/** @type {{ active: boolean, life: number }[]} */ pool, /** @type {boolean} */ gate, /** @type {number} */ lifeMod) => {
    if (gate) {
      for (const p of pool) {
        if (p.active) continue;
        rng.next(3);
        p.life = roll() % lifeMod;
        p.active = true;
      }
    }
    for (const p of pool) {
      if (p.life < 1) p.active = false;
      else if (p.active) p.life--;
    }
  };

  for (let pass = 0; pass < C.PASSES; pass++) {
    const bodyTick = pass - C.PHASE2_FIRST;
    if (bodyTick >= C.BOLT_FIRST_TICK && bodyTick < C.PHASE2_TICKS
      && (bodyTick - C.BOLT_FIRST_TICK) % C.BOLT_STEP === 0
      && (bodyTick - C.BOLT_FIRST_TICK) / C.BOLT_STEP < C.BOLTS) {
      rng.next(2);
    }
    const gate1 = pass >= C.GATE1_FIRST && pass <= C.GATE_LAST;
    const gate2 = pass >= C.GATE2_FIRST && pass <= C.GATE_LAST;

    runCountdownPool(pool1, gate1, C.P1_LIFE_MOD);

    if (gate2) {
      for (const p of pool2) {
        if (p.active) continue;
        const height = roll() % C.P2_HEIGHT_MOD;
        rng.next(2);
        p.vel = roll() % C.P2_VEL_MOD + C.P2_VEL_BASE;
        p.life = roll() % C.P2_LIFE_MOD;
        p.active = true;
        p.z = (p.z & 0xfff) + (-height * 4096);
      }
    }
    for (const p of pool2) {
      if (p.life < 1 || Math.floor(p.z / 4096) > 0) p.active = false;
      else p.z += p.vel;
    }

    runCountdownPool(pool3, gate1, C.P3_LIFE_MOD);
  }
  return { calls: rng.count - startCount };
}
