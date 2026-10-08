import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ATTACK_RESULT } from '../lib/Game/Battle/Actions.js';
import { ENEMY_AI, ENEMY_MOVES, frontRowTarget } from '../lib/Game/Battle/EnemyAI.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { STATUS } from '../lib/Game/Constants.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { cDiv } from '../lib/util/math.js';
import RNG from '../lib/rng.js';

const gremio = () =>
  new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(10)
    .setStats({ PWR: 40, SKL: 30, DEF: 20, SPD: 20, MGC: 10, LUK: 20, HP: 120 })
    .rest();

/** @param {Character[]} party @param {Enemy[]} enemies @param {number} seed */
const makeBattle = (party, enemies, seed) =>
  new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty(enemies),
    rng: new RNG(seed),
  });

/** Steps 2-4 of the round driver (events, commit, animation pass) for ticks from..to, like Battle.tick. */
const runTicks = (
  /** @type {Battle} */ battle,
  /** @type {number} */ from,
  /** @type {number} */ to,
) => {
  for (let tick = from; tick <= to; tick++) {
    battle.turn.tick = tick;
    battle.runDueEvents();
    battle.commitPendingDamage();
    battle.checkDeaths();
  }
};

/** Seeds tried by a search before giving up, so a missing case fails instead of hanging */
const SEARCH_LIMIT = 5000;

/** The status roll the reaction makes on the rand() at `count + 1`: ((rand * 100) / 0x7fff) % 100. */
const statusRollAt = (/** @type {number} */ seed, /** @type {number} */ count) =>
  cDiv(new RNG(seed).next(count + 1).rand * 100, 0x7fff) % 100;

describe('Mosquito: Poison from its hit reaction', () => {
  /**
   * A Mosquito's basic attack on Gremio at t0 = 0, played through its damage tick (+53).
   * @param {number} seed @param {(c: Character) => void} [setup]
   */
  const attack = (seed, setup = () => {}) => {
    const target = gremio();
    setup(target);
    const mosquito = new Enemy(ENEMY_KEYS.MOSQUITO);
    const battle = makeBattle([target], [mosquito], seed);
    battle.resolveEnemyAttack(mosquito, target);
    const result = battle.log.ofType(LOG_TYPES.ATTACK)[0].detail;
    const afterRolls = battle.rng.getCount(); // the hit (and counter) rolls at t0
    runTicks(battle, 0, 53);
    return { battle, target, result, afterRolls, calls: battle.rng.getCount() - afterRolls };
  };

  /** The first seeds whose Mosquito attack hits, sorted by whether the Poison roll lands. */
  const hitSeeds = () => {
    const poisons = [],
      misses = [];
    for (let seed = 1; poisons.length < 3 || misses.length < 3; seed++) {
      if (seed > SEARCH_LIMIT) throw new Error('not enough hitting seeds');
      const { result, afterRolls } = attack(seed);
      if (result !== ATTACK_RESULT.HIT) continue;
      // Rolls at t0, then calc_damage's rand(), then the status roll
      (statusRollAt(seed, afterRolls + 1) < 20 ? poisons : misses).push(seed);
    }
    return { poisons, misses };
  };

  it('a hit makes 2 rand() on the damage tick: calc_damage, then the status roll', () => {
    const { poisons, misses } = hitSeeds();
    for (const seed of [...poisons, ...misses])
      assert.strictEqual(attack(seed).calls, 2, `seed ${seed}`);
  });

  it('poisons the target on roll < 20', () => {
    const { poisons, misses } = hitSeeds();
    for (const seed of poisons)
      assert.strictEqual(attack(seed).target.status[STATUS.POISON], true, `seed ${seed}`);
    for (const seed of misses)
      assert.strictEqual(attack(seed).target.status[STATUS.POISON], false, `seed ${seed}`);
  });

  it("rolls on the damage tick's animation pass, not before", () => {
    const [seed] = hitSeeds().poisons;
    const target = gremio(),
      mosquito = new Enemy(ENEMY_KEYS.MOSQUITO);
    const battle = makeBattle([target], [mosquito], seed);
    battle.resolveEnemyAttack(mosquito, target);
    runTicks(battle, 0, 52);
    assert.strictEqual(target.status[STATUS.POISON], false);
    runTicks(battle, 53, 53);
    assert.strictEqual(target.status[STATUS.POISON], true);
  });

  it('a Turtle Rune wearer gets no roll and no Poison', () => {
    const [seed] = hitSeeds().poisons;
    const { calls, target } = attack(seed, (c) => c.setRune(RUNES.TURTLE));
    assert.strictEqual(calls, 1); // calc_damage only
    assert.strictEqual(target.status[STATUS.POISON], false);
  });

  it('an already poisoned target still rolls, and stays poisoned', () => {
    const { misses } = hitSeeds();
    const { calls, target } = attack(misses[0], (c) => {
      c.status[STATUS.POISON] = true;
    });
    assert.strictEqual(calls, 2);
    assert.strictEqual(target.status[STATUS.POISON], true);
  });

  it('only a hit or crit rolls: a miss plays the dodge, with no status roll', () => {
    // A Mosquito never misses in play (alwaysHitIfNotCounter, and it can't be countered), so the
    // miss path is driven directly
    const target = gremio(),
      mosquito = new Enemy(ENEMY_KEYS.MOSQUITO);
    const battle = makeBattle([target], [mosquito], 1);
    battle.applyAttackResult(mosquito, target, ATTACK_RESULT.MISSED);
    assert.strictEqual(battle.animationEvents.size, 0);
    assert.strictEqual(battle.events.size, 0);
    runTicks(battle, 0, 120);
    assert.strictEqual(battle.rng.getCount(), 0);
    assert.strictEqual(target.status[STATUS.POISON], false);
  });

  it("Red Solider Ant's reaction has no status roll", () => {
    for (let seed = 1, checked = 0; checked < 3; seed++) {
      if (seed > SEARCH_LIMIT) throw new Error('no hitting seed');
      const target = gremio(),
        ant = new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT);
      const battle = makeBattle([target], [ant], seed);
      battle.resolveEnemyAttack(ant, target);
      if (battle.log.ofType(LOG_TYPES.ATTACK)[0].detail !== ATTACK_RESULT.HIT) continue;
      const before = battle.rng.getCount();
      runTicks(battle, 0, 83);
      assert.strictEqual(battle.rng.getCount() - before, 1);
      checked++;
    }
  });
});

