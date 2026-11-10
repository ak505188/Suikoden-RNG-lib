/**
 * The launch phase of Crystal Core's Attack hit effect, derived from the game's code instead of the recorded tables
 * (Suikoden-Bizhawk-HUD notes/2026-11-09_vfx_phase1_port_spec.md and ..._vfx_projection_fit_answers.md, v1.0 disc): the camera matrix, the
 * GTE projection and the controller's two 30-tick legs give each of the 12 sprite resources' screen position (header word 2) per tick.
 * Not here yet: the packet words (stale words 7 and 9 come from the arena), the child effect, the free order, the timeline to the first launch.
 */
import {
  CAMERA_PRESETS,
  GTE_COS,
  HIT_POINTS,
  GTE_SIN,
  MEMBER_POSITIONS,
  SIN_QUARTER,
} from './HitEffectTables.js';
import {
  OT_BASE as SPRITE_OT_BASE,
  SPRITE_LISTS,
  decodeSprite,
  effectTable,
} from './SpriteRecord.js';

/** The crystal's combatant position (x, y, z records) in the Crystal Core fight: (-0x80, 0, 0) << 12 */
export const CRYSTAL_POSITION = [-0x80000, 0, 0];
/** Shard radius and per-tick phase step of the Attack's launch (DAT_80070474 / DAT_8007047c after the wind-up) */
const RADIUS = 0x32;
const STEP = 0x90;
/** The shard placement pieces of the two objects (DAT_8006b1a4[0..1]) */
export const PIECES = [5, 1];

/** @param {number} a @param {number} b C division (truncates toward zero) */
const cdiv = (a, b) => Math.trunc(a / b);
const s16 = (/** @type {number} */ x) => (x << 16) >> 16;
/** @param {number} x @param {number} bits arithmetic shift for values beyond 32 bits */
const sar = (x, bits) => Math.floor(x / 2 ** bits);

/** PsyQ rsin / rcos */
const rsin = (/** @type {number} */ a) => (a < 0 ? -GTE_SIN[-a & 0xfff] : GTE_SIN[a & 0xfff]);
const rcos = (/** @type {number} */ a) => GTE_COS[Math.abs(a) & 0xfff];

/**
 * FUN_80153674 (RotMatrix) followed by FUN_8014ffcc (ScaleMatrix, columns); entries are s16
 * @param {number[]} rot @param {number[]} scale
 * @returns {number[][]}
 */
export function cameraMatrix(rot, scale) {
  const [sa, ca] = [rsin(rot[0]), rcos(rot[0])];
  const [sb, cb] = [rsin(rot[1]), rcos(rot[1])];
  const [sc, cc] = [rsin(rot[2]), rcos(rot[2])];
  const t = (cc * -sb) >> 12;
  const u = (sc * -sb) >> 12;
  const m = [
    [(cc * cb) >> 12, -((sc * cb) >> 12), sb],
    [
      ((sc * ca) >> 12) - ((t * sa) >> 12),
      ((cc * ca) >> 12) + ((u * sa) >> 12),
      -((cb * sa) >> 12),
    ],
    [((sc * sa) >> 12) + ((t * ca) >> 12), ((cc * sa) >> 12) - ((u * ca) >> 12), (cb * ca) >> 12],
  ];
  return m.map((row) => row.map((v, c) => s16((v * scale[c]) >> 12)));
}

// the GTE's unsigned Newton division (psx-spx): UNR table, H / SZ3 saturated at 0x1ffff
const UNR = Array.from({ length: 0x101 }, (_, i) =>
  Math.max(0, ((0x40000 / (i + 0x100) + 1) >> 1) - 0x101),
);
/** @param {number} h @param {number} sz */
function divide(h, sz) {
  if (h >= sz * 2) return 0x1ffff;
  const z = 16 - (32 - Math.clz32(sz));
  const n = h * 2 ** z;
  let d = sz * 2 ** z;
  const u = UNR[(d - 0x7fc0) >> 7] + 0x101;
  d = (0x2000080 - d * u) >> 8;
  d = (0x0000080 + d * u) >> 8;
  return Math.min(0x1ffff, sar(n * d + 0x8000, 16));
}

