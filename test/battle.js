import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { ITEMS } from '../lib/Game/Items.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */
/** @typedef {import('../lib/Game/Battle/Actions.js').Round} Round */

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

  const zombieDragon = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
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

  battle.playTurn(actions);

  it('rng == 0x66c25dd8', () => {
    assert.strictEqual(battle.rng.getRNG(), 0x66c25dd8);
  });
  it('rng count after battle 18215', () => {
    assert.strictEqual(battle.rng.count, 18215);
  });
  // Not captured here: the next capture (Varkas & Sydonia, below) starts on this RNG, so it only
  // holds while nothing else rolls in between. Finished on a copy, so the checks here still see
  // the battle as it ended.
  it('rng after drop == 0xf8b88416 (next battle\'s start)', () => {
    assert.strictEqual(battle.clone().finish().result.rng.afterDrop.current, 0xf8b88416);
  });
  it('rng count after drop 18217 (next battle\'s start)', () => {
    assert.strictEqual(battle.clone().finish().result.rng.afterDrop.count, 18217);
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
    const damage = battle.log.ofType(LOG_TYPES.DAMAGE).map(({ tick, actor, target, amount }) => ({ tick, actor, target, amount }));
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

describe('Dragon tests', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(25)
    .setEXP(679)
    .setStats({ PWR: 82, SKL: 102, DEF: 80, SPD: 93, MGC: 86, LUK: 85, HP: 278 })
    .clearInventory()
    .setRune(RUNES.SOUL_EATER)
    .setWeaponLvl(8);

  const Viktor = new Character(CHARACTER_KEYS.VIKTOR)
    .setLVL(25)
    .setEXP(447)
    .setStats({ PWR: 119, SKL: 48, DEF: 94, SPD: 68, MGC: 51, LUK: 65, HP: 432 })
    .setRune(RUNES.HOLY);

  const Kuromimi = new Character(CHARACTER_KEYS.KUROMIMI)
    .setLVL(24)
    .setEXP(0)
    .setStats({ PWR: 77, SKL: 65, DEF: 74, SPD: 70, MGC: 40, LUK: 76, HP: 241 });

  const Kirkis = new Character(CHARACTER_KEYS.KIRKIS)
    .setLVL(20)
    .setEXP(566)
    .setStats({ PWR: 64, SKL: 99, DEF: 65, SPD: 76, MGC: 67, LUK: 50, HP: 196 })
    .setRune(RUNES.WIND);

  const Valeria = new Character(CHARACTER_KEYS.VALERIA)
    .setLVL(28)
    .setEXP(150)
    .setStats({ PWR: 94, SKL: 74, DEF: 90, SPD: 68, MGC: 65, LUK: 75, HP: 320 })

  const Gremio = new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(25)
    .setEXP(674)
    .setStats({ PWR: 65, SKL: 73, DEF: 90, SPD: 53, MGC: 42, LUK: 72, HP: 228 })
    .setRune(RUNES.WIND);

  const party = new PlayerParty([McDohl, Viktor, Kuromimi, Kirkis, Valeria, Gremio]).rest();

  /** @param {Action[]} actions */
  const actionsT1 = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.DEFEND },
  ];

  /** @param {Action[]} actions */
  const actionsT2 = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.ATTACK },
  ];

  /** @param {Action[]} actions */
  const actionsT3 = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.DEFEND },
  ];

  /** @param {Action[]} actions */
  const actionsT4 = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.DEFEND },
  ];

  /** @param {Action[]} actions */
  const actionsT5 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.RUNE, slot: 1 },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.RUNE, slot: 1 },
  ];

  /** @param {Action[]} actions */
  const actionsT6 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.RUNE, slot: 1 },
    { type: ACTION_TYPES.RUNE },
    { type: ACTION_TYPES.DEFEND },
  ];

  const actions = [actionsT1, actionsT2, actionsT3, actionsT4, actionsT5, actionsT6];

  const rng = new RNG(0x43).next(7750);
  const rngCloneForTest = rng.cloneKeepIndex();

  it ('rng at start == 0x980a9e75', () => {
    assert.strictEqual(rngCloneForTest.getRNG(), 0x980a9e75);
  });

  const enemyParty = EnemyParty.fromFormation(AREAS.PANNU_YAKUTA.scripted[0]);
  const battle = new Battle({ party, enemies: enemyParty, rng, turns: [] });

  const snapshots = actions.map(turn => {
    battle.playTurn(turn);
    return Battle.snapshot(battle);
  });

  it('T1 rng == 0x8ddcf2e4', () => {
    assert.strictEqual(snapshots[0].rng, 0x8ddcf2e4);
  });
  it('rng count after T1 == 8493', () => {
    assert.strictEqual(snapshots[0].count, 8493);
  });
  it('McDohl HP == 246', () => {
    assert.strictEqual(snapshots[0].partyHPByName[McDohl.name], 246);
  });
  it('Dragon HP = 5457', () => {
    assert.strictEqual(snapshots[0].enemyHPBySlot[0], 5457);
  });

  it('T2 rng == 0x68ea8ddd', () => {
    assert.strictEqual(snapshots[1].rng, 0x68ea8ddd);
  });
  it('rng count after T2 == 9246', () => {
    assert.strictEqual(snapshots[1].count, 9246);
  });
  it('Viktor HP == 329', () => {
    assert.strictEqual(snapshots[1].partyHPByName[Viktor.name], 329);
  });
  it('Dragon HP = 4669', () => {
    assert.strictEqual(snapshots[1].enemyHPBySlot[0], 4669);
  });

  it('T3 rng count == 10007', () => {
    assert.strictEqual(snapshots[2].count, 10007);
  });
  it('McDohl HP == 214', () => {
    assert.strictEqual(snapshots[2].partyHPByName[McDohl.name], 214);
  });
  it('Dragon HP = 3815', () => {
    assert.strictEqual(snapshots[2].enemyHPBySlot[0], 3815);
  });

  it('T4 rng count == 10762', () => {
    assert.strictEqual(snapshots[3].count, 10762);
  });
  it('McDohl HP == 181', () => {
    assert.strictEqual(snapshots[3].partyHPByName[McDohl.name], 181);
  });
  it('Dragon HP = 3117', () => {
    assert.strictEqual(snapshots[3].enemyHPBySlot[0], 3117);
  });

  it('T4 rng count == 11522', () => {
    assert.strictEqual(snapshots[4].count, 11522);
  });
  it('Kuromimi HP == 181', () => {
    assert.strictEqual(snapshots[4].partyHPByName[Kuromimi.name], 124);
  });
  it('Dragon HP = 1139', () => {
    assert.strictEqual(snapshots[4].enemyHPBySlot[0], 1139);
  });

  it('T5 rng count == 11551', () => {
    assert.strictEqual(snapshots[5].count, 11551);
  });
  it('Dragon HP = 0', () => {
    assert.strictEqual(snapshots[5].enemyHPBySlot[0], 0);
  });
});

