import { MAIN_EXE, BATTLE_BIN, CHARACTER_FILES, CRYSTAL_CORE_OVERLAY } from './EffectData.js';

/**
 * The battle's effect-script engine (the scripts that run a party Attack's hit, the items and the enemy basic attack), as the
 * game runs it: FUN_800e39e8 (start), FUN_800e3754 (the per-tick interpreter and motion), the op handlers of the table at 0x80170060, the
 * sprite resource builder FUN_800e2004 with its frame set / animation tick, the effect slot allocator FUN_800e6028 and the heap.
 * A port of Suikoden-Bizhawk-HUD/enemy_profiles/vfx_effects/effect_script_engine_v10.py (NTSC-U v1.0), which the RE agent verified against
 * recordings (party hit children of McDohl, Viktor, Flik, Luc, Hellion, Tengaar's arrow + hit, the lunge, the Crystal Core attack child).
 *
 * Not ported (as in the reference): the placement and draw words (a resource header's words 2-4, the packets' xy and link words), the
 * hard-coded handlers the op 35 hands over to (projectile 1, items), the sound ops, the camera ops' effect, op 40 (a status icon roll).
 * What the engine does not produce is left as it was in the arena and reported unknown by the caller.
 */

const M32 = 0xffffffff;
const s32 = (/** @type {number} */ v) => v | 0;
const s16 = (/** @type {number} */ v) => (v << 16) >> 16;
const s8 = (/** @type {number} */ v) => (v << 24) >> 24;
/** C signed division (truncates toward zero) */
const cdiv = (/** @type {number} */ a, /** @type {number} */ b) => {
  if (b === 0) throw new Error('script divides by zero (the game traps)');
  return Math.trunc(a / b);
};

/** @param {string} b64 */
const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// ------------------------------------------------------------------------------------------------------- static data

/** The game's files as the engine sees them: regions of address space, read only. */
export class Space {
  constructor() {
    /** @type {{ base: number, data: Uint8Array, view: DataView }[]} */
    this.regions = [];
  }

  /** @param {number} base @param {Uint8Array} data */
  add(base, data) {
    this.regions.push({
      base,
      data,
      view: new DataView(data.buffer, data.byteOffset, data.byteLength),
    });
  }

