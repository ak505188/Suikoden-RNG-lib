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

// Yell (Resurrection slot 1, one ally): revives a downed ally. Phase 5's last tick clears the invalid flag
// (+0x45) and then heals the target for HPMax / 3 (apply_hp_damage_display(target, -HPMax/3)). Cast on a
// standing ally it still goes through (MP, animation, RNG) and does nothing. The revived member keeps their
// ActionTag from dying, so they don't act again that round. UNVERIFIED: that statuses are left alone.
const YELL_SLOT = 1;

const makeCleo = () => new Character(CHARACTER_KEYS.CLEO)
  .setLVL(22)
  .setRune(RUNES.RESURRECTION)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

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

describe('Yell effect', () => {
  it('revives a downed ally at a third of their max HP, rounded down', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    const party = new PlayerParty([cleo, gremio]);
    const applied = applySpell({ actor: cleo, spell: SPELLS.YELL, target: gremio, party, enemies: new EnemyParty([]), rng: new RNG(1) });
    gremio.commitPendingDamage();
    assert.strictEqual(applied, true);
    assert.strictEqual(gremio.knockedOut, false);
    assert.strictEqual(gremio.HP, 67); // floor(201 / 3)
  });

  it('keeps the revived member from acting again that round', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    applySpell({ actor: cleo, spell: SPELLS.YELL, target: gremio, party: new PlayerParty([cleo, gremio]), enemies: new EnemyParty([]), rng: new RNG(1) });
    assert.strictEqual(gremio.acted, true);
  });

  it('does nothing to a standing ally', () => {
    const cleo = makeCleo(), gremio = makeGremio().setHP(50);
    const applied = applySpell({ actor: cleo, spell: SPELLS.YELL, target: gremio, party: new PlayerParty([cleo, gremio]), enemies: new EnemyParty([]), rng: new RNG(1) });
    gremio.commitPendingDamage();
    assert.strictEqual(applied, true);
    assert.strictEqual(gremio.HP, 50);
  });

  it('burns no RNG of its own beyond the animation', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    const rng = new RNG(1);
    applySpell({ actor: cleo, spell: SPELLS.YELL, target: gremio, party: new PlayerParty([cleo, gremio]), enemies: new EnemyParty([]), rng });
    assert.strictEqual(rng.count, 0);
  });
});

describe('Yell in a battle round', () => {
  /** @param {Character[]} party */
  const makeBattle = party => new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
    rng: new RNG(0x12345678),
    turns: [],
  });

  it('revives the downed member, spends MP and logs the revive', () => {
    const cleo = makeCleo(), gremio = knockOut(makeGremio());
    const mpBefore = cleo.MP[YELL_SLOT];
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: YELL_SLOT, target: 1 }]);
    assert.strictEqual(cleo.MP[YELL_SLOT], mpBefore - 1);
    const revive = battle.log.entries.find(e => e.type === LOG_TYPES.REVIVE);
    assert.strictEqual(revive?.target, gremio.label);
    assert.strictEqual(revive?.detail, 'Yell');
  });

  it('goes through on a standing target: MP spent, the animation burned, nothing revived or healed', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const mpBefore = cleo.MP[YELL_SLOT];
    const battle = makeBattle([cleo, gremio]);
    const rngBefore = battle.rng.count;
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: YELL_SLOT, target: 1 }]);
    assert.strictEqual(cleo.MP[YELL_SLOT], mpBefore - 1);
    assert.ok(battle.rng.count - rngBefore >= 33, 'Yell burns its 33 sparkle calls');
    assert.strictEqual(battle.log.entries.some(e => e.type === LOG_TYPES.REVIVE), false);
    assert.strictEqual(battle.log.entries.some(e => e.type === LOG_TYPES.CAST), true);
  });
});

describe('Yell action planning', () => {
  /** @param {Character[]} party */
  const yellTargets = party => {
    const battle = new Battle({
      party: new PlayerParty(party),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
      rng: new RNG(1),
      turns: [],
    });
    return characterActions(party[0], battle)
      .filter(a => a.type === ACTION_TYPES.RUNE && a.slot === YELL_SLOT)
      .map(a => a.target);
  };

  it('plans every member in reach, standing or downed', () => {
    assert.deepStrictEqual(yellTargets([makeCleo(), knockOut(makeGremio())]), [0, 1]);
    assert.deepStrictEqual(yellTargets([makeCleo(), makeGremio()]), [0, 1]);
  });

  it('leaves out a member who floated away', () => {
    const gremio = makeGremio();
    gremio.status[STATUS.BALLOON] = 3; // the battle's setup floats them away
    assert.deepStrictEqual(yellTargets([makeCleo(), gremio]), [0]);
  });
});
