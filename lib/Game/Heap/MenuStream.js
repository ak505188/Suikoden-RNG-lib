/**
 * The Fight menu's window text and the 2D packet stream its draw writes every frame into the battle's two 6000-byte packet buffers
 * (Suikoden-Bizhawk-HUD notes/2026-11-10_vfx_menu_draw.md and mdraw_model_v10.json's reference generator, v1.0, static; 211296 of 211296
 * SPRT words, 1620 of 1620 TILE words and 5184 of 5184 line words equal in 162 prompt dumps). The stream starts at the block's first byte: per
 * window 0, 1 and 2, one 24-byte SPRT + DR_MODE packet per text cell, each linked to the previous head of the ordering-table bucket, with the
 * window's nine FT4 prims linked in after its text; then the cursor object's TILE and four LINE_F2 packets (20 + 4 x 16 bytes).
 */

/** The ordering-table buckets the 2D draw uses by draw buffer: [the SPRT / lines bucket, the TILE bucket] (OT + 4 and OT + 0) */
const BUCKET = [
  [0x801ba440, 0x801ba43c],
  [0x801bac40, 0x801bac3c],
];

/** The text window sizes and screen positions (the table at main.exe 0x8017022c, windows 0-2; window 1's height is the living enemies) */
const WINDOWS = [
  { x: -150, y: 42, w: 17, h: 6 },
  { x: 30, y: -96, w: 15, h: 1 },
  { x: -150, y: -96, w: 10, h: 4 },
];

/** The menu's glyph codes: a-z 0x11-0x2a, A-Z 0x2b-0x44, digits 0x45-0x4e, blank 0x10, '/' 0x68, the bar 0xf0 */
const GLYPH = (/** @type {string} */ ch) => {
  if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0) - 97 + 0x11;
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 65 + 0x2b;
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48 + 0x45;
  if (ch === ' ') return 0x10;
  return undefined;
};

/**
 * The inverse of `glyphs`: a name from glyph codes (blank cells end it); undefined for a code the table lacks.
 * @param {number[]} codes
 * @returns {string | undefined}
 */
export function glyphName(codes) {
  let out = '';
  for (const code of codes) {
    if (code === 0x10 || code === 0) out += ' ';
    else if (code >= 0x11 && code <= 0x2a) out += String.fromCharCode(97 + code - 0x11);
    else if (code >= 0x2b && code <= 0x44) out += String.fromCharCode(65 + code - 0x2b);
    else if (code >= 0x45 && code <= 0x4e) out += String.fromCharCode(48 + code - 0x45);
    else return undefined;
  }
  return out.trimEnd();
}

/**
 * A name as glyph codes; undefined for a character the table here does not hold.
 * @param {string} name
 * @returns {number[] | undefined}
 */
export function glyphs(name) {
  const out = [];
  for (const ch of name) {
    const g = GLYPH(ch);
    if (g === undefined) return undefined;
    out.push(g);
  }
  return out;
}

/** The fixed strings of the command window (main.exe 0x801702dc..) */
const FIGHT = glyphs('Fight');
const RUN = glyphs('Run');
const LET_GO = glyphs('Let go');
const BRIBE = glyphs('Bribe');
const FREE_WILL = glyphs('Free Will');

/** A text window: its cells (code per cell) and attribute bytes. */
class Window {
  /** @param {number} w @param {number} h */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.text = Array(w * h).fill(0x10);
    this.attr = Array(w * h).fill(0);
    this.cx = 0;
    this.cy = 0;
  }
  /** @param {number} x @param {number} y */
  at(x, y) {
    this.cx = Math.min(x, this.w - 1);
    this.cy = Math.min(y, this.h - 1);
  }
  /** @param {number} code */
  put(code) {
    if (code < 0x10) return;
    this.text[this.cy * this.w + this.cx] = code;
    this.cx = Math.min(this.cx + 1, this.w - 1);
  }
  /** @param {number[]} codes @param {number} [max] */
  string(codes, max = 0) {
    let n = max;
    for (const c of codes) {
      this.put(c);
      if (max && --n === 0) break;
    }
  }
  /** A number right-aligned in `width` cells, blanks to its left; 0 prints one '0' @param {number} v @param {number} width */
  number(v, width) {
    const digits = v === 0 ? [0] : [];
    for (let x = v; x > 0; x = Math.floor(x / 10)) digits.unshift(x % 10);
    const cells = Array(Math.max(0, width - digits.length))
      .fill(0x10)
      .concat(digits.map((d) => d + 0x45));
    this.string(cells.slice(-width));
  }
}

/**
 * The text of windows 0-2 at a prompt.
 * @param {{ party: { name: string, hp: number, maxHp: number }[], enemies: string[], canRun?: boolean }} input - the party in menu order
 *   (at most six), the living enemies' names
 * @returns {Window[] | undefined} undefined when a name has a character the glyph table lacks
 */