  /** @param {number} addr @param {number} n */
  #at(addr, n) {
    for (const r of this.regions)
      if (r.base <= addr && addr + n <= r.base + r.data.length) return [r, addr - r.base];
    throw new Error(`address ${addr.toString(16)} is not in the effect data`);
  }

  /** @param {number} a */
  u8(a) {
    const [r, o] = /** @type {[any, number]} */ (this.#at(a, 1));
    return r.data[o];
  }

  /** @param {number} a */
  u16(a) {
    const [r, o] = /** @type {[any, number]} */ (this.#at(a, 2));
    return r.view.getUint16(o, true);
  }

  /** @param {number} a */
  s16(a) {
    return s16(this.u16(a));
  }

  /** @param {number} a */
  u32(a) {
    const [r, o] = /** @type {[any, number]} */ (this.#at(a, 4));
    return r.view.getUint32(o, true);
  }
}

/**
 * A character's file with the file-relative pointers made absolute, as the game's loader does at `base` (header +0x20 / +0x24, the 12
 * script slots, the resource table's words +8..+0x14, the frame-list and entry arrays).
 * @param {string} code - the file's name (shu, vic, fri, luk, ten, hel, ...)
 * @param {number} base - where the game loaded it
 * @returns {{ data: Uint8Array, scriptTable: number, resourceTable: number, rosterId: number }}
 */
export function relocatedCharacter(code, base) {
  const file = CHARACTER_FILES[code];
  if (!file) throw new Error(`no character file ${code}`);
  const d = decode(file.bytes);
  const v = new DataView(d.buffer);
  const rel = (/** @type {number} */ o) => {
    const x = v.getUint32(o, true);
    if (x < 0x10000) v.setUint32(o, x + base, true);
    return v.getUint32(o, true) - base;
  };
  const tab = rel(0x20);
  const res = rel(0x24);
  for (let i = 0; i < 12; i++) {
    const x = v.getUint32(tab + 4 * i, true);
    if (x > 0 && x < 0x10000) v.setUint32(tab + 4 * i, x + base, true);
  }
  const nl = v.getUint16(res, true);
  const ne = v.getUint16(res + 2, true);
  for (const w of [0x8, 0xc, 0x10, 0x14]) rel(res + w);
  const fla = v.getUint32(res + 0x10, true) - base;
  const ea = v.getUint32(res + 0x14, true) - base;
  for (let i = 0; i < nl; i++) rel(fla + 4 * i);
  for (let i = 0; i < ne; i++) rel(ea + 4 * i);
  return { data: d, scriptTable: base + tab, resourceTable: base + res, rosterId: file.rosterId };
}

/**
 * The static space of a battle: main.exe's script tables, battle.bin's effect table (its runtime counters t6 / t7 at +6 / +7 of the table
 * at 0x800aab64 are loader state: inputs) and the party characters' files at their load addresses.
 * @param {{ code: string, base: number }[]} party - the party members' file codes and load addresses, in slot order
 * @param {{ t6?: number, t7?: number }} [counters]
 */
export function makeSpace(party, { t6 = 16, t7 = 7 } = {}) {
  const sp = new Space();
  sp.add(MAIN_EXE.base, decode(MAIN_EXE.bytes));
  const battle = decode(BATTLE_BIN.bytes);
  battle[0xab64 - 0xa000 + 6] = t6;
  battle[0xab64 - 0xa000 + 7] = t7;
  sp.add(BATTLE_BIN.base, battle);
  for (const r of CRYSTAL_CORE_OVERLAY) sp.add(r.base, decode(r.bytes));
  const info = party.map(({ code, base }) => {
    const c = relocatedCharacter(code, base);
    sp.add(base, c.data);
    return {
      base,
      scriptTable: c.scriptTable,
      resourceTable: c.resourceTable,
      rosterId: c.rosterId,
    };
  });
  return { sp, info };
}

// ------------------------------------------------------------------------------------------------------------ memory

/** A word the engine reads that the simulator does not know. */
export class UnknownInput extends Error {
  /** @param {number} addr */
  constructor(addr) {
    super(`the engine reads the unknown word at ${addr.toString(16)}`);
    this.addr = addr;
  }
}

/**
 * The arena as the engine reads and writes it, over the simulator's heap state: byte writes with the knowledge of each byte (a word keeps
 * the other bytes' earlier knowledge: a word the dump holds, a word known, an unknown word). The engine's reads need known bytes.
 * `commit` writes the words back into the heap state.
 */
export class EngineMemory {
  /** @param {{ heap: import('../HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state */
  constructor(state) {
    this.state = state;
    this.heap = state.heap;
    /** @type {Map<number, { value: number, mask: number }>} words the engine wrote: the value and the bytes known (bit k = byte k) */
    this.words = new Map();
    /** @type {[number, string, number, number, number][]} */
    this.events = [];
    this.tick = 0;
  }

  /** @param {number} word - the word's address */
  #word(word) {
    const w = this.words.get(word);
    if (w) return w;
    const { known, unknown, partial } = this.state;
    const k = known.get(word);
    if (k !== undefined) return { value: k >>> 0, mask: 0xf };
    const v = this.heap.u32(word);
    if (unknown.has(word)) return { value: v, mask: partial?.has(word) ? 0x7 : 0 };
    return { value: v, mask: 0xf };
  }

  /** @param {number} a */
  u8(a) {
    const w = this.#word((a & ~3) >>> 0);
    const k = a & 3;
    if (!(w.mask & (1 << k))) throw new UnknownInput(a);
    return (w.value >>> (8 * k)) & 0xff;
  }

  /** @param {number} a */
  u16(a) {
    return this.u8(a) | (this.u8(a + 1) << 8);
  }

  /** @param {number} a */
  s16(a) {
    return s16(this.u16(a));
  }

  /** @param {number} a */
  u32(a) {
    return (this.u16(a) | (this.u16(a + 2) << 16)) >>> 0;
  }

  /**
   * @param {number} a
   * @param {number} v
   * @param {boolean} [known] - false: the engine wrote the byte but its value is not known (placement-owned)
   */
  w8(a, v, known = true) {
    const word = (a & ~3) >>> 0;
    const w = this.#word(word);
    const k = a & 3;
    const value = ((w.value & ~(0xff << (8 * k))) | ((v & 0xff) << (8 * k))) >>> 0;
    this.words.set(word, { value, mask: known ? w.mask | (1 << k) : w.mask & ~(1 << k) });
  }

  /** @param {number} a @param {number} v @param {boolean} [known] */
  w16(a, v, known = true) {
    this.w8(a, v, known);
    this.w8(a + 1, v >> 8, known);
  }

  /** @param {number} a @param {number} v @param {boolean} [known] */
  w32(a, v, known = true) {
    this.w16(a, v, known);
    this.w16(a + 2, v >> 16, known);
  }

  /**
   * Changes some bits of a byte and keeps the byte's knowledge: a byte whose other bits are unknown stays unknown.
   * @param {number} a @param {number} mask - the bits to set from `bits` @param {number} bits
   */
  rmw8(a, mask, bits) {
    const w = this.#word((a & ~3) >>> 0);
    const k = a & 3;
    const old = (w.value >>> (8 * k)) & 0xff;
    this.w8(a, (old & ~mask) | (bits & mask), !!(w.mask & (1 << k)));
  }

  /** The byte at `src` goes to `dst`, with its knowledge. @param {number} dst @param {number} src */
  copy8(dst, src) {
    const w = this.#word((src & ~3) >>> 0);
    const k = src & 3;
    this.w8(dst, (w.value >>> (8 * k)) & 0xff, !!(w.mask & (1 << k)));
  }

  /**
   * heap_alloc: the block's words keep what they held (the knowledge too).
   * @param {number} n @param {number} ra
   */
  alloc(n, ra) {
    const p = this.heap.alloc(n);
    if (p === null) throw new Error('heap_alloc returns 0');
    this.events.push([this.tick, 'a', n, p, ra]);
    return p;
  }

  /** @param {number} ptr @param {number} ra */
  free(ptr, ra) {
    if (!ptr) return;
    this.events.push([this.tick, 'f', 0, ptr, ra]);
    this.heap.free(ptr);
  }

  /** Writes the words the engine wrote into the heap state: known when all four bytes are, partial when the low three are. */
  commit() {
    const { known, unknown, partial } = this.state;
    for (const [addr, { value, mask }] of this.words) {
      this.heap.over.set(addr, value);
      if (mask === 0xf) {
        known.set(addr, value);
        unknown.delete(addr);
        partial?.delete(addr);
      } else if ((mask & 0x7) === 0x7 && partial) {
        known.delete(addr);
        unknown.add(addr);
        partial.add(addr);
      } else {
        known.delete(addr);
        unknown.add(addr);
        partial?.delete(addr);
      }
    }
    this.words.clear();
  }
}

// -------------------------------------------------------------------------------------------------- sprite resources

/** the allocation return addresses of the sprite builder, free and shadow (observed in the recorded traces) */
const RA_BUILD = [0x800e2040, 0x800e2084, 0x800e2090];
const RA_FREE = [0x800e2d20, 0x800e2d2c, 0x800e2d34];
const RA_SHADOW_ALLOC = [0x800e7678, 0x800e76ac, 0x800e76f4];
const RA_SHADOW_FREE = [0x800e7928, 0x800e7934, 0x800e793c];

const getClut = (/** @type {number} */ x, /** @type {number} */ y) =>
  ((y << 6) | ((x >> 4) & 0x3f)) & 0xffff;
const getTpage = (
  /** @type {number} */ tp,
  /** @type {number} */ abr,
  /** @type {number} */ x,
  /** @type {number} */ y,
) =>
  (((tp & 3) << 7) |
    ((abr & 3) << 5) |
    ((y & 0x100) >> 4) |
    ((x & 0x3ff) >> 6) |
    ((y & 0x200) << 2)) &
  0xffff;

const ENGINE_FLAGS = 0x70007;

/** A sprite resource: the 52-byte header and its two packet arrays, fields written exactly like the game. */
class Res {
  /** @param {Engine} eng @param {number} addr */
  constructor(eng, addr) {
    this.e = eng;
    this.m = eng.mem;
    this.a = addr;
    /** the engine's flag bits; a resource that exists already (the battle struct's) has them in the arena */
    this.fl = 0;
  }

  /** @param {Engine} eng @param {number} addr @returns {Res} */
  static existing(eng, addr) {
    const r = new Res(eng, addr);
    r.fl = (eng.mem.u32(addr + 8) & ENGINE_FLAGS) >>> 0;
    return r;
  }

  get entry() {
    return this.m.u8(this.a);
  }
  set entry(v) {
    this.m.w8(this.a, v);
  }
  get nframes() {
    return this.m.u8(this.a + 1);
  }
  set nframes(v) {
    this.m.w8(this.a + 1, v);
  }
  get fidx() {
    return this.m.u8(this.a + 2);
  }
  set fidx(v) {
    this.m.w8(this.a + 2, v);
  }
  get counter() {
    return this.m.u8(this.a + 3);
  }
  set counter(v) {
    this.m.w8(this.a + 3, v);
  }
  get nspr() {
    return this.m.u32(this.a + 4);
  }
  set nspr(v) {
    this.m.w32(this.a + 4, v);
  }
  /**
   * The engine's bits of the header's flag word (0-2 loop / playing / semi-trans, 16-17 the copy countdown, 18 the palette flash). The
   * other bits (3-15 and 19-31) are the placement's screen position, which is not ported: the heap word keeps whatever it held (and its
   * knowledge); the engine works on its own bits.
   */
  get flags() {
    return this.fl;
  }
  set flags(v) {
    this.setFlagBits(ENGINE_FLAGS, v);
  }

  /** @param {number} mask @param {number} bits */
  setFlagBits(mask, bits) {
    this.fl = ((this.fl & ~mask) | (bits & mask)) >>> 0;
    for (let k = 0; k < 4; k++) {
      const part = (mask >>> (8 * k)) & 0xff;
      if (part) this.m.rmw8(this.a + 8 + k, part, (bits >>> (8 * k)) & 0xff);
    }
  }
  get depth() {
    return this.m.u16(this.a + 0xc);
  }
  set depth(v) {
    this.m.w16(this.a + 0xc, v);
  }
  get sx() {
    return this.m.u16(this.a + 0xe);
  }
  set sx(v) {
    this.m.w16(this.a + 0xe, v);
  }
  get sy() {
    return this.m.u16(this.a + 0x10);
  }
  set sy(v) {
    this.m.w16(this.a + 0x10, v);
  }
  get one() {
    return this.m.u32(this.a + 0x14);
  }
  set one(v) {
    this.m.w32(this.a + 0x14, v);
  }
  get anim() {
    return this.m.u32(this.a + 0x20);
  }
  set anim(v) {
    this.m.w32(this.a + 0x20, v);
  }
  get lst() {
    return this.m.u32(this.a + 0x24);
  }
  set lst(v) {
    this.m.w32(this.a + 0x24, v);
  }
  get pk0() {
    return this.m.u32(this.a + 0x28);
  }
  set pk0(v) {
    this.m.w32(this.a + 0x28, v);
  }
  get pk1() {
    return this.m.u32(this.a + 0x2c);
  }
  set pk1(v) {
    this.m.w32(this.a + 0x2c, v);
  }
  get table() {
    return this.m.u32(this.a + 0x30);
  }
  set table(v) {
    this.m.w32(this.a + 0x30, v);
  }

  /** @param {number} b */
  pk(b) {
    return b === 0 ? this.pk0 : this.pk1;
  }

  /** @param {number} k */
  entryPtr(k) {
    const sp = this.e.sp;
    return sp.u32(sp.u32(this.table + 0x14) + 4 * k);
  }

  /** @param {number} i */
  listPtr(i) {
    const sp = this.e.sp;
    return sp.u32(sp.u32(this.table + 0x10) + 4 * i);
  }

  /** FUN_800e220c @param {number} k */
  setframeEntry(k) {
    const sp = this.e.sp;
    const ep = this.entryPtr(k);
    this.entry = k;
    const b1 = sp.u8(ep + 1);
    this.nframes = sp.u8(ep);
    this.fidx = 0;
    this.counter = 0;
    this.setFlagBits(7, ((b1 >> 1) & 1) | ((b1 & 1) << 1) | (b1 & 4));
    this.setframeIdx();
  }

  /** FUN_800e22e4 (writes the current buffer) */
  setframeIdx() {
    const { sp, mem: h } = this.e;
    const buf = this.e.buf;
    const ep = this.entryPtr(this.entry);
    this.anim = ep + 4;
    const li = sp.u8(this.anim + 2 * this.fidx);
    this.counter = sp.u8(this.anim + 2 * this.fidx + 1);
    const lp = this.listPtr(li);
    this.lst = lp;
    const n = sp.u8(lp);
    this.setFlagBits(0x30000, 0x20000);
    const t6 = sp.u8(this.table + 6);
    const t7 = sp.u8(this.table + 7);
    for (let i = 0; i < n; i++) {
      const r = lp + 8 + 8 * i;
      const rb = Array.from({ length: 8 }, (_, j) => sp.u8(r + j)); // x y b2 b3 w h b6 b7
      const idx = (t6 + rb[2]) & 0xff;
      const k = Math.floor((idx % 20) / 5);
      const tp = getTpage(
        1,
        0,
        (Math.floor(idx / 20) * 5 + (idx % 5)) * 0x40 + 0x140,
        (k >> 1) << 8,
      );
      const cl = getClut(0x100, ((t7 + rb[6]) & 0xff) + 0x1e0);
      const u0 = ((rb[7] & 0x80 ? 0x80 : 0) + (rb[3] & 0xf) * 8) & 0xff;
      const v0 = (-0x80 * k + (rb[3] >> 4) * 8) & 0xff;
      const p = this.pk(buf) + 0x28 * i;
      h.w16(p + 0x16, tp);
      if (!(this.flags & 0x40000)) h.w16(p + 0xe, cl);
      const [w, hh] = [rb[4], rb[5]];
      if (!(rb[7] & 2)) {
        /** @type {Record<number, number>} */
        const c = !(rb[7] & 1)
          ? {
              0xc: u0,
              0xd: v0,
              0x15: v0,
              0x1c: u0,
              0x14: u0 + w,
              0x1d: v0 + hh,
              0x24: u0 + w,
              0x25: v0 + hh,
            }
          : {
              0x1c: u0,
              0x1d: v0,
              0x25: v0,
              0xc: u0,
              0x24: u0 + w,
              0xd: v0 + hh,
              0x14: u0 + w,
              0x15: v0 + hh,
            };
        for (const [o, v] of Object.entries(c)) h.w8(p + Number(o), v);
      } else {
        h.w8(p + 0x14, u0);
        h.w8(p + 0x15, v0);
        h.w8(p + 0xc, h.u8(p + 0x14) + w);
        h.w8(p + 0xd, h.u8(p + 0x15));
        h.w8(p + 0x24, h.u8(p + 0x14));
        h.w8(p + 0x25, h.u8(p + 0x15) + hh);
        h.w8(p + 0x1c, h.u8(p + 0xc));
        h.w8(p + 0x1d, h.u8(p + 0x25));
      }
    }
  }

  /** FUN_800e263c: the other buffer's packets are copied into the current one (the colour look-up word of a flashing sprite stays). */
  copyOtherToCurrent() {
    const h = this.m;
    const buf = this.e.buf;
    const m = this.e.sp.u8(this.lst);
    for (let i = 0; i < m; i++) {
      const cur = this.pk(buf) + 0x28 * i;
      const oth = this.pk(1 - buf) + 0x28 * i;
      const flash = this.flags & 0x40000;
      const clut = flash ? h.u16(cur + 0xe) : 0;
      for (let o = 0; o < 0x28; o++) h.copy8(cur + o, oth + o);
      if (flash) h.w16(cur + 0xe, clut);
    }
  }

  /**
   * The effect actor's placement (FUN_800e09ec) and draw (FUN_800e2734) as far as they are the engine's: the countdown of flag bits 16-17
   * and the copy of the other buffer's packets, the semi-transparent bit. What they compute from the screen position is not ported: the
   * header's flag word, depth and scales (the placement's words) and every packet's xy and link words are written unknown.
   * @param {boolean} effectActor - an effect slot: its depth counts down once per tick
   */
  placeAndDraw(effectActor) {
    const h = this.m;
    // the placement's words
    h.w32(this.a + 8, 0, false);
    h.w16(this.a + 0xc, 0, false);
    h.w16(this.a + 0xe, 0, false);
    h.w16(this.a + 0x10, 0, false);
    void effectActor;
    const f = this.fl;
    if (f & 0x30000) {
      const v = (((f >> 16) & 3) - 1) & 3;
      this.setFlagBits(0x30000, v << 16);
      if (v === 0) this.copyOtherToCurrent();
    }
    const lp = this.lst;
    const m = this.e.sp.u8(lp);
    for (let i = m - 1; i >= 0; i--) {
      const p = this.pk(this.e.buf) + 0x28 * i;
      for (const o of [8, 0x10, 0x18, 0x20]) h.w32(p + o, 0, false); // xy words
      h.w16(p + 0, 0, false); // the ordering table link (low 24 bits)
      h.w8(p + 2, 0, false);
      h.rmw8(p + 7, 2, this.fl & 4 ? 2 : 0);
    }
  }

  /** FUN_800e2c64 */
  animTick() {
    if (this.flags & 2) {
      const c = (this.counter - 1) & 0xff;
      this.counter = c;
      if (c === 0) {
        if (this.fidx + 1 < this.nframes) this.fidx = this.fidx + 1;
        else if (!(this.flags & 1)) this.setFlagBits(2, 0);
        else this.fidx = 0;
        this.setframeIdx();
      }
    }
  }
}

/**
 * FUN_800e2004: the sprite builder.
 * @param {Engine} eng @param {number} table @param {number} k
 */
function build(eng, table, k) {
  const { mem: h, sp } = eng;
  const ep = sp.u32(sp.u32(table + 0x14) + 4 * k);
  const n = sp.u8(ep + 2);
  const hdr = h.alloc(0x34, RA_BUILD[0]);
  const r = new Res(eng, hdr);
  r.table = table;
  r.nspr = n;
  r.pk0 = h.alloc(n * 0x28, RA_BUILD[1]);
  r.pk1 = h.alloc(n * 0x28, RA_BUILD[2]);
  r.sx = 0x1000;
  r.sy = 0x1000;
  r.one = 0x1000;
  for (const b of [0, 1])
    for (let i = 0; i < n; i++) {
      const p = r.pk(b) + 0x28 * i;
      h.w8(p + 3, 9);
      h.w8(p + 7, 0x2c);
      h.w8(p + 4, 0x80);
      h.w8(p + 5, 0x80);
      h.w8(p + 6, 0x80);
    }
  h.w16(hdr + 0x1c, 0);
  h.w16(hdr + 0x1a, 0);
  h.w16(hdr + 0x18, 0);
  r.setFlagBits(0x40000, 0);
  r.setframeEntry(k);
  r.setFlagBits(0x30000, 0);
  const m = sp.u8(r.lst);
  const b = eng.buf;
  for (let i = 0; i < m; i++) {
    const src = r.pk(b) + 0x28 * i;
    const dst = r.pk(1 - b) + 0x28 * i;
    for (let o = 0; o < 0x28; o++) h.copy8(dst + o, src + o);
  }
  return r;
}

/** FUN_800e2d04 @param {Engine} eng @param {Res} r */
function freeRes(eng, r) {
  const { pk0, pk1, a } = r;
  eng.mem.free(pk0, RA_FREE[0]);
  eng.mem.free(pk1, RA_FREE[1]);
  eng.mem.free(a, RA_FREE[2]);
}

/** FUN_800e7630: a shadow resource (24-byte header, two packet arrays); only its allocations and first byte are ported. */
class Shadow {
  /** @param {Engine} eng @param {Res} owner */
  constructor(eng, owner) {
    const { mem: h, sp } = eng;
    const ep = sp.u32(sp.u32(owner.table + 0x14) + 4 * owner.entry);
    const n = sp.u8(ep + 2);
    this.a = h.alloc(0x18, RA_SHADOW_ALLOC[0]);
    this.p0 = h.alloc(n * 0x28, RA_SHADOW_ALLOC[1]);
    h.w32(this.a + 0x10, this.p0);
    this.p1 = h.alloc(n * 0x28, RA_SHADOW_ALLOC[2]);
    h.w32(this.a + 0x14, this.p1);
    h.w8(this.a, 1);
    h.w8(this.a + 1, 1);
  }

  /** FUN_800e790c @param {Engine} eng */
  free(eng) {
    eng.mem.free(this.p0, RA_SHADOW_FREE[0]);
    eng.mem.free(this.p1, RA_SHADOW_FREE[1]);
    eng.mem.free(this.a, RA_SHADOW_FREE[2]);
  }
}

/** A shadow resource that exists in the arena already (actor +0x88): byte 0 of its header is the op 13 / 14 target. */
class ShadowRef {
  /** @param {number} a */
  constructor(a) {
    this.a = a;
  }

  free() {
    throw new Error('freeing an arena shadow is not ported');
  }
}

// ------------------------------------------------------------------------------------------------------------ actors

/** An effect actor record (0x8c bytes at battle + 0x50 + 0x8c * slot). */
class Actor {
  constructor() {
    this.active = 0;
    this.draw = 0;
    this.kind = 0;
    this.owner = 0;
    this.flags5 = 0;
    this.opidx = 0;
    this.table = 0;
    this.ptr = 0;
    this.cnt = 0;
    this.wait = 0;
    this.tgt = [0, 0, 0];
    this.acc = [0, 0, 0];
    this.vel = [0, 0, 0];
    this.sx38 = 0;
    this.sy3c = 0;
    this.flags40 = 0;
    this.state42 = 0;
    this.words44 = new Array(24).fill(0);
    /** @type {[string, number] | null} */
    this.handler54 = null;
    this.spawn = [0, 0, 0];
    this.pos = [0, 0, 0];
    this.v74 = 0;
    this.v76 = 0;
    this.a78 = 0;
    this.a79 = 0;
    /** @type {Res | null} */
    this.res = null;
    /** @type {Shadow | ShadowRef | null} */
    this.shadow = null;
  }
}

/** @typedef {(e: Engine, slot: number, mode: number) => number} OpHandler */

export class Engine {
  /**
   * @param {Space} sp
   * @param {EngineMemory} mem
   * @param {{ nparty?: number, nenemy?: number }} [counts]
   */
  constructor(sp, mem, { nparty = 6, nenemy = 1 } = {}) {
    this.sp = sp;
    this.mem = mem;
    this.A = Array.from({ length: 0x14 }, () => new Actor());
    this.nparty = nparty;
    this.lastEnemy = nparty + nenemy;
    this.buf = 0;
    this.tickNo = 0;
    /** @type {{ tick: number, op: number, args: number[] }[]} */
    this.cameraOps = [];
    /** @type {{ tick: number, sound: number }[]} */
    this.sounds = [];
    /** @type {{ afterInterp: (e: Engine, slot: number) => void }[]} */
    this.controllers = [];
    /** @type {{ tick: number, slot: number, handler: [string, number] }[]} */
    this.handlers = [];
    /** hard-coded handler stubs: Handler 1 of the default table (a straight projectile) sets state 1 on its first call (observed: 17 ticks) */
    this.handlerStubs = /** @type {Record<string, (e: Engine, slot: number) => void>} */ ({
      'default_table_0x80170114:1': (e, s) => {
        e.A[s].state42 = 1;
      },
    });
    /** the placement and draw of the effect actors (the reference's draw_enabled) */
    this.drawEnabled = true;
    this.battleActor = 0;
    this.eventFlags = /** @type {Record<number, number>} */ ({});
  }

  get heap() {
    return this.mem;
  }

  /** FUN_800e39e8: start a script on a slot. @param {number} slot @param {number} owner @param {number} script */
  start(slot, owner, script) {
    const a = this.A[slot];
    a.owner = owner;
    a.ptr = script;
    let op = this.sp.u16(script);
    while (opHandler(op)(this, slot, 0) !== 0) op = this.sp.u16(a.ptr);
    a.opidx = op;
  }

  /** FUN_800e3754: the per-tick interpreter and the motion. @param {number} slot */
  interp(slot) {
    const a = this.A[slot];
    if (a.opidx !== 0) {
      if (opHandler(a.opidx)(this, slot, 1) === -1) {
        let op;
        for (;;) {
          op = this.sp.u16(a.ptr);
          if (opHandler(op)(this, slot, 0) !== -1) break;
        }
        a.opidx = op;
      }
      const c = a.cnt;
      if (c > 0) {
        const ix = (s32(a.sx38) >> 12) - a.a78;
        const iy = (s32(a.sy3c) >> 12) - a.a79;
        a.pos = a.pos.map((p, i) => s32(p + a.vel[i]));
        a.vel = a.vel.map((v, i) => s32(v + a.acc[i]));
        a.cnt = s16(c - 1);
        a.a78 = s8(a.a78 + s8(cdiv(ix, c)));
        a.a79 = s8(a.a79 + s8(cdiv(iy, c)));
        if (c === 1) {
          a.pos = [...a.tgt];
          a.a78 = s8(s32(a.sx38) >> 12);
          a.a79 = s8(s32(a.sy3c) >> 12);
        }
      }
    }
    if (a.handler54) {
      this.handlers.push({ tick: this.tickNo, slot, handler: a.handler54 });
      const f = this.handlerStubs[`${a.handler54[0]}:${a.handler54[1]}`];
      if (f) f(this, slot);
    }
  }

  /** The battle struct inside the arena (observed in 16 dump pairs) */
  static BATTLE = 0x80196bd0;

  /** Fills the party and enemy actor records from the battle struct of the arena. */
  loadActorsFromArena() {
    const h = this.mem;
    for (let s = 1; s <= this.lastEnemy; s++) {
      const o = Engine.BATTLE + 0x50 + 0x8c * s;
      const a = this.A[s];
      a.active = h.u8(o + 3);
      a.draw = h.u8(o + 2);
      a.owner = h.u8(o + 4);
      a.flags5 = h.u8(o + 5);
      a.table = h.u32(o + 8);
      a.pos = [s32(h.u32(o + 0x68)), s32(h.u32(o + 0x6c)), s32(h.u32(o + 0x70))];
      a.spawn = [s32(h.u32(o + 0x5c)), s32(h.u32(o + 0x60)), s32(h.u32(o + 0x64))];
      a.v74 = s16(h.u16(o + 0x74));
      a.v76 = s16(h.u16(o + 0x76));
      const rp = h.u32(o + 0x84);
      a.res = rp ? Res.existing(this, rp) : null;
      const shadow = h.u32(o + 0x88);
      a.shadow = shadow ? new ShadowRef(shadow) : null;
      a.opidx = 0;
    }
  }

  /** FUN_800e6028: the highest free effect slot. */
  allocSlot() {
    for (let s = 0x13; s > 0; s--) {
      const a = this.A[s];
      if (a.active === 0) {
        a.active = 1;
        a.draw = 1;
        a.kind = 0;
        a.table = 0;
        a.ptr = 0;
        a.cnt = 0;
        a.wait = 0;
        a.sx38 = 0;
        a.sy3c = 0;
        a.handler54 = null;
        a.res = null;
        a.shadow = null;
        a.a78 = 0;
        a.a79 = 0;
        return s;
      }
    }
    return -1;
  }

  /**
   * One main-loop iteration (the loops of FUN_800e0b84): party slots, enemy slots, effect slots; each active slot gets its resource's
   * animation tick and its interpreter. The placement and the draw are not ported (the packets' xy and link words stay as they were).
   */
  tick() {
    this.tickNo++;
    this.mem.tick = this.tickNo;
    for (let s = 1; s < 0x14; s++) {
      const a = this.A[s];
      if (a.active === 0) continue;
      const res0 = a.res;
      if (res0) res0.animTick();
      this.interp(s);
      for (const c of this.controllers) c.afterInterp(this, s);
      // the draw of an effect actor (the party's and the enemies' own resources are the scene's: not run)
      if (this.drawEnabled && s > this.lastEnemy) {
        if (a.res && a.draw) a.res.placeAndDraw(true);
        else if (res0 && !a.res) this.mem.w16(res0.a + 0xc, 0, false); // the depth countdown on the freed header (use after free)
      }
    }
    this.buf ^= 1;
  }
}

// ------------------------------------------------------------------------------------------------------- op handlers

/** @param {Engine} e @param {Actor} a @param {number} w1 - the actor the op acts on: the owner when 1 */
const ref = (e, a, w1) => (w1 === 1 ? e.A[a.owner] : a);

/** @type {Record<number, OpHandler>} */
const OPS = {};

/** @param {number} op @returns {OpHandler} */
function opHandler(op) {
  return OPS[op] ?? (() => 0);
}

OPS[2] = (e, s, m) => {
  const a = e.A[s];
  if (m === 0) a.draw = 0;
  else if (m === 1) {
    a.active = 0;
    if (a.res) freeRes(e, a.res);
    a.res = null;
    if (a.shadow) {
      a.shadow.free(e);
      a.shadow = null;
    }
    a.handler54 = null;
    a.ptr += 2;
  }
  return 0;
};

OPS[3] = (e, s, m) => {
  const a = e.A[s];
  if (m === 0) {
    a.wait = e.sp.s16(a.ptr + 2);
    return 0;
  }
  if (m === 1) {
    a.wait = s16(a.wait - 1);
    if (a.wait <= 0) {
      a.ptr += 4;
      return -1;
    }
  }
  return 0;
};

OPS[4] = (e, s) => {
  const a = e.A[s];
  /** @type {Res} */ (a.res).setframeEntry(e.sp.s16(a.ptr + 2));
  a.ptr += 4;
  return -1;
};

OPS[5] = (e, s) => {
  const a = e.A[s];
  if (/** @type {Res} */ (a.res).flags & 2) return 0;
  a.ptr += 2;
  return -1;
};

OPS[6] = (e, s) => {
  const a = e.A[s];
  a.kind = e.sp.u16(a.ptr + 2) & 0xff;
  a.ptr += 4;
  return -1;
};

OPS[8] = (e, s) => {
  const a = e.A[s];
  a.draw = e.sp.s16(a.ptr + 2) !== 0 ? 1 : 0;
  a.ptr += 4;
  return -1;
};

OPS[9] = (e, s) => {
  const a = e.A[s];
  if (s === e.battleActor) e.eventFlags[e.sp.s16(a.ptr + 2)] = 1;
  a.ptr += 4;
  return -1;
};

OPS[13] = (e, s) => {
  const a = e.A[s];
  const sh = /** @type {Shadow | ShadowRef} */ (a.shadow);
  e.mem.w8(sh.a, e.mem.u8(sh.a) | (e.sp.u16(a.ptr + 2) & 0xff));
  a.ptr += 4;
  return -1;
};

OPS[14] = (e, s) => {
  const a = e.A[s];
  const sh = /** @type {Shadow | ShadowRef} */ (a.shadow);
  e.mem.w8(sh.a, e.mem.u8(sh.a) & ~(e.sp.u16(a.ptr + 2) & 0xff) & 0xff);
  a.ptr += 4;
  return -1;
};

OPS[15] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  r.flags5 = (r.flags5 | e.sp.u16(a.ptr + 4)) & 0xff;
  a.ptr += 6;
  return -1;
};

