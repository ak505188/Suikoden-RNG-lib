import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../lib/Game/Battle/Enemy.js';
import Character from '../lib/Game/Battle/Character.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { PlayerParty } from '../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { ENEMY_MOVES } from '../lib/Game/Battle/EnemyAI.js';
import RNG from '../lib/rng.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';

describe('Enemy construction', () => {
  it('builds an enemy from its key', () => {
    const e = new Enemy(ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.key, ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.name, 'FurFur');
  });

  it('builds a boss the same way', () => {
    const e = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
    assert.strictEqual(e.key, ENEMY_KEYS.ZOMBIE_DRAGON);
    assert.strictEqual(e.name, 'Zombie Dragon');
  });

  it('keeps Queen Ant (LVL 52) and Queen Ant boss (LVL 15) apart', () => {
    assert.strictEqual(new Enemy(ENEMY_KEYS.QUEEN_ANT).LVL, 52);
    assert.strictEqual(new Enemy(ENEMY_KEYS.QUEEN_ANT_BOSS).LVL, 15);
  });
});

describe('Enemy attack timing', () => {
  const mcdohl = new Character(CHARACTER_KEYS.MCDOHL);
  const eileen = new Character(CHARACTER_KEYS.EILEEN);

  it('FurFur timing: damage roll at 13, free at 44, reaction 45', () => {
    const e = new Enemy(ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.attackTiming.damage, 13);
    assert.strictEqual(e.attackTiming.free, 44);
    assert.strictEqual(e.reactionFrames(mcdohl), 45);
  });

  it('Zombie Dragon (boss) timing: damage roll at 57, free at 108, reaction 45', () => {
    const e = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
    assert.strictEqual(e.attackTiming.damage, 57);
    assert.strictEqual(e.attackTiming.free, 108);
    assert.strictEqual(e.reactionFrames(mcdohl), 45);
  });

  it('Shadow Man uses per-character reaction exceptions (Eileen 222), else the default (235)', () => {
    const e = new Enemy(ENEMY_KEYS.SHADOW_MAN);
    assert.strictEqual(e.reactionFrames(eileen), 222);
    assert.strictEqual(e.reactionFrames(mcdohl), 235);
  });

  it('No reaction when the attack does not mark its target busy (Beast Commander)', () => {
    const e = new Enemy(ENEMY_KEYS.BEAST_COMMANDER);
    assert.strictEqual(e.reactionFrames(mcdohl), null);
  });
});

describe('Sydonia AI', () => {
  // Seed 5: the first rand() % 100 is 55, so party member 1 passes the > 50 check on the first roll
  const party = new PlayerParty([new Character(CHARACTER_KEYS.MCDOHL)]);
  const params = (/** @type {number} */ position) => {
    party.combatants[0].position = position;
    return { party, enemies: null, rng: new RNG(5), turn_count: 1, tick: 0 };
  };
  const sydonia = new Enemy(ENEMY_KEYS.SYDONIA);

  it('uses her special on a front-row target, after one extra roll', () => {
    const p = params(1);
    const choice = sydonia.selectAction(p);
    assert.strictEqual(choice.action, ACTION_TYPES.ABILITY);
    assert.strictEqual(choice.move, ENEMY_MOVES.SYDONIA_SPECIAL);
    assert.strictEqual(p.rng.count, 2);
  });

  it('basic-attacks a back-row target, with no extra roll', () => {
    const p = params(5);
    assert.strictEqual(sydonia.selectAction(p).action, ACTION_TYPES.ATTACK);
    assert.strictEqual(p.rng.count, 1);
  });
});

/** @typedef {import('../lib/Game/Battle/Actions.js').EnemyAbilityAction} EnemyAbilityAction */

describe('Dragon AI', () => {
  const dragon = new Enemy(ENEMY_KEYS.DRAGON);
  const select = (/** @type {any} */ p) =>
    /** @type {EnemyAbilityAction} */ (dragon.selectAction(p));
  /** @param {number} seed */
  const params = (seed) => ({
    party: new PlayerParty([new Character(CHARACTER_KEYS.MCDOHL)]),
    enemies: null,
    rng: new RNG(seed),
    turn_count: 1,
    tick: 0,
  });

  // Both seeds pass the target roll on party member 1; the move roll is 25 (seed 5) or 90 (seed 12)
  it('Lightning at the target when (r * 100) / 32767 < 51', () => {
    const p = params(5);
    const choice = select(p);
    assert.strictEqual(choice.move, ENEMY_MOVES.DRAGON_LIGHTNING);
    assert.strictEqual(choice.target, p.party.combatants[0]);
    assert.strictEqual(p.rng.count, 2);
  });

  it('Fire Breath otherwise', () => {
    assert.strictEqual(select(params(12)).move, ENEMY_MOVES.DRAGON_FIRE_BREATH);
  });

  it('Fire Breath: one roll per member, halved; resisted and the slot-1 bug halve once more', () => {
    const [slot1, slot2, fire] = [
      CHARACTER_KEYS.MCDOHL,
      CHARACTER_KEYS.GREMIO,
      CHARACTER_KEYS.CLEO,
    ].map((key) => new Character(key).setLVL(20).rest());
    slot1.setRune(RUNES.NONE);
    slot2.setRune(RUNES.NONE);
    fire.setRune(RUNES.FIRE);
    const party = new PlayerParty([slot1, slot2, fire]);
    const hits = new Map();
    for (const c of party.combatants) c.takeDamage = (amount) => hits.set(c, amount);
    ENEMY_MOVES.DRAGON_FIRE_BREATH.apply(dragon, { party, rng: new RNG(1) });

    const rng = new RNG(1);
    const roll = (/** @type {Character} */ c) => {
      const b = 150 - c.MGC,
        r = rng.next().rand;
      return Math.max(b + Math.trunc((Math.trunc(b / 2) - (r % b)) / 5), 1);
    };
    const half = (/** @type {number} */ n) => Math.trunc(n / 2);
    assert.deepStrictEqual(
      [...hits.values()],
      [half(half(roll(slot1))), half(roll(slot2)), half(half(roll(fire)))],
    );
  });

  it('Lightning: the particle phase rolls before the one damage roll', () => {
    const target = new Character(CHARACTER_KEYS.MCDOHL).setLVL(20).rest();
    const rng = new RNG(1);
    ENEMY_MOVES.DRAGON_LIGHTNING.apply(dragon, { party: new PlayerParty([target]), rng, target });
    assert.ok(rng.count > 150); // 30 particles x 5 calls on the first tick alone
  });
});
