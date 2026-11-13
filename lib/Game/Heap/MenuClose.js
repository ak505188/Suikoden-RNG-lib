/**
 * The Fight menu closing over the 19 frames between the prompt and the round (Suikoden-Bizhawk-HUD notes/2026-11-09_vfx_simulator_status.md, ASK 29): what each
 * frame writes into the two 6000-byte packet blocks. Frame 0 is the prompt; frame f writes only the block of its draw index (the prompt's index + f, mod 2).
 *   f 3      window 2's cells (the first row up one pixel, the last row down one) and its nine FT4 prims (down 30) move
 *   f 4, 5   four LINE_F2 of window 2's closing rectangle at 24 K (K = the text cells of windows 0 and 1), n = f - 3
 *   f 6..17  four groups of LINE_F2 at 0, 64, 128, 192: windows 0, 1 closing (n = f - 5), window 2 (n = f - 3), the popup opening (n = 17 - f)
 *   f 19     the popup's eight SPRT at 0..191 and its border lines at 192..255
 * A rectangle shrinks to the window's centre in twelve steps: rect(n) = (centre n + window (12 - n)) / 12 per field, C-truncated.
 */

/** The ordering-table bucket each draw buffer's lines hang from */
const BUCKET = [0x801ba440, 0x801bac40];

/** The windows' rectangles (x, y, w, h); window 1's height is ten per living enemy */
const WINDOW = [
  [-150, 42, 136, 60],
  [30, -96, 120, 10],
  [-150, -96, 80, 40],
];

const POPUP = [-20, -18, 40, 36];

/** The popup's eight SPRT cells (x, y, clut + uv word), a 3 x 3 grid with the ninth blank */
const POPUP_CELLS = [
  [-12, -18, 0x7e3f18c0],
  [-4, -18, 0x7e3f18a0],
  [4, -18, 0x7e3fc888],
  [-12, -6, 0x7e3f2490],
  [-4, -6, 0x7e3f0cf0],
  [4, -6, 0x7e3f18e0],
  [-12, 6, 0x7e3f18b8],
  [-4, 6, 0x7e3f18c0],
];

/**
 * The words of window 2 that frame 3 moves, by offset from 24 K, with the y halfword before and after (a stream that went through frame 3 already holds the
 * "after": the move is the same then; any other y leaves the word unknown)
 * @type {[number, Record<number, number>][]}
 */
const FRAME_3 = [
  ...[0, 1, 2, 3, 4].map(
    (j) => /** @type {[number, Record<number, number>]} */ ([12 + 24 * j, { 0xff9f: 0xffa0 }]),
  ),
  ...[13, 14, 15, 16, 17, 18, 19, 20].map(
    (j) => /** @type {[number, Record<number, number>]} */ ([12 + 24 * j, { 0xffbe: 0xffbd }]),
  ),
  ...[516, 532, 536, 548, 552, 564, 568, 580, 584].map(
    (o) =>
      /** @type {[number, Record<number, number>]} */ ([
        o,
        { 0xff9e: 0xffbc, 0xff9d: 0xffbb, 0xffa9: 0xffc7 },
      ]),
  ),
];

/**
 * @param {number | undefined} old
 * @param {Record<number, number>} table - y before -> y after
 * @returns {number | undefined}
 */
function moved(old, table) {
  if (old === undefined) return undefined;
  const y = old >>> 16;
  if (table[y] !== undefined) return ((table[y] << 16) | (old & 0xffff)) >>> 0;
  return Object.values(table).includes(y) ? old : undefined;
}

/** @param {number[]} window @param {number[]} centre @param {number} n @returns {[number, number, number, number]} */
function rect(window, centre, n) {
  const field = (/** @type {number} */ i) =>
    Math.trunc((centre[i] * n + window[i] * (12 - n)) / 12);
  const x0 = field(0);
  const y0 = field(1);
  return [x0, y0, x0 + field(2), y0 + field(3)];
}

/** @param {number[]} w */
const centreOf = (w) => [w[0] + Math.trunc(w[2] / 2), w[1] + Math.trunc(w[3] / 2), 1, 1];

