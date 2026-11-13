/**
 * The particle rings Black Shadow and Hell build in their setup frame, as far as the heap sees them. One function (FUN_80120a50,
 * fx_ring_builder) allocates and initialises every ring block: an 84-byte header, then for each of the two draw buffers n 36-byte
 * POLY_G4 packets and n 12-byte link records. The words it writes are exact; the rest of a block keeps what the previous occupant left
 * (the loader image where the block lies under the loader buffer), and the per-tick code rewrites the projected points, the
 * ordering-table links and (group rings) the colours once a ring is active (README 7e; the agent's ASK 14 answer, 3888 of 3888 words of
 * the 18 blocks that lie in the loader area).
 */
import { EngineMemory } from './Engine/EffectEngine.js';

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
