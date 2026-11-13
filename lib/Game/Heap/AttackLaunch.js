/**
 * What the 12 launch groups of Crystal Core's Attack leave in their blocks (the agent's ASK 15 answer, `ask15_word_rules_v10.json`; the
 * engine's own sprite builder FUN_800e2004 through the Core overlay's FUN_800194b8): 12 resources (two objects of six: entry 0x0e, then
 * 0x0d five times), each a 52-byte header and two 40-byte packets, all built in the burst tick L, drawn L..L+89 and freed at L+98.
 * The builder writes the exact words (E); the draws rewrite the links, the projected points and the header's placement words (T); the
 * rest keeps what the previous occupant left (S). The built buffer is the draw buffer of tick L; the builder copies it whole to the other.
 */
import { EngineMemory } from './Engine/EffectEngine.js';

/**
 * The words the builder writes into a resource's packet and header, by party size m and entry (the loader counters t6 = 2m + 2, t7 = m
 * put the first sprite's texture coordinates at 0x79904060 for six members).
 * @type {Record<number, Record<'e' | 'd', { w3: number, w5: number, w7: number, w9: number }>>}
 */
const PACKET_WORDS = {
  3: {
    e: { w3: 0x78d0c060, w5: 0x0088c07f, w7: 0xdf60, w9: 0xdf7f },
    d: { w3: 0x78d0c040, w5: 0x0088c05f, w7: 0xdf40, w9: 0xdf5f },
  },
  4: {
    e: { w3: 0x79104060, w5: 0x0095407f, w7: 0x5f60, w9: 0x5f7f },
    d: { w3: 0x79104040, w5: 0x0095405f, w7: 0x5f40, w9: 0x5f5f },
  },
  5: {
    e: { w3: 0x79504060, w5: 0x0097407f, w7: 0x5f60, w9: 0x5f7f },
    d: { w3: 0x79504040, w5: 0x0097405f, w7: 0x5f40, w9: 0x5f5f },
  },
  6: {
    e: { w3: 0x79904060, w5: 0x0099407f, w7: 0x5f60, w9: 0x5f7f },
    d: { w3: 0x79904040, w5: 0x0099405f, w7: 0x5f40, w9: 0x5f5f },
  },
};
/** the header's animation and list pointers by entry */
const HEADER_POINTERS = {
  e: { anim: 0x8006b438, list: 0x8006b2fc },
  d: { anim: 0x8006b430, list: 0x8006b2ec },
};
/** Blocks per resource (header, packet 0, packet 1) and resources per Attack. */
const RESOURCES = 12;

/**
 * Applies the launch groups' words to the heap state, over the words as they were.
 * @param {{ heap: import('./HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state
 * @param {readonly (number | null)[]} ptrs - the payload pointer of each of the Attack's allocations (the 36 launch blocks come first)
 * @param {{ members: number, parity?: number }} options - `parity`: the draw buffer index at the burst tick (unset: unknown)
 * @returns {boolean} whether the rules cover this party size
 */
export function applyLaunchWords(state, ptrs, { members, parity }) {
  const words = PACKET_WORDS[members];
  if (!words) return false;
  const rows = words;
  const mem = new EngineMemory(state);
  for (let g = 0; g < RESOURCES; g++) {
    const [header, p0, p1] = [ptrs[3 * g], ptrs[3 * g + 1], ptrs[3 * g + 2]];
    if (header == null || p0 == null || p1 == null) return false;
    const kind = g % 6 === 0 ? 'e' : 'd';
    const w = rows[kind];
    const entry = kind === 'e' ? 0x0e : 0x0d;
    // header: the builder's exact words; the placement owns w2 / w3 / w4 (and w12's table row, not known)
    mem.w32(header, 0x01000100 | entry);
    mem.w32(header + 4, 1);
    for (const off of [8, 0xc, 0x10, 0x30]) mem.w32(header + off, 0, false);
    mem.w32(header + 0x14, 0x1000);
    mem.w32(header + 0x18, 0);
    mem.w16(header + 0x1c, 0);
    mem.w32(header + 0x20, HEADER_POINTERS[kind].anim);
    mem.w32(header + 0x24, HEADER_POINTERS[kind].list);
    mem.w32(header + 0x28, p0);
    mem.w32(header + 0x2c, p1);
    /** @param {number} block */
    const packet = (block) => {
      mem.w8(block + 3, 9);
      for (const o of [0, 1, 2]) mem.w8(block + o, 0, false);
      mem.w32(block + 4, 0x2c808080);
      mem.w32(block + 0xc, w.w3);
      mem.w32(block + 0x14, w.w5);
      for (const o of [8, 0x10, 0x18, 0x20]) mem.w32(block + o, 0, false);
      mem.w16(block + 0x1c, w.w7);
      mem.w16(block + 0x24, w.w9);
    };
    packet(p0);
    packet(p1);
    // the pad halves: the built buffer keeps its own, the other is a whole-block copy of it (parity unknown: not known for either)
    for (const o of [0x1e, 0x26]) {
      if (parity === undefined) {
        for (const block of [p0, p1]) for (let k = 0; k < 2; k++) mem.w8(block + o + k, 0, false);
      } else {
        const [built, other] = parity === 0 ? [p0, p1] : [p1, p0];
        mem.copy8(other + o, built + o);
        mem.copy8(other + o + 1, built + o + 1);
      }
    }
  }
  mem.commit();
  return true;
}