describe('Poison tick', () => {
  /** Gremio (poisoned or not) Defends through a round against a FurFur. */
  const round = (/** @type {boolean} */ poisoned) => {
    const target = gremio();
    if (poisoned) target.status[STATUS.POISON] = true;
    const battle = makeBattle([target], [new Enemy(ENEMY_KEYS.FURFUR)], 1);
    battle.beginRound([{ type: ACTION_TYPES.DEFEND }]);
    const rngAfterStart = battle.rng.getCount();
    const hpBefore = target.HP;
    battle.tick(); // the first tick commits it
    return { target, rngAfterStart, lost: hpBefore - target.HP };
  };

  it('takes floor(HPMax / 20) at round start, committed on the first tick, with no RNG', () => {
    const poisoned = round(true),
      healthy = round(false);
    assert.strictEqual(poisoned.lost, Math.floor(120 / 20));
    assert.strictEqual(healthy.lost, 0);
    assert.strictEqual(poisoned.rngAfterStart, healthy.rngAfterStart);
  });
});

describe('Red Solider Ant AI', () => {
  const party = () => new PlayerParty([gremio()]);
  /** @param {number} seed */
  const params = (seed) => ({
    party: party(),
    enemies: null,
    rng: new RNG(seed),
    turn_count: 1,
    tick: 0,
  });

  it('after the target pass: ((r * 100) / 0x7fff) % 100 < 0x4d -> Attack, else Double Strike', () => {
    const ant = new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT);
    let attacks = 0,
      strikes = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const p = params(seed);
      const choice = ENEMY_AI[ENEMY_KEYS.RED_SOLDIER_ANT](ant, p);
      // Replay the pass and the move roll by hand
      const rng = new RNG(seed);
      const target = frontRowTarget(p.party, rng, 0);
      if (!target) {
        assert.strictEqual(choice.action, ACTION_TYPES.UNDETERMINED);
        continue;
      }
      const roll = cDiv(rng.next().rand * 100, 0x7fff) % 100;
      if (roll < 0x4d) {
        assert.strictEqual(choice.action, ACTION_TYPES.ATTACK);
        attacks++;
      } else {
        assert.strictEqual(choice.action, ACTION_TYPES.ABILITY);
        assert.strictEqual(
          /** @type {any} */ (choice).move,
          ENEMY_MOVES.RED_SOLDIER_ANT_DOUBLE_STRIKE,
        );
        assert.strictEqual(/** @type {any} */ (choice).target, p.party.combatants[0]);
        strikes++;
      }
      assert.strictEqual(p.rng.getCount(), rng.getCount());
    }
    assert.ok(attacks > strikes && strikes > 0);
  });

  it('r = 32767 is an Attack: 100 % 100 = 0', () => {
    assert.strictEqual(cDiv(0x7fff * 100, 0x7fff) % 100, 0);
  });
});

describe('Red Solider Ant Double Strike', () => {
  /** The first seed whose ant AI picks Double Strike at tick 0, dispatched on the battle. */
  const doubleStrike = () => {
    for (let seed = 1; seed <= SEARCH_LIMIT; seed++) {
      const target = gremio(),
        ant = new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT);
      const battle = makeBattle([target], [ant], seed);
      battle.turn.current = 2;
      const result = battle.dispatchEnemy(ant);
      if (
        battle.log.ofType(LOG_TYPES.CAST)[0]?.detail !==
        ENEMY_MOVES.RED_SOLDIER_ANT_DOUBLE_STRIKE.name
      )
        continue;
      return { seed, battle, target, ant, result };
    }
    throw new Error('no Double Strike seed');
  };

  it('from its AI tick: damage roll +29, target free +63, ant free +145, gate 20, released at +82', () => {
    const { battle, target, ant, result } = doubleStrike();
    assert.deepStrictEqual([...battle.events.keys()], [29]);
    assert.strictEqual(target.busyUntil, 63);
    assert.strictEqual(ant.busyUntil, 145);
    assert.strictEqual(result.gate, 20);
    assert.strictEqual(battle.turn.releaseAt, 82);
  });

  it('has no hit or crit roll, and deals calc_damage x 2', () => {
    const { seed, battle, target } = doubleStrike();
    const aiRolls = battle.rng.getCount(); // the target pass and the move roll only
    const hpBefore = target.HP;
    runTicks(battle, 0, 29);
    assert.strictEqual(battle.rng.getCount(), aiRolls + 1); // calc_damage
    const expected =
      new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT).calcAttackDamage(target, new RNG(seed).next(aiRolls)) *
      2;
    assert.strictEqual(hpBefore - target.HP, expected);
    assert.strictEqual(expected % 2, 0);
  });
});