/**
 * RTPS with H = 0x400 and zero offsets (the game function runs before the per-swap offsets)
 * @param {number[][]} m @param {number[]} t @param {number[]} v
 * @returns {[number, number]}
 */
export function rtps(m, t, v) {
  const mac = [0, 1, 2].map(
    (i) => (t[i] * 0x1000 + m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]) >> 12,
  );
  const ir = mac.map((x) => Math.max(-0x8000, Math.min(0x7fff, x)));
  const sz = Math.max(0, Math.min(0xffff, mac[2]));
  const q = sz ? divide(0x400, sz) : 0x1ffff;
  return [sar(ir[0] * q, 16), sar(ir[1] * q, 16)];
}

/** the camera's camera-space depth (SZ3 before the division) of a world point, for the ordering table bucket */
export function depthOf(
  /** @type {number[][]} */ m,
  /** @type {number[]} */ t,
  /** @type {number[]} */ v,
) {
  return Math.max(
    0,
    Math.min(0xffff, (t[2] * 0x1000 + m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]) >> 12),
  );
}

/**
 * A settled camera (the class preset, reached 30 ticks after the round start) as a projection of a world point to the header's
 * screen position: rel(p) + rel(0) - rel(look)
 * @param {number} camera - class, first rand of the round % 3
 * @returns {(v: number[]) => [number, number]}
 */
export function projector(camera) {
  const w = CAMERA_PRESETS[camera].map((x) => x >> 12);
  const m = cameraMatrix(w.slice(3, 6), w.slice(9, 12));
  const t = w.slice(6, 9);
  const [x0, y0] = rtps(m, t, [0, 0, 0]);
  const [xl, yl] = rtps(m, t, w.slice(0, 3));
  return (v) => {
    const [x, y] = rtps(m, t, v);
    return [x + x0 - xl, y + y0 - yl];
  };
}

/** Attack sine / cosine (quarter table, 4096 = one turn) */
const SIN = (/** @type {number} */ a) => {
  const u = a & 0xfff;
  return u < 0x400
    ? SIN_QUARTER[u]
    : u < 0x800
      ? SIN_QUARTER[0x7ff - u]
      : u < 0xc00
        ? -SIN_QUARTER[u - 0x800]
        : -SIN_QUARTER[0xfff - u];
};
const COS = (/** @type {number} */ a) => {
  const u = a & 0xfff;
  return u < 0x400
    ? SIN_QUARTER[0x3ff - u]
    : u < 0x800
      ? -SIN_QUARTER[u - 0x400]
      : u < 0xc00
        ? -SIN_QUARTER[0xbff - u]
        : SIN_QUARTER[u - 0xc00];
};

/** The shard placement i at a phase (FUN_80018280's loop) @param {number} i @param {number} phase */
function placement(i, phase) {
  let a = cdiv(i * 0x1000, 6) + phase;
  a -= (a >> 12) * 0x1000;
  return [
    COS(a) * RADIUS + CRYSTAL_POSITION[0],
    SIN(a) * RADIUS + CRYSTAL_POSITION[1],
    CRYSTAL_POSITION[2] - 0x24000,
  ];
}

/**
 * The 6 resources of both objects per tick from the launch (tick 0 = state 0): the world position (>> 12) of each resource
 * @param {number} slot - target party slot 1..6
 * @param {number} ticks
 * @returns {number[][][][]} [tick][object][resource] = [x, y, z]
 */
