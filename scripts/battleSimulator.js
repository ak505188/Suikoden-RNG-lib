import Character from '../lib/Game/Battle/Character.js';
import CHARACTERS from '../lib/Game/Characters.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */

const McDohl = new Character(CHARACTERS.MCDOHL)
  .setLVL(22)
  .setEXP(870)
  .setRune(RUNES.SOUL_EATER)
  .setStats({ PWR: 76, SKL: 94, DEF: 74, SPD: 86, MGC: 80, LUK: 79, HP: 244 })
  .rest();

const Gremio = new Character(CHARACTERS.GREMIO)
  .setLVL(22)
  .setEXP(870)
  .setRune(RUNES.HOLY)
  .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
  .rest();

const Viktor = new Character(CHARACTERS.VIKTOR)
  .setLVL(22)
  .setEXP(575)
  .setStats({ PWR: 114, SKL: 43, DEF: 85, SPD: 63, MGC: 47, LUK: 61, HP: 414 })
  .rest();

const Cleo = new Character(CHARACTERS.CLEO)
  .setLVL(22)
  .setEXP(870)
  .setRune(RUNES.FIRE)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

const Tai_Ho = new Character(CHARACTERS.TAI_HO)
  .levelUp(9);


const Camille = new Character(CHARACTERS.CAMILLE)
  .setLVL(9)
  .setStats({ PWR: 37, SKL: 53, DEF: 30, SPD: 40, MGC: 36, LUK: 28, HP: 91 });

const party = new PlayerParty([McDohl, Gremio, Viktor, Cleo, Tai_Ho, Camille]);
/** @param {Action[]} actions */
const actions = [
  { type: ACTION_TYPES.ATTACK },
  { type: ACTION_TYPES.ATTACK },
  { type: ACTION_TYPES.ATTACK },
  { type: ACTION_TYPES.RUNE, slot: 2 },
  { type: ACTION_TYPES.DEFEND }
];

const enemyParty = new EnemyParty([new ZombieDragon()]);

const battle = new Battle({ party, enemies: enemyParty, rng: new RNG(0x12), turns: [actions] });

console.log(battle);