OPS[16] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  r.flags5 = r.flags5 & ~e.sp.u16(a.ptr + 4) & 0xff;
  a.ptr += 6;
  return -1;
};

OPS[26] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  r.flags40 = (r.flags40 | e.sp.u16(a.ptr + 4)) & 0xffff;
  a.ptr += 6;
  return -1;
};

OPS[27] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  r.flags40 = r.flags40 & ~e.sp.u16(a.ptr + 4) & 0xffff;
  a.ptr += 6;
  return -1;
};

OPS[28] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  if (e.sp.u16(a.ptr + 4) & r.flags40) {
    a.ptr += 6;
    return -1;
  }
  return 0;
};

OPS[29] = (e, s) => {
  const a = e.A[s];
  const r = ref(e, a, e.sp.s16(a.ptr + 2));
  if (!(e.sp.u16(a.ptr + 4) & r.flags40)) {
    a.ptr += 6;
    return -1;
  }
  return 0;
};

OPS[30] = (e, s, m) => {
  const a = e.A[s];
  if (m === 0) {
    a.state42 = e.sp.u16(a.ptr + 2);
    return 0;
  }
  if (m === 1) {
    a.ptr += 4;
    return -1;
  }
  return 0;
};

OPS[31] = (e, s) => {
  const a = e.A[s];
  if (a.state42 === e.sp.u16(a.ptr + 2)) {
    a.ptr += 4;
    return -1;
  }
  return 0;
};

