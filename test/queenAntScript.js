import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { BATTLE_STATUS } from '../lib/Game/Battle/Battle.js';
import QueenAntScript, {
  FIGHT_EXIT_DELAY,
  SPAWN_BUSY,
} from '../lib/Game/Battle/Scripts/QueenAnt.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';

const member = (
  /** @type {import('../lib/Game/Keys.js').CharacterKey} */ key,
  /** @type {number} */ SPD,
) =>
  new Character(key)
    .setLVL(10)
    .setStats({ PWR: 90, SKL: 80, DEF: 60, SPD, MGC: 10, LUK: 20, HP: 9000 })
    .rest();

const DEFEND = { type: ACTION_TYPES.DEFEND };
/** @param {number} target the enemy's index: the ants are 0-2, the Queen 3 */
const attack = (target) => ({ type: ACTION_TYPES.ATTACK, target });

/**
 * Gremio (fast), Pahn, Cleo (slow: acts after the Queen) against 3 Soldier Ants and the Queen.
 * @param {number} seed @param {number} round the round to play (the fight ends on the 3rd)
 */
const fight = (seed, round = 1) =>
  new Battle({
    party: new PlayerParty([
      member(CHARACTER_KEYS.GREMIO, 30),
      member(CHARACTER_KEYS.PAHN, 26),
      member(CHARACTER_KEYS.CLEO, 12),
    ]),
    enemies: new EnemyParty([
      ...[0, 1, 2].map(() => new Enemy(ENEMY_KEYS.SOLDIER_ANT)),
      new Enemy(ENEMY_KEYS.QUEEN_ANT_BOSS),
    ]),
    rng: new RNG(seed),
    script: new QueenAntScript(),
    turn_count: round - 1,
    escapable: false,
  });

/** @param {Battle} battle @param {import('../lib/Game/Battle/ActionLog.js').LogType} type @returns {import('../lib/Game/Battle/ActionLog.js').LogEntry[]} */
const logged = (battle, type) => battle.log.ofType(type);

describe('Queen Ant script: respawn', () => {
  it('early kills revive one tick after the last actor starts a Defend (L = 1)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const battle = fight(seed);
      battle.playTurn([attack(0), attack(1), DEFEND]);
      const deaths = logged(battle, LOG_TYPES.DEATH),
        revives = logged(battle, LOG_TYPES.REVIVE);
      assert.strictEqual(revives.length, 2, `seed ${seed}`);
      // Cleo is last (the Queen and every ant act before her), so her Defend opens the gate
      const lastDefend = logged(battle, LOG_TYPES.DEFEND).at(-1).tick;
      for (const revive of revives) {
        const death = deaths.find((d) => d.target === revive.target);
        assert.strictEqual(
          revive.tick,
          Math.max(death.tick + 94, lastDefend + 1),
          `seed ${seed} ${revive.target}`,
        );
      }
    }
  });

  it('a kill after the gate opened revives at K + D + 94, and the round waits for it', () => {
    const battle = fight(1);
    battle.playTurn([attack(0), attack(1), attack(2)]);
    const death = logged(battle, LOG_TYPES.DEATH).find((d) => d.target === 'Soldier Ant #3');
    const revive = logged(battle, LOG_TYPES.REVIVE).find((r) => r.target === 'Soldier Ant #3');
    assert.strictEqual(revive.tick, death.tick + 94);
    // The round end starts with the revive: its 30-tick wait, then the 61 ticks of spawn animation
    assert.ok(logged(battle, LOG_TYPES.ROUND_END)[0].tick > revive.tick + SPAWN_BUSY);
  });

  it('a revived ant has full HP, its turn tag and the spawn animation', () => {
    const battle = fight(1);
    battle.playTurn([attack(0), attack(1), DEFEND]);
    const ant = battle.enemies.combatants[0];
    const revive = logged(battle, LOG_TYPES.REVIVE).find((r) => r.target === ant.label);
    assert.strictEqual(ant.HP, ant.stats.HP);
    assert.strictEqual(ant.knockedOut, false);
    assert.strictEqual(ant.acted, true);
    assert.strictEqual(ant.busyUntil, revive.tick + SPAWN_BUSY);
  });

  it('costs no RNG', () => {
    const battle = fight(1);
    battle.beginRound([attack(0), attack(1), attack(2)]);
    let revivalTicks = 0;
    while (battle.phase !== 'Round Over') {
      const revives = logged(battle, LOG_TYPES.REVIVE).length,
        rolls = battle.rng.count;
      battle.tick();
      if (logged(battle, LOG_TYPES.REVIVE).length > revives) {
        revivalTicks++;
        assert.strictEqual(battle.rng.count, rolls, `tick ${battle.turn.tick - 1}`);
      }
    }
    assert.ok(revivalTicks >= 2);
  });

  it('survives a clone mid-round', () => {
    const battle = fight(1);
    battle.beginRound([attack(0), attack(1), attack(2)]);
    for (let i = 0; i < 400; i++) {
      battle.tick();
      battle.skipIdleTicks();
    }
    const copy = battle.clone();
    battle.playRound();
    copy.playRound();
    assert.deepStrictEqual(
      copy.log.ofType(LOG_TYPES.REVIVE).map((r) => r.tick),
      battle.log.ofType(LOG_TYPES.REVIVE).map((r) => r.tick),
    );
    assert.strictEqual(copy.rng.count, battle.rng.count);
  });
});

