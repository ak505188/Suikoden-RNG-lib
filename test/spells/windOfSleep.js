import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Character from '../../lib/Game/Battle/Character.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../lib/Game/Keys.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { STATUS } from '../../lib/Game/Constants.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { spellRand, spellEffect } from '../../lib/Game/Magic/Behavior.js';
import { windOfSleepRand } from '../../lib/Game/Magic/SpellRNG/Wind.js';
import { cDiv } from '../../lib/util/math.js';
import { AREAS } from '../../battle.js';

// McDohl's Wind Lv1 (Wind of Sleep) on WindOfSleep.State (5 enemies, all eligible for the Sleep roll) and on
// SpellDuration.State (Ain Gide alone, immune to Sleep). Start seeds are the RNG value on the frame the VFX
// setup ran; the live totals are 300 + 4 per spawn-loop life roll of 0, plus one Sleep roll per eligible enemy.
// windOfSleepRand is only the particle part, so its expectation is the live total minus that enemy count.
// Native seeds first, then 20 injected ones per state.
const eligibleFiveCases = [
  { seed: 0x96b9137b, calls: 308 },
  { seed: 0x8f873905, calls: 304 },
  { seed: 0xab4c2322, calls: 304 },
  { seed: 0x5e582083, calls: 300 },
  { seed: 0x31dff4f5, calls: 300 },
  { seed: 0x21799493, calls: 308 },
  { seed: 0xe0f8c12d, calls: 304 },
  { seed: 0xafcfd1bc, calls: 304 },
  { seed: 0x154f6959, calls: 300 },
  { seed: 0xab046152, calls: 300 },
  { seed: 0xe751d526, calls: 300 },
  { seed: 0xde582083, calls: 300 },
  { seed: 0xbd912741, calls: 300 },
  { seed: 0xbb4a6632, calls: 300 },
  { seed: 0xa0304e21, calls: 300 },
  { seed: 0x81095e8e, calls: 312 },
  { seed: 0xc98534c4, calls: 300 },
  { seed: 0x47edd366, calls: 300 },
  { seed: 0x26f10a09, calls: 304 },
  { seed: 0xe4354f4e, calls: 300 },
  { seed: 0xd9466462, calls: 300 },
];

const immuneOneCases = [
  { seed: 0xfd5ecce9, calls: 300 },
  { seed: 0x58dbd149, calls: 304 },
  { seed: 0xb4a56396, calls: 304 },
  { seed: 0xf0289ce7, calls: 300 },
  { seed: 0x9cfbae39, calls: 300 },
  { seed: 0x7d3feff7, calls: 308 },
  { seed: 0x3101a6f1, calls: 304 },
  { seed: 0x6ac77c90, calls: 304 },
  { seed: 0xdd33e45d, calls: 304 },
  { seed: 0x67651ec6, calls: 300 },
  { seed: 0x3a8d3d5a, calls: 300 },
  { seed: 0x70289ce7, calls: 300 },
  { seed: 0x10de13c5, calls: 300 },
  { seed: 0x0d1a95a6, calls: 300 },
  { seed: 0x4c3e8ca5, calls: 300 },
  { seed: 0xc47f8042, calls: 312 },
  { seed: 0xa34f3f18, calls: 300 },
  { seed: 0xa059d79a, calls: 300 },
  { seed: 0x87d3da0d, calls: 304 },
  { seed: 0x4289e502, calls: 300 },
  { seed: 0x2d6210d6, calls: 300 },
];

describe('Wind of Sleep Rand tests', () => {
  for (const { seed, calls } of eligibleFiveCases) {
    it(`Should be ${calls} particle calls for ${seed.toString(16)} (5 enemies: live total ${calls + 5})`, () => {
      assert.strictEqual(windOfSleepRand(new RNG(seed)).calls, calls);
    });
  }

  for (const { seed, calls } of immuneOneCases) {
    it(`Should be ${calls} particle calls for ${seed.toString(16)} (immune enemy)`, () => {
      assert.strictEqual(windOfSleepRand(new RNG(seed)).calls, calls);
    });
  }
});

const makeMcDohl = () =>
  new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(22)
    .setRune(RUNES.WIND)
    .setStats({ PWR: 76, SKL: 86, DEF: 74, SPD: 86, MGC: 80, LUK: 79, HP: 244 })
    .rest();

