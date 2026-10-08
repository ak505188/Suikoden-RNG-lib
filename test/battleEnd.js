import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { BATTLE_STATUS } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';
import { ITEMS } from '../lib/Game/Items.js';
import { calculateBattleEXP } from '../lib/Game/Experience.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';

const ATTACK = { type: ACTION_TYPES.ATTACK, target: 0 };
const DEFEND = { type: ACTION_TYPES.DEFEND };
const MAX_ROUNDS = 30;

/**
 * A party strong enough to kill two FurFurs in round 1. The drop seeds below were found by running
 * this battle, so they check the sim against itself, not against the game.
 * @param {import('../lib/Game/Battle/Actions.js').Action[][]} [turns]
 * @param {number} [seed]
 */
const winningBattle = (turns = [], seed = 1) =>
  new Battle({
    party: new PlayerParty(
      [CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO].map((key) =>
        new Character(key)
          .setLVL(40)
          .setStats({ PWR: 150, SKL: 150, DEF: 150, SPD: 150, MGC: 60, LUK: 60, HP: 500 })
          .rest(),
      ),
    ),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]),
    rng: new RNG(seed),
    turns,
  });

const NO_DROP_SEED = 1; // no drop (3 rolls)
const FIRST_DROP_SEED = 4; // Medicine from FurFur #1 (2 rolls)
const SECOND_DROP_SEED = 45; // Wooden shoes from FurFur #2 (4 rolls)

/** One 1-HP McDohl defending against the Zombie Dragon. */
const losingBattle = () =>
  new Battle({
    party: new PlayerParty([
      new Character(CHARACTER_KEYS.MCDOHL)
        .setStats({ PWR: 10, SKL: 10, DEF: 1, SPD: 10, MGC: 10, LUK: 10, HP: 1 })
        .rest(),
    ]),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
    rng: new RNG(1),
  });

/** @param {Battle} battle @param {import('../lib/Game/Battle/Actions.js').Action[]} turn */
const playUntilOver = (battle, turn) => {
  for (let i = 0; i < MAX_ROUNDS && battle.status === BATTLE_STATUS.IN_PROGRESS; i++)
    battle.playTurn(turn);
  assert.notStrictEqual(
    battle.status,
    BATTLE_STATUS.IN_PROGRESS,
    `battle not over after ${MAX_ROUNDS} rounds`,
  );
};

describe('Party.isDefeated', () => {
  const party = () => new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]);

  it('is false while anyone is still in the fight', () => {
    const p = party();
    p.combatants[0].knockedOut = true;
    assert.strictEqual(p.isDefeated, false);
  });

  it('is true once everyone is dead', () => {
    const p = party();
    p.combatants.forEach((c) => (c.knockedOut = true));
    assert.strictEqual(p.isDefeated, true);
  });

  it('counts removed combatants as out, even alive', () => {
    const p = party();
    p.combatants[0].knockedOut = true;
    p.combatants[1].removedFromFight = true;
    assert.ok(p.combatants[1].HP > 0);
    assert.strictEqual(p.isDefeated, true);
  });

  it("is false for a combatant at 0 HP whose death routine hasn't run", () => {
    const p = party();
    p.combatants.forEach((c) => c.setHP(0));
    assert.strictEqual(p.isDefeated, false);
  });
});