OPS[21] = (e, s) => {
  const a = e.A[s];
  if (a.cnt < 1) {
    a.ptr += 2;
    return -1;
  }
  return 0;
};

OPS[22] = (e, s) => {
  const a = e.A[s];
  const n = e.sp.s16(a.ptr + 2);
  const d = [0, 1, 2].map((i) => cdiv(s32(a.spawn[i] - a.pos[i]), n));
  a.acc = [0, 0, 0];
  a.tgt = [...a.spawn];
  a.cnt = n;
  a.ptr += 4;
  a.vel = d;
  return -1;
};

OPS[23] = (e, s) => {
  const a = e.A[s];
  const p = a.ptr;
  const { sp } = e;
  const [mode, n] = [sp.s16(p + 2), sp.s16(p + 4)];
  const tz = sp.s16(p + 10) * 0x1000;
  const v = [sp.s16(p + 12) * 0x800, sp.s16(p + 14) * 0x800, sp.s16(p + 16) * 0x800];
  let rx;
  let ry;
  if (mode < 3) {
    const r = mode === 1 ? a : mode === 2 ? e.A[a.owner] : e.A[0];
    [rx, ry] = [r.pos[0], r.pos[1]];
  } else [rx, ry] = [a.spawn[0], a.spawn[1]];
  const tx = sp.s16(p + 6) * 0x1000 + rx;
  const ty = sp.s16(p + 8) * 0x1000 + ry;
  const S = n > 0 ? (n * (n - 1)) / 2 : 0;
  const ax = cdiv(s32(tx - a.pos[0] - v[0] * n), S);
  const ay = cdiv(s32(ty - a.pos[1] - v[1] * n), S);
  const az = cdiv(s32(tz - a.pos[2] - v[2] * n), S);
  a.cnt = n;
  a.vel = v;
  a.tgt = [s32(tx), s32(ty), s32(tz)];
  a.acc = [ax, ay, az];
  a.ptr += 0x12;
  return -1;
};

