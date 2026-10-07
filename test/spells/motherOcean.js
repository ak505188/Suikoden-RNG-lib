import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Character from '../../lib/Game/Battle/Character.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { characterActions } from '../../lib/Game/Battle/ActionPlans.js';
import { LOG_TYPES } from '../../lib/Game/Battle/ActionLog.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { STATUS } from '../../lib/Game/Constants.js';
import { applySpell } from '../../lib/Game/Magic/Behavior.js';

// Mother Ocean (Flowing Rune slot 3, whole party): its heal step restores every party member to full HP and
// zeroes a byte of their combatant record, which is the same invalid flag Yell clears, so it revives downed
// members too (the spell's description says so as well). A member who floated away is out of reach. UNVERIFIED:
// that it cures nothing, unlike the +300 heals.
const MOTHER_OCEAN_SLOT = 3;

const makeCleo = () => {
  const cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(22)
    .setRune(RUNES.FLOWING)
    .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
    .rest();
  cleo.MP[MOTHER_OCEAN_SLOT] = 2; // a level 4 spell, which Cleo at LVL 22 hasn't any MP for
  return cleo;
};

const makeGremio = () => new Character(CHARACTER_KEYS.GREMIO)
  .setLVL(22)
  .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

/** @param {Character} c */
const knockOut = c => {
  c.setHP(0);
  c.die(0);
  return c;
};

/** @param {Character[]} members @returns {boolean} */
const cast = members => {
  const party = new PlayerParty(members);
  const applied = applySpell({ actor: members[0], spell: SPELLS.MOTHER_OCEAN, party, enemies: new EnemyParty([]), rng: new RNG(1) });
  members.forEach(c => c.commitPendingDamage());
  return applied;
};

describe('Mother Ocean effect', () => {
  it('fully heals every member, whatever their HP', () => {
    const cleo = makeCleo().setHP(10), gremio = makeGremio().setHP(150);
    assert.strictEqual(cast([cleo, gremio]), true);
    assert.strictEqual(cleo.HP, 217);
    assert.strictEqual(gremio.HP, 201);
  });

  it('revives a downed member at full HP', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    cast([cleo, gremio]);
    assert.strictEqual(gremio.knockedOut, false);
    assert.strictEqual(gremio.HP, 201);
  });

  it("doesn't reach a member who floated away", () => {
    const cleo = makeCleo(), gremio = makeGremio().setHP(20);
    gremio.removedFromFight = true;
    cast([cleo, gremio]);
    assert.strictEqual(gremio.HP, 20);
  });

  it("can't change an HP Locked member's HP", () => {
    const cleo = makeCleo(), gremio = makeGremio().setHP(20);
    gremio.lockHP();
    cast([cleo, gremio]);
    assert.strictEqual(gremio.HP, 20);
  });

  it("doesn't cure ailments", () => {
    const cleo = makeCleo().setHP(10);
    cleo.status[STATUS.POISON] = true;
    cast([cleo]);
    assert.strictEqual(cleo.status[STATUS.POISON], true);
  });
});

describe('Mother Ocean in a battle round', () => {
  /** @param {Character[]} party */
  const makeBattle = party => new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
    rng: new RNG(0x12345678),
    turns: [],
  });

  it('spends MP, revives the downed member and logs it', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    const mpBefore = cleo.MP[MOTHER_OCEAN_SLOT];
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: MOTHER_OCEAN_SLOT }]);
    assert.strictEqual(cleo.MP[MOTHER_OCEAN_SLOT], mpBefore - 1);
    const revive = battle.log.entries.find(e => e.type === LOG_TYPES.REVIVE);
    assert.strictEqual(revive?.target, gremio.label);
    assert.strictEqual(revive?.detail, 'Mother Ocean');
  });

  it('is planned once, with no target', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const battle = makeBattle([cleo, gremio]);
    const actions = characterActions(cleo, battle)
      .filter(a => a.type === ACTION_TYPES.RUNE && a.slot === MOTHER_OCEAN_SLOT);
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].target, undefined);
  });
});
