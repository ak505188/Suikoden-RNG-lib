import Area from './Area';

export default class Town extends Area {
  constructor(name, enemies, encounterTable) {
    super(name, enemies, encounterTable, 0, 'Town');
  }

  isBattle(_rng) {
    return null;
  }

  calcIsBattleValue(_rng) {
    return null;
  }
}
