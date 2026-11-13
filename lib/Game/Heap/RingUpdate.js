/**
 * One tick of the particle ring update FUN_80120d08 (fx_ring_update), as the agent ported and validated it on the recorded Siren Special (ASK 26: the xy words
 * 48384 of 48384, the links to a previous record of the ring 7000 of 7000): per segment the ring's own matrix (the camera's RotMatrix and ScaleMatrix, not composed with
 * it) takes the inner and the outer radius point at the segment's angle and the next one, the camera projects the four, and the packet goes into an ordering-table
 * bucket by the depth of the last vertex.
 */
import { cameraMatrix, depthOf, rtps } from './HitEffect.js';

/** The Siren Special's camera in the frames the rings are drawn in (look 0, rotation (-800, 0, 864), scale 4096, translation (0, 0, 1024); H 0x400, no screen offset) */
export const SIREN_CAMERA = {
  matrix: cameraMatrix([-800, 0, 864], [4096, 4096, 4096]),
  translation: [0, 0, 1024],
};

/** The ordering tables of the two draw buffers: the entry of depth 0 */
export const OT = [0x801ba43c, 0x801bac3c];

/** @param {number} v */
const s16 = (v) => ((v & 0xffff) << 16) >> 16;

/**
 * GTE MVMVA with the rotation matrix, V0 and the translation: (TR * 0x1000 + R * v) >> 12 for each axis, stored as an s16.
 * @param {number[][]} m @param {number[]} t @param {number[]} v
 * @returns {number[]}
 */
export const mvmva = (m, t, v) =>
  [0, 1, 2].map((i) =>
    s16(Math.floor((t[i] * 4096 + m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]) / 4096)),
  );

/**
 * @typedef {Object} RingState
 * @property {number} n - the segments
 * @property {number[]} pos - the ring's position (header w7-w9)
 * @property {number[]} inner - the inner radius point's x and z (w10, w11)
 * @property {number[]} outer - the outer one (w12, w13)
 * @property {number[]} rot - the rotation (s16 x, y, z)
 * @property {number} scale - the 12-bit scale (w18-w20)
 */

/**
 * The projection of a ring: per segment the four screen points (x, y) and the bucket depth.
 * @param {RingState} ring
 * @param {{ matrix: number[][], translation: number[] }} [camera]
 * @returns {{ xy: [number, number][], d: number }[]}
 */
export function ringTick(ring, camera = SIREN_CAMERA) {
  const { n, pos, rot, scale } = ring;
  const step = Math.trunc(0x1000 / n);
  const inner = [ring.inner[0], 0, ring.inner[1]];
  const outer = [ring.outer[0], 0, ring.outer[1]];
  let rz = rot[2];
  /** @type {{ xy: [number, number][], d: number }[]} */
  const segs = [];
  let d = 1;
  for (let s = 0; s < n - 1; s++) {
    const m0 = cameraMatrix([rot[0], rot[1], rz], [scale, scale, scale]);
    const ai = mvmva(m0, pos, inner);
    const ao = mvmva(m0, pos, outer);
    rz = s16(rz - step);
    const m1 = cameraMatrix([rot[0], rot[1], rz], [scale, scale, scale]);
    const bi = mvmva(m1, pos, inner);
    const bo = mvmva(m1, pos, outer);
    const pts = [ai, bi, ao, bo].map((v) => rtps(camera.matrix, camera.translation, v));
    const depth = depthOf(camera.matrix, camera.translation, bo) >> 2;
    d = depth < 1 ? 1 : depth > 0x1fd ? 0x1fd : depth;
    segs.push({ xy: /** @type {[number, number][]} */ (pts), d });
  }
  const first = segs[0].xy;
  const prev = segs[segs.length - 1].xy;
  segs.push({ xy: [prev[1], first[0], prev[3], first[2]], d });
  return segs;
}