describe('Golem 3 FurFur no force to test Medicine', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL)
    .setLVL(4)
    .setEXP(120)
    .setStats({ PWR: 22, SKL: 32, DEF: 27, SPD: 26, MGC: 22, LUK: 24, HP: 7 })
    .setHP(7);

  const Gremio = new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(4)
    .setEXP(120)
    .setRune(RUNES.HOLY)
    .setStats({ PWR: 25, SKL: 20, DEF: 26, SPD: 16, MGC: 12, LUK: 18, HP: 46 })
    .setHP(40);

  const Pahn = new Character(CHARACTER_KEYS.PAHN)
    .setLVL(4)
    .setEXP(120)
    .setStats({ PWR: 36, SKL: 26, DEF: 28, SPD: 14, MGC: 6, LUK: 23, HP: 60 })
    .setHP(7);

  const Ted = new Character(CHARACTER_KEYS.TED)
    .setLVL(4)
    .setEXP(120)
    .setStats({ PWR: 22, SKL: 30, DEF: 17, SPD: 24, MGC: 24, LUK: 23, HP: 46 })

  const Cleo = new Character(CHARACTER_KEYS.CLEO)
    .setLVL(4)
    .setEXP(120)
    .setStats({ PWR: 20, SKL: 30, DEF: 24, SPD: 22, MGC: 32, LUK: 25, HP: 47 })

  const party = new PlayerParty([McDohl, Gremio, Pahn, Ted, Cleo]);
  const enemyParty = EnemyParty.fromFormation(AREAS.MAGICIANS_ISLAND.scripted[0]);

  const rng = new RNG(0x17).next(141);

  const battle1 = new Battle({ party, enemies: enemyParty, rng });
  const battle2 = battle1.clone();

  /** @param {Action[]} actions */
  const actionsT1v1 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target: 2 },
    { type: ACTION_TYPES.DEFEND }
  ];

  /** @param {Action[]} actions */
  const actionsT2v1 = [
    { type: ACTION_TYPES.ATTACK },
    { type: ACTION_TYPES.UNITE,  uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE,  uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
  ];

  /** @param {Action[]} actions */
  const actionsT1v2 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target: 2 },
    { type: ACTION_TYPES.ATTACK }
  ];

  const actionsT2v2 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.UNITE,  uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.UNITE,  uniteKey: UNITE_KEYS.TALISMAN },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.DEFEND },
  ];

  const actionsV1 = [actionsT1v1, actionsT2v1];
  const actionsV2 = [actionsT1v2, actionsT2v2];

  const snapshotsV1 = actionsV1.map(turn => {
    battle1.playTurn(turn);
    return Battle.snapshot(battle1);
  });

  const snapshotsV2 = actionsV2.map(turn => {
    battle2.playTurn(turn);
    return Battle.snapshot(battle2);
  });

  it('rng count after T1 == 166', () => {
    assert.strictEqual(snapshotsV1[0].count, 166);
  });
  it('McDohl HP == 7', () => {
    assert.strictEqual(snapshotsV1[0].partyHPByName[McDohl.name], 7);
  });
  it('Gremio HP == 32', () => {
    assert.strictEqual(snapshotsV1[0].partyHPByName[Gremio.name], 32);
  });
  it('Pahn HP == 60', () => {
    assert.strictEqual(snapshotsV1[0].partyHPByName[Pahn.name], 60);
  });
  it('Golem HP == 154', () => {
    assert.strictEqual(snapshotsV1[0].enemyHPBySlot[0], 154);
  });

  it('rng count after T2 == 187', () => {
    assert.strictEqual(snapshotsV1[1].count, 187);
  });
  it('Golem HP == 0', () => {
    assert.strictEqual(snapshotsV1[1].enemyHPBySlot[0], 0);
  });

  console.log(battle2.log.format());

  describe('Alternate version to test special move', () => {
    it('rng count after T1 == 172', () => {
      assert.strictEqual(snapshotsV2[0].count, 172);
    });
    it('McDohl HP == 5', () => {
      assert.strictEqual(snapshotsV2[0].partyHPByName[McDohl.name], 5);
    });
    it('Gremio HP == 27', () => {
      assert.strictEqual(snapshotsV2[0].partyHPByName[Gremio.name], 27);
    });
    it('Pahn HP == 51', () => {
      assert.strictEqual(snapshotsV2[0].partyHPByName[Pahn.name], 51);
    });
    it('Ted HP == 45', () => {
      assert.strictEqual(snapshotsV2[0].partyHPByName[Ted.name], 45);
    });
    it('Cleo HP == 46', () => {
      assert.strictEqual(snapshotsV2[0].partyHPByName[Cleo.name], 46);
    });
    it('Golem HP == 134', () => {
      assert.strictEqual(snapshotsV2[0].enemyHPBySlot[0], 134);
    });

    it('rng count after T1 == 198', () => {
      assert.strictEqual(snapshotsV2[1].count, 198);
    });
    it('McDohl HP == 5', () => {
      assert.strictEqual(snapshotsV2[1].partyHPByName[McDohl.name], 5);
    });
    it('Golem HP == 0', () => {
      assert.strictEqual(snapshotsV2[1].enemyHPBySlot[0], 0);
    });
  });
});

