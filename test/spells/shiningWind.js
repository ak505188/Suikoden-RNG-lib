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
import { STATUS } from '../../lib/Game/Constants.js';
import { applySpell, spellEffect } from '../../lib/Game/Magic/Behavior.js';

// Shining Wind (Cyclone Rune slot 3, both sides): 500 damage to every enemy, and +500 HP to every party member still in
// the fight, who also get the usual cure (Poison, Balloon, Bucket, Sleep; not Unbalanced or HP Locked).
// The heal never revives. The enemy half's damage is covered by the damage tests; here it just has to land.
const SHINING_WIND_SLOT = 3;

const makeCleo = () => {
  const cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(22)
    .setRune(RUNES.CYCLONE)
    .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 999 })
    .rest();
  cleo.MP[SHINING_WIND_SLOT] = 2; // a level 4 spell, which Cleo at LVL 22 hasn't any MP for
  return cleo;
};

const makeGremio = () =>
  new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(22)
    .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
    .rest();

/** @param {Character[]} members @param {Enemy[]} enemyList */
const cast = (members, enemyList = []) => {
  const party = new PlayerParty(members);
  const enemies = new EnemyParty(enemyList);
  const applied = applySpell({
    actor: members[0],
    spell: SPELLS.SHINING_WIND,
    party,
    enemies,
    rng: new RNG(1),
  });
  [...members, ...enemyList].forEach((c) => c.commitPendingDamage());
  return applied;
};

describe('Shining Wind heals the party', () => {
  it('heals every member 500, capped at their max', () => {
    const cleo = makeCleo().setHP(100),
      gremio = makeGremio().setHP(10);
    assert.strictEqual(cast([cleo, gremio]), true);
    assert.strictEqual(cleo.HP, 600);
    assert.strictEqual(gremio.HP, 201);
  });

  it('cures ailments but not Unbalanced', () => {
    const cleo = makeCleo().setHP(100);
    cleo.status[STATUS.POISON] = true;
    cleo.status[STATUS.BALLOON] = 2;
    cleo.status[STATUS.BUCKET] = true;
    cleo.status[STATUS.SLEEP] = true;
    cleo.status[STATUS.UNBALANCED] = 2;
    cast([cleo]);
    assert.deepStrictEqual(
      [STATUS.POISON, STATUS.BALLOON, STATUS.BUCKET, STATUS.SLEEP].map((k) => cleo.status[k]),
      [false, 0, false, false],
    );
    assert.strictEqual(cleo.status[STATUS.UNBALANCED], 2);
  });

  it('does not revive a downed member', () => {
    const cleo = makeCleo(),
      gremio = makeGremio();
    gremio.setHP(0);
    gremio.die(0);
    cast([cleo, gremio]);
    assert.strictEqual(gremio.knockedOut, true);
    assert.strictEqual(gremio.HP, 0);
  });

  it("can't change an HP Locked member's HP", () => {
    const cleo = makeCleo(),
      gremio = makeGremio().setHP(20);
    gremio.lockHP();
    cast([cleo, gremio]);
    assert.strictEqual(gremio.HP, 20);
  });
});

describe('Shining Wind damages the enemies', () => {
  it('deals the same damage spellEffect computes, to every living enemy', () => {
    const cleo = makeCleo();
    const enemyList = [new Enemy(ENEMY_KEYS.KOBOLD_SWORD), new Enemy(ENEMY_KEYS.KOBOLD_SWORD)];
    const party = new PlayerParty([cleo]);
    const enemies = new EnemyParty(enemyList);
    const expected = spellEffect({ actor: cleo, spell: SPELLS.SHINING_WIND, party, enemies });
    assert.ok(expected.length === 2 && expected.every((h) => h.damage > 0));
    const hpBefore = enemyList.map((e) => e.HP);
    cast([cleo], enemyList);
    assert.deepStrictEqual(
      enemyList.map((e) => hpBefore[0] - e.HP),
      expected.map((h) => Math.min(h.damage, hpBefore[0])),
    );
  });
});

describe('Shining Wind in a battle round', () => {
  it('spends MP and heals the party', () => {
    const cleo = makeCleo(),
      gremio = makeGremio().setHP(10);
    const mpBefore = cleo.MP[SHINING_WIND_SLOT];
    const battle = new Battle({
      party: new PlayerParty([cleo, gremio]),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
      rng: new RNG(0x12345678),
      turns: [],
    });
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: SHINING_WIND_SLOT }]);
    assert.strictEqual(cleo.MP[SHINING_WIND_SLOT], mpBefore - 1);
    assert.ok(gremio.HP > 100, `Gremio at ${gremio.HP}`);
  });
});
