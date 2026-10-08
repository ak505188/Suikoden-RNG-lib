import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { shiningWindRand } from '../../lib/Game/Magic/SpellRNG/Wind.js';
import { stormFangRand } from '../../lib/Game/Magic/SpellRNG/Unites.js';

describe('Storm Fang Rand tests', () => {
  it('Should always be 38', () => {
    const r = new RNG(0x11111111);
    assert.strictEqual(stormFangRand(r).calls, 38);
  });
});

const shiningWindCases = [
  { seed: 0xd7250f7e, calls: 1302 },
  { seed: 0x11111111, calls: 1314 },
  { seed: 0xcafebabe, calls: 1338 },
  { seed: 0xdeadbeef, calls: 1320 },
  { seed: 0x00000001, calls: 1314 },
  { seed: 0x7fffffff, calls: 1356 },
  { seed: 0x9e3779b9, calls: 1350 },
  { seed: 0x12345678, calls: 1308 },
  { seed: 0xa5a5a5a5, calls: 1320 },
  { seed: 0x00c0ffee, calls: 1338 },
  { seed: 0x1badb002, calls: 1320 },
  { seed: 0x5eadbeef, calls: 1320 },
  { seed: 0x8badf00d, calls: 1338 },
  { seed: 0xfeedface, calls: 1326 },
  { seed: 0x0defaced, calls: 1320 },
  { seed: 0xabad1dea, calls: 1338 },
  { seed: 0x31337000, calls: 1308 },
  { seed: 0x42424242, calls: 1362 },
  { seed: 0x55555555, calls: 1344 },
  { seed: 0xaaaaaaaa, calls: 1296 },
  { seed: 0xfffffffe, calls: 1314 },
];

describe('Shining Wind Rand tests', () => {
  for (const { seed, calls } of shiningWindCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(shiningWindRand(r).calls, calls);
    });
  }
});
