import Area, { calcIsBattleValueWorldMap, isBattleWorldMap } from './Area';

export default class WorldMapArea extends Area {
  constructor(name, enemies, encounterTable) {
    super(name, enemies, encounterTable, 8, 'World Map');
  }

  isBattle(rng) {
    return isBattleWorldMap(rng, this.encounterRate);
  }

  calcIsBattleValue(rng) {
    return calcIsBattleValueWorldMap(rng);
  }
}
