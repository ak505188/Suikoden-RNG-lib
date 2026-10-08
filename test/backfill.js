import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { BATTLE_STATUS } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { characterActions } from '../lib/Game/Battle/ActionPlans.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';

const D = { type: ACTION_TYPES.DEFEND };
const A = (/** @type {number} */ target) => ({ type: ACTION_TYPES.ATTACK, target });

/** Enemies at the given slots, with the given footprint sizes. @param {[number, number][]} slots [position, size] */
const enemies = (slots) =>
  new EnemyParty(
    slots.map(([position, size]) => {
      const e = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
      e.position = position;
      e.size = size;
      return e;
    }),
  );

const kill = (/** @type {Enemy | Character} */ c) => {
  c.setHP(0);
  c.knockedOut = true;
};

describe('Live: 3 Mosquitoes + Red Solider Ant, LVL 1 party (Gregminster area 1)', () => {
  const make = () =>
    new Battle({
      party: new PlayerParty(
        [
          CHARACTER_KEYS.MCDOHL,
          CHARACTER_KEYS.GREMIO,
          CHARACTER_KEYS.PAHN,
          CHARACTER_KEYS.CLEO,
          CHARACTER_KEYS.TED,
        ].map((key) => new Character(key)),
      ),
      enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[7]),
      rng: new RNG(0x30a82220).jump(5560),
      escapable: true,
    });
  const turn1 = [
    D,
    A(0),
    A(1),
    { type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target: 1 },
    A(3),
  ];

  it('the Ant moves up to slot 1 at round end, so Gremio (Medium) can attack it in turn 2', () => {
    const battle = make();
    const [, gremio] = battle.party.combatants;
    const ant = battle.enemies.combatants[3];
    assert.strictEqual(ant.position, 4);
    assert.ok(!gremio.canReach(ant));
    battle.playTurn(turn1);
    assert.strictEqual(battle.rng.count, 5629);
    assert.deepStrictEqual(
      battle.enemies.combatants.map((e) => e.HP),
      [0, 0, 17, 15],
    );
    assert.deepStrictEqual(
      battle.party.combatants.map((c) => c.HP),
      [5, 22, 21, 20, 18],
    );
    assert.strictEqual(ant.position, 1);
    assert.ok(gremio.canReach(ant));
    const targets = characterActions(gremio, battle)
      .filter((a) => a.type === ACTION_TYPES.ATTACK)
      .map((a) => a.target);
    assert.deepStrictEqual(targets, [2, 3]);
    const moves = battle.log.ofType(LOG_TYPES.FORMATION);
    assert.deepStrictEqual(
      moves.map((m) => [m.actor, m.detail]),
      [[ant.label, 'slot 4 -> 1']],
    );
  });

  it('turn 2 [D, Attack 3, D, D, Attack 2] wins: 685 + 431 frames, Holy crystal, battle end RNG 5667', () => {
    const battle = make();
    battle.playTurn(turn1);
    assert.strictEqual(battle.frames, 685);
    battle.playTurn([D, A(3), D, D, A(2)]);
    battle.finish();
    assert.strictEqual(battle.status, BATTLE_STATUS.WON);
    assert.strictEqual(battle.frames, 1116);
    assert.strictEqual(battle.result.drop?.name, 'Holy crystal');
    assert.strictEqual(battle.result.rng.battleEnd.count, 5667);
  });

  it('positions are part of stateKey', () => {
    const battle = make();
    battle.playTurn(turn1);
    const moved = battle.stateKey();
    battle.enemies.combatants[3].position = 4;
    assert.notStrictEqual(battle.stateKey(), moved);
  });
});

