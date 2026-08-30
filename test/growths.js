import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import {
  calculateLevelupGrowth,
  characterLevelUp,
  characterLevelUps,
  generateCharacterMultipleLevelup,
} from '../stats/growths.js';
import { getGrowthValue, getCharacterStatGrowth } from '../stats/characters.js';

describe('calculateLevelupGrowth', () => {
  it('floors to 0 when the RNG contributes nothing', () => {
    assert.strictEqual(calculateLevelupGrowth(0, 242, false), 0);
  });

  it('masks non-HP rolls to 0xff before adding the growth value', () => {
    // 0x1ff would overflow into the next bucket if it weren't masked to 0xff.
    assert.strictEqual(calculateLevelupGrowth(0x1ff, 242, false), calculateLevelupGrowth(0xff, 242, false));
    assert.strictEqual(calculateLevelupGrowth(0xff, 242, false), 1);
  });

  it('masks HP rolls to 0x1ff instead of 0xff', () => {
    assert.strictEqual(calculateLevelupGrowth(0x1ff, 835, true), 5);
    assert.strictEqual(calculateLevelupGrowth(0x3ff, 835, true), calculateLevelupGrowth(0x1ff, 835, true));
  });
});

describe('getGrowthValue', () => {
  it('uses the [0, 20) growth value below level 20', () => {
    assert.strictEqual(getCharacterStatGrowth('McDohl', 'PWR'), 6);
    assert.strictEqual(getGrowthValue('McDohl', 'PWR', 19), 835);
  });

  it('bumps to the [20, 60) growth value at the level 20 cutoff', () => {
    assert.strictEqual(getGrowthValue('McDohl', 'PWR', 20), 563);
    assert.strictEqual(getGrowthValue('McDohl', 'PWR', 59), 563);
  });

  it('bumps to the [60, ∞) growth value at the level 60 cutoff', () => {
    assert.strictEqual(getGrowthValue('McDohl', 'PWR', 60), 177);
  });

  it('uses a level 15 cutoff instead of 20 for growth ID 9', () => {
    assert.strictEqual(getCharacterStatGrowth('Viktor', 'PWR'), 9);
    assert.strictEqual(getGrowthValue('Viktor', 'PWR', 14), 1682);
    assert.strictEqual(getGrowthValue('Viktor', 'PWR', 15), 420);
    assert.strictEqual(getGrowthValue('Viktor', 'PWR', 59), 420);
    assert.strictEqual(getGrowthValue('Viktor', 'PWR', 60), 196);
  });

  it('looks up HP growth off of the PWR growth ID', () => {
    assert.strictEqual(getGrowthValue('McDohl', 'HP', 19), 2613);
    assert.strictEqual(getGrowthValue('McDohl', 'HP', 20), 2816);
  });
});

describe('characterLevelUp', () => {
  it('is deterministic for a given RNG state (McDohl, level 25, 0x12 @ 30000)', () => {
    const rng = new RNG(0x12).next(30000);
    const growth = characterLevelUp('McDohl', 25, rng);
    assert.deepStrictEqual(growth, { PWR: 2, SKL: 2, DEF: 2, SPD: 3, MGC: 2, LUK: 3, HP: 11 });
  });

  it('advances the RNG by exactly one roll per stat', () => {
    const rng = new RNG(0x12).next(30000);
    characterLevelUp('McDohl', 25, rng);
    assert.strictEqual(rng.count, 30000 + 7);
  });
});

describe('generateCharacterMultipleLevelup', () => {
  it('matches characterLevelUps when summed (McDohl, 24 -> 27, 0x12 @ 30000)', () => {
    const perLevel = generateCharacterMultipleLevelup(new RNG(0x12).next(30000), 'McDohl', 24, 3);
    const summed = perLevel.reduce((total, stats) => {
      Object.entries(stats).forEach(([stat, value]) => {
        total[stat] = (total[stat] ?? 0) + value;
      });
      return total;
    }, {});

    const cumulative = characterLevelUps('McDohl', 24, 3, new RNG(0x12).next(30000));

    assert.deepStrictEqual(summed, cumulative);
  });

  it('is deterministic for a given RNG state (McDohl, 24 -> 27, 0x12 @ 30000)', () => {
    const perLevel = generateCharacterMultipleLevelup(new RNG(0x12).next(30000), 'McDohl', 24, 3);
    assert.deepStrictEqual(perLevel, [
      { PWR: 2, SKL: 2, DEF: 2, SPD: 3, MGC: 2, LUK: 3, HP: 11 },
      { PWR: 2, SKL: 3, DEF: 1, SPD: 3, MGC: 3, LUK: 2, HP: 11 },
      { PWR: 2, SKL: 2, DEF: 2, SPD: 3, MGC: 2, LUK: 2, HP: 11 },
    ]);
  });
});

// Regression baseline mirroring the party-levelup pattern used in
// scripts/gigantesLevelups.js: a single RNG stream advances sequentially
// across every character in the party (nobody's rolls are cloned/reset),
// so the results below depend on the exact order stats and characters
// are processed in as well as the growth math itself.
describe('Party levelups (regression baseline, 0x12 @ 30000)', () => {
  const party = [
    { name: 'McDohl', level: 24, levels_gained: 1 },
    { name: 'Gremio', level: 24, levels_gained: 1 },
    { name: 'Viktor', level: 24, levels_gained: 1 },
    { name: 'Cleo', level: 24, levels_gained: 1 },
    { name: 'Kirkis', level: 18, levels_gained: 2 },
    { name: 'Valeria', level: 27, levels_gained: 1 },
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
  for (const character of party) {
    levelUps[character.name] = generateCharacterMultipleLevelup(
      rng,
      character.name,
      character.level,
      character.levels_gained
    ).reduce((total, stats) => {
      Object.entries(stats).forEach(([stat, value]) => {
        total[stat] = (total[stat] ?? 0) + value;
      });
      return total;
    }, {});
  }

  for (const character of party) {
    it(`${character.name} gains the expected stats`, () => {
      assert.deepStrictEqual(levelUps[character.name], expected[character.name]);
    });
  }

  it('advances the shared RNG by 7 rolls per level-up across the whole party', () => {
    const totalLevels = party.reduce((sum, character) => sum + character.levels_gained, 0);
    assert.strictEqual(rng.count, 30000 + totalLevels * 7);
  });
});