/** Casts like Battle.resolvePartyRune: the spell's burn, then its effect. */
const cast = (/** @type {Enemy[]} */ enemyList, /** @type {number} */ seed) => {
  const rng = new RNG(seed);
  const actor = makeMcDohl();
  const party = new PlayerParty([actor]);
  const enemies = new EnemyParty(enemyList);
  spellRand({ spell: SPELLS.WIND_OF_SLEEP, rng, party, enemies });
  const hits = spellEffect({ actor, spell: SPELLS.WIND_OF_SLEEP, party, enemies, rng });
  return { rng, hits };
};

const makeFiveEnemies = () =>
  [
    ENEMY_KEYS.BANSHEE,
    ENEMY_KEYS.CLAY_DOLL,
    ENEMY_KEYS.RED_ELEMENTAL,
    ENEMY_KEYS.IVY,
    ENEMY_KEYS.MIRAGE,
  ].map((key) => new Enemy(key));

describe('Wind of Sleep total RNG calls', () => {
  for (const { seed, calls } of eligibleFiveCases) {
    it(`Should be ${calls + 5} for ${seed.toString(16)} with 5 eligible enemies`, () => {
      assert.strictEqual(cast(makeFiveEnemies(), seed).rng.count, calls + 5);
    });
  }

  for (const { seed, calls } of immuneOneCases) {
    it(`Should be ${calls} for ${seed.toString(16)} against an immune enemy`, () => {
      assert.strictEqual(cast([new Enemy(ENEMY_KEYS.AIN_GIDE)], seed).rng.count, calls);
    });
  }
});

// Opcode 40 on an enemy: roll = (rand * 100 / 0x7fff) % 100, Sleep lands when roll >= 30 (70%). One
// roll per eligible enemy, in enemy index order, after the particle calls. The outcomes are derived from
// the formula (live captures only counted the calls), so they check the order and the inversion.
describe('Wind of Sleep effect', () => {
  /** The rolls the formula gives for the first `n` enemies after the particle burn */
  const expectedRolls = (/** @type {number} */ seed, /** @type {number} */ n) => {
    const rng = new RNG(seed);
    windOfSleepRand(rng);
    return Array.from({ length: n }, () => cDiv(rng.next().rand * 100, 0x7fff) % 100);
  };

  it('rolls once per enemy in index order and sleeps on roll >= 30', () => {
    let sawSleep = false,
      sawAwake = false;
    for (const { seed } of eligibleFiveCases) {
      const { hits } = cast(makeFiveEnemies(), seed);
      const rolls = expectedRolls(seed, 5);
      assert.deepStrictEqual(
        hits.map((h) => h.inflicted),
        rolls.map((r) => (r >= 30 ? STATUS.SLEEP : null)),
      );
      sawSleep ||= rolls.some((r) => r >= 30);
      sawAwake ||= rolls.some((r) => r < 30);
    }
    assert.ok(sawSleep && sawAwake, 'the seeds should cover both outcomes');
  });

  it('deals no damage', () => {
    const { hits } = cast(makeFiveEnemies(), 0x96b9137b);
    assert.deepStrictEqual(
      hits.map((h) => h.damage),
      [0, 0, 0, 0, 0],
    );
  });

  it('skips a Sleep-immune enemy with no roll, and rolls for the others in order', () => {
    const enemies = [
      new Enemy(ENEMY_KEYS.BANSHEE),
      new Enemy(ENEMY_KEYS.AIN_GIDE),
      new Enemy(ENEMY_KEYS.IVY),
    ];
    const { rng, hits } = cast(enemies, 0x96b9137b);
    assert.deepStrictEqual(
      hits.map((h) => h.enemy),
      [enemies[0], enemies[2]],
    );
    const rolls = expectedRolls(0x96b9137b, 2);
    assert.deepStrictEqual(
      hits.map((h) => h.inflicted),
      rolls.map((r) => (r >= 30 ? STATUS.SLEEP : null)),
    );
    assert.strictEqual(rng.count, windOfSleepRand(new RNG(0x96b9137b)).calls + 2);
  });
});

