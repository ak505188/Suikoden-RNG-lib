import Area from './Area.js';

/** A world map area: fixed encounter rate 8, world map encounter check (see Area.isBattle). */
export default class WorldMapArea extends Area {
  constructor(name, enemies, encounterTable) {
    super(name, enemies, encounterTable, 8, 'World Map');
  }
}
