import createFight from '../Fight.js';
import { div32ulo } from '../util/math.js';
import { ENEMIES } from './Bestiary/Enemies.js';

/** @typedef {import('./Bestiary/Areas.js').Area} AreaData */
/** @typedef {import('./Bestiary/Areas.js').Formation} Formation */
/** @typedef {import('../rng.js').default} RNG */

/* The random-encounter model over the AREAS data: the battle check, formation pick and the
 * champion value. Every function takes the AREAS entry (or a formation) as its parameter. */

/** @param {Formation} formation The enemies in a formation, empty slots skipped */
export function formationEnemies(formation) {
  return formation.filter((key) => key !== null).map((key) => ENEMIES[key]);
}

/**
 * @param {Formation} formation
 * @returns {number}
 * The group's champion value: summed enemy levels * 1.5.
 */
export function championValue(formation) {
  let level = 0;
  for (const enemy of formationEnemies(formation)) level += enemy.LVL;
  level = (level << 4) - level;
  return div32ulo(level, 0xa);
}

/**
 * Whether a party at `partyLevel` skips a fight with this formation
 * @param {Formation} formation
 * @param {number} partyLevel
 * @returns {boolean}
 */
export function isChampionSkip(formation, partyLevel) {
  return partyLevel > championValue(formation);
}

/**
 * Whether this RNG value starts a battle in `area`: the dungeon or world map encounter check.
 * @param {RNG} rng
 * @param {AreaData} area
 * @returns {boolean}
 */
export function isBattle(rng, area) {
  return battleValue(rng, area) < area.encounterRate;
}

/**
 * The value `isBattle` compares against the encounter rate.
 * @param {RNG} rng
 * @param {AreaData} area
 * @returns {number}
 */
export function battleValue(rng, area) {
  const { rand } = rng;
  // World map: the low byte. Dungeon: rand / 0x7f, low byte.
  return area.areaType === 'Dungeon' ? div32ulo(rand, 0x7f) & 0xff : rand & 0xff;
}

/**
 * How many encounter checks in a row from `rng`'s position come up battle-free in `area`. A check
 * reads the next value, so the current one never starts a battle: 0 means the very next value
 * does. Null if more than `limit` are free. `rng` isn't moved.
 * @param {RNG} rng
 * @param {AreaData} area
 * @param {number} limit
 * @returns {number | null}
 */
export function battleFreeSteps(rng, area, limit) {
  const probe = rng.clone();
  for (let free = 0; free <= limit; free++) {
    if (isBattle(probe.next(), area)) return free;
  }
  return null;
}

/**
 * The index into `area.encounters` the RNG's next value picks.
 * @param {RNG} rng
 * @param {AreaData} area
 * @returns {number}
 */
export function encounterIndex(rng, area) {
  const count = area.encounters.length;
  const r3 = div32ulo(0x7fff, count);
  let index = div32ulo(rng.peek().rand, r3);
  while (index >= count) index--;
  return index;
}

/**
 * The encounter `rng` rolls in `area`, as a fight: the formation (with its champion value) and
 * the RNG positions around it. Doesn't move `rng`.
 * @param {RNG} rng
 * @param {AreaData} area
 */
export function rollEncounter(rng, area) {
  const index = encounterIndex(rng, area);
  const formation = area.encounters[index];
  return {
    ...createFight(area.name, { formation, champVal: championValue(formation) }, rng),
    encounterIndex: index,
  };
}

/**
 * Every battle in the next `iterations` RNG values. `rng` is advanced.
 *
 * `realistic` skips the value right after a battle: two adjacent battle values only ever show
 * the first, as the game doesn't check again until the fight is over. Keep it off with a
 * `partyLevel`.
 * @param {RNG} rng
 * @param {AreaData} area
 * @param {{ iterations: number, partyLevel?: number, realistic?: boolean }} options
 */
export function generateEncounters(rng, area, { iterations, partyLevel = 0, realistic = false }) {
  const encounters = [];
  for (let i = 0; i < iterations; i++) {
    if (isBattle(rng, area)) {
      const fight = { isBattleValue: battleValue(rng, area), ...rollEncounter(rng, area) };
      if (!isChampionSkip(fight.enemyGroup.formation, partyLevel)) encounters.push(fight);
      if (realistic) {
        rng.next();
        i++;
      }
    }
    rng.next();
  }
  return encounters;
}
