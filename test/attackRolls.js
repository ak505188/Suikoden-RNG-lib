import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ATTACK_RESULT, ROLL_KINDS } from '../lib/Game/Battle/Actions.js';
import { LOG_TYPES, formatRoll, rollMargin } from '../lib/Game/Battle/ActionLog.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { STATUS } from '../lib/Game/Constants.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').AttackRoll} AttackRoll */

const gremio = () => new Character(CHARACTER_KEYS.GREMIO).setLVL(10)
  .setStats({ PWR: 40, SKL: 30, DEF: 20, SPD: 20, MGC: 10, LUK: 20, HP: 120 }).rest();

/** @param {Character} character @param {Enemy} enemy @param {number} seed */
const makeBattle = (character, enemy, seed) =>
  new Battle({ party: new PlayerParty([character]), enemies: new EnemyParty([enemy]), rng: new RNG(seed) });

/** The 0-99 values of the rand() calls after `count`, as the party (rng2) and enemies (rand) read them */
const partyRoll = (/** @type {number} */ seed, /** @type {number} */ count) => new RNG(seed).next(count + 1).getRNG2() % 100;
const enemyRoll = (/** @type {number} */ seed, /** @type {number} */ count) => new RNG(seed).next(count + 1).rand % 100;

describe('Attack rolls in the log', () => {
  it('a party attack logs its hit and crit rolls: the RNG values it used, and its chances', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const attacker = gremio(), ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
      const result = attacker.calcAttackResult(ant, new RNG(seed));
      const rolls = /** @type {AttackRoll[]} */ ([]);
      attacker.calcAttackResult(ant, new RNG(seed), rolls);
      const hitChance = Math.min(Math.max(attacker.SKL - (ant.SKL - 80), 60), 99);
      assert.deepStrictEqual(rolls[0], { kind: ROLL_KINDS.HIT, roll: partyRoll(seed, 0), chance: hitChance, min: 60, max: 99, pass: partyRoll(seed, 0) < hitChance });
      if (result === ATTACK_RESULT.HIT || result === ATTACK_RESULT.CRIT) {
        assert.strictEqual(rolls[1].kind, ROLL_KINDS.CRIT);
        assert.strictEqual(rolls[1].roll, partyRoll(seed, 1));
        assert.strictEqual(rolls[1].pass, result === ATTACK_RESULT.CRIT);
      }
    }
  });

  it('recording rolls doesn\'t change the result or the RNG', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const attacker = gremio(), ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
      const plain = new RNG(seed), logged = new RNG(seed);
      assert.strictEqual(attacker.calcAttackResult(ant, logged, []), attacker.calcAttackResult(ant, plain));
      assert.strictEqual(logged.getCount(), plain.getCount());
    }
  });

  it('an enemy attack logs its hit roll, and on a miss its counter coin flip', () => {
    let counterRolls = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const target = gremio(), ant = new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT);
      ant.slot = 2;
      const rolls = /** @type {AttackRoll[]} */ ([]);
      const result = ant.calcAttackResult(target, new RNG(seed), rolls);
      assert.strictEqual(rolls[0].kind, ROLL_KINDS.HIT);
      assert.strictEqual(rolls[0].roll, enemyRoll(seed, 0));
      if (rolls[0].pass) {
        assert.strictEqual(rolls.length, 1);
        continue;
      }
      assert.deepStrictEqual(rolls[1], { kind: ROLL_KINDS.COUNTER, roll: new RNG(seed).next(2).rand & 1, chance: null, min: null, max: null, pass: result === ATTACK_RESULT.COUNTERED });
      counterRolls++;
    }
    assert.ok(counterRolls > 0);
  });

  it('Battle puts them on the ATTACK entry, and leaves them off with logging off', () => {
    const run = (/** @type {boolean} */ logging) => {
      const mosquito = new Enemy(ENEMY_KEYS.MOSQUITO), target = gremio();
      const battle = makeBattle(target, mosquito, 7).setLogging(logging);
      battle.resolveEnemyAttack(mosquito, target);
      return battle;
    };
    const [entry] = run(true).log.ofType(LOG_TYPES.ATTACK);
    assert.strictEqual(entry.rolls?.length, 1);
    assert.match(run(true).log.format(), /attacks Gremio: Hit \(hit \d+ < \d+ (by \d+|locked)\)/);
    assert.strictEqual(run(false).log.entries.length, 0);
    assert.deepStrictEqual(run(true).log.attackRolls().map(r => [r.actor, r.target, r.kind, r.round]), [[entry.actor, 'Gremio', ROLL_KINDS.HIT, 0]]);
  });
});

describe('rollMargin', () => {
  /** @param {Partial<AttackRoll>} r @returns {AttackRoll} */
  const hit = r => ({ kind: ROLL_KINDS.HIT, roll: 70, chance: 75, min: 60, max: 99, pass: true, ...r });

  it('a pass flips when its chance drops to the roll; a fail when its chance rises past it', () => {
    assert.strictEqual(rollMargin(hit({ roll: 70, chance: 75, pass: true })), 5);
    assert.strictEqual(rollMargin(hit({ roll: 74, chance: 75, pass: true })), 1);
    assert.strictEqual(rollMargin(hit({ roll: 75, chance: 75, pass: false })), 1);
    assert.strictEqual(rollMargin(hit({ roll: 80, chance: 75, pass: false })), 6);
  });

  it('is Infinity when the clamp keeps the roll where it is', () => {
    assert.strictEqual(rollMargin(hit({ roll: 59, chance: 99, pass: true })), Infinity); // hit chance is never below 60
    assert.strictEqual(rollMargin(hit({ roll: 60, chance: 99, pass: true })), 39);
    assert.strictEqual(rollMargin(hit({ roll: 99, chance: 80, pass: false })), Infinity); // never above 99
    assert.strictEqual(formatRoll(hit({ roll: 30, chance: 75, pass: true })), 'hit 30 < 75 locked');
    assert.strictEqual(formatRoll(hit({ roll: 70, chance: 75, pass: true })), 'hit 70 < 75 by 5');
  });

  it('a counter coin flip has no margin', () => {
    const flip = /** @type {AttackRoll} */ ({ kind: ROLL_KINDS.COUNTER, roll: 1, chance: null, min: null, max: null, pass: true });
    assert.strictEqual(rollMargin(flip), null);
    assert.strictEqual(formatRoll(flip), 'counter 1');
  });

  it('clamp bounds follow Bucket, Hazy and Killer', () => {
    const ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
    const bucket = gremio();
    bucket.status[STATUS.BUCKET] = true;
    const rolls = /** @type {AttackRoll[]} */ ([]);
    bucket.rollHit(ant, new RNG(1), rolls);
    gremio().setRune(RUNES.KILLER).willCrit(new RNG(1), rolls);
    new Enemy(ENEMY_KEYS.SOLDIER_ANT).willHitTarget(gremio().setRune(RUNES.HAZY), new RNG(1), rolls);
    assert.deepStrictEqual(rolls.map(r => [r.min, r.max]), [[30, 49], [6, 50], [30, 49]]);
  });
});
