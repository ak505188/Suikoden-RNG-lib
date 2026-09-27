import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { STATUS } from '../lib/Game/Constants.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

// Seeds for a fresh RNG with the attack resolved first: seed 1 hits, seed 7 misses (both directions).
// Seed 7 also produces the counters below, where the target can counter.
const HIT_SEED = 1;
const MISS_SEED = 7;

/** @param {number} [SKL] */
const makeGremio = (SKL = 68) => new Character(CHARACTER_KEYS.GREMIO)
  .setLVL(22)
  .setStats({ PWR: 64, SKL, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

/** @param {number} SKL */
const makeMcDohl = SKL => new Character(CHARACTER_KEYS.MCDOHL)
  .setLVL(22)
  .setStats({ PWR: 76, SKL, DEF: 74, SPD: 86, MGC: 80, LUK: 79, HP: 244 })
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
    assert.strictEqual(ant.fx & 0x2, 0x2); // its dodge sets 0x2
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

describe('Counters', () => {
  /** McDohl (Medium range) misses an Elite Soldier (species bit 1), which counters. */
  const partyCountered = (primed = false) => {
    const mcdohl = makeMcDohl(1), soldier = new Enemy(ENEMY_KEYS.ELITE_SOLDIER_1);
    const battle = makeBattle([mcdohl], [soldier], MISS_SEED);
    mcdohl.setAction({ type: ACTION_TYPES.ATTACK });
    mcdohl.fx = 0x2;
    if (primed) soldier.fx = 0x2;
    battle.resolvePartyAttack(mcdohl);
    return { battle, mcdohl, soldier };
  };

  it('monster counters a party miss: roll at +110, attacker free +177, retaliator free +148', () => {
    const { battle, mcdohl, soldier } = partyCountered();
    assert.deepStrictEqual([...battle.events.keys()], [110]);
    assert.strictEqual(mcdohl.busyUntil, 177);
    assert.strictEqual(soldier.busyUntil, 148);
  });

  it('the counter damages the attacker on the roll tick', () => {
    const { battle, mcdohl } = partyCountered();
    let hpBefore = null;
    runTicks(battle, 0, 110, tick => { if (tick === 109) hpBefore = mcdohl.HP; });
    assert.strictEqual(hpBefore, 244);
    assert.ok(mcdohl.HP < 244);
  });

  it('a primed retaliator (it dodged earlier) counters sooner: roll at +106', () => {
    const { battle, mcdohl, soldier } = partyCountered(true);
    assert.deepStrictEqual([...battle.events.keys()], [106]);
    assert.strictEqual(mcdohl.busyUntil, 173);
    assert.strictEqual(soldier.busyUntil, 144);
  });

  it('effect flags: the attacker\'s are cleared, the counter steps clear the retaliator\'s', () => {
    const { mcdohl, soldier } = partyCountered(true);
    assert.strictEqual(mcdohl.fx, 0);
    assert.strictEqual(soldier.fx, 0);
  });

  /** An Elite Soldier (species bit 0, not the first enemy) misses McDohl, who counters. */
  const enemyCountered = defending => {
    const mcdohl = makeMcDohl(150), ant = new Enemy(ENEMY_KEYS.SOLDIER_ANT), soldier = new Enemy(ENEMY_KEYS.ELITE_SOLDIER_1);
    const battle = makeBattle([mcdohl], [ant, soldier], MISS_SEED);
    mcdohl.defending = defending;
    const result = battle.resolveEnemyAttack(soldier, mcdohl);
    return { battle, mcdohl, soldier, result };
  };

  it('party member counters an enemy miss: roll at +103, retaliator free +126, attacker free +184', () => {
    const { battle, mcdohl, soldier } = enemyCountered(true);
    assert.deepStrictEqual([...battle.events.keys()], [103]);
    assert.strictEqual(mcdohl.busyUntil, 126);
    assert.strictEqual(soldier.busyUntil, 184);
  });

  it('Defend guarantees the counter with no coin flip (1 rand() call: the hit roll)', () => {
    assert.strictEqual(enemyCountered(true).battle.rng.getCount(), 1);
  });

  it('without Defend or Counter Rune, a coin flip decides (2 rand() calls)', () => {
    assert.strictEqual(enemyCountered(false).battle.rng.getCount(), 2);
  });

  it('the first enemy can never be countered', () => {
    const mcdohl = makeMcDohl(150), soldier = new Enemy(ENEMY_KEYS.ELITE_SOLDIER_1);
    const battle = makeBattle([mcdohl], [soldier], MISS_SEED);
    mcdohl.defending = true;
    battle.resolveEnemyAttack(soldier, mcdohl);
    assert.strictEqual(battle.events.size, 0); // a plain miss
  });
});

describe('Waiting for the other side', () => {
  it('an actor waits while an attack from the other side is in its continuation chain', () => {
    const gremio = makeGremio(), cleo = makeCleo(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio, cleo], [dragon], HIT_SEED);
    gremio.setAction({ type: ACTION_TYPES.ATTACK });
    battle.resolvePartyAttack(gremio); // t0 = 0; Gremio's recover starts at +88
    assert.strictEqual(gremio.attackUntil, 88);
    battle.turn.tick = 88;
    assert.strictEqual(battle.isWaitingForOtherSide(dragon), true);
    assert.strictEqual(battle.isWaitingForOtherSide(cleo), false); // same side: no wait
    battle.turn.tick = 89;
    assert.strictEqual(battle.isWaitingForOtherSide(dragon), false);
  });
});

describe('Battle start', () => {
  it('clears statuses except Poison and Balloon', () => {
    const gremio = makeGremio();
    Object.assign(gremio.status, {
      [STATUS.POISON]: true, [STATUS.BALLOON]: 2, [STATUS.BUCKET]: true, [STATUS.UNBALANCED]: 1, [STATUS.SLEEP]: true,
    });
    makeBattle([gremio], [new ZombieDragon()], HIT_SEED);
    assert.deepStrictEqual(gremio.status, {
      [STATUS.POISON]: true, [STATUS.BALLOON]: 2, [STATUS.BUCKET]: false, [STATUS.UNBALANCED]: 0, [STATUS.SLEEP]: false,
    });
  });
});

describe('Unbalanced', () => {
  it('lasts through the next round, clearing at its end', () => {
    const gremio = makeGremio(), dragon = new ZombieDragon();
    const battle = makeBattle([gremio], [dragon], HIT_SEED);
    const endRound = () => {
      battle.resetTurn();
      battle.phase = PHASE_STATE.ROUND_END_WAIT;
      battle.turn.rollGate = 1;
      battle.turnStep();
      assert.strictEqual(battle.phase, PHASE_STATE.ROUND_OVER);
    };
    gremio.unbalance(); // lands in round 0
    endRound();
    assert.strictEqual(gremio.status[STATUS.UNBALANCED], 1); // still on for round 1
    endRound();
    assert.strictEqual(gremio.status[STATUS.UNBALANCED], 0);
    endRound();
    assert.strictEqual(gremio.status[STATUS.UNBALANCED], 0);
  });

  it('limits an action plan to Defend or Item', () => {
    const gremio = makeGremio();
    const battle = makeBattle([gremio], [new ZombieDragon()], HIT_SEED);
    gremio.unbalance();
    assert.throws(() => battle.party.setActionPlan([{ type: ACTION_TYPES.ATTACK }]), /Unbalanced/);
    battle.party.setActionPlan([{ type: ACTION_TYPES.ITEM, itemId: 'MEDICINE' }]);
    battle.party.setActionPlan([]); // unplanned members Defend
    assert.strictEqual(gremio.action.type, ACTION_TYPES.DEFEND);
  });

  it("doesn't decay on enemies", () => {
    const dragon = new ZombieDragon();
    const battle = makeBattle([makeGremio()], [dragon], HIT_SEED);
    dragon.unbalance();
    battle.party.decayStatuses();
    assert.strictEqual(dragon.status[STATUS.UNBALANCED], 2);
  });
});

describe('Balloon', () => {
  it('at 3 or more removes a combatant at battle start, for the whole battle', () => {
    const floating = makeGremio(), almost = makeCleo(), dragon = new ZombieDragon();
    floating.status[STATUS.BALLOON] = 3;
    almost.status[STATUS.BALLOON] = 2;
    const battle = makeBattle([floating, almost], [dragon], HIT_SEED);
    assert.strictEqual(floating.removedFromFight, true);
    assert.strictEqual(floating.outOfFight, true);
    assert.strictEqual(almost.removedFromFight, false);

    battle.roundStart();
    assert.strictEqual(floating.acted, true); // no turn
  });

  it('is only checked at battle start', () => {
    const floating = makeGremio();
    const battle = makeBattle([floating], [new ZombieDragon()], HIT_SEED);
    floating.status[STATUS.BALLOON] = 3;
    battle.roundStart();
    assert.strictEqual(floating.removedFromFight, false); // until the next battle
    makeBattle([floating], [new ZombieDragon()], HIT_SEED);
    assert.strictEqual(floating.removedFromFight, true);
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
