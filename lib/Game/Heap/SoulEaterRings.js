/**
 * The particle rings Black Shadow and Hell build in their setup frame, as far as the heap sees them. One function (FUN_80120a50,
 * fx_ring_builder) allocates and initialises every ring block: an 84-byte header, then for each of the two draw buffers n 36-byte
 * POLY_G4 packets and n 12-byte link records. The words it writes are exact; the rest of a block keeps what the previous occupant left
 * (the loader image where the block lies under the loader buffer), and the per-tick code rewrites the projected points, the
 * ordering-table links and (group rings) the colours once a ring is active (README 7e; the agent's ASK 14 answer, 3888 of 3888 words of
 * the 18 blocks that lie in the loader area).
 */
import { EngineMemory } from './Engine/EffectEngine.js';
import { OT, ringTick } from './RingUpdate.js';

/**
 * What each ring of a cast is built with (the builder's calls: the six latitude segments of the group, then the two rings; the setup
 * frame's observed parameters, the same for both spells).
 * @type {Record<'group' | 'ring10' | 'ring36', { n: number, flag: number, abr: number, rgb0: number, rgb1: number }>}
 */
const RING_PARAMS = {
  group: { n: 36, flag: 1, abr: 2, rgb0: 0, rgb1: 0 },
  ring10: { n: 10, flag: 1, abr: 2, rgb0: 0x20, rgb1: 0x50 },
  ring36: { n: 36, flag: 1, abr: 1, rgb0: 0, rgb1: 0x7f },
};

/**
 * The header's +0x1c word (the builder's param 4) of the group's segments, as observed: Black Shadow's are all -128; Hell's first is
 * -128 and the other five -178.
 * @type {Record<'BlackShadow' | 'Hell', number[]>}
 */
const GROUP_P4 = {
  BlackShadow: [-128, -128, -128, -128, -128, -128],
  Hell: [-128, -178, -178, -178, -178, -178],
};

/** The group's segments the cast builds. */
const GROUP_SEGMENTS = 6;

/** @typedef {{ kind: 'group' | 'ring10' | 'ring36', header: number, packets: [number, number], links: [number, number], keep: number[] }} RingBlocks */

/**
 * Finds the ring blocks in a Soul Eater cast's allocation list: after the 76-byte group header and its 24-byte pointer table come
 * the group's six segments, then the cast's two rings (10 and 36 segments, in the order the spell builds them).
 * @param {readonly number[]} sizes - the request size of each allocation, in order
 * @returns {{ kind: RingBlocks['kind'], first: number }[]}
 */
function ringSequences(sizes) {
  const start = sizes.findIndex((s, i) => s === 76 && sizes[i + 1] === 24);
  if (start < 0) return [];
  const rings = [];
  let j = start + 2;
  for (;;) {
    if (sizes[j] !== 84) break;
    const packets = sizes[j + 1];
    if (packets !== 1296 && packets !== 360) break;
    if (sizes[j + 2] !== packets / 3 || sizes[j + 3] !== packets || sizes[j + 4] !== packets / 3)
      break;
    const kind = rings.length < GROUP_SEGMENTS ? 'group' : packets === 360 ? 'ring10' : 'ring36';
    rings.push({ kind, first: j });
    j += 5;
  }
  return rings;
}

/**
 * The allocations of a cast that are ring blocks: their words keep what they held until `applyRingInit` writes what the builder does.
 * @param {readonly number[]} events - the cast's heap events
 * @returns {Set<number>} the (0-based) allocation indexes
 */
export function ringKeep(events) {
  const keep = new Set();
  for (const { first } of ringSequences(events.filter((e) => e > 0)))
    for (let i = 0; i < 5; i++) keep.add(first + i);
  return keep;
}

/**
 * The ring blocks of a cast: the indexes (in the allocation list) of the blocks whose words keep their previous contents, and the
 * pointers of each ring.
 * @param {readonly number[]} events - the cast's heap events
 * @param {readonly (number | null)[]} ptrs - the payload pointer of each allocation
 * @returns {RingBlocks[]}
 */
export function ringBlocks(events, ptrs) {
  const sizes = events.filter((e) => e > 0);
  return ringSequences(sizes).flatMap(({ kind, first }) => {
    const p = ptrs.slice(first, first + 5);
    if (p.some((x) => x === null || x === undefined)) return [];
    const [header, p0, l0, p1, l1] = /** @type {number[]} */ (p);
    return [
      {
        kind,
        header,
        packets: /** @type {[number, number]} */ ([p0, p1]),
        links: /** @type {[number, number]} */ ([l0, l1]),
        keep: [first, first + 1, first + 2, first + 3, first + 4],
      },
    ];
  });
}