export function launchPositions(slot, ticks) {
  const [mx, my, mz] = MEMBER_POSITIONS[slot];
  const member = [(mx + 0x80) * 0x1000, my * 0x1000, mz * 0x1000];
  const target = [member[0] - 0x5000, member[1], member[2] - 0x14000];
  const objects = PIECES.map((piece) => {
    const start = placement(piece, STEP);
    return {
      piece,
      start,
      pos: [...start],
      vel: [0, 0, 0],
      acc: target.map((x, k) => cdiv(x - start[k], 435)),
    };
  });
  /** @type {number[][][][]} */
  const out = [];
  for (let t = 0; t < ticks; t++) {
    if (t === 60)
      for (const o of objects) {
        // state 4: the way back to the placement of the piece at that tick's phase
        const back = placement(o.piece, (STEP * (t + 1)) & 0xfff);
        o.vel = [0, 0, 0];
        o.acc = back.map((x, k) => cdiv(x - o.pos[k], 435));
      }
    const row = [];
    for (const o of objects) {
      if (t === 30 || t === 90) {
        o.vel = [0, 0, 0];
        o.acc = [0, 0, 0];
      }
      o.pos = o.pos.map((x, k) => x + o.vel[k]);
      o.vel = o.vel.map((x, k) => x + o.acc[k]);
      if (t === 29 || t === 89) {
        o.vel = [0, 0, 0];
        o.acc = [0, 0, 0];
      }
      // pos[5] stays at the piece start; pos[1..4] trail between it and pos[0]
      const res = [o.pos];
      for (let j = 1; j < 5; j++)
        res.push(o.pos.map((x, k) => o.start[k] + j * cdiv(x - o.start[k], 5)));
      res.push(o.start);
      row.push(res);
    }
    out.push(row);
  }
  return out;
}

/**
 * The two sprite lists of the launch resources: entry 0xe (the first of an object) and 0xd (the other five), decoded from their records
 * @param {number} members - the party size (the counters of the effect table)
 */
const entries = (members) =>
  [0xe, 0xd].map((id) => ({
    origin: SPRITE_LISTS[id].origin,
    sprite: decodeSprite(SPRITE_LISTS[id].record, effectTable('crystalCore', members)),
  }));
const OT_BASE = SPRITE_OT_BASE & 0xffffff;

/**
 * The words of the 24 GPU packets of the 12 launch resources after the last draw (tick `last`, the effect's tick 89), as 8-digit
 * hex per word, in allocation order (resource 0 buffer 0, buffer 1, resource 1 ...). Words 7 and 9 are only their low 4 digits: the
 * upper halves (padding of the POLY_FT4, never written by the effect) are the arena's stale words at the block of the buffer that was
 * written at the build (see `padding`).
 * @param {{ camera: number, slot: number, newest: number, addresses: number[], last?: number, members?: number }} input
 *   newest: the draw buffer written at the last tick; addresses: the 24 packet addresses in allocation order
 * @returns {string[][]}
 */
export function hitPackets({ camera, slot, newest, addresses, last = 89, members = 6 }) {
  const ENTRY = entries(members);
  const w = CAMERA_PRESETS[camera].map((x) => x >> 12);
  const m = cameraMatrix(w.slice(3, 6), w.slice(9, 12));
  const t = w.slice(6, 9);
  const project = projector(camera);
  const scale = cdiv(w[9] << 10, t[2]);
  const positions = launchPositions(slot, last + 1);
  const hex = (/** @type {number} */ x) => (x >>> 0).toString(16).padStart(8, '0');
  const hex4 = (/** @type {number} */ x) => x.toString(16).padStart(4, '0');
  const xy = (/** @type {number} */ x, /** @type {number} */ y) =>
    ((y & 0xffff) << 16) | (x & 0xffff);
  /** @type {string[][]} */
  const out = Array.from({ length: 24 }, () => []);
  // buffer b was last drawn at tick last (newest) or last - 1; the draws of one tick link into that buffer's ordering table
  for (const [buffer, tick] of [
    [newest, last],
    [1 - newest, last - 1],
  ]) {
    /** @type {Map<number, number>} bucket -> address of the last packet drawn into it this tick */
    const head = new Map();
    for (let r = 0; r < 12; r++) {
      const world = positions[tick][Math.floor(r / 6)][r % 6].map((x) => Math.floor(x / 4096));
      const [sx, sy] = project(world);
      const bucket = Math.max(5, Math.min(0x17b, depthOf(m, t, world) >> 2));
      const address = addresses[r * 2 + buffer];
      const link = head.get(bucket) ?? OT_BASE + 0x800 * buffer + 4 * bucket;
      head.set(bucket, address);
      const { origin, sprite } = ENTRY[r % 6 === 0 ? 0 : 1];
      const { u, v, tpage, clut, width: SIZE } = sprite;
      const off = (/** @type {number} */ o) => {
        const v = (0 - o) * scale;
        return (v < 0 ? v + 0xfff : v) >> 12;
      };
      const x0 = sx + off(origin[0]);
      const y0 = sy + off(origin[1]);
      const d = (SIZE * scale + 0) >> 12;
      out[r * 2 + buffer] = [
        hex(0x09000000 | (link & 0xffffff)),
        '2c808080',
        hex(xy(x0, y0)),
        hex((clut << 16) | (v << 8) | u),
        hex(xy(x0 + d, y0)),
        hex((tpage << 16) | (v << 8) | (u + SIZE)),
        hex(xy(x0, y0 + d)),
        hex4(((v + SIZE) << 8) | u),
        hex(xy(x0 + d, y0 + d)),
        hex4(((v + SIZE) << 8) | (u + SIZE)),
      ];
    }
  }
  return out;
}

