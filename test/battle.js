import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import { CHARACTER_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */

describe('Zombie Dragon 1 turn tests', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(22)
    .setEXP(870)
    .setRune(RUNES.SOUL_EATER)
    .setStats({ PWR: 76, SKL: 94, DEF: 74, SPD: 86, MGC: 80, LUK: 79, HP: 244 })
    .rest();

  const Gremio = new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(22)
    .setEXP(870)
    .setRune(RUNES.HOLY)
    .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
    .rest();

  const Viktor = new Character(CHARACTER_KEYS.VIKTOR)
    .setLVL(22)
    .setEXP(575)
    .setStats({ PWR: 114, SKL: 43, DEF: 85, SPD: 63, MGC: 47, LUK: 61, HP: 414 })
    .rest();

  const Cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(22)
    .setEXP(870)
    .setRune(RUNES.FIRE)
    .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
    .rest();

  const Tai_Ho = new Character(CHARACTER_KEYS.TAI_HO)
    .levelUp(9);


  const Camille = new Character(CHARACTER_KEYS.CAMILLE)
    .setLVL(9)
    .setStats({ PWR: 37, SKL: 53, DEF: 30, SPD: 40, MGC: 36, LUK: 28, HP: 91 });

  const zombieDragon = new ZombieDragon();
  const enemyParty = new EnemyParty([zombieDragon]);
  const party = new PlayerParty([Viktor, Gremio, McDohl, Cleo, Camille, Tai_Ho]);
  /** @param {Action[]} actions */
  const actions = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE, slot: 2 },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
  ];
  const rng = new RNG(0xb0a9b6c8);
  const battle = new Battle({ party, enemies: enemyParty, rng, turns: [actions] });

  battle.run();

  it('rng == 0x27bc4952', () => {
    assert.strictEqual(battle.rng.getRNG(), 0x27bc4952);
  });
  it('Viktor HP == 325', () => {
    assert.strictEqual(battle.party.getCombatantByName(Viktor.name).HP, 325);
  });
  it('Gremio HP == 103', () => {
    assert.strictEqual(battle.party.getCombatantByName(Gremio.name).HP, 103);
  });
  it('McDohl HP == 220', () => {
    assert.strictEqual(battle.party.getCombatantByName(McDohl.name).HP, 220);
  });
  it('Cleo HP == 180', () => {
    assert.strictEqual(battle.party.getCombatantByName(Cleo.name).HP, 180);
  });
  it('Camille HP == 4', () => {
    assert.strictEqual(battle.party.getCombatantByName(Camille.name).HP, 4);
  });
  it('Zombie Dragon HP == 2635', () => {
    assert.strictEqual(battle.enemies.getCombatantByName(zombieDragon.name).HP, 2635);
  });
});

describe('5 Bandit best version battle tests', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(5)
    .setEXP(500)
    .setStats({ PWR: 25, SKL: 36, DEF: 30, SPD: 30, MGC: 25, LUK: 27, HP: 26 })
    .setHP(26);

  const Gremio = new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(5)
    .setEXP(500)
    .setStats({ PWR: 27, SKL: 23, DEF: 29, SPD: 18, MGC: 14, LUK: 21, HP: 54 })
    .setHP(40);

  const Pahn = new Character(CHARACTER_KEYS.PAHN)
    .setLVL(5)
    .setEXP(500)
    .setStats({ PWR: 39, SKL: 29, DEF: 31, SPD: 15, MGC: 7, LUK: 26, HP: 71 })

  const Cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(5)
    .setEXP(500)
    .setStats({ PWR: 23, SKL: 33, DEF: 27, SPD: 25, MGC: 36, LUK: 27, HP: 56 })
    .setHP(18);

  const Ted = new Character(CHARACTER_KEYS.TED)
    .setLVL(5)
    .setEXP(500)
    .setStats({ PWR: 25, SKL: 33, DEF: 19, SPD: 28, MGC: 27, LUK: 25, HP: 56 })

  const party = new PlayerParty([McDohl, Gremio, Pahn, Cleo, Ted]);
  /** @param {Action[]} actions */
  const actions = [
    { type: ACTION_TYPES.ATTACK, target: 1 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.ATTACK, target: 4 },
  ];

  const rng = new RNG(0x19).next(18159);
  const rngCloneForTest = rng.cloneKeepIndex();

  it ('rng at start == 0x26aeb330', () => {
    assert.strictEqual(rngCloneForTest.getRNG(), 0x26aeb330);
  });
  it ('rng count at start 18159', () => {
    assert.strictEqual(rngCloneForTest.count, 18159);
  });

  const enemyParty = EnemyParty.fromFormation(AREAS.MT_SEIFU.scripted[1]);
  const battle = new Battle({ party, enemies: enemyParty, rng, turns: [actions] });

  battle.playTurnTickBased(actions);

  it('rng == 0x66c25dd8', () => {
    assert.strictEqual(battle.rng.getRNG(), 0x66c25dd8);
  });
  it('rng count after battle 18215', () => {
    assert.strictEqual(battle.rng.count, 18215);
  });
  it('McDohl HP == 26', () => {
    assert.strictEqual(battle.party.getCombatantByName(McDohl.name).HP, 26);
  });
  it('Gremio HP == 40', () => {
    assert.strictEqual(battle.party.getCombatantByName(Gremio.name).HP, 40);
  });
  it('Pahn HP == 71', () => {
    assert.strictEqual(battle.party.getCombatantByName(Pahn.name).HP, 71);
  });
  it('Cleo HP == 18', () => {
    assert.strictEqual(battle.party.getCombatantByName(Cleo.name).HP, 18);
  });
  it('Ted HP == 56', () => {
    assert.strictEqual(battle.party.getCombatantByName(Ted.name).HP, 56);
  });
  it('damage rolls match the capture', () => {
    const damage = battle.log.ofType('damage').map(({ tick, actor, target, amount }) => ({ tick, actor, target, amount }));
    assert.deepStrictEqual(damage, [
      { tick: 77, actor: 'Cleo', target: 'Bandit (yellow) #1', amount: 63 }, // crit
      { tick: 82, actor: 'Ted', target: 'Bandit (green) #5', amount: 32 },
      { tick: 103, actor: 'McDohl', target: 'Bandit (red) #2', amount: 24 },
      { tick: 289, actor: 'Gremio', target: 'Bandit (red) #2', amount: 28 },
      { tick: 393, actor: 'Pahn', target: 'Bandit (red) #3', amount: 38 }, // counter
      { tick: 544, actor: 'Pahn', target: 'Bandit (green) #4', amount: 43 },
    ]);
  });
});