/**
 * The bytes of a launch group's blocks the builder never stores (ASK 30, `ask30_attack_word_rules_v10.json`, class S) and the bytes it copies from the
 * current array into the other (class C of an S byte): the header's +0x12 / +0x13 and +0x1e / +0x1f, a packet's +0x1e / +0x1f and +0x26 / +0x27. They hold the
 * block's previous occupant's bytes (the other packet array: the current array's), so a recorded image, which carries the recorded run's, must not give them.
 * @param {{ heap: import('./HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state
 * @param {readonly (number | null)[]} ptrs - the payload pointer of each of the Attack's allocations (the 36 launch blocks, then the hit child's)
 * @param {{ parity?: number, history: Map<number, number>, unknownBefore: Set<number> }} options - `parity`: the draw buffer index at the burst tick (unset: unknown);
 *   `history` / `unknownBefore`: the known and the unknown words from before the move's allocations
 */
export function applyLaunchPads(state, ptrs, { parity, history, unknownBefore }) {
  const { heap, known, unknown, partial } = state;
  /** the word's value before the move, undefined where not known @param {number} addr */
  const before = (addr) =>
    history.has(addr) ? history.get(addr) : unknownBefore.has(addr) ? undefined : heap.u32(addr);
  /**
   * Sets bytes `mask` (bit k: byte k) of the word at `addr` from `source`, a word or undefined (unknown); the other bytes stay as the image gave them.
   * @param {number} addr @param {number} mask @param {number | undefined} source
   */
  const setBytes = (addr, mask, source) => {
    const image = known.get(addr);
    if (source === undefined || image === undefined) {
      // the word is not known; its best value is the image's (the recorded run's previous occupant)
      if (image !== undefined) heap.over.set(addr, image);
      known.delete(addr);
      partial?.delete(addr);
      unknown.add(addr);
      return;
    }
    let bytes = 0;
    for (let k = 0; k < 4; k++) if (mask & (1 << k)) bytes |= 0xff << (8 * k);
    known.set(addr, ((image & ~bytes) | (source & bytes)) >>> 0);
  };
  for (let g = 0; g < RESOURCES + 1; g++) {
    const [header, p0, p1] = [ptrs[3 * g], ptrs[3 * g + 1], ptrs[3 * g + 2]];
    if (header == null) continue;
    // header: +0x10 b2-3 and +0x1c b2-3 (the child is the 13th: its packets are not covered)
    for (const [offset, mask] of [
      [0x10, 0b1100],
      [0x1c, 0b1100],
    ])
      setBytes(header + offset, mask, before(header + offset));
    if (g === RESOURCES || p0 == null || p1 == null) continue;
    if (parity === undefined) {
      for (const block of [p0, p1])
        for (const offset of [0x1c, 0x24]) setBytes(block + offset, 0b1100, undefined);
      // (the other array's +0x27 is a copy)
      continue;
    }
    const [built, other] = parity === 0 ? [p0, p1] : [p1, p0];
    for (const offset of [0x1c, 0x24]) {
      const stale = before(built + offset);
      setBytes(built + offset, 0b1100, stale);
      // the other array: a copy of the current array's bytes (+0x24 b2 is rewritten by the draw: the image's)
      setBytes(other + offset, offset === 0x1c ? 0b1100 : 0b1000, stale);
    }
  }
}