export function windowText({ party, enemies, canRun = true }) {
  const w0 = new Window(WINDOWS[0].w, WINDOWS[0].h);
  party.slice(0, 6).forEach((member, r) => {
    const name = glyphs(member.name);
    if (!name) return;
    w0.at(0, r);
    w0.string(name, 8);
    w0.at(9, r);
    w0.put(0xf0);
    w0.number(member.hp, 3);
    w0.put(0x68);
    w0.number(member.maxHp, 3);
  });
  if (party.slice(0, 6).some((m) => !glyphs(m.name))) return undefined;
  const w1 = new Window(WINDOWS[1].w, enemies.length);
  for (let r = 0; r < enemies.length; r++) {
    const name = glyphs(enemies[r]);
    if (!name) return undefined;
    w1.at(0, r);
    w1.string(name);
  }
  const w2 = new Window(WINDOWS[2].w, WINDOWS[2].h);
  [FIGHT, canRun ? RUN : LET_GO, BRIBE, FREE_WILL].forEach((s, r) => {
    w2.at(0, r);
    w2.string(/** @type {number[]} */ (s));
  });
  // the cursor row (the Fight command) is the selected one: its attribute's high nibble is set
  for (let i = 0; i < 10; i++) w2.attr[i] |= 0x10;
  return [w0, w1, w2];
}

/** @param {number} code the glyph's texture coordinates [u, v] */
function glyphUv(code) {
  const g = (code - 0x11) & 0xffff;
  if (g < 0xdf) {
    const cc = g < 0x3e ? code + 9 : code + 0x23;
    return [((cc & 0xf) << 3) | 0x80, ((cc >> 4) * 12 - 0x80) & 0xff];
  }
  return [(((code + 0xff10) & 0xffff) * 8 + 0x20) & 0xff, 0x18];
}

/** The text colours by attribute nibble (r, g, b) */
const RGB = [
  [0x80, 0x80, 0x80],
  [0x30, 0x70, 0x80],
  [0x40, 0x40, 0x40],
  [0x24, 0x54, 0x60],
  [0x20, 0x20, 0x20],
  [0x80, 0x80, 0x20],
  [0, 0x80, 0],
  [0x80, 0, 0],
  [0, 0xff, 0x20],
  [0x80, 0x0a, 0x0a],
];

/**
 * The stream the menu draws into one packet buffer at a prompt: the words by address.
 * @param {{ windows: Window[], buffer: number, block: number, prims: (window: number) => number }} input
 *   buffer: the draw buffer (0 or 1) of the block; block: the 6000-byte block's address; prims(k): the address of window k's nine FT4 prims
 *   in that buffer (the 360-byte array of the draw buffer)
 * @returns {Map<number, number>}
 */
export function menuStream({ windows, buffer, block, prims }) {
  /** @type {Map<number, number>} */
  const words = new Map();
  let head = BUCKET[buffer][0];
  let at = block;
  const s16 = (/** @type {number} */ v) => v & 0xffff;
  windows.forEach((win, k) => {
    const { x: x0, y: y0 } = WINDOWS[k];
    for (let r = 0; r < win.h; r++)
      for (let c = 0; c < win.w; c++) {
        const code = win.text[r * win.w + c];
        if (code <= 0x10) continue;
        const attr = win.attr[r * win.w + c];
        const [u, v] = glyphUv(code);
        const x = x0 + c * 8;
        const y = y0 + r * 10 - (attr & 0xf0 ? 1 : 0);
        const [cr, cg, cb] = RGB[attr & 0xf] ?? RGB[0];
        const packet = [
          0x05000000 | (head & 0xffffff),
          0xe100020f,
          0x64000000 | (cb << 16) | (cg << 8) | cr,
          (s16(y) << 16) | s16(x),
          0x7e3f0000 | (v << 8) | u,
          (10 << 16) | 8,
        ];
        packet.forEach((w, i) => words.set(at + 4 * i, w >>> 0));
        head = at;
        at += 24;
      }
    // the window's nine FT4 prims are linked in after its text, prim 0 first (the head becomes prim 8)
    for (let i = 0; i < 9; i++) head = prims(k) + 0x28 * i;
  });
  // the cursor object (row 0): a TILE in its own bucket and four LINE_F2 packets chained after it
  const [x, y, w, h] = [-150, -98, 80, 10];
  let head2 = BUCKET[buffer][1];
  [
    0x04000000 | (head2 & 0xffffff),
    0xe1000220,
    0x62403020,
    (s16(y) << 16) | s16(x),
    (h << 16) | w,
  ].forEach((v, i) => words.set(at + 4 * i, v >>> 0));
  head2 = at;
  at += 20;
  const line = (
    /** @type {number} */ colour,
    /** @type {number[]} */ p0,
    /** @type {number[]} */ p1,
  ) => [
    0x03000000,
    0x40000000 | colour,
    (s16(p0[1]) << 16) | s16(p0[0]),
    (s16(p1[1]) << 16) | s16(p1[0]),
  ];
  for (const l of [
    line(0xffffff, [x - 1, y - 1], [x + w + 1, y - 1]),
    line(0xffffff, [x - 1, y + h + 1], [x - 1, y - 1]),
    line(0x202020, [x + w + 1, y + h + 1], [x - 1, y + h + 1]),
    line(0x202020, [x + w + 1, y - 1], [x + w + 1, y + h + 1]),
  ]) {
    l[0] = ((l[0] & 0xff000000) | (head2 & 0xffffff)) >>> 0;
    head2 = at;
    l.forEach((v, i) => words.set(at + 4 * i, v >>> 0));
    at += 16;
  }
  return words;
}
