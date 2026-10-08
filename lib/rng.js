import { div32ulo } from './util/math.js';

/**
 * The RNG at one point in time.
 * @typedef {Object} RNGSnapshot
 * @property {number} seed - the value it started from
 * @property {number} raw - the 32-bit value it's at now, as read live
 * @property {number} count - calls since the seed
 */

/** jump(n) composes the step's powers rather than stepping from this many calls on (stepping is faster below it) */
const JUMP_FROM = 32;

/**
 * The step x -> 0x41c64e6d * x + 0x3039 (mod 2^32) applied 2^k times, as x -> JUMP_MUL[k] * x +
 * JUMP_ADD[k], for k = 0..31: composing f(x) = a x + c with itself gives a^2 x + (a c + c).
 */
const JUMP_MUL = new Uint32Array(32),
  JUMP_ADD = new Uint32Array(32);
JUMP_MUL[0] = 0x41c64e6d;
JUMP_ADD[0] = 0x3039;
for (let k = 1; k < 32; k++) {
  JUMP_MUL[k] = Math.imul(JUMP_MUL[k - 1], JUMP_MUL[k - 1]);
  JUMP_ADD[k] = Math.imul(JUMP_MUL[k - 1], JUMP_ADD[k - 1]) + JUMP_ADD[k - 1];
}

export default class RNG {
  // seed is the value it started from, raw the 32-bit value it's at now (it determines the next)
  // rand (raw's high 15 bits) is what most calculations read

  /** @param {number} seed */
  constructor(seed = generateRandomSeed()) {
    this.raw = seed;
    this.seed = seed;
    this.count = 0;
  }

  get rand() {
    return RNG.calcRand(this.raw);
  }

  /** An independent copy: same seed, raw value and count. */
  clone() {
    const copy = new RNG(this.seed);
    copy.raw = this.raw;
    copy.count = this.count;
    return copy;
  }

  /** @returns {RNGSnapshot} */
  snapshot() {
    return { seed: this.seed, raw: this.raw, count: this.count };
  }

  reset() {
    this.raw = this.seed;
    this.count = 0;
  }

  isCliveAppearance() {
    const a = div32ulo(0x7fff, 3);
    const b = div32ulo(this.rand, a);
    return b === 0;
  }

  isMarieDialogue() {
    const a = div32ulo(0x7fff, 9);
    const b = div32ulo(this.rand, a);
    return b === 0;
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
    let raw = this.raw;
    for (let i = 0; i < calls; i++) {
      raw = (Math.imul(raw, 0x41c64e6d) + 0x3039) >>> 0;
    }
    return { raw, rand: RNG.calcRand(raw) };
  }

  static isRun(rand) {
    let r3 = 100;
    r3 = rand % r3;
    return r3 > 50;
  }

  static getWheelAttempts(rng) {
    let counter = 0;
    const success = (pos) => {
      return pos >= 0x7f && pos <= 0xa0;
    };
    do {
      counter++;
      rng.next();
    } while (!success(div32ulo(rng.rand, 0x5a)));
    return counter - 1;
  }

  calculateDamageRoll(atk, def) {
    const diff = atk - def;
    let r3 = this.rand % diff;
    let r2 = diff < 0 ? -1 : 0;
    r2 += diff;
    r2 = r2 >> 1;
    r2 = r2 - r3;
    const res = r2 / 5;
    return res < 0 ? Math.ceil(res) : Math.floor(res);
  }

  /** Advances the RNG by one call, in place (the same step as peek). */
  next() {
    this.raw = (Math.imul(this.raw, 0x41c64e6d) + 0x3039) >>> 0;
    this.count++;
    return this;
  }

  /**
   * Advances the RNG by `calls` calls, in place: the same state as `calls` next()s. Long jumps (an
   * animation's burned calls) compose the step's powers instead, in at most 32 multiply-adds. The
   * LCG has full period 2^32, so the state only moves `calls` mod 2^32 steps; count still records
   * every call.
   * @param {number} calls
   */
  jump(calls) {
    let raw = this.raw;
    if (calls < JUMP_FROM) {
      for (let i = 0; i < calls; i++) {
        raw = (Math.imul(raw, 0x41c64e6d) + 0x3039) >>> 0;
      }
    } else {
      for (let bit = 0, n = calls % 2 ** 32; n > 0; bit++, n = Math.floor(n / 2)) {
        if (n % 2) raw = (Math.imul(raw, JUMP_MUL[bit]) + JUMP_ADD[bit]) >>> 0;
      }
    }
    this.raw = raw;
    this.count += calls;
    return this;
  }

  static calcRand(raw) {
    return (raw >>> 16) & 0x7fff;
  }
}

export function simulateAssassinTurn(rng, def, defend = true) {
  const atk = 120;
  const { move, move_name } = determineAssassinMove(rng);
  if (move === 1) rng.next();
  const roll = rng.next().calculateDamageRoll(atk, def);

  let dmg = atk - def + roll;

  if (defend) {
    if (dmg < 0) {
      dmg = dmg + 1;
    }
    dmg = dmg >> 1;
  }

  if (move === 1) return { move, move_name, rng, damage: dmg };

  dmg = dmg * 3;
  if (dmg < 0) {
    dmg = dmg + 1;
  }

  dmg = dmg >> 1;

  return { move, move_name, rng, damage: dmg };
}

export function determineAssassinMove(rng) {
  // Push RNG forward for turn start
  // And for McDohl > Assassin turn
  rng.jump(4);

  // Run rng check until it returns true
  do {
    rng.next();
  } while (rng.rand % 100 < 51);

  // Determine Move
  rng.next();

  let r3 = rng.rand << 1;
  r3 = r3 + rng.rand;
  r3 = r3 << 3;
  r3 = r3 + rng.rand;
  r3 = r3 << 2;

  const move = Math.floor(r3 / 0x7fff) < 51 ? 1 : 0;
  const move_name = move === 1 ? 'Shuriken' : 'Melee';

  return { move, move_name, rng: rng.raw };
}

export function simulateAssassinFight(rng, def, defend = true) {
  const turn1 = simulateAssassinTurn(rng, def, defend);
  const turn2 = simulateAssassinTurn(rng, def, defend);

  // Delay at start of turn
  rng.jump(4);

  // Run rng check until it returns true
  do {
    rng.next();
  } while (rng.rand % 100 < 51);

  // Advancement from petal effect;
  rng.jump(200);

  return {
    turns: [turn1, turn2],
    advancement: rng.count,
    rng: rng.raw,
  };
}

export function generateRandomSeed() {
  return Math.floor(Math.random() * 0x7ffffff);
}
