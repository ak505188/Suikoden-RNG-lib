// suikoden-rng-lib/war: the war battle simulator (the army-vs-army fights), for tools built on it:
//   import { WarBattle, WAR_SCENARIO_KEYS, WAR_UNIT_KEYS, WAR_TYPES } from 'suikoden-rng-lib/war';
// A separate entry from index.js and battle.js. Anything not exported here is internal.

export { default as WarBattle } from './lib/Game/War/WarBattle.js';
export { WAR_CHARACTER_KEYS, WAR_SCENARIO_KEYS, WAR_UNIT_KEYS } from './lib/Game/Keys.js';
export {
  MATCHUP,
  THIEF_RESULTS,
  WAR_OUTCOMES,
  WAR_RESOLVERS,
  WAR_TYPES,
} from './lib/Game/War/WarConstants.js';
export { WAR_CHARACTERS, WAR_SCENARIOS, WAR_UNITS } from './lib/Game/War/WarData.js';
export { default as RNG } from './lib/rng.js';

/** @typedef {import('./lib/Game/Keys.js').WarCharacterKey} WarCharacterKey */
/** @typedef {import('./lib/Game/Keys.js').WarUnitKey} WarUnitKey */
/** @typedef {import('./lib/Game/Keys.js').WarScenarioKey} WarScenarioKey */
/** @typedef {import('./lib/Game/War/WarBattle.js').WarCommandResult} WarCommandResult */
/** @typedef {import('./lib/Game/War/WarBattle.js').WarCommandOptions} WarCommandOptions */
/** @typedef {import('./lib/Game/War/WarConstants.js').WarType} WarType */
/** @typedef {import('./lib/Game/War/WarConstants.js').WarOutcome} WarOutcome */
