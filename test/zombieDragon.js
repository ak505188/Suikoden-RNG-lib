import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import Character from '../lib/Game/Combat/Characters/Character.js';
import { CHARACTERS } from '../lib/Game/Combat/Characters/Characters.js';
import Enemy from '../lib/Game/Combat/Battle/Enemy.js';
import { selectNextActor } from '../lib/Game/Combat/Battle/TurnOrder.js';
import { resolveAttack, resolveMagicAttack, applyDefend } from '../lib/Game/Combat/Battle/Actions.js';
import Battle from '../lib/Game/Combat/Battle/Battle.js';
import { enemies } from '../lib/enemies.js';

function makeDragon() {
  return new Enemy('ZombieDragon', enemies['Bosses'].enemies.ZombieDragon);
}

function makeParty() {
  return ['MCDOHL', 'GREMIO', 'VIKTOR', 'CLEO', 'TAI_HO', 'CAMILLE'].map(
    name => new Character(CHARACTERS[name])
  );
}

describe('selectNextActor', () => {
  it('picks the fighter with the highest SPD*10 + (rng2 % 10 - 5) roll', () => {
    // rng2 sequence for RNG(0x1) is deterministic; roll fighters in a fixed
    // order and confirm the pick matches a hand-evaluation of that formula.
    const rng = new RNG(0x1);
    const probe = rng.clone();
    const rollA = ((probe.next().getRNG2() % 10) - 5);
    const rollB = ((probe.next().getRNG2() % 10) - 5);

    const fighters = [
      { name: 'A', SPD: 50, actedThisRound: false, busy: false },
      { name: 'B', SPD: 50, actedThisRound: false, busy: false },
    ];

    const speedA = 50 * 10 + rollA;
    const speedB = 50 * 10 + rollB;
    const expected = speedB > speedA ? 'B' : 'A';

    const actor = selectNextActor(fighters, new RNG(0x1));
    assert.strictEqual(actor.name, expected);
  });

  it('skips fighters that have already acted or are busy', () => {
    const rng = new RNG(0x1);
    const fighters = [
      { name: 'A', SPD: 999, actedThisRound: true, busy: false },
      { name: 'B', SPD: 1, actedThisRound: false, busy: false },
      { name: 'C', SPD: 999, actedThisRound: false, busy: true },
    ];
    const actor = selectNextActor(fighters, rng);
    assert.strictEqual(actor.name, 'B');
  });

  it('only advances RNG once per eligible fighter', () => {
    const rng = new RNG(0x1);
    const fighters = [
      { name: 'A', SPD: 10, actedThisRound: false, busy: false },
      { name: 'B', SPD: 10, actedThisRound: true, busy: false },
      { name: 'C', SPD: 10, actedThisRound: false, busy: false },
    ];
    selectNextActor(fighters, rng);
    assert.strictEqual(rng.count, 2);
  });
});

describe('resolveAttack / resolveMagicAttack', () => {
  it('resolveAttack = actor.ATK - target.ARM + calculateDamageRoll(ATK, ARM)', () => {
    const rng = new RNG(0x12345678);
    const expectedRoll = rng.clone().next().calculateDamageRoll(120, 35);
    const { damage } = resolveAttack(new RNG(0x12345678), { ATK: 120 }, { ARM: 35 });
    assert.strictEqual(damage, 120 - 35 + expectedRoll);
  });

  it('resolveMagicAttack uses MGC vs. target MGC (not ARM), per zombieDragonTesting.js', () => {
    const rng = new RNG(0x12345678);
    const expectedRoll = rng.clone().next().calculateDamageRoll(130, 47);
    const { damage } = resolveMagicAttack(new RNG(0x12345678), { MGC: 130 }, { MGC: 47 });
    assert.strictEqual(damage, 130 - 47 + expectedRoll);
  });
});

describe('applyDefend', () => {
  it('halves positive damage, rounding down', () => {
    assert.strictEqual(applyDefend(31), 15);
  });

  it('matches simulateAssassinTurn defend rounding for negative damage', () => {
    assert.strictEqual(applyDefend(-3), -1);
  });
});

// Regression baseline: level-1 base-stat party (Character growths aren't
// wired up yet, see plan) vs. the solo Zombie Dragon boss, RNG(0x12345678),
// everyone always attacks. This locks in turn order, RNG advancement, and
// damage numbers for the engine as it exists today - it is NOT a claim that
// these are the real leveled stats for this fight.
describe('Battle: Zombie Dragon (regression baseline, RNG 0x12345678)', () => {
  const party = makeParty();
  const dragon = makeDragon();
  const battle = new Battle({
    party,
    enemies: [dragon],
    rng: new RNG(0x12345678),
    actionPlan: () => 'attack',
  });
  const result = battle.run(3);

  it('runs exactly 3 rounds without a winner yet', () => {
    assert.strictEqual(result.rounds, 3);
    assert.strictEqual(result.winner, null);
  });

  it('round 1 turn order is Dragon, Camille, Cleo, Tai Ho, Gremio, Viktor', () => {
    const round1Actors = result.log.slice(0, 6).map(entry => entry.actor);
    assert.deepStrictEqual(round1Actors, [
      'ZombieDragon',
      'Camille',
      'Cleo',
      'Tai Ho',
      'Gremio',
      'Viktor',
    ]);
  });

  it("the Dragon's breath one-shots McDohl, Gremio, and Viktor (level-1 HP vs. lvl 30 boss)", () => {
    assert.strictEqual(party[0].name, 'McDohl');
    assert.strictEqual(party[0].isAlive, false);
    assert.strictEqual(party[1].name, 'Gremio');
    assert.strictEqual(party[1].isAlive, false);
    assert.strictEqual(party[2].name, 'Viktor');
    assert.strictEqual(party[2].isAlive, false);
  });

  it('weak attacks against the Dragon are clamped to 0 damage, never healing it', () => {
    const dragonHPs = result.log
      .filter(entry => entry.target === 'ZombieDragon')
      .map(entry => entry.targetHP);
    for (let i = 1; i < dragonHPs.length; i++) {
      assert.ok(dragonHPs[i] <= dragonHPs[i - 1]);
    }
  });

  it('ends at the expected RNG value and Dragon HP', () => {
    assert.strictEqual(result.rng, 0xb2182677);
    assert.strictEqual(dragon.currentHP, 3697);
  });
});