OPS[33] = (e, s) => {
  const a = e.A[s];
  const p = a.ptr;
  const { sp } = e;
  const [mode, n] = [sp.s16(p + 2), sp.s16(p + 4)];
  const w = [sp.s16(p + 6) * 0x1000, sp.s16(p + 8) * 0x1000, sp.s16(p + 10) * 0x1000];
  /** @type {number[]} */
  let base;
  if (mode === 1) base = [...a.pos];
  else if (mode === 0) base = [0, 0, 0];
  else if (mode === 2) base = [...e.A[a.owner].pos];
  else if (mode === 3) base = [...a.spawn];
  else throw new Error(`op 33 mode ${mode} reads uninitialised stack in the game`);
  a.cnt = n;
  if (n < 1) {
    a.cnt = 1;
    a.vel = [0, 0, 0];
    a.acc = [0, 0, 0];
    a.tgt = w.map((x, i) => s32(x + base[i]));
  } else {
    a.vel = w.map((x, i) => cdiv(s32(x + base[i] - a.pos[i]), n));
    a.acc = [0, 0, 0];
    a.tgt = w.map((x, i) => s32(x + base[i]));
  }
  a.ptr += 0xc;
  return -1;
};

OPS[25] = (e, s) => {
  const a = e.A[s];
  const p = a.ptr;
  const { sp } = e;
  const mode = sp.s16(p + 2);
  if (mode === 1) {
    a.a78 = s8(sp.u16(p + 4));
    a.a79 = s8(sp.u16(p + 6));
  } else if (mode === 0) {
    a.a78 = 0;
    a.a79 = 0;
  } else if (mode === 2) {
    const lp = /** @type {Res} */ (e.A[a.owner].res).lst;
    a.a78 = s8(sp.u8(lp + 6) - sp.u8(lp + 4));
    a.a79 = s8(sp.u8(lp + 7) - sp.u8(lp + 5));
  }
  a.sx38 = ((a.sx38 & 0xfff) | (a.a78 << 12)) >>> 0;
  a.sy3c = ((a.sy3c & 0xfff) | (a.a79 << 12)) >>> 0;
  a.ptr += 8;
  return -1;
};

