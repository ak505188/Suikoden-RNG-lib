import Area, { isBattleDungeon, calcIsBattleValueDungeon } from './Area';

export default class Dungeon extends Area {
  constructor(name, enemies, encounterTable, encounterRate) {
    super(name, enemies, encounterTable, encounterRate, 'Dungeon');
  }

  isBattle(rng) {
    return isBattleDungeon(rng, this.encounterRate);
  }

  calcIsBattleValue(rng) {
    return calcIsBattleValueDungeon(rng);
  }
}
