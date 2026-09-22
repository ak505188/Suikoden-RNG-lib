import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { stormFangRand, shiningWindRand } from '../../lib/Game/Magic/SpellRNG/Wind.js';

describe("Storm Fang Rand tests", () => {
  it("Should always be 38", () => {
    const r = new RNG(0x11111111);
    assert.strictEqual(stormFangRand(r).calls, 38);
  });
});

const shiningWindCases = [
  { rng: 0xd7250f7e, calls: 1302 },
  { rng: 0x11111111, calls: 1314 },
  { rng: 0xcafebabe, calls: 1338 },
  { rng: 0xdeadbeef, calls: 1320 },
  { rng: 0x00000001, calls: 1314 },
  { rng: 0x7fffffff, calls: 1356 },
  { rng: 0x9e3779b9, calls: 1350 },
  { rng: 0x12345678, calls: 1308 },
  { rng: 0xa5a5a5a5, calls: 1320 },
  { rng: 0x00c0ffee, calls: 1338 },
  { rng: 0x1badb002, calls: 1320 },
  { rng: 0x5eadbeef, calls: 1320 },
  { rng: 0x8badf00d, calls: 1338 },
  { rng: 0xfeedface, calls: 1326 },
  { rng: 0x0defaced, calls: 1320 },
  { rng: 0xabad1dea, calls: 1338 },
  { rng: 0x31337000, calls: 1308 },
  { rng: 0x42424242, calls: 1362 },
  { rng: 0x55555555, calls: 1344 },
  { rng: 0xaaaaaaaa, calls: 1296 },
  { rng: 0xfffffffe, calls: 1314 },
];

describe("Shining Wind Rand tests", () => {
  for (const { rng, calls } of shiningWindCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(shiningWindRand(r).calls, calls);
    });
  };
});