/**
 * The words of the 12 launch resources' 52-byte headers after the last draw, as 8-digit hex per word; `half(address)` gives the halfword
 * the header's three never-written halves (+0xc, +0x12, +0x1e) hold, or undefined if unknown (that word is then listed as varying).
 * Header layout (U1/U4 of the RE notes): +0 the frame, +2 flags, +4 the sprite count, +8 the screen position (x << 3 | y << 19 | flags & 7),
 * +0xc depth word (stale), +0xe / +0x10 scale x / y, +0x12 (stale), +0x14 scale z, +0x18 / +0x1a / +0x1c rotation, +0x1e (stale), +0x20 the
 * entry's animation pointer, +0x24 its sprite list, +0x28 / +0x2c the two packet buffers, +0x30 the effect table.
 * @param {{ camera: number, slot: number, headers: number[], packets: number[][], half: (address: number) => number | undefined, last?: number }} input
 * @returns {{ hex: string, varying: number[] }[]}
 */
export function hitHeaders({ camera, slot, headers, packets, half, last = 89 }) {
  const w = CAMERA_PRESETS[camera].map((x) => x >> 12);
  const scale = cdiv(w[9] << 10, w[8]);
  const project = projector(camera);
  const positions = launchPositions(slot, last + 1);
  const h4 = (/** @type {number} */ x) => x.toString(16).padStart(4, '0');
  const hex = (/** @type {number} */ x) => (x >>> 0).toString(16).padStart(8, '0');
  return headers.map((address, r) => {
    const [sx, sy] = project(
      positions[last][Math.floor(r / 6)][r % 6].map((x) => Math.floor(x / 4096)),
    );
    const first = r % 6 === 0;
    const stale = [0xc, 0x12, 0x1e].map((o) => half(address + o));
    /** @type {number[]} */
    const varying = [];
    if (stale[0] === undefined) varying.push(3);
    if (stale[1] === undefined) varying.push(4);
    if (stale[2] === undefined) varying.push(7);
    const [s0, s1, s2] = stale.map((x) => x ?? 0);
    const words = [
      hex(0x01000100 | (first ? 0x0e : 0x0d)),
      hex(1),
      hex((((sy & 0x1fff) << 19) | ((sx & 0x1fff) << 3) | 2) >>> 0),
      hex((scale << 16) | s0),
      hex((s1 << 16) | scale),
      hex(0x1000),
      hex(0),
      hex(s2 << 16),
      hex(first ? 0x8006b438 : 0x8006b430),
      hex(first ? 0x8006b2fc : 0x8006b2ec),
      hex(packets[r][0]),
      hex(packets[r][1]),
      hex(0x8006b4c0),
    ];
    void h4;
    return { hex: words.join(''), varying };
  });
}

// ---- the child effect: the hit spark the target member's hit-reaction script spawns (op 24) at tick S = launch + 34 ----

