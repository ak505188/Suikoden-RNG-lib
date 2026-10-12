import RawWarData from './WarData.json' with { type: 'json' };
import { WAR_TYPE_ORDER } from './WarConstants.js';

/** @typedef {import('../Keys.js').WarCharacterKey} WarCharacterKey */
/** @typedef {import('../Keys.js').WarUnitKey} WarUnitKey */
/** @typedef {import('../Keys.js').WarScenarioKey} WarScenarioKey */
/** @typedef {import('./WarConstants.js').WarType} WarType */
/** @typedef {import('./WarConstants.js').WarResolver} WarResolver */

/**
 * @typedef {Object} WarCharacterData
 * @property {string} name
 * @property {number} id - The game's war ID (the index into its tables).
 * @property {WarType} type - Charge, Bow, Magic or Other.
 * @property {number} base - The power the unit gets when this is its first available member.
 * @property {number} extra - The power it adds when it isn't.
 * @property {number} soldiers - The soldiers it brings to the army.
 * @property {boolean} speaking - Whether it can comment in a banter event.
 */

/**
 * @typedef {Object} WarUnitData
 * @property {string} name
 * @property {number} id - The unit's index in the game's unit table.
 * @property {WarCharacterKey[]} members - In power order: the first available one sets the category.
 */

/**
 * @typedef {Object} WarEnemyAction
 * @property {WarType} type
 * @property {number} power
 * @property {string} name
 */

/**
 * @typedef {Object} WarScenarioData
 * @property {number} enemySoldiers
 * @property {number} soldiersPerSprite
 * @property {WarEnemyAction[]} actions
 * @property {[number, number][]} turns - Per turn of the cycle, the (min, max) range of action
 *   indexes the enemy picks from.
 * @property {number | null} turnLimit - The turn count at which the command menu ends the battle.
 * @property {boolean} gameOverOnLoss - Whether a defeat (or running out of units) is a game over.
 * @property {number} seed - The RNG seed the war starts from.
 * @property {WarResolver} resolver
 */

/** @type {Record<WarCharacterKey, WarCharacterData>} */
export const WAR_CHARACTERS = /** @type {any} */ (RawWarData.characters);

/** @type {Record<WarUnitKey, WarUnitData>} */
export const WAR_UNITS = /** @type {any} */ (RawWarData.units);

/** @type {Record<WarScenarioKey, WarScenarioData>} */
export const WAR_SCENARIOS = /** @type {any} */ (RawWarData.scenarios);

/** Every war character in war-ID order (the index is the ID). */
export const WAR_CHARACTER_LIST = /** @type {WarCharacterKey[]} */ (
  Object.keys(WAR_CHARACTERS).sort((a, b) => WAR_CHARACTERS[a].id - WAR_CHARACTERS[b].id)
);

/** Every war unit in unit-table order (the index is the unit's ID). */
export const WAR_UNIT_LIST = /** @type {WarUnitKey[]} */ (
  Object.keys(WAR_UNITS).sort((a, b) => WAR_UNITS[a].id - WAR_UNITS[b].id)
);

/** The index of a war type in the game's command order (Charge 0, Bow 1, Magic 2, Other 3). */
export const typeIndex = (/** @type {WarType} */ type) => WAR_TYPE_ORDER.indexOf(type);