describe('Queen Ant script: fight end', () => {
  it('rounds 1 and 2 go on; round 3 ends the fight with no results', () => {
    const battle = fight(3);
    for (let round = 1; round <= 3; round++) {
      assert.strictEqual(battle.status, BATTLE_STATUS.IN_PROGRESS);
      battle.playTurn([DEFEND, DEFEND, DEFEND]);
    }
    assert.strictEqual(battle.status, BATTLE_STATUS.SCRIPTED_END);
    const before = battle.rng.count;
    const { result } = battle.finish();
    assert.strictEqual(result.drop, null);
    assert.deepStrictEqual(result.rewards, []);
    assert.strictEqual(battle.rng.count, before); // no drop roll, no EXP rolls
  });

  it('a clean round 3 ends 65 ticks after the callback sets the flag', () => {
    let checked = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const battle = fight(seed, 3);
      battle.playTurn([DEFEND, DEFEND, DEFEND]);
      assert.strictEqual(battle.status, BATTLE_STATUS.SCRIPTED_END);
      // The flag is set one tick after Cleo's Defend starts; the countdown reads -1 62 ticks later
      // and the exit follows FIGHT_EXIT_DELAY after; frames count the last tick as a whole one
      const flag = logged(battle, LOG_TYPES.DEFEND).at(-1).tick + 1;
      const busy = Math.max(...battle.combatants.slice(1).map((c) => c.busyUntil));
      // Nothing dies (no revive to wait for) and nobody is still animating when the countdown ends
      if (logged(battle, LOG_TYPES.REVIVE).length || busy > flag + 30) continue;
      checked++;
      assert.strictEqual(battle.frames, flag + 62 + 1 + FIGHT_EXIT_DELAY, `seed ${seed}`);
    }
    assert.ok(checked >= 3, `only ${checked} clean seeds`);
  });

  it('a dead ant holds round 3 open until it revives', () => {
    const battle = fight(1, 3);
    battle.playTurn([attack(0), attack(1), attack(2)]);
    const revive = logged(battle, LOG_TYPES.REVIVE).at(-1);
    assert.strictEqual(battle.status, BATTLE_STATUS.SCRIPTED_END);
    assert.ok(battle.frames > revive.tick + SPAWN_BUSY);
  });

  it('flags a latency it never measured', () => {
    const battle = fight(1);
    battle.playTurn([
      attack(0),
      DEFEND,
      { type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target: 0 },
    ]);
    const { warnings } = /** @type {QueenAntScript} */ (battle.script);
    assert.ok(
      warnings.some((w) => /Poll latency.*Item/.test(w.text)),
      JSON.stringify(warnings),
    );
  });
});
