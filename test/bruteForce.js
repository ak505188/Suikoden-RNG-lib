import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { BATTLE_STATUS } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { characterActions, fightPlans, roundPlans } from '../lib/Game/Battle/ActionPlans.js';
import { bruteForce } from '../lib/Game/Battle/BruteForce.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { CHARACTER_KEYS, ITEM_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import { ITEMS } from '../lib/Game/Items.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { STATUS } from '../lib/Game/Constants.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */

const DEFEND = { type: ACTION_TYPES.DEFEND };

/** The 3 BonBon Celadon Urn fight from test/battle.js, before round 1. */
const bonbonBattle = () => {
  const party = new PlayerParty([
    CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.CLEO, CHARACTER_KEYS.TED,
  ].map(key => new Character(key)));
  return new Battle({
    party,
    enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
    rng: new RNG(0x30a82220).next(5419),
    escapable: true,
  });
};

describe('characterActions', () => {
  it('lists Defend, an Attack per reachable enemy and each Medicine target', () => {
    const battle = bonbonBattle();
    const mcdohl = battle.party.combatants[0];
    const actions = characterActions(mcdohl, battle);
    assert.deepStrictEqual(actions.slice(0, 4), [
      DEFEND,
      { type: ACTION_TYPES.ATTACK, target: 0 },
      { type: ACTION_TYPES.ATTACK, target: 1 },
      { type: ACTION_TYPES.ATTACK, target: 2 },
    ]);
    assert.deepStrictEqual(actions.slice(4), [0, 1, 2, 3, 4].map(target =>
      ({ type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target })));
  });

  it('gives a member out of the fight only Defend, and skips them as an item target', () => {
    const battle = bonbonBattle();
    const [mcdohl, gremio] = battle.party.combatants;
    gremio.setHP(0);
    gremio.resetBattleState();
    assert.deepStrictEqual(characterActions(gremio, battle), [DEFEND]);
    const itemTargets = characterActions(mcdohl, battle).filter(a => a.type === ACTION_TYPES.ITEM).map(a => a.target);
    assert.deepStrictEqual(itemTargets, [0, 2, 3, 4]);
  });

  it('leaves out dead enemies', () => {
    const battle = bonbonBattle();
    battle.enemies.combatants[1].setHP(0);
    battle.enemies.combatants[1].resetBattleState();
    const attacks = characterActions(battle.party.combatants[2], battle);
    assert.deepStrictEqual(attacks, [
      DEFEND,
      { type: ACTION_TYPES.ATTACK, target: 0 },
      { type: ACTION_TYPES.ATTACK, target: 2 },
      { type: ACTION_TYPES.RUNE, target: 0 }, // Boar
      { type: ACTION_TYPES.RUNE, target: 2 },
    ]);
  });

  it('only Defends or uses items while Unbalanced', () => {
    const battle = bonbonBattle();
    const mcdohl = battle.party.combatants[0];
    mcdohl.status[STATUS.UNBALANCED] = 1;
    const types = new Set(characterActions(mcdohl, battle).map(a => a.type));
    assert.deepStrictEqual([...types], [ACTION_TYPES.DEFEND, ACTION_TYPES.ITEM]);
  });

  it('plans a Command rune the sim can\'t run yet, per target', () => {
    const battle = bonbonBattle();
    const ted = battle.party.combatants[4].setRune(RUNES.HATE);
    const casts = characterActions(ted, battle).filter(a => a.type === ACTION_TYPES.RUNE);
    assert.deepStrictEqual(casts, [0, 1, 2].map(target => ({ type: ACTION_TYPES.RUNE, target })));
  });

  it('casts each spell level with MP left, on each target it can take', () => {
    const battle = bonbonBattle();
    const cleo = battle.party.combatants[3].setRune(RUNES.FIRE);
    cleo.MP = [2, 1, 0, 0];
    const casts = characterActions(cleo, battle).filter(a => a.type === ACTION_TYPES.RUNE);
    // Flaming Arrows picks an enemy, Firestorm hits them all
    assert.deepStrictEqual(casts, [
      { type: ACTION_TYPES.RUNE, slot: 0, target: 0 },
      { type: ACTION_TYPES.RUNE, slot: 0, target: 1 },
      { type: ACTION_TYPES.RUNE, slot: 0, target: 2 },
      { type: ACTION_TYPES.RUNE, slot: 1 },
    ]);
  });
});

