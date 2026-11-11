import { describe, it } from 'node:test';
import assert from 'node:assert';
import Teo2SimOutput from '../fixtures/minigames/war_teo2_sim_output.json' with { type: 'json' };
import {
  MATCHUP,
  WarBattle,
  WAR_CHARACTERS,
  WAR_CHARACTER_KEYS,
  WAR_OUTCOMES,
  WAR_SCENARIOS,
  WAR_SCENARIO_KEYS,
  WAR_TYPES,
  WAR_UNITS,
  WAR_UNIT_KEYS,
  WAR_VERSIONS,
} from '../../war.js';
import { rcos, rcosV10, rsin, rsinV10 } from '../../lib/Game/War/WarField.js';

/** @typedef {import('../../war.js').WarCharacterKey} WarCharacterKey */

/** The war's characters by war ID */
const keysById = (/** @type {number[]} */ ids) =>
  /** @type {WarCharacterKey[]} */ (
    ids.map((id) => Object.keys(WAR_CHARACTERS).find((k) => WAR_CHARACTERS[k].id === id))
  );

/** The kuwa savestate's roster: 5625 soldiers */
const KUWA_RECRUITS = keysById([
  0, 1, 2, 3, 4, 5, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 39, 48, 74, 83, 90,
]);

/** The Teo 2 brute-force sheet's roster */
const TEO2_RECRUITS = keysById([
  0, 3, 4, 5, 7, 8, 9, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  38, 39, 40, 44, 45, 46, 48, 67, 74, 83, 90, 92,
]);

const OUTCOMES = { 0: WAR_OUTCOMES.VICTORY, 5: WAR_OUTCOMES.DEFEAT, 8: WAR_OUTCOMES.NO_UNITS_LEFT };

describe('war data', () => {
  it('has a key for every war character, unit and scenario', () => {
    assert.deepStrictEqual(
      Object.keys(WAR_CHARACTERS).sort(),
      Object.keys(WAR_CHARACTER_KEYS).sort(),
    );
    assert.deepStrictEqual(Object.keys(WAR_UNITS).sort(), Object.keys(WAR_UNIT_KEYS).sort());
    assert.deepStrictEqual(
      Object.keys(WAR_SCENARIOS).sort(),
      Object.keys(WAR_SCENARIO_KEYS).sort(),
    );
  });

  it('numbers the characters 0..107 and the units 0..35', () => {
    const ids = Object.values(WAR_CHARACTERS)
      .map((c) => c.id)
      .sort((a, b) => a - b);
    assert.deepStrictEqual(
      ids,
      Array.from({ length: 108 }, (_, i) => i),
    );
    const unitIds = Object.values(WAR_UNITS)
      .map((u) => u.id)
      .sort((a, b) => a - b);
    assert.deepStrictEqual(
      unitIds,
      Array.from({ length: 36 }, (_, i) => i),
    );
  });

  it('puts every character in exactly one unit of three', () => {
    const seen = Object.values(WAR_UNITS).flatMap((u) => u.members);
    assert.strictEqual(seen.length, 108);
    assert.strictEqual(new Set(seen).size, 108);
    for (const u of Object.values(WAR_UNITS)) {
      assert.strictEqual(u.members.length, 3);
      for (const m of u.members) assert.ok(WAR_CHARACTERS[m], m);
    }
  });
});

