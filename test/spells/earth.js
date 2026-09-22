import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { earthquakeRand } from '../../lib/Game/Magic/SpellRNG/Earth.js';

const cases = [
  { rng: 0xe15d6b34, calls: 1626 },
  { rng: 0x11111111, calls: 1639 },
  { rng: 0xcafebabe, calls: 1678 },
  { rng: 0xdeadbeef, calls: 1607 },
  { rng: 0x00000001, calls: 1534 },
  { rng: 0x7fffffff, calls: 1667 },
  { rng: 0x9e3779b9, calls: 1621 },
  { rng: 0x12345678, calls: 1631 },
  { rng: 0xa5a5a5a5, calls: 1659 },
  { rng: 0x00c0ffee, calls: 1622 },
  { rng: 0x1badb002, calls: 1614 },
  { rng: 0x5eadbeef, calls: 1607 },
  { rng: 0x8badf00d, calls: 1677 },
  { rng: 0xfeedface, calls: 1630 },
  { rng: 0x0defaced, calls: 1625 },
  { rng: 0xabad1dea, calls: 1592 },
  { rng: 0x31337000, calls: 1643 },
  { rng: 0x42424242, calls: 1704 },
  { rng: 0x55555555, calls: 1651 },
  { rng: 0xaaaaaaaa, calls: 1628 },
  { rng: 0xfffffffe, calls: 1639 },
];

describe("Earthquake Rand tests", () => {
  for (const { rng, calls } of cases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(earthquakeRand(r).calls, calls);
    });
  };
});
