import createFight from '../Fight.js';
import { div32ulo } from '../lib.js';

export default class Area {
  constructor(name, enemies, encounterTable, encounterRate, areaType) {
    this.name           = name;
    this.areaType       = areaType;
    this.encounterRate  = encounterRate;
    this.enemies        = enemies;
    this.encounterTable = encounterTable;
  }

  getEncounter(rng) {
    const enemyGroup = this.encounterTable[this.getEncounterIndex(rng)];
    return createFight(this.name, enemyGroup, rng);
  }

  getEnemyGroupByName(name) {
    for (const enemyGroup of this.encounterTable) {
      if (enemyGroup.name === name) {
        return enemyGroup;
      }
    }
    return null;
  }

  getEnemyGroupByIndex(index) {
    if (index < this.encounterTable.length) {
      return this.encounterTable[index];
    }
    return null;
  }

  getEncounterIndex(rng) {
    return Area.getEncounterIndex(rng, this.encounterTable.length);
  }

  static getEncounterIndex(rng, encounterTableLength) {
    const r2 = rng.getNext().rng2;
    const r3 = div32ulo(0x7FFF, encounterTableLength);
    let encounterIndex = div32ulo(r2, r3);
    while (encounterIndex >= encounterTableLength) {
      encounterIndex--;
    }
    return encounterIndex;
  }

  static isBattle(rng, encounterRate, areaType) {
    return areaType === 'Dungeon'
      ? isBattleDungeon(rng, encounterRate) : isBattleWorldMap(rng, encounterRate);
  }

  // Realistic advances RNG whenever getEncounter is called.
  // Sometimes, you get battles at 2 RNG values next to each other
  // ex: You get a battle at index 1444 and index 1445
  // What 99.999% of the time is that you hit the index at 1444 and skip the battle at 1445
  // With realistic false it will show both battles.
  // With realistic on it will show only 1444
  // Realistic is recommended for RunAssistant and RNG finder
  // Also, keep realistic off with partylevel > 0
  generateEncounters(rng, iterations, partylevel, realistic = false) {
    const encounters = [];
    for (let i = 0; i < iterations; i++) {
      if (this.isBattle(rng)) {
        const isBattleValue = this.calcIsBattleValue(rng);
        const fight = { isBattleValue, ...this.getEncounter(rng) };
        if (!(partylevel > 0 && partylevel > fight.enemyGroup.champVal)) {
          encounters.push(fight);
        }
        if (realistic) {
          rng.next();
          i++;
        }
      }
      rng.next();
    }
    return encounters;
  }
}

export function isBattleWorldMap(rng, encounterRate) {
  let r2 = rng.getRNG2();
  const r3 = r2;
  r2 = (r2 >> 8) << 8;
  r2 = r3 - r2;
  return r2 < encounterRate;
}

export function isBattleDungeon(rng, encounterRate) {
  let r2 = rng.getRNG2();
  const r3 = 0x7F;
  const mflo = div32ulo(r2, r3);
  r2 = mflo;
  r2 = r2 & 0xFF;
  return r2 < encounterRate;
}

export function calcIsBattleValueWorldMap(rng) {
  let r2 = rng.getRNG2();
  const r3 = r2;
  r2 = (r2 >> 8) << 8;
  r2 = r3 - r2;
  return r2;
}

export function calcIsBattleValueDungeon(rng) {
  let r2 = rng.getRNG2();
  const r3 = 0x7F;
  const mflo = div32ulo(r2, r3);
  r2 = mflo;
  r2 = r2 & 0xFF;
  return r2;
}
