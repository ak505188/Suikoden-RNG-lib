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
import { applySpell, spellRand } from '../../lib/Game/Magic/Behavior.js';

// Copper Flesh (Earth Lv3, slot 2 of the Earth Rune): zero RNG, locks one ally's HP for 3 rounds. See
// test/hpLocked.js for what the lock does. The caster is a party member, so the target is a party index
// (omitted means the caster), like an item's.
const COPPER_FLESH_SLOT = 2;

const makeCleo = () => new Character(CHARACTER_KEYS.CLEO)
  .setLVL(22)
  .setRune(RUNES.EARTH)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

const makeGremio = () => new Character(CHARACTER_KEYS.GREMIO)
  .setLVL(22)
  .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

/** @param {Character[]} party */
const makeBattle = party => new Battle({
  party: new PlayerParty(party),
  enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
  rng: new RNG(0x12345678),
  turns: [],
});

describe('Copper Flesh effect', () => {
  it('rolls no RNG', () => {
    const rng = new RNG(0x12345678);
    const party = new PlayerParty([makeCleo()]);
    assert.strictEqual(spellRand({ spell: SPELLS.COPPER_FLESH, rng, party, enemies: new EnemyParty([]) }), 0);
    assert.strictEqual(rng.count, 0);
  });

  it('locks the one chosen ally, and nothing else', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const rng = new RNG(0x12345678);
    const applied = applySpell({
      actor: cleo, spell: SPELLS.COPPER_FLESH, target: gremio,
      party: new PlayerParty([cleo, gremio]), enemies: new EnemyParty([]), rng,
    });
    assert.strictEqual(applied, true);
    assert.strictEqual(gremio.isHPLocked, true);
    assert.strictEqual(cleo.isHPLocked, false);
    assert.strictEqual(rng.count, 0);
  });
});

describe('Copper Flesh in a battle round', () => {
  it('locks the targeted party member for the rest of the round and two more', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const mpBefore = cleo.MP[COPPER_FLESH_SLOT];
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: COPPER_FLESH_SLOT, target: 1 }]);
    // 3 on cast, 2 after that round's end
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 2);
    assert.strictEqual(cleo.status[STATUS.HP_LOCKED], 0);
    assert.strictEqual(cleo.MP[COPPER_FLESH_SLOT], mpBefore - 1);
    battle.playTurn([]);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 1);
    battle.playTurn([]);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
  });

  it('can target the first party member', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: COPPER_FLESH_SLOT, target: 0 }]);
    assert.strictEqual(cleo.status[STATUS.HP_LOCKED], 2);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
  });

  it('targets the caster when no target is given', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: COPPER_FLESH_SLOT }]);
    assert.strictEqual(cleo.status[STATUS.HP_LOCKED], 2);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
  });

  it('logs the cast against the ally', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: COPPER_FLESH_SLOT, target: 1 }]);
    const cast = battle.log.entries.find(e => e.type === LOG_TYPES.CAST);
    assert.strictEqual(cast?.target, gremio.label);
    assert.strictEqual(cast?.detail, 'Copper Flesh');
  });

  it("Defends with no MP spent when the ally isn't a valid target (UNVERIFIED in the game)", () => {
    const cleo = makeCleo(), gremio = makeGremio().setHP(0);
    const mpBefore = cleo.MP[COPPER_FLESH_SLOT];
    const battle = makeBattle([cleo, gremio]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: COPPER_FLESH_SLOT, target: 1 }]);
    assert.strictEqual(gremio.status[STATUS.HP_LOCKED], 0);
    assert.strictEqual(cleo.MP[COPPER_FLESH_SLOT], mpBefore);
  });

  it("throws for an ally spell whose effect isn't implemented yet", () => {
    const cleo = makeCleo();
    const battle = makeBattle([cleo]);
    assert.throws(
      () => battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 0, target: 0 }]), // Clay Guardian
      /Clay Guardian.*not implemented/,
    );
  });
});

describe('Copper Flesh action planning', () => {
  it('plans one action per valid party member, by party index', () => {
    const cleo = makeCleo(), gremio = makeGremio();
    const battle = makeBattle([cleo, gremio]);
    const actions = characterActions(cleo, battle)
      .filter(a => a.type === ACTION_TYPES.RUNE && a.slot === COPPER_FLESH_SLOT);
    assert.deepStrictEqual(actions.map(a => a.target), [0, 1]);
  });

  it('leaves out a party member who is out of the fight', () => {
    const cleo = makeCleo(), gremio = makeGremio().setHP(0);
    const battle = makeBattle([cleo, gremio]);
    const actions = characterActions(cleo, battle)
      .filter(a => a.type === ACTION_TYPES.RUNE && a.slot === COPPER_FLESH_SLOT);
    assert.deepStrictEqual(actions.map(a => a.target), [0]);
  });
});
