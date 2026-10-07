import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { thorRand } from '../../lib/Game/Magic/SpellRNG/Unites.js';
import { spellRand } from '../../lib/Game/Magic/Behavior.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';

// McDohl's Lightning + Luc's Water (Magic Unite Thor, id 37) on SpellDuration.State, aimed at the first enemy.
// Start seeds are the RNG value at the VFX setup frame; counts are the real number of rand() calls through the
// end of the tick machine, from 20 injected seeds. The arcs' respawns make the total seed-dependent, 550-610.
const thorCases = [
  { rng: 0x58dbd149, calls: 594 },
  { rng: 0xb4a56396, calls: 590 },
  { rng: 0xf0289ce7, calls: 574 },
  { rng: 0x9cfbae39, calls: 590 },
  { rng: 0x7d3feff7, calls: 554 },
  { rng: 0x3101a6f1, calls: 550 },
  { rng: 0x6ac77c90, calls: 570 },
  { rng: 0xdd33e45d, calls: 610 },
  { rng: 0x67651ec6, calls: 570 },
  { rng: 0x3a8d3d5a, calls: 574 },
  { rng: 0x70289ce7, calls: 574 },
  { rng: 0x10de13c5, calls: 574 },
  { rng: 0x0d1a95a6, calls: 566 },
  { rng: 0x4c3e8ca5, calls: 586 },
  { rng: 0xc47f8042, calls: 578 },
  { rng: 0xa34f3f18, calls: 586 },
  { rng: 0xa059d79a, calls: 566 },
  { rng: 0x87d3da0d, calls: 554 },
  { rng: 0x4289e502, calls: 574 },
  { rng: 0x2d6210d6, calls: 550 },
];

describe('Thor Rand tests', () => {
  for (const { rng, calls } of thorCases) {
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      const r = new RNG(rng);
      assert.strictEqual(thorRand(r).calls, calls);
      assert.strictEqual(r.count, calls);
    });
  }
});

describe('Thor spellRand', () => {
  it('burns the same calls as thorRand, memoized or not', () => {
    for (const { rng, calls } of thorCases.slice(0, 3)) {
      const r = new RNG(rng);
      const party = new PlayerParty([]);
      const enemies = new EnemyParty([]);
      for (let pass = 0; pass < 2; pass++) {
        const r2 = new RNG(rng);
        assert.strictEqual(spellRand({ spell: SPELLS.THOR, rng: r2, party, enemies }), calls);
        assert.strictEqual(r2.count, calls);
      }
      assert.strictEqual(r.rng, rng);
    }
  });
});