/**
 * The party's character ids by slot: the standard order (McDohl, Viktor, Flik, Luc, Tengaar, Hellion) and the other order (Viktor and Flik
 * swapped). The child's hit point (a78, a79) is the owner character's sprite data, keyed by character id (`HIT_POINTS`)
 */
const PARTY_CHARACTERS = {
  recorded: [8, 35, 17, 26, 33, 59],
  ord: [8, 17, 35, 26, 33, 59],
};

/** The child's animation (entry 0 of table 0x800aab64): 8 frames, ticks per frame, list address and the sprites [x, y, b2, b3, w, h] */
const CHILD_FRAMES = [
  { ticks: 3, list: 0x800aa18c, origin: [8, 8], sprites: [[0, 0, 2, 0x42, 15, 15]] },
  { ticks: 4, list: 0x800aa19c, origin: [24, 24], sprites: [[8, 8, 2, 0x44, 31, 31]] },
  {
    ticks: 2,
    list: 0x800aa1ac,
    origin: [24, 24],
    sprites: [
      [24, 8, 2, 0x42, 15, 15],
      [8, 8, 2, 0x48, 31, 31],
    ],
  },
  {
    ticks: 4,
    list: 0x800aa1c4,
    origin: [24, 24],
    sprites: [
      [8, 8, 2, 0x88, 31, 31],
      [16, 0, 2, 0x04, 31, 31],
    ],
  },
  {
    ticks: 2,
    list: 0x800aa1dc,
    origin: [24, 24],
    sprites: [
      [8, 8, 2, 0x84, 31, 31],
      [16, 0, 2, 0x08, 31, 31],
    ],
  },
  {
    ticks: 2,
    list: 0x800aa1f4,
    origin: [24, 24],
    sprites: [
      [8, 8, 2, 0x80, 31, 31],
      [16, 0, 2, 0x0c, 31, 31],
    ],
  },
  { ticks: 2, list: 0x800aa20c, origin: [24, 24], sprites: [[16, 0, 2, 0x4c, 31, 31]] },
  { ticks: 2, list: 0x800aa21c, origin: [24, 24], sprites: [[16, 0, 2, 0x8c, 31, 31]] },
];
/**
 * The child's header and its two 80-byte packet arrays after the effect, as 8-digit hex words: all the words the code writes. The link
 * words (the ordering table's previous head: another prim of the frame) are null; the never-written halves come from `half` (undefined:
 * unknown, listed as varying).
 * @param {{ camera: number, slot: number, order?: string, bufferAtSpawn: number, header: number, arrays: number[], half: (address: number) => number | undefined, members?: number, characters?: number[], resource?: (slot: number) => [number, number] }} input
 *   members: the party size; characters: the character id of each slot (default: the party order's); resource: the two packet block
 *   addresses of a party slot (1..members) and of the enemy (members + 1), which gives the arrays' ordering-table link words
 *   bufferAtSpawn: the draw buffer index at the child's spawn tick S (the last draw, S + 19, is the other one)
 * @returns {{ header: { hex: string[], varying: number[] }, arrays: { hex: (string | null)[], varying: number[] }[] }}
 */
