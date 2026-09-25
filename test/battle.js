import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */

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

// Run

describe('Zombie Dragon 1 turn tests', () => {
  const party = new PlayerParty([Viktor, Gremio, McDohl, Cleo, Tai_Ho, Camille]);
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

  // it('rng == 0x27bc4952', () => {
  //   assert.strictEqual(battle.rng.getRNG(), 0x27bc4952);
  // });
  // it('Viktor HP == 325', () => {
  //   assert.strictEqual(battle.party.getCombatant(Viktor.name).HP, 325);
  // });
  // it('Gremio HP == 103', () => {
  //   assert.strictEqual(battle.party.getCombatant(Gremio.name).HP, 103);
  // });
  // it('McDohl HP == 220', () => {
  //   assert.strictEqual(battle.party.getCombatant(McDohl.name).HP, 220);
  // });
  // it('Cleo HP == 180', () => {
  //   assert.strictEqual(battle.party.getCombatant(Cleo.name).HP, 180);
  // });
  // it('Camille HP == 4', () => {
  //   assert.strictEqual(battle.party.getCombatant(Camille.name).HP, 4);
  // });
  // it('Tai Ho HP == 66', () => {
  //   assert.strictEqual(battle.party.getCombatant(Tai_Ho.name).HP, 66);
  // });
  // it('Zombie Dragon HP == 2635', () => {
  //   assert.strictEqual(battle.enemies.getCombatant(zombieDragon.name).HP, 2635);
  // });
});
