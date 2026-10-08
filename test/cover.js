import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ATTACK_RESULT } from '../lib/Game/Battle/Actions.js';
import { ENEMY_MOVES } from '../lib/Game/Battle/EnemyAI.js';
import { findCoverTarget } from '../lib/Game/Battle/Cover.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { GENDER, STATUS } from '../lib/Game/Constants.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import CHARACTERS from '../lib/Game/Characters.js';
import { cDiv } from '../lib/util/math.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Keys.js').CharacterKey} CharacterKey */

/** @param {CharacterKey} key @param {number} [hpMax] */
const member = (key, hpMax = 28) =>
  new Character(key)
    .setStats({ PWR: 20, SKL: 20, DEF: 10, SPD: 20, MGC: 10, LUK: 10, HP: hpMax })
    .rest();

/** A party in slot order (index 1 = the first). @param {CharacterKey[]} keys */
const party = (keys) => new PlayerParty(keys.map((key) => member(key))).combatants;

describe('Gender and roster data', () => {
  it('every character has a roster Id and a gender byte', () => {
    for (const [key, data] of Object.entries(CHARACTERS)) {
      assert.ok(Number.isInteger(data.id), key);
      assert.ok(Object.values(GENDER).includes(data.gender), key);
    }
    const count = (g) => Object.values(CHARACTERS).filter((c) => c.gender === g).length;
    assert.deepStrictEqual(
      [count(GENDER.MALE), count(GENDER.FEMALE), count(GENDER.MILICH), count(GENDER.KOBOLD)],
      [57, 18, 1, 2],
    );
  });
});

describe('findCoverTarget', () => {
  it('only below floor(HPMax / 4), strictly: Hero at 28 HPMax is covered at 6 HP, never at 7', () => {
    const [hero, gremio] = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO]);
    hero.setHP(7);
    assert.strictEqual(findCoverTarget([hero, gremio], hero, 0), null);
    hero.setHP(6);
    assert.strictEqual(findCoverTarget([hero, gremio], hero, 0), gremio);
  });

  it("uses committed HP: pending damage doesn't trigger it", () => {
    const [hero, gremio] = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO]);
    hero.setHP(20);
    hero.takeDamage(19);
    assert.strictEqual(findCoverTarget([hero, gremio], hero, 0), null);
  });

  it("walks the Hero's chain: Gremio busy -> Pahn; Gremio and Pahn busy -> back-row Cleo", () => {
    const members = party([
      CHARACTER_KEYS.MCDOHL,
      CHARACTER_KEYS.GREMIO,
      CHARACTER_KEYS.PAHN,
      CHARACTER_KEYS.TED,
      CHARACTER_KEYS.CLEO,
    ]);
    const [hero, gremio, pahn, , cleo] = members;
    hero.setHP(6);
    cleo.position = 5; // back row: no row check
    gremio.busyUntil = 10;
    assert.strictEqual(findCoverTarget(members, hero, 5), pahn);
    pahn.busyUntil = 10;
    assert.strictEqual(findCoverTarget(members, hero, 5), cleo);
    assert.strictEqual(findCoverTarget(members, hero, 11), gremio); // both free again
  });

  it('skips a knocked-out partner, and one whose HP - pending damage is 0', () => {
    const members = party([
      CHARACTER_KEYS.MCDOHL,
      CHARACTER_KEYS.GREMIO,
      CHARACTER_KEYS.PAHN,
      CHARACTER_KEYS.CLEO,
    ]);
    const [hero, gremio, pahn, cleo] = members;
    hero.setHP(6);
    gremio.knockedOut = true;
    pahn.takeDamage(pahn.HP); // dying: fails check_combatant_alive
    assert.strictEqual(findCoverTarget(members, hero, 0), cleo);
  });

  it('nobody covers a character with no story partner present and no Phero Rune', () => {
    const members = party([CHARACTER_KEYS.PAHN, CHARACTER_KEYS.TED, CHARACTER_KEYS.CLEO]);
    members[0].setHP(1);
    assert.strictEqual(findCoverTarget(members, members[0], 0), null);
  });

  it('Phero: the next member (wrapping) of a different gender, in the fight and not busy', () => {
    const members = party([CHARACTER_KEYS.PAHN, CHARACTER_KEYS.TED, CHARACTER_KEYS.CLEO]);
    const [pahn, , cleo] = members;
    pahn.setRune(RUNES.PHERO).setHP(1);
    assert.strictEqual(findCoverTarget(members, pahn, 0), cleo); // skips Ted (male)
    cleo.busyUntil = 5;
    assert.strictEqual(findCoverTarget(members, pahn, 0), null);
  });

  it('Phero wraps round to the start of the party', () => {
    const members = party([CHARACTER_KEYS.CLEO, CHARACTER_KEYS.TED, CHARACTER_KEYS.PAHN]);
    const [cleo, , pahn] = members;
    pahn.setRune(RUNES.PHERO).setHP(1);
    assert.strictEqual(findCoverTarget(members, pahn, 0), cleo);
  });
});