describe('Battle end', () => {
  it('starts in progress with no result', () => {
    const battle = winningBattle();
    assert.strictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS);
    assert.strictEqual(battle.result, null);
  });

  it('stays in progress with no result while both sides are still fighting', () => {
    const battle = new Battle({
      party: new PlayerParty([
        new Character(CHARACTER_KEYS.MCDOHL)
          .setLVL(22)
          .setStats({ PWR: 70, SKL: 70, DEF: 80, SPD: 50, MGC: 60, LUK: 60, HP: 220 })
          .rest(),
      ]),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
      rng: new RNG(1),
    });
    battle.playTurn([ATTACK]);
    assert.ok(battle.party.combatants[0].isAlive && battle.enemies.combatants[0].isAlive);
    assert.strictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS);
    assert.strictEqual(battle.result, null);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.BATTLE_END).length, 0);
  });

  it('is won once every enemy is out, 34 ticks after the last busy combatant clears', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    battle.finish();
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    assert.ok(battle.enemies.combatants.every((e) => e.knockedOut));

    // A winning round skips the round-end status step, so it logs no roundEnd
    assert.strictEqual(
      battle.log.ofType(LOG_TYPES.ROUND_END).filter((e) => e.round === battle.turn_count).length,
      0,
    );

    // Nothing rolls between the last event and the drop: the battle ends on that RNG
    const entries = battle.log.entries;
    const battleEndAt = entries.findIndex((e) => e.type === LOG_TYPES.BATTLE_END);
    const last = entries[battleEndAt - 1];
    const battleEnd = battle.result.rng.battleEnd;
    assert.strictEqual(battleEnd.count, last.rng);
    assert.strictEqual(battleEnd.raw, new RNG(1).jump(last.rng).raw);
    assert.strictEqual(battleEnd.seed, 1);

    // B = the last busyUntil: wait passes B + 1, victory check B + 2, countdown to B + 33, drop B + 34
    const lastBusy = Math.max(...battle.combatants.slice(1).map((c) => c.busyUntil));
    assert.deepStrictEqual(entries[battleEndAt], {
      type: LOG_TYPES.BATTLE_END,
      round: battle.turn_count,
      tick: lastBusy + 34,
      rng: last.rng,
      detail: BATTLE_STATUS.WON,
    });
    assert.strictEqual(entries[battleEndAt + 1].type, 'drop');
    assert.strictEqual(entries[battleEndAt + 1].tick, lastBusy + 34);
  });

  it('is lost once every party member is out', () => {
    const battle = losingBattle();
    playUntilOver(battle, [DEFEND]);
    assert.strictEqual(battle.status, BATTLE_STATUS.LOST);
    assert.ok(battle.party.combatants[0].knockedOut);
    assert.strictEqual(battle.log.entries.at(-1).detail, BATTLE_STATUS.LOST);
  });

  it('rolls no drop when lost', () => {
    const battle = losingBattle();
    playUntilOver(battle, [DEFEND]);
    battle.finish();
    assert.strictEqual(battle.result.drop, null);
    assert.strictEqual(battle.result.rng.afterDrop, undefined);
    assert.strictEqual(battle.rng.count, battle.result.rng.battleEnd.count);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.DROP).length, 0);
  });

  it('refuses to play another round once over', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    const count = battle.rng.count;
    assert.throws(() => battle.playTurn([ATTACK, ATTACK]), /Battle is over \(Won\)/);
    assert.strictEqual(battle.rng.count, count);
  });

  it('run() stops at the round the battle ends', () => {
    const played = winningBattle();
    playUntilOver(played, [ATTACK, ATTACK]);

    const battle = winningBattle(Array.from({ length: MAX_ROUNDS }, () => [ATTACK, ATTACK]));
    battle.run();
    assert.strictEqual(battle.turn_count, played.turn_count);
    assert.ok(battle.turn_count < MAX_ROUNDS);
    assert.strictEqual(battle.status, played.status);
    assert.deepStrictEqual(battle.result, played.result);
  });

  it('clone copies the result without sharing it', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    battle.finish();
    const copy = battle.clone();
    assert.strictEqual(copy.status, BATTLE_STATUS.WON);
    assert.deepStrictEqual(copy.result, battle.result);
    copy.result.rng.battleEnd.count = -1;
    copy.result.rng.afterDrop.count = -1;
    assert.notStrictEqual(battle.result.rng.battleEnd.count, -1);
    assert.notStrictEqual(battle.result.rng.afterDrop.count, -1);
  });
});

