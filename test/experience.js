import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { calculateBattleEXP, getEnemyEXP } from '../lib/Game/Experience.js';

// The EXP table by level difference (enemy LVL - character LVL).
const TABLE = {
  15: 10000, 14: 9700, 13: 9300, 12: 9000, 11: 8500, 10: 8000, 9: 7500, 8: 6900, 7: 6000,
  6: 5100, 5: 3900, 4: 2600, 3: 1600, 2: 900, 1: 400, 0: 200, [-1]: 160, [-2]: 120, [-3]: 90,
  [-4]: 70, [-5]: 50, [-6]: 30, [-7]: 20, [-8]: 15, [-9]: 10, [-10]: 7, [-11]: 5, [-12]: 3,
  [-13]: 2, [-14]: 1,
};

describe('getEnemyEXP', () => {
  for (const [diff, exp] of Object.entries(TABLE)) {
    it(`level difference ${diff} is worth ${exp}`, () => {
      assert.strictEqual(getEnemyEXP(50 + Number(diff), 50), exp);
    });
  }

  it('+15 and up are all worth 10000', () => {
    assert.strictEqual(getEnemyEXP(40, 10), 10000);
  });

  it('-14 and down are all worth 1', () => {
    assert.strictEqual(getEnemyEXP(10, 40), 1);
  });
});

describe('calculateBattleEXP', () => {
  it('adds up every enemy and splits it between the living party members', () => {
    // 400 + 200 + 160 = 760, / 3 = 253.33
    assert.strictEqual(calculateBattleEXP(20, [21, 20, 19], 3), 253);
  });

  it('gives at least 5', () => {
    // 1 + 1 = 2, / 6 = 0
    assert.strictEqual(calculateBattleEXP(60, [10, 10], 6), 5);
  });

  it('doubles with the Fortune Rune', () => {
    assert.strictEqual(calculateBattleEXP(20, [21, 20, 19], 3, true), 506);
  });

  it('doubles the minimum with the Fortune Rune', () => {
    assert.strictEqual(calculateBattleEXP(60, [10, 10], 6, true), 10);
  });
});

describe('Character.gainEXP', () => {
  it('keeps EXP under 1000 without levelling up or using RNG', () => {
    const c = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10).setEXP(300);
    const rng = new RNG(0x12);
    assert.strictEqual(c.gainEXP(699, rng).levels, 0);
    assert.strictEqual(c.EXP, 999);
    assert.strictEqual(c.LVL, 10);
    assert.strictEqual(rng.getCount(), 0);
  });

  it('levels up once per 1000 EXP and keeps the remainder', () => {
    const c = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10).setEXP(900);
    const rng = new RNG(0x12);
    assert.strictEqual(c.gainEXP(2600, rng).levels, 3);
    assert.strictEqual(c.EXP, 500);
    assert.strictEqual(c.LVL, 13);
    assert.strictEqual(rng.getCount(), 3 * 7);
  });

  it('rolls the same stat growths as levelUp', () => {
    const gained = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10);
    const levelled = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10);
    gained.gainEXP(2000, new RNG(0x12));
    levelled.levelUp(2, 10, new RNG(0x12));
    assert.deepStrictEqual(gained.stats, levelled.stats);
  });

  it('stops at LVL 99', () => {
    const c = new Character(CHARACTER_KEYS.MCDOHL).setLVL(98);
    const rng = new RNG(0x12);
    assert.strictEqual(c.gainEXP(3000, rng).levels, 1);
    assert.strictEqual(c.LVL, 99);
    assert.strictEqual(rng.getCount(), 7);
  });
});

describe('PlayerParty.awardEXP', () => {
  const makeParty = () => new PlayerParty([
    new Character(CHARACTER_KEYS.MCDOHL).setLVL(20),
    new Character(CHARACTER_KEYS.VIKTOR).setLVL(22),
    new Character(CHARACTER_KEYS.GREMIO).setLVL(18).setRune(RUNES.FORTUNE),
  ]);
  const enemies = () => new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]);

  it('gives each living member their own EXP, split between the living', () => {
    const party = makeParty();
    const enemyParty = enemies();
    const lvl = enemyParty.combatants[0].LVL;
    const results = party.awardEXP(enemyParty, new RNG(0x12));
    assert.deepStrictEqual(results.map(r => r.exp), [
      calculateBattleEXP(20, [lvl, lvl], 3),
      calculateBattleEXP(22, [lvl, lvl], 3),
      calculateBattleEXP(18, [lvl, lvl], 3, true),
    ]);
  });

  it('skips fallen members and splits between the rest', () => {
    const party = makeParty();
    party.combatants[1].HP = 0;
    const enemyParty = enemies();
    const lvl = enemyParty.combatants[0].LVL;
    const results = party.awardEXP(enemyParty, new RNG(0x12));
    assert.deepStrictEqual(results.map(r => r.character.name), [party.combatants[0].name, party.combatants[2].name]);
    assert.deepStrictEqual(results.map(r => r.exp), [
      calculateBattleEXP(20, [lvl, lvl], 2),
      calculateBattleEXP(18, [lvl, lvl], 2, true),
    ]);
    assert.strictEqual(party.combatants[1].EXP, 0);
  });

  it('rolls level-ups in slot order from the same RNG', () => {
    const party = makeParty();
    party.combatants.forEach(c => c.setEXP(999));
    const rng = new RNG(0x12);
    const results = party.awardEXP(enemies(), rng);
    assert.deepStrictEqual(results.map(r => r.levels), [1, 1, 1]);
    assert.strictEqual(rng.getCount(), 3 * 7);

    const expected = makeParty();
    const expectedRNG = new RNG(0x12);
    expected.combatants.forEach(c => c.levelUp(1, c.LVL, expectedRNG));
    assert.deepStrictEqual(party.combatants.map(c => c.stats), expected.combatants.map(c => c.stats));
  });
});

describe('Character.gainEXP growths', () => {
  it('returns the stat gains it rolled and added', () => {
    const c = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10);
    const before = { ...c.stats };
    const { levels, growths } = c.gainEXP(2000, new RNG(0x12));
    assert.strictEqual(levels, 2);
    assert.deepStrictEqual(growths, new Character(CHARACTER_KEYS.MCDOHL).calculateLevelups(2, 10, new RNG(0x12)));
    for (const [stat, gain] of Object.entries(growths)) assert.strictEqual(c.stats[stat], before[stat] + gain);
  });

  it('returns null growths without a level-up', () => {
    const c = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10);
    assert.deepStrictEqual(c.gainEXP(500, new RNG(0x12)), { levels: 0, growths: null });
  });
});

describe('PlayerParty.awardEXP removed members', () => {
  it('gives a removed member nothing but still counts them in the split', () => {
    const party = new PlayerParty([
      new Character(CHARACTER_KEYS.MCDOHL).setLVL(20),
      new Character(CHARACTER_KEYS.VIKTOR).setLVL(22),
    ]);
    party.combatants[1].removedFromFight = true; // e.g. Balloon
    const enemyParty = new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]);
    const lvl = enemyParty.combatants[0].LVL;
    const results = party.awardEXP(enemyParty, new RNG(0x12));
    assert.deepStrictEqual(results.map(r => r.character.name), [party.combatants[0].name]);
    assert.strictEqual(results[0].exp, calculateBattleEXP(20, [lvl, lvl], 2));
    assert.strictEqual(party.combatants[1].EXP, 0);
  });
});
