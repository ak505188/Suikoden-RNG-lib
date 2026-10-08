import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { STATUS } from '../lib/Game/Constants.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

// Copper Flesh's status (id 8): bit 0x8000 and a +0x4c counter set to 2. apply_hp_damage_display zeroes any HP
// change while the bit is set, so damage and healing are both dropped. The party's round-end decay clears the
// bit when the counter is already 0, then counts down: cast in round R, the lock holds for the rest of R, all of
// R+1 and all of R+2 - three rounds counting the casting one. Modelled as the rounds left, 3 on cast.
// See Battle_Damage_Formula.md's "Copper Flesh" section in the HUD repo.

const makeGremio = () =>
  new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(22)
    .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
    .rest();

/** @param {Character[]} party @param {Enemy[]} enemies */
const makeBattle = (party, enemies) =>
  new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty(enemies),
    rng: new RNG(1),
    turns: [],
  });

/** Runs a round's end: the wait, the round check and the round-end status step (see test/battleMechanics.js) */
const endRound = (/** @type {Battle} */ battle) => {
  battle.resetTurn();
  battle.phase = PHASE_STATE.ROUND_END_WAIT;
  battle.turn.rollGate = 1;
  for (let i = 0; i < 3; i++) battle.turnStep();
  assert.strictEqual(battle.phase, PHASE_STATE.ROUND_OVER);
};

describe('HP Locked', () => {
  it('starts off, and lockHP sets it for 3 rounds', () => {
    const gremio = makeGremio();
    assert.strictEqual(gremio.isHPLocked, false);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
    gremio.lockHP();
    assert.strictEqual(gremio.isHPLocked, true);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 3);
  });

  it('drops damage', () => {
    const gremio = makeGremio();
    gremio.lockHP();
    gremio.takeDamage(50);
    assert.strictEqual(gremio.pendingDamage, 0);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 201);
  });

  it('drops healing', () => {
    const gremio = makeGremio().setHP(100);
    gremio.lockHP();
    gremio.takeDamage(-50);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 100);
  });

  it("doesn't drop damage already queued before the lock landed", () => {
    const gremio = makeGremio();
    gremio.takeDamage(30);
    gremio.lockHP();
    gremio.takeDamage(30);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 171);
  });

  it('takes damage and healing normally when not locked', () => {
    const gremio = makeGremio();
    gremio.takeDamage(50);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 151);
    gremio.takeDamage(-20);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 171);
  });

  it('lasts the rest of the casting round and the next two, clearing at the end of the third', () => {
    const gremio = makeGremio();
    const battle = makeBattle([gremio], [new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]);
    gremio.lockHP(); // cast in round R
    endRound(battle); // end of R
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 2);
    assert.strictEqual(gremio.isHPLocked, true); // all of R+1
    endRound(battle); // end of R+1
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 1);
    assert.strictEqual(gremio.isHPLocked, true); // all of R+2
    endRound(battle); // end of R+2
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
    assert.strictEqual(gremio.isHPLocked, false);
    endRound(battle);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
  });

  it('takes damage again once it has worn off', () => {
    const gremio = makeGremio();
    const battle = makeBattle([gremio], [new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]);
    gremio.lockHP();
    for (let i = 0; i < 3; i++) endRound(battle);
    gremio.takeDamage(40);
    gremio.commitPendingDamage();
    assert.strictEqual(gremio.HP, 161);
  });

  it('is reset to 3 by recasting while locked', () => {
    const gremio = makeGremio();
    const battle = makeBattle([gremio], [new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]);
    gremio.lockHP();
    endRound(battle);
    endRound(battle);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 1);
    gremio.lockHP();
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 3);
  });

  it("doesn't decay on enemies (the round-end decay covers the party only)", () => {
    const dragon = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
    const battle = makeBattle([makeGremio()], [dragon]);
    dragon.lockHP();
    battle.party.decayStatuses();
    assert.strictEqual(dragon.status[STATUS.HP_LOCKED], 3);
  });

  it("doesn't carry over to the next battle", () => {
    const gremio = makeGremio();
    gremio.lockHP();
    makeBattle([gremio], [new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
  });

  it('is part of a clone and of the battle state key', () => {
    const gremio = makeGremio();
    const key = (/** @type {Character} */ c) => {
      const out = /** @type {number[]} */ ([]);
      c.stateKeyInto(out);
      return out.join(',');
    };
    const unlockedKey = key(gremio);
    gremio.lockHP();
    assert.notStrictEqual(key(gremio), unlockedKey);
    assert.strictEqual(gremio.clone().status[STATUS.HP_LOCKED], 3);
  });
});