describe('who the war ids are', () => {
  // The game's tables are indexed by war id and hold no names. The names were first taken from the
  // recruitment flags' addresses, which are rotated for these three (Suikoden-Bizhawk-HUD's
  // Addresses.lua gives their `Id` and their RecruitmentState offset differently). The `Id` names
  // are the ones that fit the Teo 2 army below and the unit groupings.
  it('puts Gremio at id 1, Cleo at id 3 and Eileen at id 19', () => {
    assert.deepStrictEqual(
      [1, 3, 19].map((id) => {
        const key = keysById([id])[0];
        const { type, base, extra, soldiers, speaking } = WAR_CHARACTERS[key];
        return { key, type, base, extra, soldiers, speaking };
      }),
      [
        {
          key: 'GREMIO',
          type: WAR_TYPES.CHARGE,
          base: 10,
          extra: 7,
          soldiers: 80,
          speaking: false,
        },
        { key: 'CLEO', type: WAR_TYPES.BOW, base: 14, extra: 3, soldiers: 170, speaking: false },
        { key: 'EILEEN', type: WAR_TYPES.MAGIC, base: 13, extra: 7, soldiers: 150, speaking: true },
      ],
    );
  });

  it('groups them with the characters they are grouped with in the game', () => {
    const ids = (/** @type {import('../war.js').WarUnitKey} */ unit) =>
      WAR_UNITS[unit].members.map((m) => WAR_CHARACTERS[m].id);
    assert.deepStrictEqual(WAR_UNITS[WAR_UNIT_KEYS.COMMANDERS_TEAM].members, [
      'MCDOHL',
      'PAHN',
      'GREMIO',
    ]);
    assert.deepStrictEqual(ids(WAR_UNIT_KEYS.COMMANDERS_TEAM), [0, 2, 1]);
    assert.deepStrictEqual(WAR_UNITS[WAR_UNIT_KEYS.LEPANT_FAMILY].members, [
      'LEPANT',
      'EILEEN',
      'SHEENA',
    ]);
    assert.deepStrictEqual(WAR_UNITS[WAR_UNIT_KEYS.SOLDIER_BEAUTIES].members, [
      'SONYA',
      'CLEO',
      'CAMILLE',
    ]);
  });

  it("has Cleo and Eileen in the Teo 2 sheet's army, and not Gremio or Pahn, who are gone by then", () => {
    for (const key of /** @type {WarCharacterKey[]} */ (['CLEO', 'EILEEN'])) {
      assert.ok(TEO2_RECRUITS.includes(key), key);
    }
    for (const key of /** @type {WarCharacterKey[]} */ (['GREMIO', 'PAHN'])) {
      assert.ok(!TEO2_RECRUITS.includes(key), key);
    }
  });
});

describe('war battle start', () => {
  it("starts kuwa at the game's first command menu", () => {
    // KwandaWBT1.State: 251 rand() calls after the start (seed 0x43), 19 + 31 sprites
    const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: KUWA_RECRUITS });
    assert.strictEqual(war.playerSoldiers, 5625);
    assert.strictEqual(war.enemySoldiers, 9000);
    assert.strictEqual(war.rng.count, 251);
    assert.strictEqual(war.rng.raw, 0xe9acc066);
    assert.deepStrictEqual(war.field.cap, [19, 31]);
    // the first turn of kuwa is always Kwanda's attack
    assert.strictEqual(war.enemyAction.name, "Kwanda's Attack");
  });

  it('offers units by their first available member', () => {
    const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: KUWA_RECRUITS });
    assert.strictEqual(war.unitPower(WAR_UNIT_KEYS.COMMANDERS_TEAM), 26); // Hero 14 + Pahn 5 + Cleo 7
    assert.ok(war.units(WAR_TYPES.CHARGE).includes(WAR_UNIT_KEYS.COMMANDERS_TEAM));
    assert.deepStrictEqual(war.units(WAR_TYPES.OTHER), [
      WAR_UNIT_KEYS.THIEVES,
      WAR_UNIT_KEYS.STRATEGISTS,
    ]);
  });

  it('rejects an unknown character, a used unit and a unit that is not offered', () => {
    assert.throws(
      () => WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: /** @type {any} */ (['NOBODY']) }),
      /not a war character/,
    );
    const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: KUWA_RECRUITS });
    assert.throws(() => war.use(WAR_UNIT_KEYS.PIRATES), /not offered/); // nobody of theirs is recruited
    war.use(WAR_UNIT_KEYS.COMMANDERS_TEAM);
    assert.throws(() => war.use(WAR_UNIT_KEYS.COMMANDERS_TEAM), /not offered/);
  });
});