describe('A covered attack', () => {
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

  /** Hero at 6/28 HP (index 1) with Gremio (index 2), against two Mosquitoes. */
  const setup = (seed = 1) => {
    const hero = member(CHARACTER_KEYS.MCDOHL).setHP(6);
    const gremio = member(CHARACTER_KEYS.GREMIO, 120);
    const mosquitoes = [new Enemy(ENEMY_KEYS.MOSQUITO), new Enemy(ENEMY_KEYS.MOSQUITO)];
    const battle = new Battle({
      party: new PlayerParty([hero, gremio]),
      enemies: new EnemyParty(mosquitoes),
      rng: new RNG(seed),
    });
    return { battle, hero, gremio, mosquitoes };
  };

  it('the ally takes the hit: both busy from t0, damage on the ally, the target untouched', () => {
    const { battle, hero, gremio, mosquitoes } = setup();
    battle.turn.tick = 33;
    battle.resolveEnemyAttack(mosquitoes[0], hero);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.COVER)[0].actor, gremio.label);
    assert.ok(gremio.isBusy(33) && hero.isBusy(33));
    const gremioHP = gremio.HP;
    runTicks(battle, 33, 86);
    assert.strictEqual(hero.HP, 6);
    assert.ok(gremio.HP < gremioHP);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.DAMAGE)[0].tick, 33 + 53);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.DAMAGE)[0].target, gremio.label);
  });

  it('ally free at damage + reaction (+89), target free 11 later (+100)', () => {
    const { battle, hero, gremio, mosquitoes } = setup();
    battle.turn.tick = 33;
    battle.resolveEnemyAttack(mosquitoes[0], hero);
    runTicks(battle, 33, 140);
    assert.strictEqual(gremio.busyUntil, 33 + 89);
    assert.strictEqual(hero.busyUntil, 33 + 89 + 11);
  });

  it('live: Gremio covers at t0 = 33 (free 122), is attacked again at 123 (free 212); the Hero frees at 223', () => {
    const { battle, hero, gremio, mosquitoes } = setup();
    battle.turn.tick = 33;
    battle.resolveEnemyAttack(mosquitoes[0], hero);
    runTicks(battle, 33, 122);
    // Tick 123: the second Mosquito's attack on Gremio (turn coroutine), then steps 2-4
    battle.turn.tick = 123;
    assert.strictEqual(battle.resolveEnemyAttack(mosquitoes[1], gremio).status, 'Done');
    runTicks(battle, 123, 240);
    assert.strictEqual(gremio.busyUntil, 212);
    assert.strictEqual(hero.busyUntil, 223);
  });

  it("a Mosquito's Poison roll lands on the covering ally, not the target", () => {
    let checked = 0;
    for (let seed = 1; checked < 2 && seed < 2000; seed++) {
      const { battle, hero, gremio, mosquitoes } = setup(seed);
      battle.resolveEnemyAttack(mosquitoes[0], hero);
      const before = battle.rng.getCount();
      // Its damage tick: calc_damage, then the reaction's status roll on Gremio
      const roll = cDiv(new RNG(seed).next(before + 2).rand * 100, 0x7fff) % 100;
      if (roll >= 20) continue;
      runTicks(battle, 0, 53);
      assert.strictEqual(battle.rng.getCount(), before + 2);
      assert.strictEqual(gremio.status[STATUS.POISON], true);
      assert.strictEqual(hero.status[STATUS.POISON], false);
      checked++;
    }
    assert.strictEqual(checked, 2);
  });

  it("isn't checked for a Red Solider Ant's Double Strike", () => {
    const { battle, hero } = setup();
    const ant = new Enemy(ENEMY_KEYS.RED_SOLDIER_ANT);
    const withAnt = new Battle({
      party: battle.party,
      enemies: new EnemyParty([ant]),
      rng: new RNG(1),
    });
    withAnt.resolveEnemyStrike(ant, ENEMY_MOVES.RED_SOLDIER_ANT_DOUBLE_STRIKE, hero);
    runTicks(withAnt, 0, 29);
    assert.strictEqual(withAnt.log.ofType(LOG_TYPES.COVER).length, 0);
    assert.ok(hero.HP < 6);
  });

  it("isn't checked on a miss", () => {
    const { battle, hero, mosquitoes } = setup();
    battle.applyAttackResult(mosquitoes[0], hero, ATTACK_RESULT.MISSED);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.COVER).length, 0);
  });

  it('a clone taken mid-cover plays out exactly like the original', () => {
    const { battle, hero, mosquitoes } = setup();
    battle.resolveEnemyAttack(mosquitoes[0], hero);
    runTicks(battle, 0, 60);
    const copy = battle.clone();
    runTicks(battle, 61, 150);
    runTicks(copy, 61, 150);
    const state = (/** @type {Battle} */ b) => [
      b.stateKey(),
      b.combatants.slice(1).map((c) => c.busyUntil),
    ];
    assert.deepStrictEqual(state(copy), state(battle));
  });
});
