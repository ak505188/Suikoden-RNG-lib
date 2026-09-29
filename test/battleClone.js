import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS } from '../lib/Game/Keys.js';
import { STATUS, WEAPON_ELEMENTS } from '../lib/Game/Constants.js';
import CHARACTERS from '../lib/Game/Characters.js';
import RNG from '../lib/rng.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';

const ATTACK = { type: ACTION_TYPES.ATTACK, target: 0 };

const makeBattle = (turns = []) => {
  const party = [CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.CLEO].map(key =>
    new Character(key).setLVL(22).setStats({ PWR: 70, SKL: 70, DEF: 80, SPD: 50, MGC: 60, LUK: 60, HP: 220 }).rest());
  return new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
    rng: new RNG(1),
    turns,
  });
};

/** Everything that can change during a battle, for comparing two of them. */
const snapshot = (/** @type {Battle} */ battle) => ({
  rng: [battle.rng.getRNG(), battle.rng.getCount()],
  turn: battle.turn_count,
  frames: battle.frames,
  combatants: battle.combatants.slice(1).map(c => [c.HP, c.knockedOut, { ...c.status }]),
  log: battle.log.format(),
});

describe('Battle.clone', () => {
  it('plays out exactly like the original', () => {
    const turns = [[ATTACK, ATTACK, ATTACK], [ATTACK, ATTACK, ATTACK]];
    const original = makeBattle(turns);
    const copy = original.clone();
    original.run();
    copy.run();
    assert.deepStrictEqual(snapshot(copy), snapshot(original));
  });

  it('branches from a later round without touching the original', () => {
    const battle = makeBattle();
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    const before = snapshot(battle);

    const copy = battle.clone();
    copy.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.notDeepStrictEqual(snapshot(copy), before);
    assert.deepStrictEqual(snapshot(battle), before);

    // ...and the original still plays that round the same way the copy did
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.deepStrictEqual(snapshot(battle), snapshot(copy));
  });

  it('copies every combatant and their mutable state', () => {
    const battle = makeBattle();
    const copy = battle.clone();
    const [mcdohl, copyMcdohl] = [battle.party.combatants[0], copy.party.combatants[0]];

    assert.notStrictEqual(copyMcdohl, mcdohl);
    assert.ok(copyMcdohl instanceof Character);
    assert.strictEqual(copy.combatants[1], copyMcdohl);
    assert.strictEqual(copy.combatants[4], copy.enemies.combatants[0]);

    copyMcdohl.setHP(1);
    copyMcdohl.stats.PWR = 1;
    copyMcdohl.status[STATUS.POISON] = true;
    copyMcdohl.MP[0] = 0;
    copyMcdohl.inventory.use(ITEM_KEYS.MEDICINE);
    copyMcdohl.weapon.setRunePiece(WEAPON_ELEMENTS.FIRE);
    copy.enemies.combatants[0].setHP(1);
    copy.rng.next();
    copy.log.record({ type: LOG_TYPES.ROUND_START, round: 0, tick: 0, rng: 0 });

    assert.strictEqual(mcdohl.HP, 220);
    assert.strictEqual(mcdohl.stats.PWR, 70);
    assert.strictEqual(mcdohl.status[STATUS.POISON], false);
    assert.notStrictEqual(mcdohl.MP[0], 0);
    assert.strictEqual(mcdohl.inventory.get(ITEM_KEYS.MEDICINE).quantity, 6);
    assert.strictEqual(mcdohl.weapon.runePiece.element, WEAPON_ELEMENTS.NONE);
    assert.strictEqual(battle.enemies.combatants[0].HP, battle.enemies.combatants[0].stats.HP);
    assert.strictEqual(battle.rng.getCount(), 0);
    assert.strictEqual(battle.log.entries.length, 0);
  });

  it('refuses while an action is in flight', () => {
    const battle = makeBattle();
    battle.party.setActionPlan([ATTACK, ATTACK, ATTACK]);
    battle.roundStart();
    while (!battle.events.size) battle.tick(); // the first attack's damage roll is queued
    assert.throws(() => battle.clone(), /in flight/);
  });
});

describe('Character stats', () => {
  it("levelling up doesn't change the roster's starting stats", () => {
    const before = { ...CHARACTERS[CHARACTER_KEYS.MCDOHL].stats.initial };
    new Character(CHARACTER_KEYS.MCDOHL).levelUp(10, 1, new RNG(1));
    assert.deepStrictEqual(CHARACTERS[CHARACTER_KEYS.MCDOHL].stats.initial, before);
  });
});