/** Plays a Teo 2 battle of Charge units (a buffed power uses the Strategists first). */
/**
 * @param {string} actions
 * @param {(round: number, war: WarBattle) => void} [onRound] called after every round
 */
const playTeo2 = (actions, onRound = () => {}) => {
  const war = WarBattle.start(WAR_SCENARIO_KEYS.TEO2, { recruited: TEO2_RECRUITS });
  const enemy = [];
  actions.split(' ').forEach((v, i) => {
    const power = Number(v);
    let unit = war.units(WAR_TYPES.CHARGE).find((u) => war.unitPower(u) === power);
    if (!unit) {
      // a buffed power: use the Strategists first
      unit = war.units(WAR_TYPES.CHARGE).find((u) => {
        const base = war.unitPower(u);
        return war.strategistBuff === 0 && base + Math.floor(base / 2) === power;
      });
      war.use(WAR_UNIT_KEYS.STRATEGISTS);
    }
    war.use(unit);
    enemy.push(war.enemySoldiers);
    onRound(i, war);
  });
  return { war, enemy: enemy.join(' ') };
};

describe('scripted scenarios', () => {
  it('ends sca1 after one round without a game over', () => {
    const war = WarBattle.start(WAR_SCENARIO_KEYS.SCA1, { recruited: KUWA_RECRUITS });
    war.use(war.units(WAR_TYPES.CHARGE)[0]);
    assert.strictEqual(war.outcome, WAR_OUTCOMES.NO_UNITS_LEFT);
    assert.strictEqual(war.isGameOver, false);
  });

  it('makes a loss a game over in the regular scenarios', () => {
    const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: KUWA_RECRUITS });
    war.outcome = WAR_OUTCOMES.DEFEAT;
    assert.strictEqual(war.isGameOver, true);
  });
});

/**
 * The full Teo 2 sheet (720 rows) as the reference sim reproduced it: the 635 rows that match with
 * every sprite settled, each with the army sizes, rand() total and seed after every round.
 */
describe('Teo 2 sim output', () => {
  /** @type {any[]} */
  const rows = Teo2SimOutput;
  it('has the 635 settled rows', () => assert.strictEqual(rows.length, 635));

  for (const row of rows) {
    it(`reproduces ${row.actions.join(' ')}`, () => {
      /** @type {any[]} */
      const rounds = [];
      const { war } = playTeo2(row.actions.join(' '), (_, w) =>
        rounds.push({
          action: row.actions[rounds.length],
          enemy: w.enemySoldiers,
          player: w.playerSoldiers,
          rand_index: w.rng.count,
          seed: `0x${w.rng.raw.toString(16).padStart(8, '0')}`,
        }),
      );
      assert.deepStrictEqual(rounds, row.rounds);
      assert.strictEqual(war.outcome, row.outcome === null ? null : OUTCOMES[row.outcome]);
    });
  }
});

