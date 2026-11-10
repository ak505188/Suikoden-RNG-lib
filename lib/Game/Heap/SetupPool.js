/**
 * The battle's spiral-wipe pool: the 5372-byte block FUN_800de7e4 allocates (ra 0x800de9e4) for the intro wipe, double-buffered, built by
 * FUN_800df6b0 and animated for 60 ticks by FUN_800dfe6c (Suikoden-Bizhawk-HUD notes/2026-11-09_vfx_brief3_setup_pool.md, v1.0 disc). It is
 * freed before the first prompt, and the Attack's 24 packets are allocated over its POLY_F4 region: the upper halves of their words 7 and
 * 9 (padding the effect never writes) are what the wipe left there. Only the F4 region (0xd7c..0x14fb) is modelled: its bytes are all
 * written by the wipe code.
 */
import { GTE_COS, GTE_SIN } from './HitEffectTables.js';

/** Offsets of the two buffers' POLY_F4 tiles (0x18 bytes each, 40 per buffer) */
const F4_BASE = 0xd7c;
const F4_BUFFER = 0x3c0;
/** Pool size and the distance from the pool to the end of the free block the Attack's allocations carve from */
export const POOL_BYTES = 5372;
export const POOL_TO_END = 0x1500;
/** The ordering table's slot 1 heads (tag low 24 bits) the first F4 tile of each buffer links to: observed, the same in every party */
const OT_HEAD = [0x1ba43c, 0x1bac3c];

const cdiv = (/** @type {number} */ a, /** @type {number} */ b) => Math.trunc(a / b);

/**
 * The corner points (x0, y0, x1, y1) of the 40 tiles: the spiral round the screen border (FUN_800df6b0)
 * @returns {number[][]}
 */
function spiral() {
  /** @type {number[][]} */
  const tiles = [];
  let x1 = -0x20;
  let y1 = -120;
  tiles.push([0, -120, x1, y1]);
  for (let k = 1; k < 40; k++) {
    const [, , px, py] = tiles[k - 1];
    if (k === 20) {
      tiles.push([0, 0x78, 0x20, 0x78]);
      continue;
    }
    x1 = px;
    y1 = py;
    if (k < 5) x1 -= 0x20;
    else if (k < 15) y1 += 0x18;
    else if (k < 20) x1 += 0x20;
    else if (k < 25) x1 += 0x20;
    else if (k < 35) y1 -= 0x18;
    else x1 -= 0x20;
    tiles.push([px, py, x1, y1]);
  }
  return tiles;
}
const SPIRAL = spiral();

/**
 * The F4 region of the pool as the wipe leaves it, as bytes (2 buffers x 40 tiles x 0x18)
 * @param {number} pool - the pool's address
 * @param {[number, number]} t - T of buffer 0 and buffer 1: the last animate tick wrote 240 into its buffer and the one before 236
 * @returns {Uint8Array}
 */
export function wipeRegion(pool, t) {
  const bytes = new Uint8Array(2 * F4_BUFFER);
  const view = new DataView(bytes.buffer);
  for (let b = 0; b < 2; b++) {
    /** @type {number[][]} */
    const xy = [];
    for (let k = 0; k < 40; k++) {
      const a = ((k + 1) << 12) / 40;
      const angle = Math.trunc(a) & 0xfff;
      const sin = GTE_SIN[angle];
      const cos = GTE_COS[angle];
      const x3 = -cdiv(sin * t[b], 4096);
      const y3 = -cdiv(cos * t[b], 4096);
      const [x2, y2] = k === 0 ? [0, -t[b]] : [xy[k - 1][6], xy[k - 1][7]];
      const [x0, y0, x1, y1] = SPIRAL[k];
      xy.push([x0, y0, x1, y1, x2, y2, x3, y3].slice(0, 8));
      // xy2 / xy3 of the FT4 are what the F4 copies: (x2, y2) = the previous tile's (x3, y3)
      xy[k] = [x0, y0, x1, y1, x2, y2, x3, y3];
    }
    for (let k = 0; k < 40; k++) {
      const at = b * F4_BUFFER + 0x18 * k;
      const next =
        k === 0 ? OT_HEAD[b] : (pool + F4_BASE + b * F4_BUFFER + 0x18 * (k - 1)) & 0xffffff;
      view.setUint32(at, ((5 << 24) | next) >>> 0, true);
      bytes.set([8, 8, 8, 0x28], at + 4);
      // xy0, xy1 (the first two corners), then xy2, xy3 of the F4: (x0, y0), (x1, y1), (x2, y2), (x3, y3) as x low, y high
      for (let c = 0; c < 4; c++) {
        view.setInt16(at + 8 + 4 * c, xy[k][2 * c], true);
        view.setInt16(at + 10 + 4 * c, xy[k][2 * c + 1], true);
      }
    }
  }
  return bytes;
}

/**
 * The halfword at an address, if the wipe wrote it
 * @param {Uint8Array} region - wipeRegion
 * @param {number} pool
 * @param {number} address - halfword address
 * @returns {number | undefined}
 */
export function wipeHalf(region, pool, address) {
  const off = address - pool - F4_BASE;
  if (off < 0 || off + 2 > region.length) return undefined;
  return region[off] | (region[off + 1] << 8);
}