/** @type {import('../../lib/Game/Battle/Character.js').CharacterJSON[]} */
const WindOfSleepPartyJSON = [
  {
    key: 'MCDOHL',
    id: 8,
    HP: 485,
    EXP: 873,
    inventory: [
      { id: 81 },
      { quantity: 255, id: 73 },
      { id: 17 },
      { id: 144 },
      { quantity: 2, id: 72 },
    ],
    rune: { id: 4 },
    LVL: 43,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 8 },
    stats: { SKL: 145, LUK: 125, PWR: 122, DEF: 115, HP: 485, SPD: 139, MGC: 130 },
    MP: [7, 5, 3, 0],
    status: { balloon: 0, poison: false },
  },
  {
    key: 'HIX',
    id: 63,
    HP: 451,
    EXP: 400,
    inventory: [
      { slot: 'HEAD', id: 4 },
      { slot: 'BODY', id: 15 },
      { slot: 'SHIELD', id: 67 },
      { slot: 'ACCESSORY_1', id: 28 },
      { quantity: 6, id: 25 },
    ],
    rune: { id: 0 },
    LVL: 43,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 10 },
    stats: { SKL: 111, LUK: 149, PWR: 118, DEF: 101, HP: 451, SPD: 115, MGC: 77 },
    MP: [5, 2, 1, 0],
    status: { balloon: 0, poison: false },
  },
  {
    key: 'FLIK',
    id: 17,
    HP: 500,
    EXP: 0,
    inventory: [
      { slot: 'HEAD', id: 1 },
      { slot: 'BODY', id: 12 },
      { slot: 'SHIELD', id: 67 },
      { slot: 'ACCESSORY_1', id: 38 },
      { id: 66 },
      { id: 65 },
      { id: 66 },
      { appraised: false, id: 114 },
    ],
    rune: { id: 24 },
    LVL: 44,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 9 },
    stats: { SKL: 128, LUK: 102, PWR: 133, DEF: 103, HP: 500, SPD: 135, MGC: 118 },
    MP: [6, 4, 3, 0],
    status: { balloon: 0, poison: false },
  },
  {
    key: 'LUC',
    id: 26,
    HP: 235,
    EXP: 400,
    inventory: [
      { slot: 'BODY', id: 13, locked: true },
      { slot: 'ACCESSORY_1', id: 52, locked: true },
      { id: 62 },
    ],
    rune: { id: 7 },
    LVL: 43,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 3 },
    stats: { SKL: 106, LUK: 52, PWR: 36, DEF: 45, HP: 235, SPD: 115, MGC: 171 },
    MP: [9, 7, 6, 4],
    status: { balloon: 0, poison: false },
  },
  {
    key: 'CLEO',
    id: 1,
    HP: 456,
    EXP: 534,
    inventory: [
      { slot: 'BODY', id: 10 },
      { slot: 'ACCESSORY_1', id: 42 },
    ],
    rune: { id: 5 },
    LVL: 44,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 1 },
    stats: { SKL: 130, LUK: 80, PWR: 111, DEF: 119, HP: 456, SPD: 123, MGC: 141 },
    MP: [8, 5, 4, 1],
    status: { balloon: 0, poison: false },
  },
  {
    key: 'VIKTOR',
    id: 35,
    HP: 535,
    EXP: 641,
    inventory: [
      { slot: 'BODY', id: 11 },
      { slot: 'ACCESSORY_1', id: 28 },
    ],
    rune: { id: 21 },
    LVL: 44,
    weapon: { runePiece: { element: 'NONE', amount: 0 }, lvl: 3 },
    stats: { SKL: 68, LUK: 98, PWR: 145, DEF: 141, HP: 535, SPD: 106, MGC: 74 },
    MP: [5, 2, 0, 0],
    status: { balloon: 0, poison: false },
  },
];

describe('Test 1 round of battle with Wind of Sleep cast', () => {
  const party = PlayerParty.fromCharacterJSON(WindOfSleepPartyJSON);
  const enemies = EnemyParty.fromFormation(AREAS.NECLORDS_CASTLE.encounters[8]);

  const rng = new RNG(0xdc0e0008).jump(35);

  /** @param {Action[]} actions */
  const actions = [{ type: ACTION_TYPES.RUNE, slot: 0 }];

  const battle = new Battle({ party, enemies, rng });

  battle.playTurn(actions);

  it('rng == 0x77c9100b', () => {
    assert.strictEqual(battle.rng.raw, 0x77c9100b);
  });
  it('Combatant HP in unchanged', () => {
    battle.combatants.slice(1).forEach((c) => {
      it(`${c.name} HP is unchanged`, () => {
        assert.strictEqual(c.HP, c.stats.HP);
      });
    });
  });
  it('Enemies are asleep', () => {
    battle.enemies.combatants.forEach((c) => {
      it(`${c.name} is asleep`, () => {
        assert.strictEqual(c.status.Sleep, true);
      });
    });
  });
});
