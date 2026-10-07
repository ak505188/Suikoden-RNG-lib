import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Character from '../../lib/Game/Battle/Character.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { applySpell } from '../../lib/Game/Magic/Behavior.js';
import { STATUS } from '../../lib/Game/Constants.js';

// The party-side heals. Each lands as queued healing (negative pending damage) that the round driver commits:
//   Drops of Kindness (id 9), Healing Wind (id 15): one ally to full, -(HPMax - HP)
//   Water of Kindness (id 11), Rain of Kindness (id 12), Scream (id 7): +300 to every living party member
// All five also cure Poison, Balloon, Bucket and Sleep, but not Unbalanced, and leave HP Locked alone.
// A heal never takes HP over the max, and an HP Locked ally gets nothing (see test/hpLocked.js).
// Spell power for all of them is 0, so the caster's MGC doesn't matter.

const makeCleo = () => new Character(CHARACTER_KEYS.CLEO)
  .setLVL(22)
  .setRune(RUNES.WATER)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

const makeGremio = () => new Character(CHARACTER_KEYS.GREMIO)
  .setLVL(22)
  .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

const makeParty = () => {
  const cleo = makeCleo(), gremio = makeGremio();
  return { cleo, gremio, party: new PlayerParty([cleo, gremio]) };
};

/** @param {Character} actor @param {import('../../lib/Game/Magic/Spells.js').Spell} spell @param {PlayerParty} party @param {Character} [target] */
const cast = (actor, spell, party, target) => {
  const applied = applySpell({ actor, spell, target, party, enemies: new EnemyParty([]), rng: new RNG(1) });
  party.combatants.forEach(c => c.commitPendingDamage());
  return applied;
};

describe('Single-target full heals', () => {
  for (const spell of [SPELLS.DROPS_OF_KINDNESS, SPELLS.HEALING_WIND]) {
    it(`${spell.name} heals the chosen ally to full and nobody else`, () => {
      const { cleo, gremio, party } = makeParty();
      gremio.setHP(20);
      cleo.setHP(100);
      assert.strictEqual(cast(cleo, spell, party, gremio), true);
      assert.strictEqual(gremio.HP, 201);
      assert.strictEqual(cleo.HP, 100);
    });

    it(`${spell.name} on a full-HP ally changes nothing`, () => {
      const { cleo, gremio, party } = makeParty();
      cast(cleo, spell, party, gremio);
      assert.strictEqual(gremio.HP, 201);
    });

    it(`${spell.name} does nothing to an HP Locked ally`, () => {
      const { cleo, gremio, party } = makeParty();
      gremio.setHP(20).lockHP();
      cast(cleo, spell, party, gremio);
      assert.strictEqual(gremio.HP, 20);
    });

    it(`${spell.name} needs a target`, () => {
      const { cleo, party } = makeParty();
      assert.throws(() => cast(cleo, spell, party), /needs a target/);
    });
  }
});

describe('Party-wide +300 heals', () => {
  for (const spell of [SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.SCREAM]) {
    it(`${spell.name} heals every living member 300, capped at their max`, () => {
      const { cleo, gremio, party } = makeParty();
      cleo.setHP(10);
      gremio.setHP(100);
      assert.strictEqual(cast(cleo, spell, party), true);
      assert.strictEqual(cleo.HP, 217); // 310 capped
      assert.strictEqual(gremio.HP, 201); // 400 capped
    });

    it(`${spell.name} heals exactly 300 when that fits`, () => {
      const cleo = makeCleo().setStats({ ...makeCleo().stats, HP: 999 }).setHP(100);
      const party = new PlayerParty([cleo]);
      cast(cleo, spell, party);
      assert.strictEqual(cleo.HP, 400);
    });

    it(`${spell.name} skips a knocked-out member`, () => {
      const { cleo, gremio, party } = makeParty();
      gremio.setHP(0);
      gremio.die(0);
      cast(cleo, spell, party);
      assert.strictEqual(gremio.HP, 0);
      assert.strictEqual(gremio.knockedOut, true);
    });

    it(`${spell.name} skips an HP Locked member`, () => {
      const { cleo, gremio, party } = makeParty();
      cleo.setHP(10);
      gremio.setHP(50).lockHP();
      cast(cleo, spell, party);
      assert.strictEqual(cleo.HP, 217);
      assert.strictEqual(gremio.HP, 50);
    });
  }
});

