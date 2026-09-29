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

const ATTACK = { type: ACTION_TYPES.ATTACK, target: 0 };
const DEFEND = { type: ACTION_TYPES.DEFEND };
const MAX_ROUNDS = 30;

/**
 * A party strong enough to kill two FurFurs in round 1. The drop seeds below were found by running
 * this battle, so they check the sim against itself, not against the game.
 * @param {import('../lib/Game/Battle/Actions.js').Action[][]} [turns]
 * @param {number} [seed]
 */
const winningBattle = (turns = [], seed = 1) => new Battle({
  party: new PlayerParty([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO].map(key =>
    new Character(key).setLVL(40).setStats({ PWR: 150, SKL: 150, DEF: 150, SPD: 150, MGC: 60, LUK: 60, HP: 500 }).rest())),
  enemies: new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]),
  rng: new RNG(seed),
  turns,
});

const NO_DROP_SEED = 1;       // no drop (3 rolls)
const FIRST_DROP_SEED = 4;    // Medicine from FurFur #1 (2 rolls)
const SECOND_DROP_SEED = 45;  // Wooden shoes from FurFur #2 (4 rolls)

/** One 1-HP McDohl defending against the Zombie Dragon. */
const losingBattle = () => new Battle({
  party: new PlayerParty([
    new Character(CHARACTER_KEYS.MCDOHL).setStats({ PWR: 10, SKL: 10, DEF: 1, SPD: 10, MGC: 10, LUK: 10, HP: 1 }).rest(),
  ]),
  enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
  rng: new RNG(1),
});

/** @param {Battle} battle @param {import('../lib/Game/Battle/Actions.js').Action[]} turn */
const playUntilOver = (battle, turn) => {
  for (let i = 0; i < MAX_ROUNDS && battle.status === BATTLE_STATUS.IN_PROGRESS; i++) battle.playTurn(turn);
  assert.notStrictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS, `battle not over after ${MAX_ROUNDS} rounds`);
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
    p.combatants.forEach(c => c.knockedOut = true);
    assert.strictEqual(p.isDefeated, true);
  });

  it('counts removed combatants as out, even alive', () => {
    const p = party();
    p.combatants[0].knockedOut = true;
    p.combatants[1].removedFromFight = true;
    assert.ok(p.combatants[1].HP > 0);
    assert.strictEqual(p.isDefeated, true);
  });

  it('is false for a combatant at 0 HP whose death routine hasn\'t run', () => {
    const p = party();
    p.combatants.forEach(c => c.setHP(0));
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
      party: new PlayerParty([new Character(CHARACTER_KEYS.MCDOHL).setLVL(22)
        .setStats({ PWR: 70, SKL: 70, DEF: 80, SPD: 50, MGC: 60, LUK: 60, HP: 220 }).rest()]),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
      rng: new RNG(1),
    });
    battle.playTurn([ATTACK]);
    assert.ok(battle.party.combatants[0].isAlive && battle.enemies.combatants[0].isAlive);
    assert.strictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS);
    assert.strictEqual(battle.result, null);
    assert.strictEqual(battle.log.ofType('battleEnd').length, 0);
  });

  it('is won once every enemy is out, at the end of that round', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    assert.ok(battle.enemies.combatants.every(e => e.knockedOut));

    // The battle ends on the RNG the round ended on
    const roundEnd = battle.log.ofType('roundEnd').at(-1);
    const battleEnd = battle.result.rng.battleEnd;
    assert.strictEqual(battleEnd.count, roundEnd.rng);
    assert.strictEqual(battleEnd.current, new RNG(1).next(roundEnd.rng).getRNG());
    assert.strictEqual(battleEnd.original, 1);

    // Logged after the round's last tick, so one tick past roundEnd, then the drop
    const entries = battle.log.entries;
    assert.deepStrictEqual(entries.at(-2), {
      type: 'battleEnd', round: battle.turn_count, tick: battle.turn.tick, rng: roundEnd.rng, detail: BATTLE_STATUS.WON,
    });
    assert.strictEqual(entries.at(-3), roundEnd);
    assert.strictEqual(entries.at(-1).type, 'drop');
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
    assert.strictEqual(battle.result.drop, null);
    assert.strictEqual(battle.result.rng.afterDrop, undefined);
    assert.strictEqual(battle.rng.getCount(), battle.result.rng.battleEnd.count);
    assert.strictEqual(battle.log.ofType('drop').length, 0);
  });

  it('refuses to play another round once over', () => {
    const battle = winningBattle();
    playUntilOver(battle, [ATTACK, ATTACK]);
    const count = battle.rng.getCount();
    assert.throws(() => battle.playTurn([ATTACK, ATTACK]), /Battle is over \(Won\)/);
    assert.strictEqual(battle.rng.getCount(), count);
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
  const won = seed => {
    const battle = winningBattle([], seed);
    playUntilOver(battle, [ATTACK, ATTACK]);
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    return battle;
  };

  it('rolls on the live RNG, right where the battle ended', () => {
    for (const seed of [NO_DROP_SEED, FIRST_DROP_SEED, SECOND_DROP_SEED]) {
      const battle = won(seed);
      const { battleEnd, afterDrop } = battle.result.rng;

      // Same roll as calculateDrop from the battle-end RNG, on a fresh copy of the formation
      const rng = new RNG(seed).next(battleEnd.count);
      const drop = new EnemyParty([new Enemy(ENEMY_KEYS.FURFUR), new Enemy(ENEMY_KEYS.FURFUR)]).calculateDrop(rng);
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
    const entry = battle.log.entries.at(-1);
    assert.deepStrictEqual(entry, { type: 'drop', round: 1, tick: battle.turn.tick, rng: afterDrop.count });
    assert.match(battle.log.format(), /No drop$/);
  });

  it('records a drop from the first enemy', () => {
    const battle = won(FIRST_DROP_SEED);
    const { battleEnd, afterDrop } = battle.result.rng;
    assert.strictEqual(battle.result.drop, ITEMS.MEDICINE);
    assert.strictEqual(afterDrop.count - battleEnd.count, 2);
    assert.deepStrictEqual(battle.log.entries.at(-1), {
      type: 'drop', round: 1, tick: battle.turn.tick, rng: afterDrop.count, detail: 'Medicine',
    });
    assert.match(battle.log.format(), /Dropped Medicine$/);
  });

  it('records a drop from a later enemy', () => {
    const battle = won(SECOND_DROP_SEED);
    const { battleEnd, afterDrop } = battle.result.rng;
    assert.strictEqual(battle.result.drop, ITEMS.WOODEN_SHOES);
    assert.strictEqual(afterDrop.count - battleEnd.count, 4);
  });
});
