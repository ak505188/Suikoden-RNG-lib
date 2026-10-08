import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import {
  hellRand,
  blackShadowWindRand,
  blackShadowBatsRand,
  judgementRand,
  deadlyFingertipsRand,
} from '../../lib/Game/Magic/SpellRNG/SoulEater.js';

const hellCases = [
  { seed: 0x333db67a, calls: 10972 }, // TedHell.State
  { seed: 0xda27f738, calls: 10784 }, // McDohlHell.State
  { seed: 0x51a1ed4b, calls: 12220 }, // McDohlHellGregminster.State
  { seed: 0x00000001, calls: 11280 },
  { seed: 0x12345678, calls: 11668 },
  { seed: 0xdeadbeef, calls: 10812 },
  { seed: 0x00000000, calls: 10400 },
  { seed: 0xffffffff, calls: 10780 },
  { seed: 0x1b65fc6a, calls: 11224 },
  { seed: 0xd7250f7e, calls: 10864 },
  { seed: 0x41c64e6d, calls: 11708 },
  { seed: 0x7fffffff, calls: 10780 },
  { seed: 0x80000000, calls: 10400 },
  { seed: 0x0badf00d, calls: 11308 },
  { seed: 0xcafebabe, calls: 10764 },
  { seed: 0x5eed1234, calls: 10824 },
  { seed: 0x99999999, calls: 11332 },
  { seed: 0x33333333, calls: 10532 },
  { seed: 0x0000ffff, calls: 10824 },
  { seed: 0xffff0000, calls: 12220 },
  { seed: 0x11111111, calls: 10832 },
  { seed: 0x22222222, calls: 10756 },
  { seed: 0xabcdef01, calls: 11192 },
];

describe('Hell Rand tests', () => {
  for (const { seed, calls } of hellCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(hellRand(r).calls, calls);
    });
  }
});

const blackShadowWindCases = [
  { seed: 0x6a2d97b4, calls: 5796 }, // BlackShadowWind.State
  { seed: 0x00000001, calls: 6260 },
  { seed: 0x12345678, calls: 5736 },
  { seed: 0xdeadbeef, calls: 5968 },
  { seed: 0x00000000, calls: 5884 },
  { seed: 0xffffffff, calls: 5928 },
  { seed: 0x1b65fc6a, calls: 5732 },
  { seed: 0xd7250f7e, calls: 5664 },
  { seed: 0x41c64e6d, calls: 6548 },
  { seed: 0x7fffffff, calls: 5928 },
  { seed: 0x80000000, calls: 5884 },
  { seed: 0x0badf00d, calls: 5964 },
  { seed: 0xcafebabe, calls: 5860 },
  { seed: 0x5eed1234, calls: 6496 },
  { seed: 0x99999999, calls: 6616 },
  { seed: 0x33333333, calls: 6272 },
  { seed: 0x0000ffff, calls: 5800 },
  { seed: 0xffff0000, calls: 6276 },
  { seed: 0x11111111, calls: 5844 },
  { seed: 0x22222222, calls: 6376 },
  { seed: 0xabcdef01, calls: 6384 },
];

const blackShadowBatsCases = [
  { seed: 0x06614a28, calls: 9476 }, // BlackShadowBats.State
  { seed: 0x00000001, calls: 9808 },
  { seed: 0x12345678, calls: 9632 },
  { seed: 0xdeadbeef, calls: 9560 },
  { seed: 0x00000000, calls: 9484 },
  { seed: 0xffffffff, calls: 9544 },
  { seed: 0x1b65fc6a, calls: 9708 },
  { seed: 0xd7250f7e, calls: 9572 },
  { seed: 0x41c64e6d, calls: 9648 },
  { seed: 0x7fffffff, calls: 9544 },
  { seed: 0x80000000, calls: 9484 },
  { seed: 0x0badf00d, calls: 10188 },
  { seed: 0xcafebabe, calls: 9552 },
  { seed: 0x5eed1234, calls: 9960 },
  { seed: 0x99999999, calls: 9444 },
  { seed: 0x33333333, calls: 9824 },
  { seed: 0x0000ffff, calls: 9500 },
  { seed: 0xffff0000, calls: 9832 },
  { seed: 0x11111111, calls: 9480 },
  { seed: 0x22222222, calls: 9712 },
  { seed: 0xabcdef01, calls: 9876 },
];