OPS[37] = (e, s) => {
  const a = e.A[s];
  a.cnt = e.sp.s16(a.ptr + 2);
  a.ptr += 4;
  return -1;
};

OPS[43] = (e, s) => {
  const a = e.A[s];
  const p = a.ptr;
  const { sp } = e;
  const mode = sp.s16(p + 2);
  let x = sp.s16(p + 4);
  let y = sp.s16(p + 6);
  if (mode === 1) {
    x += a.v74;
    y += a.v76;
  } else if (mode === 2) {
    const o = e.A[a.owner];
    x += o.v74;
    y += o.v76;
  }
  a.sx38 = ((a.sx38 & 0xfff) | (x << 12)) >>> 0;
  a.sy3c = ((a.sy3c & 0xfff) | (y << 12)) >>> 0;
  a.ptr += 8;
  return -1;
};

OPS[35] = (e, s) => {
  const a = e.A[s];
  const [w1, w2] = [e.sp.s16(a.ptr + 2), e.sp.s16(a.ptr + 4)];
  a.handler54 = [
    w1 === 1 ? 'own_table' : w1 === 2 ? 'partner_table' : 'default_table_0x80170114',
    w2,
  ];
  a.ptr += 6;
  return -1;
};

OPS[36] = (e, s) => {
  const a = e.A[s];
  const idx = e.sp.s16(a.ptr + 2);
  e.start(s, a.owner, e.sp.u32(a.table + 4 * idx));
  return -1;
};

