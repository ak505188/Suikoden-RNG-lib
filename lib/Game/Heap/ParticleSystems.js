/**
 * The Crystal Core Special's three particle systems, as the game builds and updates them (Suikoden-Bizhawk-HUD
 * notes/2026-11-09_vfx_special_particle_systems.md, v1.0, static; reproduced exactly for systems 0 and 1 in 20 of 20 slow seeds): an
 * 84-byte struct and, per draw buffer, N POLY_G4 records (36 bytes) and N DR_MODE records (12 bytes).
 * What the model gives is every word the code writes with a value that does not depend on the screen: the struct, the DR_MODE blocks and
 * the G4 code, colour and top byte of the link word. The G4 xy words and the links' low 24 bits come from the camera at the last update
 * calls, and the three pad bytes per record are the arena's byte before the Special's allocations (`pre`): neither is derived here.
 */
import { CRYSTAL_POSITION, cameraMatrix, depthOf, rtps } from './HitEffect.js';
import { MEMBER_POSITIONS } from './HitEffectTables.js';
import { OT_BASE } from './SpriteRecord.js';

/**
 * The camera the Special sets for itself at call 1 (a preset in the vf2 overlay, 0x8006af00; a 60-tick blend from the round's class
 * preset that ends at call 62, so every call from 62 on, the ones that matter for the final words, sees exactly this one regardless of
 * the class) [static, observed 378 of 378 words]. look (112, 0, 0), rot (-768, 0, 352), trans (0, 0, 1024), scale 3840.
 */
const CAMERA = {
  matrix: cameraMatrix([-768, 0, 352], [3840, 3840, 3840]),
  translation: [0, 0, 1024],
  look: [112, 0, 0],
};
/** The screen offset the camera code derives from the look point: projection of the origin minus the projection of the look point */
const OFFSET = (() => {
  const [x0, y0] = rtps(CAMERA.matrix, CAMERA.translation, [0, 0, 0]);
  const [x1, y1] = rtps(CAMERA.matrix, CAMERA.translation, CAMERA.look);
  return [x0 - x1, y0 - y1];
})();

/**
 * The three systems: N, the DR_MODE abr bits, the two vertex colour pairs, the struct's constants (words 7-13, 18-20) and the final
 * rotation word (+0x40: 0x40 per active update).
 */
export const SYSTEMS = [
  {
    n: 24,
    abr: 2,
    rgb01: 0x404040,
    rgb23: 0x404040,
    translation: [0x78, 0, 0],
    extent: [0x78, -300, 0x78, 0],
    rotation: 0,
    scale: [0xaa, 0xaa, 0x1000],
  },
  {
    n: 24,
    abr: 1,
    rgb01: 0x404040,
    rgb23: 0x101010,
    translation: [0x78, 0, 0],
    extent: [0x73, -300, 0x73, 0],
    rotation: 0x2b80,
    scale: [0xaa, 0xaa, 0x1000],
  },
  {
    n: 10,
    abr: 1,
    rgb01: 0x808080,
    rgb23: 0x101010,
    // the Special's struct words 28-30: Crystal Core's x and y >> 12 and (z >> 12) - 0x1e
    translation: [-0x80, 0, -0x1e],
    extent: [600, 0, 5, 0],
    rotation: 0xfc0,
    scale: [0x1000, 0x1000, 0x1000],
  },
];

/**
 * The words of one system at the Special's free. `undefined` marks a word that is not derived (xy and link words).
 * @param {number} system 0, 1 or 2
 * @param {{ struct: number, g4: [number, number], dr: [number, number] }} at - the block addresses (g4 and dr by draw buffer)
 * @param {(address: number) => number} pre - the arena's word before the Special's allocations (the never-written words)
 * @param {number} [bulkIndex] - the draw buffer index at the Special's bulk allocation (the phase): call n is drawn into buffer
 *   bulkIndex ^ (n & 1), so the last call holds buffer bulkIndex; unset: the xy words are not derived
 * @param {number[][]} [links] - the G4 link words by buffer and record (`g4Links`); unset: only the link word's top byte
 * @returns {{ struct: number[], g4: (number | number[] | undefined)[][][], dr: number[][][] }}
 */
