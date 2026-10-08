/**
 * Appends integer `value` to a state key (an array of 16-bit code units, see Battle.stateKey):
 * one unit if it's in 0..0xFFFD, else a marker (0xFFFE negative, 0xFFFF otherwise) and its
 * magnitude in three units. So every sequence of values has exactly one encoding.
 * @param {KeyOut} out
 * @param {number | boolean} value - booleans count as 0 / 1
 */
export function pushKeyInt(out, value) {
  const v = +value;
  if (v >= 0 && v < 0xfffe && Number.isInteger(v)) {
    out.push(v);
    return;
  }
  const m = Math.abs(v);
  if (!Number.isInteger(v) || m >= 2 ** 48) throw new Error(`pushKeyInt: can't encode ${value}`);
  out.push(v < 0 ? 0xfffe : 0xffff);
  out.push(Math.floor(m / 2 ** 32));
  out.push(Math.floor(m / 0x10000) & 0xffff);
  out.push(m & 0xffff);
}

/**
 * Where a state key's code units go: a KeyWriter, or any array.
 * @typedef {{ push: (unit: number) => unknown }} KeyOut
 */

/**
 * Collects a state key's 16-bit code units in a reused plain array, then makes the key string in
 * one call. A packed array of small ints is the fastest thing to hand fromCharCode.apply (about
 * 2.5x a Uint16Array subarray), and emptying it with `length = 0` keeps it packed for the next key.
 */
export class KeyWriter {
  constructor() {
    /** @type {number[]} */
    this.buf = [];
  }

  /** @param {number} unit */
  push(unit) {
    this.buf.push(unit);
  }

  get length() {
    return this.buf.length;
  }

  /** @returns {this} emptied, for the next key */
  reset() {
    this.buf.length = 0;
    return this;
  }

  toString() {
    return String.fromCharCode.apply(null, this.buf);
  }
}
