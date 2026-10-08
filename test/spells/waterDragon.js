import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { waterDragonRand } from '../../lib/Game/Magic/SpellRNG/Unites.js';
import { spellRand } from '../../lib/Game/Magic/Behavior.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';

// McDohl's Water + Luc's Wind (Magic Unite Water Dragon, id 38) on SpellDuration.State, aimed at the first
// enemy. Start seeds are the RNG value at the VFX setup frame; counts are the real number of rand() calls
// through the end of the tick machine, from 20 injected seeds. Three respawning particle pools make the total
// seed-dependent, 2998-3193.
const waterDragonCases = [
  { seed: 0x58dbd149, calls: 2998 },
  { seed: 0xb4a56396, calls: 3024 },
  { seed: 0xf0289ce7, calls: 3013 },
  { seed: 0x9cfbae39, calls: 3179 },
  { seed: 0x7d3feff7, calls: 3160 },
  { seed: 0x3101a6f1, calls: 3128 },
  { seed: 0x6ac77c90, calls: 3040 },
  { seed: 0xdd33e45d, calls: 3025 },
  { seed: 0x67651ec6, calls: 3104 },
  { seed: 0x3a8d3d5a, calls: 3037 },
  { seed: 0x70289ce7, calls: 3013 },
  { seed: 0x10de13c5, calls: 3013 },
  { seed: 0x0d1a95a6, calls: 3061 },
  { seed: 0x4c3e8ca5, calls: 3022 },
  { seed: 0xc47f8042, calls: 3193 },
  { seed: 0xa34f3f18, calls: 3095 },
  { seed: 0xa059d79a, calls: 3097 },
  { seed: 0x87d3da0d, calls: 3004 },
  { seed: 0x4289e502, calls: 3099 },
  { seed: 0x2d6210d6, calls: 3048 },
];

describe('Water Dragon Rand tests', () => {
  for (const { seed, calls } of waterDragonCases) {
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      const r = new RNG(seed);
      assert.strictEqual(waterDragonRand(r).calls, calls);
      assert.strictEqual(r.count, calls);
    });
  }
});

describe('Water Dragon spellRand', () => {
  it('burns the same calls as waterDragonRand, memoized or not', () => {
    const party = new PlayerParty([]);
    const enemies = new EnemyParty([]);
    for (const { seed, calls } of waterDragonCases.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        const r = new RNG(seed);
        assert.strictEqual(
          spellRand({ spell: SPELLS.WATER_DRAGON, rng: r, party, enemies }),
          calls,
        );
        assert.strictEqual(r.count, calls);
      }
    }
  });
});
