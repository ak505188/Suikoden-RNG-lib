import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import {
  earthquakeRand,
  clayGuardianRand,
  guardianEarthRand,
} from '../../lib/Game/Magic/SpellRNG/Earth.js';

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

describe('Earthquake Rand tests', () => {
  for (const { rng, calls } of cases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(earthquakeRand(r).calls, calls);
    });
  }
});

// McDohl's Earth Lv1 (Clay Guardian) on SpellDuration.State, aimed at himself. Start seeds are the RNG value on
// the frame the VFX setup ran; counts are the live LCG-step distance to the end handler. 90-132 over 20 seeds,
// always a multiple of 3.
const clayGuardianCases = [
  { rng: 0x58dbd149, calls: 105 },
  { rng: 0xb4a56396, calls: 117 },
  { rng: 0xf0289ce7, calls: 129 },
  { rng: 0x9cfbae39, calls: 120 },
  { rng: 0x7d3feff7, calls: 111 },
  { rng: 0x3101a6f1, calls: 105 },
  { rng: 0x6ac77c90, calls: 132 },
  { rng: 0xdd33e45d, calls: 114 },
  { rng: 0x67651ec6, calls: 105 },
  { rng: 0x3a8d3d5a, calls: 99 },
  { rng: 0x70289ce7, calls: 129 },
  { rng: 0x10de13c5, calls: 132 },
  { rng: 0x0d1a95a6, calls: 117 },
  { rng: 0x4c3e8ca5, calls: 117 },
  { rng: 0xc47f8042, calls: 105 },
  { rng: 0xa34f3f18, calls: 96 },
  { rng: 0xa059d79a, calls: 105 },
  { rng: 0x87d3da0d, calls: 102 },
  { rng: 0x4289e502, calls: 114 },
  { rng: 0x2d6210d6, calls: 90 },
];

describe('Clay Guardian Rand tests', () => {
  for (const { rng, calls } of clayGuardianCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(clayGuardianRand(r).calls, calls);
    });
  }
});

// McDohl's Mother Earth Rune (Guardian Earth, id 33, slot 4), whole party, on SpellDuration.State. Start seeds are
// the RNG value at the VFX setup frame; counts are the real number of rand() calls through the end handler, from
// 20 injected seeds. Each of the 40 sparkles rolls its start tick at setup, then respawns every 34 passes for 2
// calls, so the total is 40 + 2 x (activations): 380-408, always even.
const guardianEarthCases = [
  { rng: 0x58dbd149, calls: 408 },
  { rng: 0xb4a56396, calls: 404 },
  { rng: 0xf0289ce7, calls: 396 },
  { rng: 0x9cfbae39, calls: 400 },
  { rng: 0x7d3feff7, calls: 402 },
  { rng: 0x3101a6f1, calls: 408 },
  { rng: 0x6ac77c90, calls: 396 },
  { rng: 0xdd33e45d, calls: 380 },
  { rng: 0x67651ec6, calls: 408 },
  { rng: 0x3a8d3d5a, calls: 384 },
  { rng: 0x70289ce7, calls: 396 },
  { rng: 0x10de13c5, calls: 402 },
  { rng: 0x0d1a95a6, calls: 392 },
  { rng: 0x4c3e8ca5, calls: 380 },
  { rng: 0xc47f8042, calls: 390 },
  { rng: 0xa34f3f18, calls: 398 },
  { rng: 0xa059d79a, calls: 384 },
  { rng: 0x87d3da0d, calls: 400 },
  { rng: 0x4289e502, calls: 398 },
  { rng: 0x2d6210d6, calls: 394 },
];

describe('Guardian Earth Rand tests', () => {
  for (const { rng, calls } of guardianEarthCases) {
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      const r = new RNG(rng);
      assert.strictEqual(guardianEarthRand(r).calls, calls);
      assert.strictEqual(r.count, calls);
    });
  }
});

describe('Guardian Earth spellRand', () => {
  it('burns the same calls as guardianEarthRand, memoized or not', async () => {
    const { spellRand } = await import('../../lib/Game/Magic/Behavior.js');
    const { SPELLS } = await import('../../lib/Game/Magic/Spells.js');
    const { EnemyParty, PlayerParty } = await import('../../lib/Game/Battle/Party.js');
    for (const { rng, calls } of guardianEarthCases.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        const r = new RNG(rng);
        const burned = spellRand({
          spell: SPELLS.GUARDIAN_EARTH,
          rng: r,
          party: new PlayerParty([]),
          enemies: new EnemyParty([]),
        });
        assert.strictEqual(burned, calls);
        assert.strictEqual(r.count, calls);
      }
    }
  });
});
