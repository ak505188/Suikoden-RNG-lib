import { g4Links, particleSystem } from './ParticleSystems.js';
import { wrapperObject } from './SpecialObjects.js';

/**
 * The Crystal Core Special's heap after the effect has run and freed everything: the words of all the blocks it allocated, derived from the
 * game's code (Suikoden-Bizhawk-HUD notes 2026-11-09_vfx_special_code.md, _special_particle_systems.md, 2026-11-10_vfx_special_camera.md,
 * _special_objects.md, _g4_links.md; v1.0). `ptrs` are the payload pointers of the move's allocations in `ENEMY_MOVE_EVENTS` order. Words
 * the code writes with a value that depends on a roll or on the glow's projection are listed as unknown; the never-written words come from
 * `pre`, the arena before the effect (with the effect's own loader buffer, which holds file data).
 */

/** The allocation order: container, struct, loader buffer, three systems (5 blocks each), 10 groups (array + 10 x 4 blocks), 10 impacts, glow, 18 small */
const SYSTEM_AT = [3, 8, 13];
const GROUP_AT = 18;
const IMPACT_AT = GROUP_AT + 41 * 10;
const GLOW_AT = IMPACT_AT + 40;
const SMALL_AT = GLOW_AT + 1;
const TOTAL = SMALL_AT + 18;

/**
 * `specialEffect` for a start state in which some words are not known: a word that depends on an unknown never-written word is unknown
 * (found by running the model again with every unknown word of the arena flipped: the words that change depend on them).
 * @param {{ ptrs: (number | null)[], bulkIndex: number, pre: (address: number) => number, isUnknown: (address: number) => boolean, packets: (slot: number) => [number, number], rolls?: { xi: number, yr: number }[] }} input
 * @returns {{ known: Map<number, number>, unknown: Set<number>, rolled: Map<number, number>, partial?: Map<number, number> } | undefined}
 */
export function specialEffectFrom({ ptrs, bulkIndex, pre, isUnknown, packets, rolls }) {
  const base = specialEffect({ ptrs, bulkIndex, pre, packets, rolls });
  if (!base) return undefined;
  const flipped = specialEffect({
    ptrs,
    bulkIndex,
    pre: (a) => (isUnknown(a) ? ~pre(a) >>> 0 : pre(a)),
    packets,
    rolls,
  });
  if (!flipped) return base;
  /** @type {Map<number, number>} words only the top byte of which depends on an unknown never-written word: the low 24 bits are known */
  const partial = new Map();
  for (const [addr, w] of [...base.known]) {
    const other = flipped.known.get(addr);
    if (other === w) continue;
    base.known.delete(addr);
    base.unknown.add(addr);
    if (other !== undefined && ((w ^ other) & 0xffffff) === 0) partial.set(addr, w);
  }
  return { ...base, partial };
}

/**
 * @param {{ ptrs: (number | null)[], bulkIndex: number, pre: (address: number) => number, packets: (slot: number) => [number, number], rolls?: { xi: number, yr: number }[] }} input
 *   bulkIndex: the draw buffer index at the effect's bulk allocation (the phase); packets: the party slots' packet blocks (for the links);
 *   rolls: the groups' last rolls (specialRolls): the objects' x and y words are known with them
 * @returns {{ known: Map<number, number>, unknown: Set<number>, rolled: Map<number, number> } | undefined} undefined when the allocation list is not the Special's
 */