describe('Battle end drop', () => {
  /** @param {number} seed */
  const won = (seed) => {
    const battle = winningBattle([], seed);
    playUntilOver(battle, [ATTACK, ATTACK]);
    battle.finish();
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    return battle;
  };

  it('rolls on the live RNG, right where the battle ended', () => {
    for (const seed of [NO_DROP_SEED, FIRST_DROP_SEED, SECOND_DROP_SEED]) {
      const battle = won(seed);
      const { battleEnd, afterDrop } = battle.result.rng;

      // Same roll as calculateDrop from the battle-end RNG, on a fresh copy of the formation
      const rng = new RNG(seed).jump(battleEnd.count);
      const drop = new EnemyParty([
        new Enemy(ENEMY_KEYS.FURFUR),
        new Enemy(ENEMY_KEYS.FURFUR),
      ]).calculateDrop(rng);
      assert.strictEqual(battle.result.drop, drop);
      assert.deepStrictEqual(afterDrop, rng.snapshot());
      assert.deepStrictEqual(battle.rng.snapshot(), afterDrop);
    }
  });

  it('records no drop', () => {
    const battle = won(NO_DROP_SEED);
    const { battleEnd, afterDrop } = battle.result.rng;
    assert.strictEqual(battle.result.drop, null);
    assert.strictEqual(afterDrop.count - battleEnd.count, 3);
    const [entry] = battle.log.ofType(LOG_TYPES.DROP);
    assert.deepStrictEqual(entry, {
      type: LOG_TYPES.DROP,
      round: 1,
      tick: battle.turn.tick,
      rng: afterDrop.count,
    });
    assert.match(battle.log.format(), /No drop$/m);
  });

  it('records a drop from the first enemy', () => {
    const battle = won(FIRST_DROP_SEED);
    const { battleEnd, afterDrop } = battle.result.rng;
    assert.strictEqual(battle.result.drop, ITEMS.MEDICINE);
    assert.strictEqual(afterDrop.count - battleEnd.count, 2);
    assert.deepStrictEqual(battle.log.ofType(LOG_TYPES.DROP), [
      {
        type: LOG_TYPES.DROP,
        round: 1,
        tick: battle.turn.tick,
        rng: afterDrop.count,
        detail: 'Medicine',
      },
    ]);
    assert.match(battle.log.format(), /Dropped Medicine$/m);
  });

  it('records a drop from a later enemy', () => {
    const battle = won(SECOND_DROP_SEED);
    const { battleEnd, afterDrop } = battle.result.rng;
    assert.strictEqual(battle.result.drop, ITEMS.WOODEN_SHOES);
    assert.strictEqual(afterDrop.count - battleEnd.count, 4);
  });
});