OPS[38] = (e, s) => {
  const a = e.A[s];
  const r = /** @type {Res} */ (a.res);
  r.setFlagBits(0x40000, 0x40000);
  for (let i = 0; i < r.nspr; i++) e.mem.w16(r.pk0 + 0x28 * i + 0xe, getClut(0x120, 0x1f0));
  a.ptr += 2;
  return -1;
};

OPS[39] = (e, s) => {
  const a = e.A[s];
  const r = /** @type {Res} */ (a.res);
  r.setFlagBits(0x40000, 0);
  const c = getClut(0x100, e.sp.u8(r.table + 7) + 0x1e0);
  for (let i = 0; i < r.nspr; i++) {
    e.mem.w16(r.pk0 + 0x28 * i + 0xe, c);
    e.mem.w16(r.pk1 + 0x28 * i + 0xe, c);
  }
  a.ptr += 2;
  return -1;
};

OPS[41] = (e, s) => {
  const a = e.A[s];
  const r = /** @type {Res} */ (a.res);
  const p = a.ptr;
  const c = [e.sp.u16(p + 2) & 0xff, e.sp.u16(p + 4) & 0xff, e.sp.u16(p + 6) & 0xff];
  for (let i = 0; i < r.nspr; i++)
    for (const base of [r.pk0, r.pk1])
      for (let j = 0; j < 3; j++) e.mem.w8(base + 0x28 * i + 4 + j, c[j]);
  a.ptr += 8;
  return -1;
};

OPS[42] = (e, s) => {
  const a = e.A[s];
  const n = e.sp.s16(a.ptr + 2);
  for (let i = 0; i < Math.max(n, 0); i++) a.words44[i] = e.sp.u16(a.ptr + 4 + 2 * i);
  a.ptr += n * 2 + 4;
  return -1;
};