describe('fightPlans', () => {
  it('is every combination of member actions, plus Talisman for Pahn and Gremio', () => {
    const battle = bonbonBattle();
    const plans = [...fightPlans(battle)];
    // 9 choices each for McDohl, Gremio, Cleo, Ted; Pahn has no items, but Boar on each enemy (7)
    const solo = 9 * 9 * 7 * 9 * 9;
    // Talisman on each of 3 enemies, McDohl / Cleo / Ted free
    const talisman = 3 * 9 * 9 * 9;
    assert.strictEqual(plans.length, solo + talisman);

    const unitePlans = plans.filter(plan => plan.some(a => a.type === ACTION_TYPES.UNITE));
    assert.strictEqual(unitePlans.length, talisman);
    for (const plan of unitePlans) {
      assert.strictEqual(plan[1].uniteKey, UNITE_KEYS.TALISMAN);
      assert.deepStrictEqual(plan[1], plan[2]);
    }
  });

  it('plans no Unites when asked not to', () => {
    const battle = bonbonBattle();
    const plans = [...fightPlans(battle, { unites: false })];
    assert.strictEqual(plans.length, 9 * 9 * 7 * 9 * 9);
  });

  it('plans Unites the sim can\'t run yet, and throws when one is played', () => {
    const party = new PlayerParty([CHARACTER_KEYS.TAI_HO, CHARACTER_KEYS.YAM_KOO].map(key => new Character(key)));
    const battle = new Battle({
      party,
      enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
      rng: new RNG(1),
    });
    const fisherman = [...fightPlans(battle)].filter(plan => plan[0].uniteKey === UNITE_KEYS.FISHERMAN);
    assert.strictEqual(fisherman.length, 3);
    assert.throws(() => battle.clone().playTurn(fisherman[0]), /Fisherman/);
  });

  it('plans only the Unites a unites function picks', () => {
    const battle = bonbonBattle();
    const plans = [...fightPlans(battle, { unites: key => key !== UNITE_KEYS.TALISMAN })];
    assert.strictEqual(plans.length, 9 * 9 * 7 * 9 * 9);
  });

  it('narrows each member through the filter', () => {
    const battle = bonbonBattle();
    const plans = [...fightPlans(battle, {
      unites: false,
      filter: ({ slot, candidates }) => slot === 0 ? candidates : [DEFEND],
    })];
    assert.strictEqual(plans.length, 9);
    assert.ok(plans.every(plan => plan.slice(1).every(a => a === DEFEND)));
  });
});

describe('roundPlans', () => {
  it('adds Run and Free Will as one plan each', () => {
    const battle = bonbonBattle();
    const plans = [...roundPlans(battle, {
      commands: [ROUND_COMMANDS.RUN, ROUND_COMMANDS.FREE_WILL, ROUND_COMMANDS.FIGHT],
      filter: () => [DEFEND],
      unites: false,
    })];
    assert.deepStrictEqual(plans, [
      { command: ROUND_COMMANDS.RUN },
      { command: ROUND_COMMANDS.FREE_WILL },
      [DEFEND, DEFEND, DEFEND, DEFEND, DEFEND],
    ]);
  });

  it('never plans Run in an inescapable fight', () => {
    const battle = bonbonBattle();
    battle.escapable = false;
    const plans = [...roundPlans(battle, { commands: [ROUND_COMMANDS.RUN] })];
    assert.deepStrictEqual(plans, []);
  });
});

describe('bruteForce: 3 BonBon Celadon Urn fight', () => {
  // Round 1: Run only (it fails); round 2: Run or every Attack / Defend / Boar combination
  const battle = bonbonBattle();
  const search = () => bruteForce(battle, {
    maxRounds: 2,
    commands: [ROUND_COMMANDS.RUN, ROUND_COMMANDS.FIGHT],
    unites: false,
    finish: true,
    filter: ({ battle, candidates }) => battle.turn_count === 0 ? [] : candidates.filter(a => a.type !== ACTION_TYPES.ITEM),
    score: b => ({ drop: b.result.drop?.name ?? null, rng: b.rng.count, frames: b.frames }),
  });
  const { results, stats } = search();

  it('plays Run, then every round-2 plan', () => {
    // Round 2: Run again, and every Fight plan (Pahn: Defend, 3 Attacks, 3 Boars)
    assert.strictEqual(stats.roundsPlayed, 1 + 1 + 4 ** 4 * 7);
    assert.ok(results.length > 0);
    assert.ok(results.every(r => r.status === BATTLE_STATUS.WON && r.rounds.length === 2));
  });

  it('finds the known Celadon Urn plan', () => {
    const known = [
      { command: ROUND_COMMANDS.RUN },
      [DEFEND, { type: ACTION_TYPES.ATTACK, target: 2 }, { type: ACTION_TYPES.ATTACK, target: 0 }, DEFEND, { type: ACTION_TYPES.ATTACK, target: 0 }],
    ];
    const found = results.find(r => JSON.stringify(r.rounds) === JSON.stringify(known));
    assert.ok(found);
    assert.deepStrictEqual(found.score, { drop: ITEMS[ITEM_KEYS.CELADON_URN].name, rng: 5538, frames: found.score.frames });
  });

  it('leaves the starting battle untouched', () => {
    assert.strictEqual(battle.turn_count, 0);
    assert.strictEqual(battle.rng.count, 5419);
    assert.strictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS);
  });

  it('scores every result the same as replaying its rounds on a fresh battle', () => {
    for (const { rounds, score } of results) {
      const replay = bonbonBattle();
      replay.turns = rounds;
      replay.run({ finish: true });
      assert.deepStrictEqual(
        { drop: replay.result.drop?.name ?? null, rng: replay.rng.count, frames: replay.frames },
        score,
        JSON.stringify(rounds),
      );
    }
  });

  it('is deterministic', () => {
    assert.deepStrictEqual(search().results, results);
  });

  it('stops past maxRounds', () => {
    const { stats } = bruteForce(bonbonBattle(), {
      maxRounds: 1,
      commands: [ROUND_COMMANDS.RUN],
    });
    assert.strictEqual(stats.roundsPlayed, 1);
  });
});
