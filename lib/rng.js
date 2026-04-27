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

  cloneKeepIndex() {
    const new_rng = new RNG(this.originalRNG);
    new_rng.rng = this.rng;
    new_rng.rng2 = this.calcRNG2(this.rng);
    new_rng.count = this.count;
    return new_rng;
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
    return r3 > 50;
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

  calculateDamageRoll(atk, def) {
    const diff = atk - def;
    let r3 = (this.getRNG2() % diff);
    let r2 = diff < 0 ? -1 : 0;
    r2 += diff;
    r2 = r2 >> 1;
    r2 = r2 - r3;
    const res = r2 / 5;
    return res < 0 ? Math.ceil(res) : Math.floor(res);
  }

  determineAssassinMove() {
    // Push RNG forward for turn start
    // And for McDohl > Assassin turn
    this.next(4);

    // Run rng check until it returns true
    const can_continue = (rng2) => {
      return rng2 % 100 >= 51;
    };
    do {
      this.next();
    } while (!can_continue(this.getRNG2()));

    // Determine Move
    this.next();

    let r3 = this.getRNG2() << 1;
    r3 = r3 + this.getRNG2();
    r3 = r3 << 3;
    r3 = r3 + this.getRNG2();
    r3 = r3 << 2;

    const move = Math.floor(r3 / 0x7fff) < 51 ? 1 : 0;
    const move_name = move === 1 ? 'Shuriken' : 'Melee';

    return { move, move_name, advancement: this.count, rng: this.getRNG() };
  }

  static simulateAssassinTurn(rng, def, defend = true) {
    const atk = 120;
    const { move, move_name } = rng.determineAssassinMove();
    if (move === 1) rng.next();
    const roll = rng.next().calculateDamageRoll(atk, def);

    let dmg = atk - def + roll;

    if (defend) {
      if (dmg < 0) {
        dmg = dmg + 1
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

  static simulateAssassinFight(rng, def, defend = true) {
    const turn1 = RNG.simulateAssassinTurn(rng, def, defend);
    const turn2 = RNG.simulateAssassinTurn(rng, def, defend);

    // Delay at start of turn
    rng.next(4);

    // Run rng check until it returns true
    const can_continue = (rng2) => {
      return rng2 % 100 >= 51;
    };

    do {
      rng.next();
    } while (!can_continue(rng.getRNG2()));

    // Advancement from petal effect;
    rng.next(200);

    return {
      turns: [turn1, turn2],
      advancement: rng.count,
      rng: rng.getRNG()
    }
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