describe('Battle end EXP', () => {
  /**
   * @param {{ seed?: number, exp?: number }} [options] - exp: everyone's EXP going in
   */
  const won = ({ seed = NO_DROP_SEED, exp = 0 } = {}) => {
    const battle = winningBattle([], seed);
    battle.party.combatants.forEach((c) => c.setEXP(exp));
    playUntilOver(battle, [ATTACK, ATTACK]);
    battle.finish();
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    return battle;
  };

  it('gives each living member their EXP, after the drop roll', () => {
    const battle = won();
    const { rewards, rng } = battle.result;
    const furfurLVL = battle.enemies.combatants[0].LVL;
    assert.deepStrictEqual(
      rewards.map((r) => r.character),
      battle.party.combatants,
    );
    assert.deepStrictEqual(
      rewards.map((r) => r.exp),
      [
        calculateBattleEXP(40, [furfurLVL, furfurLVL], 2),
        calculateBattleEXP(40, [furfurLVL, furfurLVL], 2),
      ],
    );
    assert.deepStrictEqual(
      battle.party.combatants.map((c) => c.EXP),
      rewards.map((r) => r.exp),
    );

    // No level-ups, so no rolls after the drop
    assert.ok(rewards.every((r) => r.levels === 0 && r.growths === null && r.fromLVL === 40));
    assert.deepStrictEqual(rng.afterLevelUps, rng.afterDrop);
    assert.deepStrictEqual(
      rewards.map((r) => r.rng),
      [rng.afterDrop, rng.afterDrop],
    );
  });

  it('rolls level-ups in slot order on the live RNG, 7 rolls per level', () => {
    const battle = won({ exp: 999 });
    const { rewards, rng } = battle.result;
    assert.deepStrictEqual(
      rewards.map((r) => r.levels),
      [1, 1],
    );
    assert.deepStrictEqual(
      battle.party.combatants.map((c) => c.LVL),
      [41, 41],
    );
    assert.strictEqual(rng.afterLevelUps.count - rng.afterDrop.count, 14);
    assert.deepStrictEqual(
      rewards.map((r) => r.rng.count),
      [rng.afterDrop.count + 7, rng.afterDrop.count + 14],
    );
    assert.deepStrictEqual(battle.rng.snapshot(), rng.afterLevelUps);

    // Same rolls as levelling fresh copies from the post-drop RNG
    const expectedRNG = new RNG(NO_DROP_SEED).jump(rng.afterDrop.count);
    const fresh = winningBattle().party.combatants;
    rewards.forEach((reward, i) => {
      assert.deepStrictEqual(reward.growths, fresh[i].calculateLevelups(1, 40, expectedRNG));
    });
  });

  it("logs each member's EXP before their level-up rolls, and the level-up after", () => {
    const battle = won({ exp: 999 });
    const start = battle.result.rng.afterDrop.count;
    const entries = battle.log.entries
      .slice(-4)
      .map(({ type, actor, rng, amount, detail }) => ({ type, actor, rng, amount, detail }));
    assert.deepStrictEqual(entries, [
      { type: LOG_TYPES.EXP, actor: 'McDohl', rng: start, amount: 5, detail: undefined },
      {
        type: LOG_TYPES.LEVEL_UP,
        actor: 'McDohl',
        rng: start + 7,
        amount: undefined,
        detail: 'LVL 40 -> 41',
      },
      { type: LOG_TYPES.EXP, actor: 'Gremio', rng: start + 7, amount: 5, detail: undefined },
      {
        type: LOG_TYPES.LEVEL_UP,
        actor: 'Gremio',
        rng: start + 14,
        amount: undefined,
        detail: 'LVL 40 -> 41',
      },
    ]);
    assert.match(battle.log.format(), /McDohl gains 5 EXP\n.*McDohl levels up: LVL 40 -> 41\n/);
  });

  it('gives fallen members nothing and splits between the rest', () => {
    const battle = winningBattle();
    battle.party.combatants[1].setHP(0);
    battle.party.resetBattleState();
    playUntilOver(battle, [ATTACK, ATTACK]);
    battle.finish();
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    const furfurLVL = battle.enemies.combatants[0].LVL;
    assert.deepStrictEqual(
      battle.result.rewards.map((r) => r.character.name),
      ['McDohl'],
    );
    assert.strictEqual(
      battle.result.rewards[0].exp,
      calculateBattleEXP(40, [furfurLVL, furfurLVL], 1),
    );
    assert.strictEqual(battle.party.combatants[1].EXP, 0);
  });

  it('gives nothing when lost', () => {
    const battle = losingBattle();
    playUntilOver(battle, [DEFEND]);
    battle.finish();
    assert.deepStrictEqual(battle.result.rewards, []);
    assert.strictEqual(battle.result.rng.afterLevelUps, undefined);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.EXP).length, 0);
    assert.strictEqual(battle.party.combatants[0].EXP, 0);
  });

  it('clone points the rewards at its own party', () => {
    const battle = won({ exp: 999 });
    const copy = battle.clone();
    assert.deepStrictEqual(
      copy.result.rewards.map((r) => r.exp),
      battle.result.rewards.map((r) => r.exp),
    );
    copy.result.rewards.forEach((reward, i) => {
      assert.strictEqual(reward.character, copy.party.combatants[i]);
      assert.notStrictEqual(reward.character, battle.party.combatants[i]);
    });
    copy.result.rewards[0].growths.PWR = -1;
    copy.result.rewards[0].rng.count = -1;
    copy.result.rng.afterLevelUps.count = -1;
    assert.notStrictEqual(battle.result.rewards[0].growths.PWR, -1);
    assert.notStrictEqual(battle.result.rewards[0].rng.count, -1);
    assert.notStrictEqual(battle.result.rng.afterLevelUps.count, -1);
  });
});

