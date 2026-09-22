import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { hellRand, blackShadowWindRand, blackShadowBatsRand } from '../../lib/Game/Magic/SpellRNG/SoulEater.js';

const hellCases = [
  { rng: 0x333db67a, calls: 10972 }, // TedHell.State
  { rng: 0xda27f738, calls: 10784 }, // McDohlHell.State
  { rng: 0x51a1ed4b, calls: 12220 }, // McDohlHellGregminster.State
  { rng: 0x00000001, calls: 11280 },
  { rng: 0x12345678, calls: 11668 },
  { rng: 0xdeadbeef, calls: 10812 },
  { rng: 0x00000000, calls: 10400 },
  { rng: 0xffffffff, calls: 10780 },
  { rng: 0x1b65fc6a, calls: 11224 },
  { rng: 0xd7250f7e, calls: 10864 },
  { rng: 0x41c64e6d, calls: 11708 },
  { rng: 0x7fffffff, calls: 10780 },
  { rng: 0x80000000, calls: 10400 },
  { rng: 0x0badf00d, calls: 11308 },
  { rng: 0xcafebabe, calls: 10764 },
  { rng: 0x5eed1234, calls: 10824 },
  { rng: 0x99999999, calls: 11332 },
  { rng: 0x33333333, calls: 10532 },
  { rng: 0x0000ffff, calls: 10824 },
  { rng: 0xffff0000, calls: 12220 },
  { rng: 0x11111111, calls: 10832 },
  { rng: 0x22222222, calls: 10756 },
  { rng: 0xabcdef01, calls: 11192 },
];

describe("Hell Rand tests", () => {
  for (const { rng, calls } of hellCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(hellRand(r).calls, calls);
    });
  };
});

const blackShadowWindCases = [
  { rng: 0x6a2d97b4, calls: 5796 }, // BlackShadowWind.State
  { rng: 0x00000001, calls: 6260 },
  { rng: 0x12345678, calls: 5736 },
  { rng: 0xdeadbeef, calls: 5968 },
  { rng: 0x00000000, calls: 5884 },
  { rng: 0xffffffff, calls: 5928 },
  { rng: 0x1b65fc6a, calls: 5732 },
  { rng: 0xd7250f7e, calls: 5664 },
  { rng: 0x41c64e6d, calls: 6548 },
  { rng: 0x7fffffff, calls: 5928 },
  { rng: 0x80000000, calls: 5884 },
  { rng: 0x0badf00d, calls: 5964 },
  { rng: 0xcafebabe, calls: 5860 },
  { rng: 0x5eed1234, calls: 6496 },
  { rng: 0x99999999, calls: 6616 },
  { rng: 0x33333333, calls: 6272 },
  { rng: 0x0000ffff, calls: 5800 },
  { rng: 0xffff0000, calls: 6276 },
  { rng: 0x11111111, calls: 5844 },
  { rng: 0x22222222, calls: 6376 },
  { rng: 0xabcdef01, calls: 6384 },
];

const blackShadowBatsCases = [
  { rng: 0x06614a28, calls: 9476 }, // BlackShadowBats.State
  { rng: 0x00000001, calls: 9808 },
  { rng: 0x12345678, calls: 9632 },
  { rng: 0xdeadbeef, calls: 9560 },
  { rng: 0x00000000, calls: 9484 },
  { rng: 0xffffffff, calls: 9544 },
  { rng: 0x1b65fc6a, calls: 9708 },
  { rng: 0xd7250f7e, calls: 9572 },
  { rng: 0x41c64e6d, calls: 9648 },
  { rng: 0x7fffffff, calls: 9544 },
  { rng: 0x80000000, calls: 9484 },
  { rng: 0x0badf00d, calls: 10188 },
  { rng: 0xcafebabe, calls: 9552 },
  { rng: 0x5eed1234, calls: 9960 },
  { rng: 0x99999999, calls: 9444 },
  { rng: 0x33333333, calls: 9824 },
  { rng: 0x0000ffff, calls: 9500 },
  { rng: 0xffff0000, calls: 9832 },
  { rng: 0x11111111, calls: 9480 },
  { rng: 0x22222222, calls: 9712 },
  { rng: 0xabcdef01, calls: 9876 },
];

describe("Black Shadow Rand tests", () => {
  describe("Wind savestate", () => {
    for (const { rng, calls } of blackShadowWindCases) {
      const r = new RNG(rng);
      it(`Should be ${calls} for ${rng.toString(16)}`, () => {
        assert.strictEqual(blackShadowWindRand(r).calls, calls);
      });
    };
  });

  describe("Bats savestate", () => {
    for (const { rng, calls } of blackShadowBatsCases) {
      const r = new RNG(rng);
      it(`Should be ${calls} for ${rng.toString(16)}`, () => {
        assert.strictEqual(blackShadowBatsRand(r).calls, calls);
      });
    };
  });
});
