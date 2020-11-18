import { Areas } from '../lib/lib.js';
import RNG from '../lib/rng.js';

const rng = new RNG(0x12);

const greatForestBattles = Areas['Great Forest'].generateEncounters(rng, 40000, 0, true);

for (const battle of greatForestBattles) {
  if (battle.enemyGroup.name === '6 Holly Boy'
    || battle.enemyGroup.name === '3 Holly Boy 3 Holly Spirit'
    || battle.enemyGroup.name === '2 Holly Boy 1 Holly Fairy'
    || battle.enemyGroup.name === '5 Holly Boy 1 Holly Spirit') {
    const rngForDrop = new RNG(battle.battleRNG).getNext(22 + battle.enemyGroup.enemies.length * 3).rng;
    const drop = battle.enemyGroup.calculateDrop(new RNG(rngForDrop));
    if (drop === "Lover's Garden") {
      console.log(battle.index, battle.enemyGroup.name, battle.battleRNG.toString(16), drop);
    }
  }
}

const dwarvesTrailBattles = Areas['Dwarves Trail'].generateEncounters(new RNG(rng.originalRNG), 40000, 0, true);

for (const battle of dwarvesTrailBattles) {
  if (battle.enemyGroup.name === '3 Death Boar 1 Eagle Man'
    || battle.enemyGroup.name === '3 Death Boar 2 Eagle Man'
    || battle.enemyGroup.name === '1 Eagle Man'
    || battle.enemyGroup.name === '2 Eagle Man'
    || battle.enemyGroup.name === '3 Eagle Man') {
    const rngForDrop = new RNG(battle.battleRNG).getNext(172 + battle.enemyGroup.enemies.length * 2).rng;
    const drop = battle.enemyGroup.calculateDrop(new RNG(rngForDrop));
    if (drop === "Lover's Garden") {
      console.log(battle.index, battle.enemyGroup.name, battle.battleRNG.toString(16), drop);
    }
  }
}

for (const battle of dwarvesTrailBattles) {
  if (battle.enemyGroup.name === '3 Death Boar 1 Eagle Man'
    || battle.enemyGroup.name === '3 Death Boar 2 Eagle Man'
    || battle.enemyGroup.name === '1 Eagle Man'
    || battle.enemyGroup.name === '2 Eagle Man'
    || battle.enemyGroup.name === '3 Eagle Man') {
    const rngForDrop = new RNG(battle.battleRNG).getNext(22 + battle.enemyGroup.enemies.length * 2).rng;
    const drop = battle.enemyGroup.calculateDrop(new RNG(rngForDrop));
    if (drop === "Lover's Garden") {
      console.log(battle.index, battle.enemyGroup.name, battle.battleRNG.toString(16), drop);
    }
  }
}