describe('EnemyParty.backfill', () => {
  it('each empty front slot takes the first back-row enemy in combatant order', () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [5, 0],
      [4, 0],
      [6, 0],
    ]);
    const [a, b, , e5, e4] = party.combatants;
    kill(a);
    kill(b);
    party.backfill();
    assert.deepStrictEqual(
      party.combatants.map((e) => e.position),
      [1, 2, 3, 1, 2, 6],
    );
    assert.ok(e5.position === 1 && e4.position === 2);
  });

  it('leaves the front row alone when it is full, and ignores dead back-row enemies', () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    assert.deepStrictEqual(party.backfill(), []);
    const two = enemies([
      [1, 0],
      [4, 0],
      [5, 0],
    ]);
    kill(two.combatants[0]);
    kill(two.combatants[1]);
    two.backfill();
    assert.deepStrictEqual(
      two.combatants.map((e) => e.position),
      [1, 4, 1],
    );
  });

  it('a size-1 enemy fits at slot 1 when slot 2 is free, even with slot 3 taken', () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 1],
    ]);
    const [first, second, , big] = party.combatants;
    kill(first);
    kill(second);
    // Slot 1: slot 2 empty, slot 3 taken -> room 1, fits
    party.backfill();
    assert.strictEqual(big.position, 1);
  });

  it('no room: the slot stays empty and the same enemy is offered the next slot', () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 1],
      [5, 0],
    ]);
    const [first, , third, big, small] = party.combatants;
    kill(first);
    kill(third);
    // Slot 1: slot 2 taken -> room 0, the size-1 enemy doesn't fit; slot 3 (room 1) takes it
    party.backfill();
    assert.strictEqual(big.position, 3);
    assert.strictEqual(small.position, 5); // only the first candidate is ever offered
  });

  it('a size-2 enemy fits only at slot 1 with slots 2 and 3 empty', () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 2],
    ]);
    const [first, second, third, big] = party.combatants;
    kill(first);
    kill(second);
    party.backfill();
    assert.strictEqual(big.position, 4); // slot 3 taken: room 1 at most
    kill(third);
    party.backfill();
    assert.strictEqual(big.position, 1);
  });

  it("a placed enemy's footprint fills the slots after it", () => {
    const party = enemies([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 1],
      [5, 0],
    ]);
    const [first, second, third, big, small] = party.combatants;
    for (const e of [first, second, third]) kill(e);
    party.backfill();
    assert.deepStrictEqual([big.position, small.position], [1, 3]);
  });
});

describe('PlayerParty.backfill', () => {
  const members = () => {
    const party = new PlayerParty(
      [
        CHARACTER_KEYS.MCDOHL,
        CHARACTER_KEYS.GREMIO,
        CHARACTER_KEYS.PAHN,
        CHARACTER_KEYS.CLEO,
        CHARACTER_KEYS.TED,
      ].map((key) => new Character(key)),
    );
    return { party, list: party.combatants };
  };

  it('a front-row member out of the fight swaps slots with the first back-row member in it', () => {
    const { party, list } = members();
    kill(list[1]);
    party.backfill(0);
    assert.deepStrictEqual(
      list.map((c) => c.position),
      [1, 4, 3, 2, 5],
    );
  });

  it('skips a busy back-row member, and moves nobody when no one is free', () => {
    const { party, list } = members();
    kill(list[0]);
    list[3].busyUntil = 10;
    party.backfill(5);
    assert.deepStrictEqual(
      list.map((c) => c.position),
      [5, 2, 3, 4, 1],
    );
    const other = members();
    kill(other.list[2]);
    other.list[3].busyUntil = 10;
    other.list[4].busyUntil = 10;
    assert.deepStrictEqual(other.party.backfill(5), []);
  });
});

describe('Backfill timing', () => {
  it('happens in the round-end status step, not when the front enemy dies', () => {
    const party = new PlayerParty([
      new Character(CHARACTER_KEYS.GREMIO)
        .setLVL(30)
        .setStats({ PWR: 200, SKL: 99, DEF: 50, SPD: 99, MGC: 10, LUK: 20, HP: 300 })
        .rest(),
    ]);
    const front = new Enemy(ENEMY_KEYS.SOLDIER_ANT),
      back = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
    front.position = 1;
    back.position = 4;
    const battle = new Battle({ party, enemies: new EnemyParty([front, back]), rng: new RNG(1) });
    battle.beginRound([A(0)]);
    let sawDeathBeforeMove = false;
    while (battle.status === BATTLE_STATUS.IN_PROGRESS && battle.phase !== 'Round Over') {
      battle.tick();
      if (front.outOfFight && back.position === 4) sawDeathBeforeMove = true;
      if (back.position === 1) break;
    }
    assert.ok(sawDeathBeforeMove);
    assert.strictEqual(back.position, 1);
  });
});
