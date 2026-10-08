import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { ENEMY_AI, ENEMY_MOVES } from '../lib/Game/Battle/EnemyAI.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { cDiv } from '../lib/lib.js';
import RNG from '../lib/rng.js';

const member = (/** @type {number} */ MGC, rune = null) => {
  const c = new Character(CHARACTER_KEYS.GREMIO).setLVL(10)
    .setStats({ PWR: 40, SKL: 30, DEF: 20, SPD: 20, MGC, LUK: 20, HP: 400 }).rest();
  if (rune) c.rune = rune;
  return c;
};

/** The variance formula from the brief, for one roll */
const variance = (/** @type {number} */ base, /** @type {number} */ roll) =>
  Math.max(base < 10 ? base + 1 - (roll % 4) : base + cDiv(cDiv(base, 2) - (roll % base), 5), 1);

describe('Queen Ant (Mt. Seifu) AI', () => {
  const queen = new Enemy(ENEMY_KEYS.QUEEN_ANT_BOSS);
  const params = (/** @type {PlayerParty} */ party, /** @type {RNG} */ rng) =>
    ({ party, enemies: new EnemyParty([queen]), rng, tick: 0, turn_count: 1 });

  it('costs one roll and picks AoE Earth below 0x33', () => {
    const party = new PlayerParty([member(10)]);
    for (let seed = 1; seed < 200; seed++) {
      const rng = new RNG(seed);
      const roll = new RNG(seed).next().rand;
      const choice = /** @type {{ move: unknown }} */ (ENEMY_AI[ENEMY_KEYS.QUEEN_ANT_BOSS](queen, params(party, rng)));
      assert.strictEqual(rng.getCount(), 1);
      if (cDiv(roll * 100, 32767) < 0x33) assert.strictEqual(choice.move, ENEMY_MOVES.QUEEN_ANT_AOE_EARTH);
      else assert.strictEqual(choice.move, ENEMY_MOVES.QUEEN_ANT_COMMAND_ANTS);
    }
  });

  it('AoE Earth: one roll per living member, MGC 55 minus theirs, halved for Earth / Soul Eater only', () => {
    const members = [member(10), member(20, RUNES.EARTH), member(36), member(7, RUNES.SOUL_EATER), member(0)];
    members[2].die(0); // dead: costs nothing
    const party = new PlayerParty(members);
    const rng = new RNG(0x1234);
    const expected = new RNG(0x1234);
    ENEMY_MOVES.QUEEN_ANT_AOE_EARTH.apply(queen, { party, rng });
    assert.strictEqual(rng.getCount(), 4);
    for (const [i, halved] of /** @type {[number, boolean][]} */ ([[0, false], [1, true], [3, true], [4, false]])) {
      const full = variance(55 - members[i].MGC, expected.next().rand);
      assert.strictEqual(members[i].pendingDamage, halved ? cDiv(full, 2) : full, `slot ${i + 1}`);
    }
  });
});

describe('Soldier Ant (Mt. Seifu) damage', () => {
  it('one roll, ATK 48 minus DEF, floored at 1, Double Strike doubles it', () => {
    const ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
    for (const def of [5, 30, 47, 60]) {
      const target = member(0);
      target.setStats({ PWR: 40, SKL: 30, DEF: def, SPD: 20, MGC: 0, LUK: 20, HP: 400 });
      const rng = new RNG(77);
      const damage = ant.calcAttackDamage(target, rng);
      assert.strictEqual(rng.getCount(), 1);
      assert.strictEqual(damage, variance(48 - target.ARM, new RNG(77).next().rand));
    }
  });
});

describe('Queen Ant (Mt. Seifu) turn timing', () => {
  /** A round of one defending member against the Queen alone; her AI roll tick and the log */
  const round = (/** @type {number} */ seed) => {
    const party = [member(10), member(10)];
    const battle = new Battle({ party: new PlayerParty(party), enemies: new EnemyParty([new Enemy(ENEMY_KEYS.QUEEN_ANT_BOSS)]), rng: new RNG(seed) });
    battle.playTurn([{ type: 'Defend' }, { type: 'Defend' }]);
    return battle;
  };
  const seeds = (/** @type {boolean} */ aoe) => {
    const found = [];
    for (let seed = 1; found.length < 3; seed++) {
      const b = round(seed);
      const cast = b.log.ofType(LOG_TYPES.CAST)[0]?.detail;
      if ((cast === 'AoE Earth') === aoe) found.push(b);
    }
    return found;
  };

  it('AoE Earth: all damage rolls on one tick, A + 175 after the AI roll', () => {
    for (const b of seeds(true)) {
      const cast = b.log.ofType(LOG_TYPES.CAST)[0];
      const hits = b.log.ofType(LOG_TYPES.DAMAGE);
      assert.strictEqual(hits.length, 2);
      assert.strictEqual(hits[0].tick, hits[1].tick);
      assert.strictEqual(hits[0].tick - cast.tick, 164 + 175);
    }
  });

  it('Command Ants: deals no damage', () => {
    for (const b of seeds(false)) {
      assert.strictEqual(b.log.ofType(LOG_TYPES.DAMAGE).length, 0);
    }
  });
});