describe('3 BonBon Celadon Urn fight', () => {
  const McDohl = new Character(CHARACTER_KEYS.MCDOHL);
  const Gremio = new Character(CHARACTER_KEYS.GREMIO);
  const Pahn = new Character(CHARACTER_KEYS.PAHN);
  const Cleo = new Character(CHARACTER_KEYS.CLEO);
  const Ted = new Character(CHARACTER_KEYS.TED);

  const party = new PlayerParty([McDohl, Gremio, Pahn, Cleo, Ted]);
  /** @param {Action[]} actions */
  const actionsT2 = [
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK, target: 2 },
    { type: ACTION_TYPES.ATTACK, target: 0 },
    { type: ACTION_TYPES.DEFEND },
    { type: ACTION_TYPES.ATTACK, target: 0 },
  ];

  /** @type {Round[]} */
  const roundInputs = [
    { command: ROUND_COMMANDS.RUN },
    actionsT2
  ]

  const rng = new RNG(0x30a82220).next(5419);

  const enemyParty = EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]);
  const battle = new Battle({ party, enemies: enemyParty, rng, escapable: true, turns: roundInputs });

  battle.run();

  it('rng count 2nd round end == 5501', () => {
    assert.strictEqual(battle.rng.count, 5501);
  });
  it('McDohl HP == 14', () => {
    assert.strictEqual(battle.party.getCombatantByName(McDohl.name).HP, 14);
  });
  it('Gremio HP == 22', () => {
    assert.strictEqual(battle.party.getCombatantByName(Gremio.name).HP, 22);
  });
  it('Pahn HP == 22', () => {
    assert.strictEqual(battle.party.getCombatantByName(Pahn.name).HP, 22);
  });


  describe('Post battle results', () => {
    const finishedBattle = battle.clone();
    finishedBattle.run();
    finishedBattle.finish();

    const result = finishedBattle.result;
    it('Dropped Celadon Urn', () => {
      assert.strictEqual(result.drop.name, ITEMS[ITEM_KEYS.CELADON_URN].name);
    });
    it('RNG battleEnd count == 5501', () => {
      assert.strictEqual(result.rng.battleEnd.count, 5501);
    });
    it('RNG drop count == 5503', () => {
      assert.strictEqual(result.rng.afterDrop.count, 5503);
    });
    it('RNG expGain count == 5538', () => {
      assert.strictEqual(result.rng.afterLevelUps.count, 5538);
    });

    it('Pahn growths match game', () => {
      const pahnGrowths = { PWR: 3, SKL: 3, DEF: 3, SPD: 1, MGC: 1, LUK: 2, HP: 12 };
      assert.deepStrictEqual(result.rewards[2].growths, pahnGrowths)
    });
  });

  describe('3 Mosquito 1 Ant Holy fight afterwards', () => {
    const previousBattle = battle.clone();
    previousBattle.run();
    previousBattle.finish();

    const enemies = EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[7]);
    const rng = new RNG(0x30a82220).next(5560);

    const actionsT1 = [
      { type: ACTION_TYPES.DEFEND },
      { type: ACTION_TYPES.ATTACK, target: 0 },
      { type: ACTION_TYPES.ATTACK, target: 1 },
      { type: ACTION_TYPES.ATTACK, target: 3 },
      { type: ACTION_TYPES.ATTACK, target: 3 },
    ];

    const actionsT2 = [
      { type: ACTION_TYPES.DEFEND },
      { type: ACTION_TYPES.DEFEND },
      { type: ACTION_TYPES.ATTACK },
      { type: ACTION_TYPES.ATTACK },
      { type: ACTION_TYPES.DEFEND },
    ];

    const battle3m1a = new Battle({ party: previousBattle.party, enemies, rng });
    battle3m1a.playTurn(actionsT1)

    describe('Turn 1 results', () => {
      it('rng count 1st round end == 5633', () => {
        assert.strictEqual(battle3m1a.rng.count, 5633);
      });
      it('McDohl HP == 15', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(McDohl.name).HP, 15);
      });
      it('Gremio HP == 26', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(Gremio.name).HP, 26);
      });
      it('Pahn HP == 33', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(Pahn.name).HP, 33);
      });
      it('McDohl is poisoned', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(McDohl.name).status.Poison, true);
      });
      it('Gremio is not poisoned', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(Gremio.name).status.Poison, false);
      });
      it('Pahn is poisoned', () => {
        assert.strictEqual(battle3m1a.party.getCombatantByName(Pahn.name).status.Poison, true);
      });
      it('Mosquito 1 is dead', () => {
        assert.strictEqual(battle3m1a.enemies.combatants[0].isAlive, false);
      });
      it('Mosquito 2 is dead', () => {
        assert.strictEqual(battle3m1a.enemies.combatants[1].isAlive, false);
      });
      it('Mosquito 3 is alive', () => {
        assert.strictEqual(battle3m1a.enemies.combatants[2].isAlive, true);
      });
      it('Ant is dead', () => {
        assert.strictEqual(battle3m1a.enemies.combatants[3].isAlive, false);
      });
    });
    describe('Turn 2 results', () => {
      const battleT2 = battle3m1a.clone();
      battleT2.playTurn(actionsT2);

      it('rng count 1st round end == 5663', () => {
        assert.strictEqual(battleT2.rng.count, 5663);
      });
      it('McDohl HP == 14', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(McDohl.name).HP, 14);
      });
      it('Gremio HP == 25', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(Gremio.name).HP, 25);
      });
      it('Pahn HP == 32', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(Pahn.name).HP, 32);
      });
      it('McDohl is poisoned', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(McDohl.name).status.Poison, true);
      });
      it('Gremio is not poisoned', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(Gremio.name).status.Poison, false);
      });
      it('Pahn is poisoned', () => {
        assert.strictEqual(battleT2.party.getCombatantByName(Pahn.name).status.Poison, true);
      });
      it('Mosquito 1 is dead', () => {
        assert.strictEqual(battleT2.enemies.combatants[0].isAlive, false);
      });
      it('Mosquito 2 is dead', () => {
        assert.strictEqual(battleT2.enemies.combatants[1].isAlive, false);
      });
      it('Mosquito 3 is dead', () => {
        assert.strictEqual(battleT2.enemies.combatants[2].isAlive, false);
      });
      it('Ant is dead', () => {
        assert.strictEqual(battleT2.enemies.combatants[3].isAlive, false);
      });

      describe('Post battle results', () => {
        const battleWithResults = battleT2.clone();
        battleWithResults.finish();
        const result = battleWithResults.result;
        it ('Dropped Holy Crystal', () => {
          assert.strictEqual(result.drop.id, ITEMS.HOLY_CRYSTAL.id);
        });
        it ('RNG on drop == 5669', () => {
          assert.strictEqual(result.rng.afterDrop.count, 5669);
        });
      });
    });
  });
});

