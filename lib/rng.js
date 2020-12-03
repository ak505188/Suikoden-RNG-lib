import { div32ulo, mult32ulo } from './lib.js';

export default class RNG {
  // rng used to determine next rng
  // rng2 used for most calculations

  constructor(rng) {
    this.rng         = rng;
    this.rng2        = this.calcRNG2(rng);
    this.originalRNG = rng;
    this.count       = 0;
  }

  clone() {
    return new RNG(this.rng);
  }

  getRNG() {
    return this.rng;
  }

  getRNG2() {
    return this.rng2;
  }

  getCount() {
    return this.count;
  }

  reset() {
    this.rng   = this.originalRNG;
    this.rng2  = this.calcRNG2(this.rng);
    this.count = 0;
  }

  isCliveAppearance() {
    const a = div32ulo(0x7fff, 3);
    const b = div32ulo(this.getRNG2(), a);
    return b === 0;
  }

  isMarieDialogue() {
    const a = div32ulo(0x7fff, 9);
    const b = div32ulo(this.getRNG2(), a);
    return b === 0;
  }

  toString() {
    return `0x${this.getRNG().toString(16)}`;
  }

  // Returns the next set of RNG values
  // Used when you don't want to advance
  // the RNG but need to see next value
  getNext(iterations = 1) {
    let rng  = this.getRNG();
    let rng2 = this.getRNG2();
    for (let i = 0; i < iterations; i++) {
      rng  = mult32ulo(rng, 0x41c64e6d) + 0x3039;
      rng2 = this.calcRNG2(rng);
    }
    return { rng, rng2 };
  }

  static isRun(rng2) {
    let r3 = 100;
    r3 = rng2 % r3;
    return r3 > 50 ? true : false;
  }

  static getWheelAttempts(rng) {
    let counter = 0;
    const success = pos => {
      return pos >= 0x7f && pos <= 0xa0;
    };
    do {
      counter++;
      rng.next();
    } while (!success(div32ulo(rng.getRNG2(), 0x5a)));
    return --counter;
  }

  // Advances the RNG internally
  next(iterations = 1) {
    const next = this.getNext(iterations);
    this.rng   = next.rng;
    this.rng2  = next.rng2;
    this.count += iterations;
    return this;
  }

  calcRNG2(rng) {
    return (rng >> 16) & 0x7FFF;
  }
}