const point = (/** @type {number} */ x, /** @type {number} */ y) =>
  (((y & 0xffff) << 16) | (x & 0xffff)) >>> 0;

/**
 * The four LINE_F2 packets of a rectangle: tag (the link), 0x40808080, two points.
 * @param {[number, number, number, number]} r
 * @param {number} head - the address the first line links to
 * @param {number} at - the address of the first line
 * @returns {number[][]}
 */
function lines([x0, y0, x1, y1], head, at) {
  const points = [
    [x0, y0, x1, y0],
    [x1, y0, x1, y1],
    [x1, y1, x0, y1],
    [x0, y1, x0, y0],
  ];
  return points.map((p, i) => [
    (0x03000000 | ((i === 0 ? head : at + 16 * (i - 1)) & 0xffffff)) >>> 0,
    0x40808080,
    point(p[0], p[1]),
    point(p[2], p[3]),
  ]);
}

/**
 * The words the closing menu frames write, in order (a later frame's word replaces an earlier one's).
 * @param {object} o
 * @param {number[]} o.blocks - the two packet blocks' addresses
 * @param {(addr: number) => number | undefined} o.read - a block's word before the closing menu (undefined: not known)
 * @param {number} o.cells - the prompt's text cells
 * @param {number} o.enemies - the living enemies (window 1's height)
 * @param {number} o.promptIdx - the prompt's draw index
 * @param {number} [o.frames] - how many frames to draw (19: the round's start)
 * @returns {Map<number, number | undefined>}
 */
export function closeMenuFrames({ blocks, read, cells, enemies, promptIdx, frames = 19 }) {
  /** @type {Map<number, number | undefined>} */
  const out = new Map();
  const at = (/** @type {number} */ a) => (out.has(a) ? out.get(a) : read(a));
  const k24 = 24 * (cells - 21);
  const windows = [WINDOW[0], [30, -96, 120, 10 * enemies], WINDOW[2]];
  for (let f = 3; f <= Math.min(frames, 19); f++) {
    const buffer = (promptIdx + f) & 1;
    const base = blocks[buffer];
    const put = (/** @type {number} */ off, /** @type {number[][]} */ packets) =>
      packets.forEach((p, i) => p.forEach((w, j) => out.set(base + off + 16 * i + 4 * j, w)));
    if (f === 3) {
      for (const [o, table] of FRAME_3) out.set(base + k24 + o, moved(at(base + k24 + o), table));
    } else if (f <= 5) {
      const old = at(base + k24);
      // (the first line links to what the first cell of window 2 linked to)
      const head = old === undefined ? undefined : old & 0xffffff;
      const packets = lines(rect(windows[2], centreOf(windows[2]), f - 3), head ?? 0, base + k24);
      put(k24, packets);
      if (head === undefined) out.set(base + k24, undefined);
    } else if (f <= 17) {
      /** @type {[number[], number[], number][]} */
      const groups = [];
      const n01 = f - 5;
      if (n01 <= 12) groups.push([windows[0], centreOf(windows[0]), n01]);
      if (n01 <= 12) groups.push([windows[1], centreOf(windows[1]), n01]);
      if (f - 3 <= 12) groups.push([windows[2], centreOf(windows[2]), f - 3]);
      if (17 - f <= 11) groups.push([POPUP, [0, 0, 1, 1], 17 - f]);
      let head = BUCKET[buffer];
      groups.forEach(([w, c, n], g) => {
        put(64 * g, lines(rect(w, c, n), head, base + 64 * g));
        head = base + 64 * g + 48;
      });
    } else if (f === 19) {
      POPUP_CELLS.forEach(([x, y, uv], i) => {
        const link = i === 0 ? BUCKET[buffer] : base + 24 * (i - 1);
        const words = [
          (0x05000000 | (link & 0xffffff)) >>> 0,
          0xe100020f,
          0x64808080,
          point(x, y),
          uv >>> 0,
          0x000c0008,
        ];
        words.forEach((w, j) => out.set(base + 24 * i + 4 * j, w));
      });
      put(192, lines([-16, -15, 17, 15], base + 176, base + 192));
    }
  }
  return out;
}