/**
 * Writes what the builder leaves in one ring's blocks into the heap state, over the words as they were (a block's other words keep
 * their knowledge), and with `ticked`, makes unknown what the per-tick code of an active ring rewrites.
 * @param {{ heap: import('./HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state
 * @param {RingBlocks[]} rings
 * @returns {number[]} the words it wrote
 * @param {{ ticked?: boolean, spell?: 'BlackShadow' | 'Hell' }} [options] - `ticked`: the ring has run (its projected points, links and group colours are rewritten each tick)
 */
export function applyRingInit(state, rings, options = {}) {
  const mem = new EngineMemory(state);
  let segment = 0;
  for (const ring of rings) {
    const { n, flag, abr, rgb0, rgb1 } = RING_PARAMS[ring.kind];
    const group = ring.kind === 'group';
    const h = ring.header;
    // the 84-byte header (words 2, 0x11 and the high half of 0x10 are stale; a group's +0x28.. and every ring's owner fields are the owner's)
    mem.w32(h, 0);
    mem.w32(h + 4, n);
    mem.w32(h + 0xc, ring.packets[0]);
    mem.w32(h + 0x10, ring.packets[1]);
    mem.w32(h + 0x14, ring.links[0]);
    mem.w32(h + 0x18, ring.links[1]);
    mem.w32(h + 0x1c, (group ? GROUP_P4[options.spell ?? 'BlackShadow'][segment++] : -128) >>> 0);
    mem.w32(h + 0x20, 0);
    mem.w32(h + 0x24, 0);
    mem.w32(h + 0x38, 1);
    mem.w16(h + 0x3c, 0);
    mem.w16(h + 0x3e, 0);
    mem.w16(h + 0x40, 0);
    mem.w32(h + 0x48, 0x1000);
    mem.w32(h + 0x4c, 0x1000);
    mem.w32(h + 0x50, 0x1000);
    // (the owner's fields: the group's segments set +0x28..+0x34 from the latitude, a ring's setup sets them and +0x38)
    for (const off of [0x28, 0x2c, 0x30, 0x34]) mem.w32(h + off, 0, false);
    if (!group) mem.w32(h + 0x38, 0, false);
    for (let b = 0; b < 2; b++) {
      for (let k = 0; k < n; k++) {
        const pkt = ring.packets[b] + 0x24 * k;
        const rec = ring.links[b] + 0xc * k;
        mem.w8(rec + 3, 2);
        mem.w32(rec + 4, (0xe1000000 | ((abr & 3) << 5)) >>> 0);
        mem.w32(rec + 8, 0);
        mem.w8(pkt + 3, 8);
        mem.w8(pkt + 7, 0x38 | 2 | (flag ? 1 : 0));
        for (const o of [4, 0xc]) {
          mem.w8(pkt + o, rgb0);
          mem.w8(pkt + o + 1, rgb0);
          mem.w8(pkt + o + 2, rgb0);
        }
        for (const o of [0x14, 0x1c]) {
          mem.w8(pkt + o, rgb1);
          mem.w8(pkt + o + 1, rgb1);
          mem.w8(pkt + o + 2, rgb1);
        }
        if (!options.ticked) continue;
        // the active ring's per-tick writes: the ordering-table link of each packet and link record, the four projected points, and
        // (group rings) the colour of every vertex
        for (const i of [0, 1, 2]) {
          mem.w8(pkt + i, 0, false);
          mem.w8(rec + i, 0, false);
        }
        for (const o of [8, 0x10, 0x18, 0x20])
          for (let i = 0; i < 4; i++) mem.w8(pkt + o + i, 0, false);
        if (group)
          for (const o of [4, 0xc, 0x14, 0x1c])
            for (let i = 0; i < 3; i++) mem.w8(pkt + o + i, 0, false);
      }
    }
  }
  const written = [...mem.words.keys()];
  mem.commit();
  return written;
}

/**
 * The Siren Special's four rings (ASK 25: the builder FUN_80120a50 with the same parameters for all four: 24 segments, rgb0 (0x64, 0x90, 0), rgb1 black, abr 1;
 * a segment's colours do not depend on its index). After the Special: the packets' init words, the link records' w0 (their own packet's address: each draw
 * links the record to the packet, both buffers drawn), the header's words the owner set (position, the two radius points, rotation, a delay that is 0 by the end);
 * the packets' links and projected points (T) and the header's activity and scale words are not known.
 * @param {{ heap: import('./HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state
 * @param {readonly (number | null)[]} ptrs - the payload pointers of the Special's allocations (the 20-byte block first, then the rings' 84 / 864 / 288 / 864 / 288)
 * @param {{ bufferLast?: number }} [options] - `bufferLast`: the draw buffer of the rings' last tick (ASK 26: the last draw of ring k is the bulk's frame + 127 + 16 k, scale 0xfc1; the tick
 *   before it, the other buffer, scale 0xf81): with it the packets' projected points and the links to a record of the same ring are known too
 * @returns {number[]} the words it wrote
 */
