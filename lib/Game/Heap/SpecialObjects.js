/**
 * The Crystal Core Special's 110 wrapper objects (100 ring objects in 10 groups of 10, and 10 impact objects) at the effect's free:
 * every word of the 80-byte object, its 52-byte header and its two 40-byte packets that the code writes with a value that does not
 * depend on the roll values or the screen (Suikoden-Bizhawk-HUD notes/2026-11-10_vfx_special_objects.md and sobj_word_rules_v10.json, v1.0,
 * static; reproduced exactly in 20 of 20 slow-party seeds). Words that carry a roll value (x and y, the header's screen position, the
 * packets' projected xy words and ordering-table links) are returned as unknown; the never-written words are the arena's, from `pre`.
 */

/**
 * @typedef {Object} ObjectBlocks
 * @property {number} object - the 80-byte object's address
 * @property {number} header - its 52-byte resource header
 * @property {[number, number]} arrays - the two 40-byte packet arrays (draw buffer 0 and 1)
 */

/**
 * @typedef {Object} BlockWords
 * @property {number[]} words - the block's words (0 where unknown)
 * @property {number[]} unknown - the word indices that are not derived
 */

/**
 * The words of one wrapper object and its blocks at the free.
 * @param {{ kind: 'ring' | 'impact', group: number, position: number, blocks: ObjectBlocks, bulkIndex: number, pre: (address: number) => number }} input
 *   position: the ring slot 0 (the head) to 9; bulkIndex: the draw buffer index at the Special's bulk allocation (phi)
 * @returns {{ object: BlockWords, header: BlockWords, arrays: [BlockWords, BlockWords] }}
 */
export function wrapperObject({ kind, group, position, blocks, bulkIndex, pre }) {
  const impact = kind === 'impact';
  const half = (/** @type {number} */ address) =>
    (pre(address - (address % 4)) >>> (address % 4 === 2 ? 16 : 0)) & 0xffff;
  const u32 = (/** @type {number} */ v) => v >>> 0;
  const { object, header, arrays } = blocks;
  const objectWords = [
    0, // x: the group's last roll
    0, // y
    0,
    0,
    0,
    0,
    header,
    0,
    1,
    impact || position === 0 ? 0 : 2 * group,
    0,
    0,
    1,
    0x1000,
    0x1000,
    0x1000,
    0,
    0x7f7f0000,
    u32((pre(object + 0x48) & 0xffffff00) | 0x7f),
    0x10,
  ];
  const headerWords = [
    impact ? 0x0a030406 : 0x01000103,
    1,
    0, // the screen position of the last draw
    0x10000001,
    u32(0x1000 | (half(header + 0x12) << 16)),
    impact ? 0x1000 : 0x2000,
    0,
    u32(1 | (half(header + 0x1e) << 16)),
    impact ? 0x800adfd0 : 0x800ad98c,
    impact ? 0x800adb48 : 0x800ad820,
    arrays[0],
    arrays[1],
    impact ? 0x800ae158 : 0x800ada40,
  ];
  // the packet words 7 and 9 keep the arena's upper halves at the array the build wrote (draw buffer = bulkIndex), copied to the other
  const buildArray = arrays[bulkIndex];
  const stale7 = half(buildArray + 0x1e);
  const stale9 = half(buildArray + 0x26);
  // an impact's last sprite frame is written into the array drawn at the effect's end (the other one of the build's)
  const finalArray = (bulkIndex + 1) % 2;
  const packet = (/** @type {number} */ b) => {
    const last = b === finalArray;
    return [
      0x09000000, // + the link
      0x2e7f7f7f,
      0, // xy0
      impact ? (last ? 0x8a104080 : 0x68bb4080) : 0x66bb0020,
      0, // xy1
      impact ? (last ? 0x009c40bf : 0x003c40bf) : 0x003e0027,
      0, // xy2
      u32((stale7 << 16) | (impact ? 0x7f80 : 0x1720)),
      0, // xy3
      u32((stale9 << 16) | (impact ? 0x7fbf : 0x1727)),
    ];
  };
  return {
    object: { words: objectWords.map(u32), unknown: [0, 1] },
    header: { words: headerWords.map(u32), unknown: [2] },
    arrays: [
      { words: packet(0).map(u32), unknown: [0, 2, 4, 6, 8] },
      { words: packet(1).map(u32), unknown: [0, 2, 4, 6, 8] },
    ],
  };
}