export function particleSystem(system, at, pre, bulkIndex, links) {
  const s = SYSTEMS[system];
  // the last two calls of the system (systems 0 and 1: 237 and 238; system 2: 62 and 63) and the buffer each wrote
  const calls = system === 2 ? [62, 63] : [238, 237];
  const screen = new Map();
  if (bulkIndex !== undefined)
    for (const call of calls) screen.set(bulkIndex ^ (call & 1), g4Screen(system, call));
  const u32 = (/** @type {number} */ x) => x >>> 0;
  const struct = [
    0,
    s.n,
    pre(at.struct + 8),
    at.g4[0],
    at.g4[1],
    at.dr[0],
    at.dr[1],
    ...s.translation,
    ...s.extent,
    1,
    0,
    u32((pre(at.struct + 0x40) & 0xffff0000) | s.rotation),
    pre(at.struct + 0x44),
    ...s.scale,
  ].map(u32);
  const g4 = at.g4.map((base, b) =>
    Array.from({ length: s.n }, (_, i) => {
      const xy = screen.get(b)?.[i];
      const word = (/** @type {number} */ k) =>
        xy ? (((xy[k][1] & 0xffff) << 16) | (xy[k][0] & 0xffff)) >>> 0 : undefined;
      const a = base + 36 * i;
      // pad bytes: the top byte of words 3, 5 and 7 is the arena's before the build
      const pad = (/** @type {number} */ w) => pre(a + 4 * w) & 0xff000000;
      return [
        links ? links[b][i] : [u32(0x08000000), undefined],
        u32(0x3b000000 | s.rgb01),
        word(0),
        u32(pad(3) | s.rgb01),
        word(1),
        u32(pad(5) | s.rgb23),
        word(2),
        u32(pad(7) | s.rgb23),
        word(3),
      ];
    }),
  );
  const dr = at.dr.map((base, b) =>
    Array.from({ length: s.n }, (_, i) => [
      u32(0x02000000 | ((at.g4[b] + 36 * i) & 0xffffff)),
      u32(0xe1000000 | (s.abr << 5)),
      0,
    ]),
  );
  return { struct, g4, dr };
}

const s16 = (/** @type {number} */ v) => (v << 16) >> 16;

/**
 * The screen words of every G4 record of a system at one update call, as [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] (G4 words 2, 4, 6, 8)
 * [static: 0x80120d08 / 0x801215f8; the camera of calls 62 and later; exact for 11520 of 11520 words of system 0 and all of system 1].
 * The call is the effect's own count (call 238 = the last of systems 0 and 1, call 63 = the last of system 2); `scale` is the ring
 * scale word S[32] >> 12 at that call (256 at 237, 170 at 238 for systems 0 and 1; 0x1000 for system 2).
 * @param {number} system
 * @param {number} call
 * @returns {number[][][]}
 */
export function g4Screen(system, call) {
  return g4Geometry(system, call).map((r) => r.xy);
}

/**
 * Per record: the screen words and the ordering table bucket z = SZ3 of the last projected point (B1) >> 2, clamped as the update clamps it
 * (1 to 0x1fd for system 0, 0x17a for systems 1 and 2); the closing record of system 0 takes record n - 2's z.
 * @param {number} system
 * @param {number} call
 * @returns {{ xy: number[][], z: number }[]}
 */