describe('3 BonBon: COPY_ACTOR hold after a party crit, and victory -> drop timing', () => {
  // Live captures (round 2 ticks). Gremio crits at t85, so the next party actor (Pahn, rolled at
  // t86) isn't copied in until Gremio's recover starts (t85 + 88 = t173): copied t174, attacks t175.
  const D = { type: ACTION_TYPES.DEFEND };
  /** @param {number} target */
  const A = target => ({ type: ACTION_TYPES.ATTACK, target });
  /** @param {Action[]} round2 */
  const play = round2 => {
    const party = new PlayerParty([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.CLEO, CHARACTER_KEYS.TED]
      .map(key => new Character(key)));
    const battle = new Battle({
      party,
      enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
      rng: new RNG(0x30a82220).next(5419),
      escapable: true,
      turns: [{ command: ROUND_COMMANDS.RUN }, round2],
    });
    battle.run({ finish: true });
    const round2Entries = battle.log.entries.filter(e => e.round === 2);
    /** @param {string} type @param {string} [actor] */
    const tickOf = (type, actor) => round2Entries.find(e => e.type === type && (!actor || e.actor === actor)).tick;
    return { battle, tickOf };
  };

  describe('Gremio -> #2, Pahn -> #3, Ted -> #1', () => {
    const { battle, tickOf } = play([D, A(1), A(2), D, A(0)]);
    it('Pahn attacks at t175 (held through Gremio\'s crit)', () => {
      assert.strictEqual(tickOf(LOG_TYPES.ATTACK, 'Pahn'), 175);
    });
    it('McDohl\'s turn comes at t176', () => {
      assert.strictEqual(battle.log.entries.find(e => e.round === 2 && e.type === LOG_TYPES.TURN && e.actor === 'McDohl').tick, 176);
    });
    it('Pahn\'s damage roll is at t231', () => {
      assert.strictEqual(tickOf(LOG_TYPES.DAMAGE, 'Pahn'), 231);
    });
    it('drops at t407 (B + 34), on RNG 5501', () => {
      const drop = battle.log.ofType(LOG_TYPES.DROP)[0];
      assert.strictEqual(drop.tick, 407);
      assert.strictEqual(battle.result.rng.battleEnd.count, 5501);
    });
  });

  describe('Gremio -> #3, Pahn -> #1, Ted -> #1', () => {
    const { battle, tickOf } = play([D, A(2), A(0), D, A(0)]);
    it('Pahn is held to t175, retargets (#1 already dead), and attacks at t176', () => {
      assert.strictEqual(tickOf(LOG_TYPES.RETARGET, 'Pahn'), 175);
      assert.strictEqual(tickOf(LOG_TYPES.ATTACK, 'Pahn'), 176);
    });
    it('drops at t408, one tick after the other plan', () => {
      assert.strictEqual(battle.log.ofType(LOG_TYPES.DROP)[0].tick, 408);
    });
  });
});