export function specialEffect({ ptrs, bulkIndex, pre, packets, rolls }) {
  if (ptrs.length !== TOTAL || ptrs.some((p) => p === null)) return undefined;
  const at = /** @type {number[]} */ (ptrs);
  /** @type {Map<number, number>} */
  const known = new Map();
  /** @type {Set<number>} */
  const unknown = new Set();
  /** The words the rolls gave @type {Map<number, number>} */
  const rolled = new Map();
  const put = (
    /** @type {number} */ base,
    /** @type {number[]} */ words,
    /** @type {number[]} */ skip = [],
  ) =>
    words.forEach((w, i) => {
      if (skip.includes(i)) unknown.add(base + 4 * i);
      else known.set(base + 4 * i, w >>> 0);
    });

  // the three particle systems (struct, both G4 and DR buffers)
  const systems = SYSTEM_AT.map((first) => ({
    struct: at[first],
    g4: /** @type {[number, number]} */ ([at[first + 1], at[first + 3]]),
    dr: /** @type {[number, number]} */ ([at[first + 2], at[first + 4]]),
  }));
  const links = g4Links(systems, bulkIndex, packets);
  systems.forEach((s, n) => {
    const model = particleSystem(n, s, pre, bulkIndex, links[n]);
    put(s.struct, model.struct);
    model.g4.forEach((buffer, b) =>
      buffer.forEach((record, i) => put(s.g4[b] + 36 * i, /** @type {number[]} */ (record))),
    );
    model.dr.forEach((buffer, b) => buffer.forEach((record, i) => put(s.dr[b] + 12 * i, record)));
  });

  // the 110 wrapper objects: ring objects by group, then the impacts; the groups' arrays hold the ring objects' addresses
  const objectAt = (/** @type {number} */ o) =>
    o < 100 ? GROUP_AT + 41 * Math.floor(o / 10) + 1 + 4 * (o % 10) : IMPACT_AT + 4 * (o - 100);
  for (let o = 0; o < 110; o++) {
    const base = objectAt(o);
    const blocks = {
      object: at[base],
      header: at[base + 1],
      arrays: /** @type {[number, number]} */ ([at[base + 2], at[base + 3]]),
    };
    const model = wrapperObject({
      kind: o < 100 ? 'ring' : 'impact',
      group: o < 100 ? Math.floor(o / 10) : o - 100,
      position: o % 10,
      blocks,
      bulkIndex,
      pre,
    });
    put(blocks.object, model.object.words, model.object.unknown);
    if (rolls) {
      // the ring objects' and the impacts' x and y: their group's last roll
      const { xi, yr } = rolls[o < 100 ? Math.floor(o / 10) : o - 100];
      for (const [k, value] of [xi << 12, yr << 12].entries()) {
        rolled.set(blocks.object + 4 * k, value >>> 0);
        known.set(blocks.object + 4 * k, value >>> 0);
        unknown.delete(blocks.object + 4 * k);
      }
    }
    put(blocks.header, model.header.words, model.header.unknown);
    put(blocks.arrays[0], model.arrays[0].words, model.arrays[0].unknown);
    put(blocks.arrays[1], model.arrays[1].words, model.arrays[1].unknown);
  }
  for (let g = 0; g < 10; g++)
    put(
      at[GROUP_AT + 41 * g],
      Array.from({ length: 10 }, (_, j) => at[objectAt(10 * g + j)]),
    );

  // the 148-byte struct: the system structs, the ring arrays, the impact objects, the glow; constants; the scale accumulator and counters
  put(at[1], [
    ...SYSTEM_AT.map((first) => at[first]),
    ...Array.from({ length: 10 }, (_, g) => at[GROUP_AT + 41 * g]),
    ...Array.from({ length: 10 }, (_, i) => at[objectAt(100 + i)]),
    at[GLOW_AT],
    0x78,
    0,
    0,
    pre(at[1] + 4 * 27),
    0xffffff80,
    0,
    0xffffffe2,
    pre(at[1] + 4 * 31),
    0x55566, // S[32] after the 32 growth calls and 47 shrink calls
    0x190000, // S[33] after 64 calls of +0x3200
    0x2f,
    3,
    0,
  ]);
  // the container (struct pointer, the callback pointer cleared) and the 18 one-word-pair blocks of the party scripts
  put(at[0], [at[1], 0]);
  for (let i = 0; i < 18; i++) put(at[SMALL_AT + i], [1, 2]);
  // the glow object's 24 words depend on its projection: not derived
  put(
    at[GLOW_AT],
    Array(24).fill(0),
    Array.from({ length: 24 }, (_, i) => i),
  );
  return { known, unknown, rolled };
}
