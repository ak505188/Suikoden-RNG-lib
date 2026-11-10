import { SQRT0_TABLE } from './Sqrt0Table.js';

/**
 * The Flaming Arrow cast's particles as the game leaves them (Suikoden-Bizhawk-HUD notes/2026-11-10_vfx_kill_round.md and
 * kill_round_luc_alloc_free_list_v10.json, v1.0; words 0-8 of particles 0-5 exact in 20 of 20 seeds): 20 particle structs, respawned
 * whenever inactive, four rolls each, 96 ticks of case 1. A particle's words 0-2 are its head, 3-5 its trail, 6-8 its velocity (all
 * x4096); the low 12 bits of words 0-5 keep what the struct held before (the arena's stale words), the rest is the cast's.
 */

const PARTICLES = 20;
const TICKS = 96;
const RADIUS = 100;

const cdiv = (/** @type {number} */ a, /** @type {number} */ b) => Math.trunc(a / b);
const cmod = (/** @type {number} */ a, /** @type {number} */ b) => a - cdiv(a, b) * b;

/** The game's integer square root (sqrt0): a table lookup on the normalised argument */
export function sqrt0(/** @type {number} */ argument) {
  const a = argument >>> 0;
  const c = Math.clz32(a);
  if (a === 0) return 0;
  const ce = c & ~1;
  const shifted = ce - 0x18 < 0 ? a >>> ((0x18 - ce) & 31) : (a << ((ce - 0x18) & 31)) >>> 0;
  const entry = SQRT0_TABLE[shifted - 0x40];
  const r = (entry << (((0x1f - ce) >> 1) & 31)) | 0;
  return r >> 12;
}

/**
 * @typedef {Object} CastParticle
 * @property {number[]} words - words 0-8 as unsigned 32-bit values
 * @property {number} life
 * @property {boolean} active
 * @property {Map<number, [number[], number[]]>} draws - by tick: the head and the trail position (words 0-2 / 3-5, divided by 4096)
 */

/**
 * @param {{ next: () => { rand: number } }} rng - positioned at the cast's first spawn (the RNG after the polls before it)
 * @param {number[][]} stale - each particle's words 0-8 as the arena held them before the cast (only the low 12 bits are used)
 * @returns {CastParticle[]}
 */
export function flamingArrowCast(rng, stale) {
  /** @type {CastParticle[]} */
  const ps = Array.from({ length: PARTICLES }, (_, i) => ({
    words: stale[i].map((w) => w >>> 0),
    life: 0,
    active: false,
    draws: new Map(),
  }));
  const spawn = (/** @type {CastParticle} */ p) => {
    const w = p.words;
    const put = (/** @type {number} */ i, /** @type {number} */ v) => {
      w[i] = ((w[i] & 0xfff) | ((v << 12) >>> 0)) >>> 0;
    };
    const x = cmod(rng.next().rand, 2 * (RADIUS - 1)) + 1 - RADIUS;
    const s = sqrt0(RADIUS * RADIUS - x * x);
    const y = s > 0 ? cmod(rng.next().rand, 2 * s) - s : (rng.next(), 0);
    const z = sqrt0(RADIUS * RADIUS - x * x - y * y);
    put(0, x);
    put(1, y);
    put(2, -z);
    put(3, cdiv(5 * x, 6));
    put(4, cdiv(5 * y, 6));
    put(5, cdiv(-5 * z, 6));
    const v = cmod(rng.next().rand, 64) + 128;
    w[6] = (-x * v) >>> 0;
    w[7] = (-y * v) >>> 0;
    w[8] = (z * v) >>> 0;
    p.life = cmod(rng.next().rand, 100);
    p.active = true;
  };
  for (let tick = 1; tick <= TICKS; tick++) {
    for (const p of ps) if (!p.active) spawn(p);
    if (tick === TICKS) break;
    for (const p of ps) {
      if (!p.active) continue;
      const w = p.words;
      if (p.life < 1 || Math.abs((w[3] | 0) >> 12) < 5) p.active = false;
      else {
        p.life--;
        for (let i = 0; i < 3; i++) {
          w[i] = (w[i] + w[6 + i]) >>> 0;
          w[3 + i] = (w[3 + i] + w[6 + i]) >>> 0;
        }
        p.draws.set(tick, [
          [0, 1, 2].map((i) => (w[i] | 0) / 4096),
          [3, 4, 5].map((i) => (w[i] | 0) / 4096),
        ]);
      }
    }
  }
  return ps;
}