export function applySirenRings(state, ptrs, options = {}) {
  const mem = new EngineMemory(state);
  const N = 24;
  for (let k = 0; k < 4; k++) {
    const [h, p0, l0, p1, l1] = ptrs.slice(1 + 5 * k, 6 + 5 * k);
    if ([h, p0, l0, p1, l1].some((x) => x === null || x === undefined)) continue;
    const [header, packets, links] = [h, [p0, p1], [l0, l1]].map((x) => x);
    const hd = /** @type {number} */ (header);
    mem.w32(hd + 4, N);
    // (the delay counts down to 0 while the ring is drawn)
    mem.w32(hd + 8, 0);
    mem.w32(hd + 0xc, /** @type {number} */ (p0));
    mem.w32(hd + 0x10, /** @type {number} */ (p1));
    mem.w32(hd + 0x14, /** @type {number} */ (l0));
    mem.w32(hd + 0x18, /** @type {number} */ (l1));
    [-0x80, -0x32, -0x28, 0xb4, -0x12c, 0x78, -0xc8].forEach((v, i) =>
      mem.w32(hd + 0x1c + 4 * i, v),
    );
    mem.w32(hd + 0x38, 1);
    mem.w16(hd + 0x3c, 0);
    mem.w16(hd + 0x3e, 0xfc00);
    mem.w16(hd + 0x40, 0);
    // (after its last draw a ring is inactive with the scale reset: ASK 26)
    mem.w32(hd, 0);
    for (const off of [0x48, 0x4c, 0x50]) mem.w32(hd + off, 0x1000);
    for (let b = 0; b < 2; b++) {
      const pk = /** @type {number[]} */ (packets)[b];
      const lk = /** @type {number[]} */ (links)[b];
      for (let s = 0; s < N; s++) {
        const pkt = pk + 36 * s;
        const rec = lk + 12 * s;
        mem.w8(pkt + 3, 8);
        for (const o of [0, 1, 2]) mem.w8(pkt + o, 0, false);
        mem.w8(pkt + 7, 0x3b);
        for (const o of [4, 0xc]) [0x64, 0x90, 0].forEach((v, i) => mem.w8(pkt + o + i, v));
        for (const o of [0x14, 0x1c]) [0, 0, 0].forEach((v, i) => mem.w8(pkt + o + i, v));
        for (const o of [8, 0x10, 0x18, 0x20])
          for (let i = 0; i < 4; i++) mem.w8(pkt + o + i, 0, false);
        mem.w8(rec + 3, 2);
        mem.w8(rec, pkt & 0xff);
        mem.w8(rec + 1, (pkt >> 8) & 0xff);
        mem.w8(rec + 2, (pkt >> 16) & 0xff);
        mem.w32(rec + 4, 0xe1000020);
        mem.w32(rec + 8, 0);
      }
    }
  }
  if (options.bufferLast !== undefined) {
    for (let k = 0; k < 4; k++) {
      const [h, p0, l0, p1, l1] = /** @type {number[]} */ (ptrs.slice(1 + 5 * k, 6 + 5 * k));
      if ([h, p0, l0, p1, l1].some((x) => x === null || x === undefined)) continue;
      for (const [scale, buffer] of [
        [0xfc1, options.bufferLast],
        [0xf81, 1 - options.bufferLast],
      ]) {
        const segs = ringTick({
          n: N,
          pos: [-0x80, -0x32, -0x28],
          inner: [0xb4, -0x12c],
          outer: [0x78, -0xc8],
          rot: [0, -0x400, 0],
          scale,
        });
        const pk = buffer === 0 ? p0 : p1;
        const lk = buffer === 0 ? l0 : l1;
        /** @type {Map<number, number>} */
        const heads = new Map();
        segs.forEach(({ xy, d }, s) => {
          const pkt = pk + 36 * s;
          xy.forEach(([x, y], j) => mem.w32(pkt + 8 + 8 * j, ((y & 0xffff) << 16) | (x & 0xffff)));
          const bucket = OT[buffer] + 4 * d;
          const prev = heads.get(bucket);
          // (the first packet of a bucket links to the empty marker or to another system's primitive: not known)
          if (prev !== undefined)
            for (let i = 0; i < 3; i++) mem.w8(pkt + i, (prev >> (8 * i)) & 0xff);
          heads.set(bucket, lk + 12 * s);
        });
      }
    }
  }
  const written = [...mem.words.keys()];
  mem.commit();
  return written;
}
