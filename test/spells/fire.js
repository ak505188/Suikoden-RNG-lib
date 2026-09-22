import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { flamingArrowRand, dancingFlamesRand } from '../../lib/Game/Magic/SpellRNG/Fire.js';

const cases = [
  { rng: 0x1b65fc6a, calls: 512 },
  { rng: 0x11111111, calls: 524 },
  { rng: 0xcafebabe, calls: 540 },
  { rng: 0xdeadbeef, calls: 536 },
  { rng: 0x00000001, calls: 504 },
  { rng: 0x7fffffff, calls: 504 },
  { rng: 0x9e3779b9, calls: 516 },
  { rng: 0x12345678, calls: 528 },
  { rng: 0xa5a5a5a5, calls: 520 },
  { rng: 0x00c0ffee, calls: 524 },
  { rng: 0x1badb002, calls: 540 },
  { rng: 0x5eadbeef, calls: 536 },
  { rng: 0x8badf00d, calls: 512 },
  { rng: 0xfeedface, calls: 524 },
  { rng: 0x0defaced, calls: 496 },
  { rng: 0xabad1dea, calls: 532 },
  { rng: 0x31337000, calls: 508 },
  { rng: 0x42424242, calls: 476 },
  { rng: 0x55555555, calls: 524 },
  { rng: 0xaaaaaaaa, calls: 536 },
  { rng: 0xfffffffe, calls: 472 },
];

describe("Flaming Arrow Rand tests", () => {
  for (const { rng, calls } of cases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(flamingArrowRand(r).calls, calls);
    });
  };
});

describe("Dancing Flames Rand tests", () => {
  it("Should always be 150", () => {
    const r = new RNG(0x11111111);
    assert.strictEqual(dancingFlamesRand(r).calls, 150);
  });
});