describe('Black Shadow Rand tests', () => {
  describe('Wind savestate', () => {
    for (const { seed, calls } of blackShadowWindCases) {
      const r = new RNG(seed);
      it(`Should be ${calls} for ${seed.toString(16)}`, () => {
        assert.strictEqual(blackShadowWindRand(r).calls, calls);
      });
    }
  });

  describe('Bats savestate', () => {
    for (const { seed, calls } of blackShadowBatsCases) {
      const r = new RNG(seed);
      it(`Should be ${calls} for ${seed.toString(16)}`, () => {
        assert.strictEqual(blackShadowBatsRand(r).calls, calls);
      });
    }
  });
});

// McDohl's Judgement (Soul Eater Lv4) on SpellDuration.State. Start seeds are the RNG value on the frame the VFX
// setup ran; counts are the real number of rand() calls through the end of the tick machine. The first
// three are native-seed per-frame captures, then 20 injected seeds. Each seed's setup roll gives a different
// spread, 152-176.
const judgementCases = [
  { seed: 0xfd5ecce9, calls: 167 },
  { seed: 0x60d0e275, calls: 161 },
  { seed: 0x72bc8dbc, calls: 167 },
  { seed: 0x58dbd149, calls: 167 },
  { seed: 0xb4a56396, calls: 173 },
  { seed: 0xf0289ce7, calls: 158 },
  { seed: 0x9cfbae39, calls: 152 },
  { seed: 0x7d3feff7, calls: 170 },
  { seed: 0x3101a6f1, calls: 167 },
  { seed: 0x6ac77c90, calls: 158 },
  { seed: 0xdd33e45d, calls: 164 },
  { seed: 0x67651ec6, calls: 167 },
  { seed: 0x3a8d3d5a, calls: 167 },
  { seed: 0x70289ce7, calls: 158 },
  { seed: 0x10de13c5, calls: 170 },
  { seed: 0x0d1a95a6, calls: 173 },
  { seed: 0x4c3e8ca5, calls: 170 },
  { seed: 0xc47f8042, calls: 164 },
  { seed: 0xa34f3f18, calls: 173 },
  { seed: 0xa059d79a, calls: 155 },
  { seed: 0x87d3da0d, calls: 176 },
  { seed: 0x4289e502, calls: 167 },
  { seed: 0x2d6210d6, calls: 164 },
];

describe('Judgement Rand tests', () => {
  for (const { seed, calls } of judgementCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(judgementRand(r).calls, calls);
    });
  }
});

// McDohl's own Soul Eater Rune slot 1 (Deadly Fingertips) on SpellDuration.State. Start seeds are the RNG value
// at the VFX setup frame; counts are the real number of rand() calls through the cleanup, from 20 injected seeds.
// The instant-death check and the hit script roll nothing; all of it is a 30-spark pool's respawns, so the total
// is 5 x (spark spawns), 1075-1170.
const deadlyFingertipsCases = [
  { seed: 0x58dbd149, calls: 1130 },
  { seed: 0xb4a56396, calls: 1120 },
  { seed: 0xf0289ce7, calls: 1100 },
  { seed: 0x9cfbae39, calls: 1110 },
  { seed: 0x7d3feff7, calls: 1150 },
  { seed: 0x3101a6f1, calls: 1160 },
  { seed: 0x6ac77c90, calls: 1145 },
  { seed: 0xdd33e45d, calls: 1120 },
  { seed: 0x67651ec6, calls: 1075 },
  { seed: 0x3a8d3d5a, calls: 1150 },
  { seed: 0x70289ce7, calls: 1100 },
  { seed: 0x10de13c5, calls: 1160 },
  { seed: 0x0d1a95a6, calls: 1125 },
  { seed: 0x4c3e8ca5, calls: 1075 },
  { seed: 0xc47f8042, calls: 1140 },
  { seed: 0xa34f3f18, calls: 1120 },
  { seed: 0xa059d79a, calls: 1120 },
  { seed: 0x87d3da0d, calls: 1170 },
  { seed: 0x4289e502, calls: 1105 },
  { seed: 0x2d6210d6, calls: 1105 },
];

describe('Deadly Fingertips Rand tests', () => {
  for (const { seed, calls } of deadlyFingertipsCases) {
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      const r = new RNG(seed);
      assert.strictEqual(deadlyFingertipsRand(r).calls, calls);
      assert.strictEqual(r.count, calls);
    });
  }
});

describe('Deadly Fingertips spellRand', () => {
  it('burns the same calls as deadlyFingertipsRand, memoized or not', async () => {
    const { spellRand } = await import('../../lib/Game/Magic/Behavior.js');
    const { SPELLS } = await import('../../lib/Game/Magic/Spells.js');
    const { EnemyParty, PlayerParty } = await import('../../lib/Game/Battle/Party.js');
    for (const { seed, calls } of deadlyFingertipsCases.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        const r = new RNG(seed);
        const burned = spellRand({
          spell: SPELLS.DEADLY_FINGERTIPS,
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
