/**
 * What the Siren Special's rings link to when a ring packet is the first of its ordering-table bucket (the agent's ASK 31 part 2 and ASK 32 answers, 4 of 4 recorded
 * Specials, 12096 of 12096 ring links): the head of the bucket at the moment of the draw. Per tick the draw order is the actors' body sprites, the 16 wrapper
 * objects (0..15, while drawn), then the rings; an empty bucket's head is the marker (the entry before it).
 */
import { cameraMatrix, depthOf } from './HitEffect.js';
import { OT, SIREN_CAMERA, mvmva } from './RingUpdate.js';

/** The actors' body sprites' bucket depths by slot (1-6 the party, 7 and 8 the Sirens): SZ3 >> 2 of the formation position through the Special's camera */
const ACTOR_DEPTH = [225, 230, 231, 207, 213, 216, 282, 288];

/** The battle struct's actor record of a slot: its sprite resource header's address is the word at +0x84 */
const ACTOR_RECORD = (/** @type {number} */ slot) => 0x80196bd0 + 0x50 + 0x8c * slot + 0x84;

/**
 * The depth the party member of `slot` is drawn at, `t` ticks after the bulk frame: the members bob up one (Defend pose): slots 2 and 3 at t = 49 + 16 n .. 57 + 16 n,
 * slots 1, 4 and 6 at 51 + 16 n .. 55 + 16 n; slot 5 and the Sirens do not.
 * @param {number} slot
 * @param {number} t
 */
function actorDepth(slot, t) {
  const base = ACTOR_DEPTH[slot - 1];
  if (t < 49) return base;
  const [lo, hi] =
    slot === 2 || slot === 3
      ? [49, 57]
      : slot === 1 || slot === 4 || slot === 6
        ? [51, 55]
        : [0, -1];
  const phase = (t - 49) % 16;
  const from = lo - 49;
  const to = hi - 49;
  return phase >= from && phase <= to ? base - 1 : base;
}

/**
 * Wrapper object `k` at `t` ticks after the bulk frame: its ordering-table depth while it is drawn (w7 = 1), else undefined.
 * @param {{ k: number, t: number, roll: number, casterY: number }} o - `roll`: the k-th of the bulk frame's 16 rand() values
 * @returns {number | undefined}
 */
export function objectDepth({ k, t, roll, casterY }) {
  const tau = t - 4 * k;
  if (!((tau >= 1 && tau <= 63) || (tau >= 65 && tau <= 127))) return undefined;
  const scale = 0x40 * (((tau - 1) % 64) + 1) + 1;
  const rz = ((roll & 0xfff) + 0x30 * Math.min(tau, 128)) & 0xfff;
  const m = cameraMatrix([0, -0x400, rz], [scale, scale, scale]);
  const world = mvmva(m, [-0x80, casterY, -0x28], [180, 0, -300]);
  const depth = depthOf(SIREN_CAMERA.matrix, SIREN_CAMERA.translation, world) >> 2;
  return depth < 1 ? 1 : depth > 0x1fd ? 0x1fd : depth;
}

/**
 * The heads of the ordering-table buckets a ring meets at tick `t` after the bulk frame, in draw buffer `buffer`: bucket address -> the head's link (24 bits), or
 * undefined where the head is an actor's sprite whose address the heap does not know.
 * @param {object} o
 * @param {number} o.buffer
 * @param {number} o.t
 * @param {number[]} o.rolls - the bulk frame's 16 rand() values
 * @param {number} o.casterY
 * @param {number} o.members - the party's size (actor slots 1..members; the Sirens are slots 7 and 8)
 * @param {readonly (number | null)[]} o.ptrs - the Special's allocations (the 16 objects' blocks from index 21: object, header, packet 0, packet 1)
 * @param {(addr: number) => number | undefined} o.read - a word of the heap, undefined where not known
 * @returns {Map<number, number | undefined>}
 */
export function bucketHeads({ buffer, t, rolls, casterY, members, ptrs, read }) {
  /** @type {Map<number, number | undefined>} */
  const heads = new Map();
  const slots = [...Array.from({ length: members }, (_, i) => i + 1), 7, 8];
  for (const slot of slots) {
    const bucket = OT[buffer] + 4 * actorDepth(slot, t);
    const resource = read(ACTOR_RECORD(slot));
    const packet = resource === undefined ? undefined : read(resource + 0x28 + 4 * buffer);
    heads.set(bucket, packet === undefined ? undefined : packet & 0xffffff);
  }
  for (let k = 0; k < 16; k++) {
    const depth = objectDepth({ k, t, roll: rolls[k], casterY });
    if (depth === undefined) continue;
    const packet = ptrs[21 + 4 * k + 2 + buffer];
    heads.set(OT[buffer] + 4 * depth, packet == null ? undefined : packet & 0xffffff);
  }
  return heads;
}
