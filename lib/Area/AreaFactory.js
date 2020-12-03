import EnemyGroup from '../EnemyGroup.js';
import Dungeon from './Dungeon.js';
import Town from './Town.js';
import WorldMap from './WorldMap.js';
import enemyImages from '../../assets/enemyImages.js';

export default class AreaFactory {
  createArea(name, area) {
    const { areaType, encounterRate, enemies, encounters } = area;
    const encounterTable = this.generateEncounterTable(encounters, enemies);
    switch(areaType) {
      case('Dungeon'):
        return new Dungeon(name, enemies, encounterTable, encounterRate);
      case('World Map'):
        return new WorldMap(name, enemies, encounterTable);
      default:
        return new Town(name, enemies, encounterTable);
    }
  }

  generateEncounterTable(enemyGroups, enemies) {
    const encounterTable = [];
    for (const enemyGroup of enemyGroups) {
      const name = enemyGroup.name;
      const enemiesInGroup = this.createEnemyGroupFromParseString(enemyGroup.parseString, enemies);
      encounterTable.push(new EnemyGroup(name, enemiesInGroup));
    }
    return encounterTable;
  }

  createEnemyGroupFromParseString(parseString, enemies) {
    const encounter = parseString.split(' ');
    const enemyGroup = [];
    for (let j = 0; j < encounter.length; j = j + 2) {
      const name = encounter[j + 1];
      for (let k = 0; k < parseInt(encounter[j], 10); k++) {
        const enemy = enemies[encounter[j + 1]];
        enemy.name = name;
        enemy.img = enemyImages[name];
        enemyGroup.push(enemies[encounter[j + 1]]);
      }
    }
    return enemyGroup;
  }
}