/** @param {Character} c */
const afflict = c => {
  c.status[STATUS.POISON] = true;
  c.status[STATUS.BALLOON] = 2;
  c.status[STATUS.BUCKET] = true;
  c.status[STATUS.SLEEP] = true;
  c.status[STATUS.UNBALANCED] = 2;
};

/** @param {Character} c */
const ailments = c => [STATUS.POISON, STATUS.BALLOON, STATUS.BUCKET, STATUS.SLEEP].map(k => c.status[k]);

describe('Heals cure negative statuses', () => {
  const singles = [SPELLS.DROPS_OF_KINDNESS, SPELLS.HEALING_WIND];
  const wides = [SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.SCREAM];

  for (const spell of singles) {
    it(`${spell.name} cures the chosen ally only, and not Unbalanced`, () => {
      const { cleo, gremio, party } = makeParty();
      afflict(cleo);
      afflict(gremio);
      cast(cleo, spell, party, gremio);
      assert.deepStrictEqual(ailments(gremio), [false, 0, false, false]);
      assert.strictEqual(gremio.status[STATUS.UNBALANCED], 2);
      assert.deepStrictEqual(ailments(cleo), [true, 2, true, true]);
    });

    it(`${spell.name} cures a full-HP ally too`, () => {
      const { cleo, gremio, party } = makeParty();
      gremio.status[STATUS.POISON] = true;
      cast(cleo, spell, party, gremio);
      assert.strictEqual(gremio.status[STATUS.POISON], false);
    });
  }

  for (const spell of wides) {
    it(`${spell.name} cures every member in the fight, and not Unbalanced`, () => {
      const { cleo, gremio, party } = makeParty();
      afflict(cleo);
      afflict(gremio);
      cast(cleo, spell, party);
      for (const c of [cleo, gremio]) {
        assert.deepStrictEqual(ailments(c), [false, 0, false, false]);
        assert.strictEqual(c.status[STATUS.UNBALANCED], 2);
      }
    });
  }

  it('leaves HP Locked as it was', () => {
    const { cleo, gremio, party } = makeParty();
    gremio.lockHP();
    gremio.status[STATUS.POISON] = true;
    cast(cleo, SPELLS.DROPS_OF_KINDNESS, party, gremio);
    assert.strictEqual(gremio.status[STATUS.POISON], false);
    assert.strictEqual(gremio.isHPLocked, true);
  });
});

describe('Heals skip a member who is out of the fight', () => {
  /** @param {Character} c */
  const floatAway = c => {
    c.status[STATUS.BALLOON] = 3;
    c.status[STATUS.POISON] = true;
    c.removedFromFight = true;
    c.setHP(20);
  };

  for (const spell of [SPELLS.DROPS_OF_KINDNESS, SPELLS.HEALING_WIND]) {
    it(`${spell.name} does nothing to them, status included`, () => {
      const { cleo, gremio, party } = makeParty();
      floatAway(gremio);
      cast(cleo, spell, party, gremio);
      assert.strictEqual(gremio.HP, 20);
      assert.strictEqual(gremio.status[STATUS.BALLOON], 3);
      assert.strictEqual(gremio.status[STATUS.POISON], true);
    });
  }

  for (const spell of [SPELLS.WATER_OF_KINDNESS, SPELLS.RAIN_OF_KINDNESS, SPELLS.SCREAM]) {
    it(`${spell.name} does nothing to them, status included`, () => {
      const { cleo, gremio, party } = makeParty();
      floatAway(gremio);
      cast(cleo, spell, party);
      assert.strictEqual(gremio.HP, 20);
      assert.strictEqual(gremio.status[STATUS.BALLOON], 3);
      assert.strictEqual(gremio.status[STATUS.POISON], true);
    });
  }
});

describe('Heals in a battle round', () => {
  /** @param {Character[]} party */
  const makeBattle = party => new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
    rng: new RNG(0x12345678),
    turns: [],
  });

  it('Drops of Kindness spends 1 MP and fills the targeted member', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    gremio.setHP(20);
    const mpBefore = cleo.MP[0];
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 0, target: 1 }]);
    assert.strictEqual(cleo.MP[0], mpBefore - 1);
    // The kobold may have hit back afterwards, but the heal itself brought Gremio from 20 up near full
    assert.ok(gremio.HP > 100, `Gremio at ${gremio.HP}`);
  });

  it('Water of Kindness heals the whole party in one cast', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    cleo.setHP(10);
    gremio.setHP(10);
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 2 }]);
    assert.ok(cleo.HP > 150, `Cleo at ${cleo.HP}`);
    assert.ok(gremio.HP > 150, `Gremio at ${gremio.HP}`);
  });
});