export function g4Geometry(system, call) {
  const s = SYSTEMS[system];
  const step = Math.floor(0x1000 / s.n);
  // sys1 turns 0x40 per active call from call 65; sys2 0x40 per call; the second pair's angle is p2 short of one step (sys0: none)
  const rotation = system === 0 ? 0 : system === 1 ? 0x40 * (call - 64) : 0x40 * call;
  const p2 = system === 0 ? 0 : system === 1 ? 0x96 : (0xc8000 + 0x3200 * call) >> 12;
  const scale =
    system === 2 ? [0x1000, 0x1000, 0x1000] : [ringScale(call), ringScale(call), 0x1000];
  const [ax, az] = [s.extent[0], s.extent[1]];
  const [bx, bz] = [s.extent[2], s.extent[3]];
  const point = (/** @type {number} */ ang, /** @type {number} */ x, /** @type {number} */ z) => {
    const model = cameraMatrix([0, 0, ang], scale);
    const v = [x, 0, z];
    const world = [0, 1, 2].map((i) =>
      s16(
        (s.translation[i] * 0x1000 +
          model[i][0] * v[0] +
          model[i][1] * v[1] +
          model[i][2] * v[2]) >>
          12,
      ),
    );
    return world;
  };
  const project = (/** @type {number[]} */ v) => {
    const [x, y] = rtps(CAMERA.matrix, CAMERA.translation, v);
    return [x + OFFSET[0], y + OFFSET[1]];
  };
  const records = [];
  const count = system === 0 ? s.n - 1 : s.n;
  for (let i = 0; i < count; i++) {
    const a0 = rotation - i * step;
    const a1 = a0 - (step - p2);
    const b1 = point(a1, bx, bz);
    records.push({
      xy: [
        project(point(a0, ax, az)),
        project(point(a1, ax, az)),
        project(point(a0, bx, bz)),
        project(b1),
      ],
      z: Math.max(
        1,
        Math.min(system === 0 ? 0x1fd : 0x17a, depthOf(CAMERA.matrix, CAMERA.translation, b1) >> 2),
      ),
    });
  }
  if (system === 0) {
    // the last record closes the ring: xy0 = record n-2's xy1, xy1 = record 0's xy0, xy2 = n-2's xy3, xy3 = 0's xy2
    const last = records[s.n - 2].xy;
    records.push({
      xy: [last[1], records[0].xy[0], last[3], records[0].xy[2]],
      z: records[s.n - 2].z,
    });
  }
  return records;
}

/** The ring scale word at a call of systems 0 and 1: S[32] grows 0x80000 per call 65..96, holds, falls 0x55555 per call 193..238 */
function ringScale(/** @type {number} */ call) {
  let acc = 1;
  for (let c = 65; c <= call; c++) {
    if (c <= 96) acc += 0x80000;
    else if (c >= 193) acc -= 0x55555;
  }
  return acc >> 12;
}

/**
 * The ordering-table link word (word 0) of every G4 record of the three systems, by system, draw buffer and record: 0x08000000 | the low
 * 24 bits of the head of the record's bucket when it was inserted. Within a tick the records go in system order (0, then 1), each record G4
 * then its DR_MODE, so the head before a record is the DR_MODE of the last earlier record in that bucket, else the party or enemy sprite
 * drawn earlier in the tick (the scene's own draw is before the Special's), else the bucket's empty marker [static, exact on the 20 slow
 * free-tick dumps]. Systems 0 and 1 share the last two calls' ticks; system 2's last calls (62, 63) are earlier, alone.
 * @param {{ g4: [number, number], dr: [number, number] }[]} at - the block addresses of the three systems
 * @param {number} bulkIndex - the draw buffer index at the Special's bulk allocation
 * @param {(slot: number) => [number, number]} packets - the two packet block addresses of a party slot (1..6) and of the enemy (7)
 * @returns {number[][][]}
 */
export function g4Links(at, bulkIndex, packets) {
  // the sprites drawn earlier in the tick: party slots ascending, then the enemy; each with its bucket under the Special's camera
  const earlier = [1, 2, 3, 4, 5, 6, 7].map((slot) => {
    const world =
      slot === 7
        ? CRYSTAL_POSITION.map((x) => x / 4096)
        : [MEMBER_POSITIONS[slot][0] + 0x80, MEMBER_POSITIONS[slot][1], MEMBER_POSITIONS[slot][2]];
    const z = Math.max(5, Math.min(0x17b, depthOf(CAMERA.matrix, CAMERA.translation, world) >> 2));
    return { slot, z };
  });
  /** @type {number[][][]} */
  const out = [0, 1, 2].map(() => [[], []]);
  const tick = (
    /** @type {number[]} */ systems,
    /** @type {number} */ buffer,
    /** @type {number} */ call,
  ) => {
    /** @type {Map<number, number>} */
    const head = new Map();
    for (const e of earlier) head.set(e.z, packets(e.slot)[buffer]);
    for (const system of systems) {
      const geometry = g4Geometry(system, call);
      out[system][buffer] = geometry.map(({ z }, i) => {
        const marker = OT_BASE + 0x800 * buffer + 4 * z;
        const link = head.get(z) ?? marker;
        head.set(z, at[system].dr[buffer] + 12 * i);
        return (0x08000000 | (link & 0xffffff)) >>> 0;
      });
    }
  };
  for (const call of [238, 237]) tick([0, 1], bulkIndex ^ (call & 1), call);
  for (const call of [62, 63]) tick([2], bulkIndex ^ (call & 1), call);
  return out;
}
