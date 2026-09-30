import Area from './Area.js';

/** A dungeon: its own encounter rate, dungeon encounter check (see Area.isBattle). */
export default class Dungeon extends Area {
  constructor(name, enemies, encounterTable, encounterRate) {
    super(name, enemies, encounterTable, encounterRate, 'Dungeon');
  }
}