export function hitChild({
  camera,
  slot,
  order = 'recorded',
  bufferAtSpawn,
  header,
  arrays,
  half,
  members = 6,
  characters,
  resource,
}) {
  const table = effectTable('battle', members);
  const w = CAMERA_PRESETS[camera].map((x) => x >> 12);
  const scale = cdiv(w[9] << 10, w[8]);
  const project = projector(camera);
  const [mx, my, mz] = MEMBER_POSITIONS[slot];
  const home = [mx + 0x80, my, mz];
  const [sx, sy] = project(home);
  const m = cameraMatrix(w.slice(3, 6), w.slice(9, 12));
  const depth = depthOf(m, w.slice(6, 9), home) >> 2;
  const ids = characters ?? PARTY_CHARACTERS[order === 'ord' ? 'ord' : 'recorded'];
  const point = HIT_POINTS[ids[slot - 1]];
  const sra = (/** @type {number} */ v) => (v < 0 ? v + 0xfff : v) >> 12;
  const X = sx + sra(point[0] * scale);
  const Y = sy + sra(point[1] * scale);
  // packets: [buffer][sprite] -> 10 words, stale halves of words 7 / 9 as tokens (address of the stale source)
  /** @type {{ w: (number | null)[], pad: (number | string)[] }[][]} */
  const pk = [0, 1].map((b) =>
    [0, 1].map((p) => ({
      w: [null, 0x2c808080, 0, 0, 0, 0, 0, 0, 0, 0],
      pad: [`${b}.${p}.7`, `${b}.${p}.9`],
    })),
  );
  const clone = (/** @type {{ w: (number | null)[], pad: (number | string)[] }} */ p) => ({
    w: [...p.w],
    pad: [...p.pad],
  });
  const uvOf = (/** @type {number[]} */ sprite) => {
    const [, , b2, b3, wd, ht] = sprite;
    const idx = (table.slot + b2) & 0xff;
    const k = Math.floor((idx % 20) / 5);
    const slotX = (Math.floor(idx / 20) * 5 + (idx % 5)) * 64 + 0x140;
    const tpage = (1 << 7) | ((k >> 1) << 4) | ((slotX >> 6) & 0xf);
    const clut = (((table.clut & 0xff) + 0x1e0) << 6) | (0x100 >> 4);
    const u = (b3 & 15) * 8;
    const v = (k & 1) * 128 + (b3 >> 4) * 8;
    return { tpage, clut, u, v, wd, ht };
  };
  /** @param {number} b @param {number} frame the setframe: uv, clut and tpage of the list's sprites into buffer b only */
  const setframe = (b, frame) => {
    CHILD_FRAMES[frame].sprites.forEach((sprite, i) => {
      const { tpage, clut, u, v, wd, ht } = uvOf(sprite);
      const p = pk[b][i];
      p.w[3] = ((clut << 16) | (v << 8) | u) >>> 0;
      p.w[5] = ((tpage << 16) | (v << 8) | (u + wd)) >>> 0;
      p.w[7] = ((v + ht) << 8) | u;
      p.w[9] = (((v + ht) << 8) | (u + wd)) >>> 0;
    });
  };
  /** @param {number} to @param {number} from @param {number} frame the copy of the list's sprites, all 0x28 bytes */
  const copy = (to, from, frame) => {
    CHILD_FRAMES[frame].sprites.forEach((_, i) => (pk[to][i] = clone(pk[from][i])));
  };
  const buffer = (/** @type {number} */ t) => bufferAtSpawn ^ (t & 1);
  // the ordering-table links: a packet's link is the head of its bucket when it is drawn, the sprite 0 packet of the last resource drawn
  // before the child that tick with the child's bucket (party slots ascending, then the enemy); none: the bucket's empty marker. A
  // two-sprite list links sprite 0 to sprite 1's packet. [static, 150 of 150 observed; positions: the lunge of the target]
  const look = w.slice(6, 9);
  const bucketOf = (/** @type {number[]} */ world) =>
    Math.max(5, Math.min(0x17b, depthOf(m, look, world) >> 2));
  const childBucket = Math.max(5, Math.min(0x17b, depth - 1));
  const headAt = (/** @type {number} */ t) => {
    const b = buffer(t);
    /** @type {number | undefined} */
    let head;
    if (resource && members === 6) {
      for (let s = 1; s <= members + 1; s++) {
        let world;
        if (s === members + 1) world = CRYSTAL_POSITION.map((x) => x / 4096);
        else {
          const [px, py, pz] = MEMBER_POSITIONS[s];
          let x = (px + 0x80) * 4096;
          if (s === slot && t + 1 <= 31) x += 6144 * (t + 1) - (396 * (t + 1) * t) / 2;
          world = [Math.floor(x / 4096), py, pz];
        }
        if (bucketOf(world) === childBucket) head = resource(s)[b];
      }
    }
    return head ?? OT_BASE + 0x800 * b + 4 * childBucket;
  };
  /** @type {number[][]} the link word of each packet [buffer][sprite] */
  const links = [
    [0, 0],
    [0, 0],
  ];
  // build (tick 0): setframe of frame 0 into the current buffer, the field cleared, a copy to the other buffer
  let frame = 0;
  let counter = CHILD_FRAMES[0].ticks;
  let field = 0;
  let animating = true;
  setframe(buffer(0), 0);
  copy(1 - buffer(0), buffer(0), 0);
  for (let t = 0; t <= 20; t++) {
    const b = buffer(t);
    // animation tick
    if (animating) {
      counter--;
      if (counter === 0) {
        if (frame + 1 < CHILD_FRAMES.length) frame++;
        else animating = false;
        counter = CHILD_FRAMES[frame].ticks;
        field = 2;
        setframe(b, frame);
      }
    }
    if (t === 20) break; // no draw at S + 20 (op 2 stops it)
    // draw: the countdown, the copy of the other buffer one tick after a setframe, the xy words
    if (field === 2) field = 1;
    else if (field === 1) {
      field = 0;
      copy(b, 1 - b, frame);
    }
    const { sprites, origin } = CHILD_FRAMES[frame];
    for (let i = sprites.length - 1; i >= 0; i--) {
      const [sxr, syr, , , wd, ht] = sprites[i];
      const x0 = X + sra((sxr - origin[0]) * scale);
      const y0 = Y + sra((syr - origin[1]) * scale);
      const dw = sra(wd * scale);
      const dh = sra(ht * scale);
      const xy = (/** @type {number} */ x, /** @type {number} */ y) =>
        (((y & 0xffff) << 16) | (x & 0xffff)) >>> 0;
      const p = pk[b][i];
      links[b][i] = sprites.length === 2 && i === 0 ? arrays[b] + 0x28 : headAt(t);
      p.w[2] = xy(x0, y0);
      p.w[4] = xy(x0 + dw, y0);
      p.w[6] = xy(x0, y0 + dh);
      p.w[8] = xy(x0 + dw, y0 + dh);
    }
  }
  const hex = (/** @type {number} */ x) => (x >>> 0).toString(16).padStart(8, '0');
  /** @type {{ hex: (string | null)[], varying: number[] }[]} */
  const outArrays = [];
  for (let b = 0; b < 2; b++) {
    /** @type {(string | null)[]} */
    const words = [];
    /** @type {number[]} */
    const varying = [];
    for (let p = 0; p < 2; p++) {
      const packet = pk[b][p];
      packet.w.forEach((value, i) => {
        if (i === 0)
          return words.push(
            resource && members === 6 ? hex(0x09000000 | (links[b][p] & 0xffffff)) : null,
          );
        if (i === 7 || i === 9) {
          const [bb, pp] = String(packet.pad[i === 7 ? 0 : 1])
            .split('.')
            .map(Number);
          const stale = half(arrays[bb] + 0x28 * pp + 4 * i + 2);
          if (stale === undefined) varying.push(p * 10 + i);
          return words.push(hex((((stale ?? 0) << 16) | (value ?? 0)) >>> 0));
        }
        words.push(hex(value ?? 0));
      });
    }
    outArrays.push({ hex: words, varying });
  }
  // header after S + 20 (the last anim tick) and S + 21 (the free's res[0xc] -= 1)
  const stale4 = half(header + 0x12);
  const stale7 = half(header + 0x1e);
  const hv = [];
  if (stale4 === undefined) hv.push(4);
  if (stale7 === undefined) hv.push(7);
  const headerWords = [
    hex((CHILD_FRAMES[7].ticks << 24) | (7 << 16) | (8 << 8) | 0),
    hex(2),
    hex((((Y & 0x1fff) << 19) | ((X & 0x1fff) << 3) | 0x20000) >>> 0),
    hex((scale << 16) | ((depth - 2) & 0xffff)),
    hex(((stale4 ?? 0) << 16) | scale),
    hex(0x1000),
    hex(0),
    hex((stale7 ?? 0) << 16),
    hex(0x800aa9a8),
    hex(CHILD_FRAMES[7].list),
    hex(arrays[0]),
    hex(arrays[1]),
    hex(0x800aab64),
  ];
  return { header: { hex: headerWords, varying: hv }, arrays: outArrays };
}