describe('clone', () => {
  it('continues exactly like the original and leaves it alone', () => {
    const actions = ['15', '19', '24', '17', '25'];
    const war = WarBattle.start(WAR_SCENARIO_KEYS.TEO2, { recruited: TEO2_RECRUITS });
    const play = (/** @type {WarBattle} */ w, /** @type {string[]} */ powers) => {
      for (const v of powers) {
        const power = Number(v);
        const unit = w.units(WAR_TYPES.CHARGE).find((u) => w.unitPower(u) === power);
        w.use(/** @type {any} */ (unit));
      }
    };
    play(war, actions.slice(0, 2));
    const copy = war.clone();
    const before = { raw: war.rng.raw, enemy: war.enemySoldiers };
    play(copy, actions.slice(2, 4));
    assert.deepStrictEqual({ raw: war.rng.raw, enemy: war.enemySoldiers }, before);
    play(war, actions.slice(2, 4));
    assert.strictEqual(copy.rng.raw, war.rng.raw);
    assert.strictEqual(copy.rng.count, war.rng.count);
    assert.strictEqual(copy.enemySoldiers, war.enemySoldiers);
    assert.strictEqual(copy.playerSoldiers, war.playerSoldiers);
    assert.deepStrictEqual(copy.units(WAR_TYPES.CHARGE), war.units(WAR_TYPES.CHARGE));
  });

  it('rates a unit against the enemy action', () => {
    const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: KUWA_RECRUITS });
    // turn 1 is Kwanda's Charge: Charge ties, Bow loses, Magic wins
    assert.strictEqual(war.matchup(WAR_UNIT_KEYS.COMMANDERS_TEAM), MATCHUP.TIE);
    const [magic] = war.units(WAR_TYPES.MAGIC);
    assert.strictEqual(war.matchup(magic), MATCHUP.WIN);
  });
});

describe('game versions', () => {
  it('runs v1.0 unless told otherwise', () => {
    const war = WarBattle.start('KUWA', { recruited: KUWA_RECRUITS });
    assert.strictEqual(war.version, WAR_VERSIONS.V1_0);
  });

  it('rejects an unknown version', () => {
    assert.throws(
      () =>
        WarBattle.start('KUWA', { recruited: KUWA_RECRUITS, version: /** @type {any} */ ('v2') }),
      /Unknown game version/,
    );
  });

  it("reads v1.0's rcos and rsin one table entry off v1.1's, as the HUD measured them", () => {
    // the PSN build's circle target for sprite 5 at angle 908: 725 on v1.1, 719 on v1.0
    assert.strictEqual(rcos(908), 725);
    assert.strictEqual(rcosV10(908), 719);
    // the second quadrant's seam: v1.1 mirrors around 0x800 (sin 0x7ff is table[1] = 6), v1.0
    // around 0x7ff (table[0] = 0)
    assert.strictEqual(rsin(0x7ff), 6);
    assert.strictEqual(rsinV10(0x7ff), 0);
    // the first quadrant reads the same entries for sin
    assert.strictEqual(rsinV10(0x3ff), rsin(0x3ff));
    // an odd function, and a full turn is no turn
    assert.strictEqual(rsinV10(-300), -rsinV10(300));
    assert.strictEqual(rsinV10(300 + 0x1000), rsinV10(300));
    assert.strictEqual(rcosV10(-300), rcosV10(300));
  });

  it('plays the same until a sprite takes a circle target, then the versions part', () => {
    const play = (/** @type {any} */ version) => {
      // the first 24 characters: a roster whose third round takes a circle target on a boundary
      const recruited = /** @type {WarCharacterKey[]} */ (Object.keys(WAR_CHARACTERS).slice(0, 24));
      const war = WarBattle.start('KUWA', { recruited, seed: 0x035c23aa, version });
      const counts = [];
      for (let i = 0; i < 4 && !war.outcome; i++) {
        war.use(war.units(WAR_TYPES.CHARGE)[0]);
        counts.push(`${war.rng.count}:${war.rng.raw}`);
      }
      return counts;
    };
    const old = play(WAR_VERSIONS.V1_0);
    const current = play(WAR_VERSIONS.V1_1);
    assert.deepStrictEqual(old.slice(0, 2), current.slice(0, 2));
    assert.notDeepStrictEqual(old, current);
    assert.deepStrictEqual(play(WAR_VERSIONS.V1_0), old);
  });

  it('keeps its version in a clone', () => {
    const war = WarBattle.start('KUWA', { recruited: KUWA_RECRUITS, version: WAR_VERSIONS.V1_0 });
    assert.strictEqual(war.clone().version, WAR_VERSIONS.V1_0);
  });
});
