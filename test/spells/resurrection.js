import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { charmArrowRand } from '../../lib/Game/Magic/SpellRNG/Resurrection.js';

const cases = [
  { seed: 0xddb92a9b, calls: 24436 },
  { seed: 0x11111111, calls: 24967 },
  { seed: 0xcafebabe, calls: 24828 },
  { seed: 0xdeadbeef, calls: 24305 },
  { seed: 0x00000001, calls: 24586 },
  { seed: 0x7fffffff, calls: 24412 },
  { seed: 0x9e3779b9, calls: 24438 },
  { seed: 0x12345678, calls: 24660 },
  { seed: 0xa5a5a5a5, calls: 24835 },
  { seed: 0x00c0ffee, calls: 24690 },
  { seed: 0x1badb002, calls: 24302 },
  { seed: 0x5eadbeef, calls: 24305 },
  { seed: 0x8badf00d, calls: 24675 },
  { seed: 0xfeedface, calls: 24599 },
  { seed: 0x0defaced, calls: 24386 },
  { seed: 0xabad1dea, calls: 24508 },
  { seed: 0x31337000, calls: 24519 },
  { seed: 0x42424242, calls: 24595 },
  { seed: 0x55555555, calls: 24381 },
  { seed: 0xaaaaaaaa, calls: 24659 },
  { seed: 0xfffffffe, calls: 24457 },
];

describe('Charm Arrow Rand tests', () => {
  for (const { seed, calls } of cases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(charmArrowRand(r).calls, calls);
    });
  }
});
