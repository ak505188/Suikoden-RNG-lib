import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { charmArrowRand } from '../../lib/Game/Magic/SpellRNG/Resurrection.js';

const cases = [
  { rng: 0xddb92a9b, calls: 24436 },
  { rng: 0x11111111, calls: 24967 },
  { rng: 0xcafebabe, calls: 24828 },
  { rng: 0xdeadbeef, calls: 24305 },
  { rng: 0x00000001, calls: 24586 },
  { rng: 0x7fffffff, calls: 24412 },
  { rng: 0x9e3779b9, calls: 24438 },
  { rng: 0x12345678, calls: 24660 },
  { rng: 0xa5a5a5a5, calls: 24835 },
  { rng: 0x00c0ffee, calls: 24690 },
  { rng: 0x1badb002, calls: 24302 },
  { rng: 0x5eadbeef, calls: 24305 },
  { rng: 0x8badf00d, calls: 24675 },
  { rng: 0xfeedface, calls: 24599 },
  { rng: 0x0defaced, calls: 24386 },
  { rng: 0xabad1dea, calls: 24508 },
  { rng: 0x31337000, calls: 24519 },
  { rng: 0x42424242, calls: 24595 },
  { rng: 0x55555555, calls: 24381 },
  { rng: 0xaaaaaaaa, calls: 24659 },
  { rng: 0xfffffffe, calls: 24457 },
];

describe("Charm Arrow Rand tests", () => {
  for (const { rng, calls } of cases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(charmArrowRand(r).calls, calls);
    });
  };
});