/** the sound trigger: no heap, no rand in the chain */
OPS[34] = (e, s) => {
  const a = e.A[s];
  e.sounds.push({ tick: e.tickNo, sound: e.sp.u16(a.ptr + 2) });
  a.ptr += 4;
  return -1;
};

/** the camera ops: only their position in the script matters here @param {number} length @returns {OpHandler} */
const cameraOp = (length) => (e, s) => {
  const a = e.A[s];
  e.cameraOps.push({
    tick: e.tickNo,
    op: e.sp.u16(a.ptr),
    args: Array.from({ length: length / 2 - 1 }, (_, i) => e.sp.s16(a.ptr + 2 * (i + 1))),
  });
  a.ptr += length;
  return -1;
};
OPS[17] = cameraOp(10);
OPS[19] = cameraOp(10);
OPS[20] = cameraOp(12);

OPS[40] = () => {
  throw new Error('op 40 (a status icon roll) is not ported');
};

/** FUN_800e4e14: spawns an effect actor. */
OPS[24] = (e, s) => {
  const a = e.A[s];
  const p = a.ptr;
  const { sp } = e;
  const [flags, entry, sidx] = [sp.s16(p + 2), sp.s16(p + 4), sp.s16(p + 6)];
  const [ox, oy, oz] = [sp.s16(p + 8) << 12, sp.s16(p + 10) << 12, sp.s16(p + 12) << 12];
  const c = e.allocSlot();
  if (c < 0) return -1;
  let table;
  let stab;
  if (flags & 1) [table, stab] = [/** @type {Res} */ (a.res).table, a.table];
  else [table, stab] = [sp.u32(0x800aa000), 0x801707ac];
  const ch = e.A[c];
  ch.res = build(e, table, entry);
  ch.table = stab;
  ch.ptr = sp.u32(stab + 4 * sidx);
  ch.shadow = flags & 2 ? new Shadow(e, ch.res) : null;
  const t0 = flags & 4 ? a.owner : s;
  ch.pos = [s32(a.pos[0] + ox), s32(a.pos[1] + oy), s32(a.pos[2] + oz)];
  ch.spawn = [...ch.pos];
  if (flags & 8) ch.spawn = [...e.A[a.owner].pos];
  e.start(c, t0, ch.ptr);
  a.ptr += 0xe;
  return -1;
};

export { OPS, M32 };

/**
 * A party Attack's hit script run on the target (the attacker's slot-2 script, or the rune piece weapons' scripts in main.exe), until the
 * effect actors are gone (the reference's run_hit).
 * @param {EngineMemory} mem
 * @param {Space} sp
 * @param {{ scriptTable: number }[]} info - the party members' files, in slot order
 * @param {{ attacker: number, target: number, tick: number, nparty?: number, runePiece?: number, maxTicks?: number, draw?: boolean }} hit
 * @returns {Engine}
 */
export function runHit(
  mem,
  sp,
  info,
  { attacker, target, tick, nparty = 6, runePiece = 0, maxTicks = 80, draw = true },
) {
  const eng = new Engine(sp, mem, { nparty, nenemy: 1 });
  eng.drawEnabled = draw;
  eng.loadActorsFromArena();
  mem.tick = tick;
  eng.tickNo = tick;
  eng.buf = tick & 1; // the draw buffer index: an input
  const script =
    runePiece === 1
      ? 0x80170b10
      : runePiece === 4
        ? 0x80170bec
        : sp.u32(info[attacker - 1].scriptTable + 4 * 2);
  eng.start(target, attacker, script);
  for (let n = 0; n < maxTicks;) {
    eng.tick();
    n++;
    let done = true;
    for (let s = nparty + 2; s < 0x14; s++) if (eng.A[s].active !== 0) done = false;
    if (done && n > 3) break;
  }
  return eng;
}

/**
 * FUN_800f5b10 as far as the engine sees it: when bit 1 of the attacker's flags40 is set (op 26 [1, 2]), the attacker's handler applies the
 * damage and starts the hit script on the target, owned by the attacker; it runs right after the attacker's interpreter call of the tick.
 */
class AttackController {
  /** @param {number} attacker @param {number} target @param {number} script */
  constructor(attacker, target, script) {
    this.attacker = attacker;
    this.target = target;
    this.script = script;
    /** @type {number | null} */
    this.started = null;
  }

  /** @param {Engine} eng @param {number} slot */
  afterInterp(eng, slot) {
    const a = eng.A[this.attacker];
    if (slot === this.attacker && this.started === null && a.flags40 & 2) {
      a.flags40 |= 0x10;
      this.started = eng.tickNo;
      eng.start(this.target, this.attacker, this.script);
    }
  }
}

/**
 * A whole party Attack from the start of the attacker's slot-1 script (the walk and lunge), whose handler starts the slot-2 hit script on the
 * target (the reference's run_attack). The slot-1 start frame is the frame of the hit roll.
 * @param {EngineMemory} mem
 * @param {Space} sp
 * @param {{ scriptTable: number }[]} info - the party members' files, in slot order
 * @param {{ attacker: number, target: number, tick: number, buf?: number, nparty?: number, maxTicks?: number, draw?: boolean }} attack
 *   `tick`: the frame of the slot-1 start (the round's frames from the confirm); `buf`: the draw buffer index at that frame (default its parity)
 * @returns {{ engine: Engine, started: number | null }} started: the tick the hit script started on
 */
export function runAttack(
  mem,
  sp,
  info,
  { attacker, target, tick, buf = tick & 1, nparty = 6, maxTicks = 200, draw = true },
) {
  const eng = new Engine(sp, mem, { nparty, nenemy: 1 });
  eng.drawEnabled = draw;
  eng.loadActorsFromArena();
  mem.tick = tick;
  eng.tickNo = tick;
  eng.buf = buf;
  const script = sp.u32(info[attacker - 1].scriptTable + 4 * 2);
  const ctl = new AttackController(attacker, target, script);
  eng.controllers.push(ctl);
  eng.start(attacker, target, sp.u32(info[attacker - 1].scriptTable + 4));
  for (let n = 0; n < maxTicks;) {
    eng.tick();
    n++;
    if (ctl.started !== null && eng.tickNo > ctl.started + 5) {
      let done = true;
      for (let s = nparty + 2; s < 0x14; s++) if (eng.A[s].active !== 0) done = false;
      if (done) break;
    }
  }
  return { engine: eng, started: ctl.started };
}