describe('Battle.finish', () => {
  it('does nothing while in progress', () => {
    const battle = winningBattle();
    const count = battle.rng.count;
    assert.deepStrictEqual(battle.finish(), { status: BATTLE_STATUS.IN_PROGRESS, result: null });
    assert.strictEqual(battle.result, null);
    assert.strictEqual(battle.rng.count, count);
  });

  it('playTurn only ends the battle: no result, and the RNG stays at battle end', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    assert.strictEqual(battle.result, null);
    assert.strictEqual(battle.rng.count, battle.log.ofType(LOG_TYPES.BATTLE_END)[0].rng);
    assert.deepStrictEqual(battle.log.entries.at(-1).type, 'battleEnd');
  });

  it('records the battle end RNG, then rolls, and returns the result', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    const battleEnd = battle.rng.snapshot();
    const returned = battle.finish();
    assert.deepStrictEqual(returned, { status: BATTLE_STATUS.WON, result: battle.result });
    assert.deepStrictEqual(battle.result.rng.battleEnd, battleEnd);
    assert.deepStrictEqual(battle.rng.snapshot(), battle.result.rng.afterLevelUps);
  });

  it('only rolls once', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    const first = battle.finish();
    const count = battle.rng.count;
    const logLength = battle.log.entries.length;
    const second = battle.finish();
    assert.strictEqual(second.result, first.result);
    assert.strictEqual(battle.rng.count, count);
    assert.strictEqual(battle.log.entries.length, logLength);
  });

  it('records only the battle end when lost', () => {
    const battle = losingBattle();
    playUntilOver(battle, [DEFEND]);
    const count = battle.rng.count;
    const { status, result } = battle.finish();
    assert.strictEqual(status, BATTLE_STATUS.LOST);
    assert.deepStrictEqual(result, {
      drop: null,
      rewards: [],
      rng: { battleEnd: battle.rng.snapshot() },
    });
    assert.strictEqual(battle.rng.count, count);
  });
});

describe('Battle.run finish option', () => {
  const turns = () => Array.from({ length: MAX_ROUNDS }, () => [ATTACK, ATTACK]);

  it("doesn't finish by default", () => {
    const battle = winningBattle(turns());
    assert.deepStrictEqual(battle.run(), { status: BATTLE_STATUS.WON, result: null });
    assert.strictEqual(battle.rng.count, battle.log.ofType(LOG_TYPES.BATTLE_END)[0].rng);
  });

  it('finishes with finish: true, the same as calling finish() after', () => {
    const finished = winningBattle(turns());
    const returned = finished.run({ finish: true });

    const manual = winningBattle(turns());
    manual.run();
    const expected = manual.finish();

    assert.strictEqual(returned.status, BATTLE_STATUS.WON);
    assert.strictEqual(returned.result, finished.result);
    assert.deepStrictEqual(returned.result.rng, expected.result.rng);
    assert.strictEqual(returned.result.drop, expected.result.drop);
    assert.deepStrictEqual(finished.log.format(), manual.log.format());
  });

  it('returns in progress with no result when the planned rounds run out first', () => {
    const battle = winningBattle([[DEFEND, DEFEND]]);
    assert.deepStrictEqual(battle.run({ finish: true }), {
      status: BATTLE_STATUS.IN_PROGRESS,
      result: null,
    });
    assert.strictEqual(battle.turn_count, 1);
  });
});
