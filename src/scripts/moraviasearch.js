import { Areas } from '../lib/lib.js';
import RNG from '../lib/rng.js';

const rng = new RNG(0x43);
const battles = Areas['Moravia Castle'].generateEncounters(rng, 20000, 216, true)
  .map(battle => ({
    name: battle.enemyGroup.name,
    index: battle.index,
  }))
  .filter(battle => (battle.name === '2 Elite Soldier 1 Ninja 2 Magus' || battle.name === '3 Ninja 2 Magus'));
console.log(battles);

const printChampVals = group => console.log(`${group.name} : ${group.champVal}`);
