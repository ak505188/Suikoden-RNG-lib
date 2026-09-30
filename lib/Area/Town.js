import Area from './Area.js';

/** A town: no random battles (Area.isBattle returns null). */
export default class Town extends Area {
  constructor(name, enemies, encounterTable) {
    super(name, enemies, encounterTable, 0, 'Town');
  }
}
