// suikoden-rng-lib/encounters: random encounters while walking, for tools built on them:
//   import { AREAS, isBattle, rollEncounter, generateEncounters, EnemyParty, RNG } from 'suikoden-rng-lib/encounters';
// Every function takes an AREAS entry. A fight's drops come from its formation:
//   EnemyParty.fromFormation(fight.enemyGroup.formation).calculateDrops(rng, iterations)
// A separate entry from index.js and battle.js. Anything not exported here is internal.

export {
  battleFreeSteps,
  battleValue,
  championValue,
  encounterIndex,
  formationEnemies,
  generateEncounters,
  isBattle,
  isChampionSkip,
  rollEncounter,
} from './lib/Game/Encounters.js';
export { AREAS } from './lib/Game/Bestiary/Areas.js';
export { formationName } from './lib/Game/Bestiary/FormationNames.js';
export { ENEMY_KEYS } from './lib/Game/Keys.js';
export { EnemyParty } from './lib/Game/Battle/Party.js';
import { MULTIPLIER, INCREMENT } from './lib/rng.js';
export { default as RNG } from './lib/rng.js';
export const LCG = { MULTIPLIER, INCREMENT };

/** @typedef {import('./lib/Game/Bestiary/Areas.js').Area} AreaData */
/** @typedef {import('./lib/Game/Bestiary/Areas.js').Formation} Formation */
