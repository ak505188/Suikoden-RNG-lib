import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { CHARACTER_KEYS, ENEMY_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
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
    // TODO: Clear Inventory
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

  // The describe body runs before any it(), so each round's state is captured right after it plays
  const snapshot = () => ({
    rng: battle.rng.getRNG(),
    count: battle.rng.count,
    party: Object.fromEntries(battle.party.combatants.map(c => [c.name, c.HP])),
    enemies: battle.enemies.combatants.map(c => c.HP),
  });

  const snapshots = actions.map(turn => {
    battle.playTurnTickBased(turn);
    return snapshot();
  });

  it('T1 rng == 0x8ddcf2e4', () => {
    assert.strictEqual(snapshots[0].rng, 0x8ddcf2e4);
  });
  it('rng count after T1 == 8493', () => {
    assert.strictEqual(snapshots[0].count, 8493);
  });
  it('McDohl HP == 246', () => {
    assert.strictEqual(snapshots[0].party[McDohl.name], 246);
  });
  it('Dragon HP = 5457', () => {
    assert.strictEqual(snapshots[0].enemies[0], 5457);
  });

  it('T2 rng == 0x68ea8ddd', () => {
    assert.strictEqual(snapshots[1].rng, 0x68ea8ddd);
  });
  it('rng count after T2 == 9246', () => {
    assert.strictEqual(snapshots[1].count, 9246);
  });
  it('Viktor HP == 329', () => {
    assert.strictEqual(snapshots[1].party[Viktor.name], 329);
  });
  it('Dragon HP = 4669', () => {
    assert.strictEqual(snapshots[1].enemies[0], 4669);
  });

  it('T3 rng count == 10007', () => {
    assert.strictEqual(snapshots[2].count, 10007);
  });
  it('McDohl HP == 214', () => {
    assert.strictEqual(snapshots[2].party[McDohl.name], 214);
  });
  it('Dragon HP = 3815', () => {
    assert.strictEqual(snapshots[2].enemies[0], 3815);
  });

  it('T4 rng count == 10762', () => {
    assert.strictEqual(snapshots[3].count, 10762);
  });
  it('McDohl HP == 181', () => {
    assert.strictEqual(snapshots[3].party[McDohl.name], 181);
  });
  it('Dragon HP = 3117', () => {
    assert.strictEqual(snapshots[3].enemies[0], 3117);
  });

  it('T4 rng count == 11522', () => {
    assert.strictEqual(snapshots[4].count, 11522);
  });
  it('Kuromimi HP == 181', () => {
    assert.strictEqual(snapshots[4].party[Kuromimi.name], 124);
  });
  it('Dragon HP = 1139', () => {
    assert.strictEqual(snapshots[4].enemies[0], 1139);
  });

  it('T5 rng count == 11551', () => {
    assert.strictEqual(snapshots[5].count, 11551);
  });
  it('Dragon HP = 0', () => {
    assert.strictEqual(snapshots[5].enemies[0], 0);
  });
});
