import { describe, it } from 'node:test';
import assert from 'node:assert';
import Teo2SimOutput from './data/war_teo2_sim_output.json' with { type: 'json' };
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
} from '../war.js';

/** @typedef {import('../war.js').WarCharacterKey} WarCharacterKey */

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
