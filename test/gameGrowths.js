import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import Character from '../lib/Game/Battle/Character.js';
import CHARACTERS from '../lib/Game/Characters.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import { calculateLevelupGrowth, getGrowthValue } from '../lib/Game/Growths.js';
import { STATS } from '../lib/Game/Constants.js';

describe('calculateLevelupGrowth', () => {
  it('floors to 0 when the RNG contributes nothing', () => {
    assert.strictEqual(calculateLevelupGrowth(0, 242, STATS.PWR), 0);
  });

  it('masks non-HP rolls to 0xff before adding the growth value', () => {
    // 0x1ff would overflow into the next bucket if it weren't masked to 0xff.
    assert.strictEqual(calculateLevelupGrowth(0x1ff, 242, STATS.PWR), calculateLevelupGrowth(0xff, 242, STATS.PWR));
    assert.strictEqual(calculateLevelupGrowth(0xff, 242, STATS.PWR), 1);
  });

  it('masks HP rolls to 0x1ff instead of 0xff', () => {
    assert.strictEqual(calculateLevelupGrowth(0x1ff, 835, STATS.HP), 5);
    assert.strictEqual(calculateLevelupGrowth(0x3ff, 835, STATS.HP), calculateLevelupGrowth(0x1ff, 835, STATS.HP));
  });
});

describe('getGrowthValue', () => {
  const mcdohlGrowths = CHARACTERS.MCDOHL.stats.growths;
  const viktorGrowths = CHARACTERS.VIKTOR.stats.growths;

  it('uses the [0, 20) growth value below level 20', () => {
    assert.strictEqual(mcdohlGrowths.PWR, 6);
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.PWR, 19), 835);
  });

  it('bumps to the [20, 60) growth value at the level 20 cutoff', () => {
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.PWR, 20), 563);
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.PWR, 59), 563);
  });

  it('bumps to the [60, ∞) growth value at the level 60 cutoff', () => {
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.PWR, 60), 177);
  });

  it('uses a level 15 cutoff instead of 20 for growth ID 9', () => {
    assert.strictEqual(viktorGrowths.PWR, 9);
    assert.strictEqual(getGrowthValue(viktorGrowths, STATS.PWR, 14), 1682);
    assert.strictEqual(getGrowthValue(viktorGrowths, STATS.PWR, 15), 420);
    assert.strictEqual(getGrowthValue(viktorGrowths, STATS.PWR, 59), 420);
    assert.strictEqual(getGrowthValue(viktorGrowths, STATS.PWR, 60), 196);
  });

  it('looks up HP growth off of the PWR growth ID', () => {
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.HP, 19), 2613);
    assert.strictEqual(getGrowthValue(mcdohlGrowths, STATS.HP, 20), 2816);
  });
});

describe('Character#calculateLevelups (single level)', () => {
  it('is deterministic for a given RNG state (McDohl, level 24 -> 25, 0x12 @ 30000)', () => {
    const rng = new RNG(0x12).next(30000);
    const character = new Character(CHARACTER_KEYS.MCDOHL);
    const growth = character.calculateLevelups(1, 24, rng);
    assert.deepStrictEqual(growth, { PWR: 2, SKL: 2, DEF: 2, SPD: 3, MGC: 2, LUK: 3, HP: 11 });
  });

  it('advances the RNG by exactly one roll per stat', () => {
    const rng = new RNG(0x12).next(30000);
    const character = new Character(CHARACTER_KEYS.MCDOHL);
    character.calculateLevelups(1, 24, rng);
    assert.strictEqual(rng.count, 30000 + 7);
  });
});

describe('Character#calculateLevelups (multiple levels)', () => {
  it('sums growths across levels (McDohl, 24 -> 27, 0x12 @ 30000)', () => {
    const rng = new RNG(0x12).next(30000);
    const character = new Character(CHARACTER_KEYS.MCDOHL);
    const growth = character.calculateLevelups(3, 24, rng);
    assert.deepStrictEqual(growth, { PWR: 6, SKL: 7, DEF: 5, SPD: 9, MGC: 7, LUK: 7, HP: 33 });
  });

  it('advances the RNG by 7 rolls per level', () => {
    const rng = new RNG(0x12).next(30000);
    const character = new Character(CHARACTER_KEYS.MCDOHL);
    character.calculateLevelups(3, 24, rng);
    assert.strictEqual(rng.count, 30000 + 3 * 7);
  });
});

// Regression baseline mirroring the party-levelup pattern used in
// scripts/gigantesLevelups.js: a single RNG stream advances sequentially
// across every character in the party (nobody's rolls are cloned/reset),
// so the results below depend on the exact order stats and characters
// are processed in as well as the growth math itself.
describe('Party levelups (regression baseline, 0x12 @ 30000)', () => {
  const party = [
    { key: CHARACTER_KEYS.MCDOHL, name: 'McDohl', level: 24, levels_gained: 1 },
    { key: CHARACTER_KEYS.GREMIO, name: 'Gremio', level: 24, levels_gained: 1 },
    { key: CHARACTER_KEYS.VIKTOR, name: 'Viktor', level: 24, levels_gained: 1 },
    { key: CHARACTER_KEYS.CLEO, name: 'Cleo', level: 24, levels_gained: 1 },
    { key: CHARACTER_KEYS.KIRKIS, name: 'Kirkis', level: 18, levels_gained: 2 },
    { key: CHARACTER_KEYS.VALERIA, name: 'Valeria', level: 27, levels_gained: 1 },
  ];

  const expected = {
    McDohl: { PWR: 2, SKL: 2, DEF: 2, SPD: 3, MGC: 2, LUK: 3, HP: 11 },
    Gremio: { PWR: 1, SKL: 2, DEF: 2, SPD: 2, MGC: 2, LUK: 2, HP: 9 },
    Viktor: { PWR: 2, SKL: 1, DEF: 3, SPD: 2, MGC: 1, LUK: 2, HP: 5 },
    Cleo: { PWR: 1, SKL: 2, DEF: 2, SPD: 2, MGC: 2, LUK: 1, HP: 10 },
    Kirkis: { PWR: 5, SKL: 7, DEF: 5, SPD: 7, MGC: 5, LUK: 3, HP: 19 },
    Valeria: { PWR: 3, SKL: 2, DEF: 2, SPD: 2, MGC: 2, LUK: 2, HP: 12 },
  };

  const rng = new RNG(0x12).next(30000);
  const levelUps = {};
  for (const member of party) {
    const character = new Character(member.key);
    levelUps[member.name] = character.calculateLevelups(member.levels_gained, member.level, rng);
  }

  for (const member of party) {
    it(`${member.name} gains the expected stats`, () => {
      assert.deepStrictEqual(levelUps[member.name], expected[member.name]);
    });
  }

  it('advances the shared RNG by 7 rolls per level-up across the whole party', () => {
    const totalLevels = party.reduce((sum, member) => sum + member.levels_gained, 0);
    assert.strictEqual(rng.count, 30000 + totalLevels * 7);
  });
});