describe('Varkas & Sydonia after 5 bandit above', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(5)
    .setEXP(840)
    .setStats({ PWR: 25, SKL: 36, DEF: 30, SPD: 30, MGC: 25, LUK: 27, HP: 26 })
    .setHP(26);

  const Gremio = new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(5)
    .setEXP(840)
    .setStats({ PWR: 27, SKL: 23, DEF: 29, SPD: 18, MGC: 14, LUK: 21, HP: 54 })
    .setHP(40);

  const Pahn = new Character(CHARACTER_KEYS.PAHN)
    .setLVL(5)
    .setEXP(840)
    .setStats({ PWR: 39, SKL: 29, DEF: 31, SPD: 15, MGC: 7, LUK: 26, HP: 71 })

  const Cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(5)
    .setEXP(840)
    .setStats({ PWR: 23, SKL: 33, DEF: 27, SPD: 25, MGC: 36, LUK: 27, HP: 56 })
    .setHP(18);

  const Ted = new Character(CHARACTER_KEYS.TED)
    .setLVL(5)
    .setEXP(840)
    .setStats({ PWR: 25, SKL: 33, DEF: 19, SPD: 28, MGC: 27, LUK: 25, HP: 56 })

  const party = new PlayerParty([McDohl, Gremio, Pahn, Cleo, Ted]);

  /** @param {Action[]} actions */
  const actionsT1 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.UNITE, target: 1, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE, target: 1, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.ATTACK, target: 1 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
  ];

  /** @param {Action[]} actions */
  const actionsT2 = [
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.UNITE, target: 0, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE, target: 0, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
  ];

  const rng = new RNG(0x19).next(18217);
  const rngCloneForTest = rng.cloneKeepIndex();

  it ('rng at start == 0xf8b88416', () => {
    assert.strictEqual(rngCloneForTest.getRNG(), 0xf8b88416);
  });
  it ('rng count at start 18217', () => {
    assert.strictEqual(rngCloneForTest.count, 18217);
  });

  const enemyParty = EnemyParty.fromFormation(AREAS.MT_SEIFU.scripted[2]);
  const battle = new Battle({ party, enemies: enemyParty, rng, turns: [actionsT1, actionsT2] });

  battle.run();

  console.log('Pahn ARM', battle.party.getCombatantByName('Pahn').ARM);
  console.log(battle.log.format());

  it('rng == 0xa16e5044', () => {
    assert.strictEqual(battle.rng.getRNG(), 0xa16e5044);
  });
  it('rng count after battle 18283', () => {
    assert.strictEqual(battle.rng.count, 18283);
  });
  it('McDohl HP == 8', () => {
    assert.strictEqual(battle.party.getCombatantByName(McDohl.name).HP, 8);
  });
  it('Gremio HP == 40', () => {
    assert.strictEqual(battle.party.getCombatantByName(Gremio.name).HP, 40);
  });
  it('Pahn HP == 34', () => {
    assert.strictEqual(battle.party.getCombatantByName(Pahn.name).HP, 34);
  });
  it('Cleo HP == 18', () => {
    assert.strictEqual(battle.party.getCombatantByName(Cleo.name).HP, 18);
  });
  it('Ted HP == 56', () => {
    assert.strictEqual(battle.party.getCombatantByName(Ted.name).HP, 56);
  });
});
