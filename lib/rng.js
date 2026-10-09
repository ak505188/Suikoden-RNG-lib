/**
 * The RNG at one point in time.
 * @typedef {Object} RNGSnapshot
 * @property {number} seed - the value it started from
 * @property {number} raw - the 32-bit value it's at now, as read live
 * @property {number} count - calls since the seed
 */

/**
 * The step x -> 0x41c64e6d * x + 0x3039 (mod 2^32) and its inverse x -> STEP_INV * x + STEP_INV_ADD
 * (0x41c64e6d * STEP_INV = 1 mod 2^32, and STEP_INV_ADD = -STEP_INV * 0x3039). They're written as
 * signed int32 so the arithmetic stays in int32 (see RNG#_raw).
 */
const STEP_INV = -0x1146149b; // 0xeeb9eb65
const STEP_INV_ADD = -Math.imul(0x3039, STEP_INV) | 0;

/** jump(n) steps one call at a time for a forward n below this, or a backward n above minus this */
const STEP_FORWARD_BELOW = 4,
  STEP_BACK_BELOW = 32;

/**
 * The step applied 2^k times, as x -> JUMP_MUL[k] * x + JUMP_ADD[k], for k = 0..31: composing
 * f(x) = a x + c with itself gives a^2 x + (a c + c).
 */
const JUMP_MUL = new Int32Array(32),
  JUMP_ADD = new Int32Array(32);
JUMP_MUL[0] = 0x41c64e6d;
JUMP_ADD[0] = 0x3039;
for (let k = 1; k < 32; k++) {
  JUMP_MUL[k] = Math.imul(JUMP_MUL[k - 1], JUMP_MUL[k - 1]);
  JUMP_ADD[k] = Math.imul(JUMP_MUL[k - 1], JUMP_ADD[k - 1]) + JUMP_ADD[k - 1];
}

export default class RNG {
  // seed is the value it started from, raw the 32-bit value it's at now (it determines the next)
  // rand (raw's high 15 bits) is what most calculations read

  /**
   * raw is kept as a signed int32 (`_raw`) and read as unsigned. V8 keeps an unsigned value above
   * 2^31 in a double, which made next() about 4x slower (6.6 against 1.5 ns); in an int32 it's one
   * multiply and an add. Use `raw`, not `_raw`.
   * @param {number} seed
   */
  constructor(seed = generateRandomSeed()) {
    this._raw = seed | 0;
    this.seed = seed;
    this.count = 0;
  }

  /** The 32-bit value the RNG is at now, as read live (unsigned). */
  get raw() {
    return this._raw >>> 0;
  }

  set raw(raw) {
    this._raw = raw | 0;
  }

  get rand() {
    return (this._raw >>> 16) & 0x7fff;
  }

  /** An independent copy: same seed, raw value and count. */
  clone() {
    const copy = new RNG(this.seed);
    copy._raw = this._raw;
    copy.count = this.count;
    return copy;
  }

  /** @returns {RNGSnapshot} */
  snapshot() {
    return { seed: this.seed, raw: this.raw, count: this.count };
  }

  reset() {
    this._raw = this.seed | 0;
    this.count = 0;
  }

  toString() {
    return `0x${this.raw.toString(16)}`;
  }

  /**
   * The raw and rand values `calls` calls ahead, without advancing: for when you need to see an
   * upcoming value but not consume it.
   * @param {number} [calls]
   */
  peek(calls = 1) {
    let raw = this._raw;
    for (let i = 0; i < calls; i++) {
      raw = (Math.imul(raw, 0x41c64e6d) + 0x3039) | 0;
    }
    return { raw: raw >>> 0, rand: RNG.calcRand(raw) };
  }

  /** Advances the RNG by one call, in place (the same step as peek). */
  next() {
    this._raw = (Math.imul(this._raw, 0x41c64e6d) + 0x3039) | 0;
    this.count++;
    return this;
  }

  /**
   * Steps the RNG back one call, in place: undoes next(). Count goes down by one, below 0 if the
   * RNG is rewound past its seed.
   */
  prev() {
    this._raw = (Math.imul(this._raw, STEP_INV) + STEP_INV_ADD) | 0;
    this.count--;
    return this;
  }

  /**
   * Moves the RNG by `calls` calls, in place: the same state as `calls` next()s, or, for a negative
   * `calls`, as -`calls` prev()s. A few calls are stepped one at a time. Any more compose the
   * step's powers instead, one multiply-add per set bit of the distance: the LCG has full period
   * 2^32, so the state only moves `calls` mod 2^32 steps, and a negative `calls` goes the long way
   * round. Count still records every call, and goes down by -`calls` when it's negative.
   * @param {number} calls
   */
  jump(calls) {
    let raw = this._raw;
    if (calls >= 0 && calls < STEP_FORWARD_BELOW) {
      for (let i = 0; i < calls; i++) {
        raw = (Math.imul(raw, 0x41c64e6d) + 0x3039) | 0;
      }
    } else if (calls < 0 && calls > -STEP_BACK_BELOW) {
      for (let i = calls; i < 0; i++) {
        raw = (Math.imul(raw, STEP_INV) + STEP_INV_ADD) | 0;
      }
    } else {
      for (let n = calls >>> 0; n !== 0; n &= n - 1) {
        const bit = 31 - Math.clz32(n & -n); // the lowest set bit
        raw = (Math.imul(raw, JUMP_MUL[bit]) + JUMP_ADD[bit]) | 0;
      }
    }
    this._raw = raw;
    this.count += calls;
    return this;
  }

  static calcRand(raw) {
    return (raw >>> 16) & 0x7fff;
  }
}

/** A uniformly random 32-bit seed */
export function generateRandomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}
