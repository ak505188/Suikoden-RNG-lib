import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

// Seeds for a fresh RNG with the attack resolved first: seed 1 hits, seed 7 misses (both directions).
const HIT_SEED = 1;
const MISS_SEED = 7;

/** @param {number} [SKL] */
const makeGremio = (SKL = 68) => new Character(CHARACTER_KEYS.GREMIO)
  .setLVL(22)
  .setStats({ PWR: 64, SKL, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

const makeCleo = () => new Character(CHARACTER_KEYS.CLEO)
  .setLVL(22)
  .setRune(RUNES.FIRE)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

/**
 * A battle at tick 0 with no rounds, for calling resolvers directly.
 * @param {Character[]} party @param {Enemy[]} enemies @param {number} seed
 */
const makeBattle = (party, enemies, seed) =>
  new Battle({ party: new PlayerParty(party), enemies: new EnemyParty(enemies), rng: new RNG(seed), turns: [] });

/**
 * Runs the round driver's steps 2-3 and the death check for ticks from..to, like Battle.tick.
 * @param {Battle} battle @param {number} from @param {number} to
 * @param {(tick: number) => void} [onTick]
 */
const runTicks = (battle, from, to, onTick = () => {}) => {
  for (let tick = from; tick <= to; tick++) {
    battle.turn.tick = tick;
    battle.runDueEvents();
    battle.commitPendingDamage();
    battle.checkDeaths();
    onTick(tick);
  }
};

describe('Party basic attack', () => {
  it('hit: damage roll at +64, target free at +100, attacker free at +120 (Gremio -> Zombie Dragon)', () => {
    const gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio], [dragon], HIT_SEED);
    gremio.setAction({ type: ACTION_TYPES.ATTACK });
    const result = battle.resolvePartyAttack(gremio);
    assert.deepStrictEqual(result, { status: 'Done', gate: 0 });
    assert.deepStrictEqual([...battle.events.keys()], [64]);
    assert.strictEqual(dragon.busyUntil, 100);
    assert.strictEqual(gremio.busyUntil, 120);
  });

  it('miss: no damage roll, target plays its own dodge (Gremio -> Soldier Ant)', () => {
    const gremio = makeGremio(1), ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
    const battle = makeBattle([gremio], [ant], MISS_SEED);
    gremio.setAction({ type: ACTION_TYPES.ATTACK });
    battle.resolvePartyAttack(gremio);
    assert.strictEqual(battle.events.size, 0);
    assert.strictEqual(ant.busyUntil, 112);
    assert.strictEqual(gremio.busyUntil, 120);
  });

  it('waits on a busy target without using RNG', () => {
    const gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio], [dragon], HIT_SEED);
    gremio.setAction({ type: ACTION_TYPES.ATTACK });
    dragon.busyUntil = 50;
    assert.deepStrictEqual(battle.resolvePartyAttack(gremio), { status: 'Pending' });
    assert.strictEqual(battle.rng.getCount(), 0);
  });
});

describe('Enemy basic attack', () => {
  it('hit: damage roll at +57, target free at +102, attacker free at +108 (Zombie Dragon -> Gremio)', () => {
    const gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio], [dragon], HIT_SEED);
    battle.resolveEnemyAttack(dragon, gremio);
    assert.deepStrictEqual([...battle.events.keys()], [57]);
    assert.strictEqual(gremio.busyUntil, 102);
    assert.strictEqual(dragon.busyUntil, 108);
  });

  it('miss: target free at +101, attacker free at +108', () => {
    const gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio], [dragon], MISS_SEED);
    battle.resolveEnemyAttack(dragon, gremio);
    assert.strictEqual(battle.events.size, 0);
    assert.strictEqual(gremio.busyUntil, 101);
    assert.strictEqual(dragon.busyUntil, 108);
  });
});

describe('Death', () => {
  const gremio = makeGremio(), ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT);
  ant.HP = 1;
  const battle = makeBattle([gremio], [ant], HIT_SEED);
  gremio.setAction({ type: ACTION_TYPES.ATTACK });
  battle.resolvePartyAttack(gremio);

  let hpZeroAt = null, outAt = null, validWhileDying = true;
  runTicks(battle, 0, 250, tick => {
    if (ant.HP === 0 && hpZeroAt === null) hpZeroAt = tick;
    if (ant.knockedOut && outAt === null) outAt = tick;
    if (ant.HP === 0 && !ant.knockedOut && !ant.isValidCombatant) validWhileDying = false;
  });

  it('HP reaches 0 on the damage roll (+64)', () => assert.strictEqual(hpZeroAt, 64));
  it('dies when its hit reaction ends (+100), not at 0 HP', () => assert.strictEqual(outAt, 100));
  it('stays a valid combatant while dying at 0 HP', () => assert.strictEqual(validWhileDying, true));
  it('death script keeps it busy until +193', () => assert.strictEqual(ant.busyUntil, 193));
  it('death sets ActionTag, so it never gets a turn', () => assert.strictEqual(ant.acted, true));
});

describe('Event ordering', () => {
  it('runs a tick\'s events in owner index order, queue order within an owner', () => {
    const viktor = new Character(CHARACTER_KEYS.VIKTOR), gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([viktor, gremio], [dragon], HIT_SEED);
    const log = [];
    battle.queueEvent(5, dragon, () => log.push('dragon'));
    battle.queueEvent(5, gremio, () => log.push('gremio 1'));
    battle.queueEvent(5, viktor, () => log.push('viktor'));
    battle.queueEvent(5, gremio, () => log.push('gremio 2'));
    battle.turn.tick = 5;
    battle.runDueEvents();
    assert.deepStrictEqual(log, ['viktor', 'gremio 1', 'gremio 2', 'dragon']);
  });

  it('rejects an owner from another battle', () => {
    const battle = makeBattle([makeGremio()], [new ZombieDragon()], HIT_SEED);
    assert.throws(() => battle.queueEvent(5, new ZombieDragon(), () => {}));
  });
});

describe('Spell cast', () => {
  it('waits until nobody is busy, winds up for its frames, resolves, then finishes next tick', () => {
    const cleo = makeCleo(), dragon = new ZombieDragon();
    const battle = makeBattle([cleo], [dragon], HIT_SEED);
    dragon.busyUntil = 50; // free from tick 51
    let resolvedAt = null, doneAt = null;
    const rngAtCast = battle.rng.getCount();

    let result = battle.castMagic(cleo, () => { resolvedAt = battle.turn.tick; }, 100);
    for (let tick = 0; tick <= 200 && doneAt === null; tick++) {
      battle.turn.tick = tick;
      if (tick > 0) result = battle.continueMagic();
      if (result.status === 'Done') doneAt = tick;
      battle.runDueEvents();
    }

    assert.strictEqual(resolvedAt, 151); // ready at 51, + 100 wind-up
    assert.strictEqual(doneAt, 152);
    assert.strictEqual(result.gate, undefined); // gate unchanged
    assert.strictEqual(battle.rng.getCount(), rngAtCast); // the resolve callback here rolls nothing
  });

  it('spends MP of the spell\'s level and refuses when that level is empty', () => {
    const cleo = makeCleo(); // MGC 93: MP 5/3/2/0
    assert.deepStrictEqual(cleo.MP, [5, 3, 2, 0]);
    cleo.spendMP(2);
    cleo.spendMP(2);
    assert.deepStrictEqual(cleo.MP, [5, 3, 0, 0]);
    assert.throws(() => cleo.spendMP(2), /no level 3 MP/);
    assert.throws(() => cleo.spendMP(3), /no level 4 MP/);
  });
});
