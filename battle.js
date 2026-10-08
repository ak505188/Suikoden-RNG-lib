// suikoden-rng-lib/battle: the battle simulator's public API, for tools built on it (e.g.
// Suikoden-Battle-Search):
//   import { Battle, Character, PlayerParty, EnemyParty, AREAS, RNG } from 'suikoden-rng-lib/battle';
// A separate entry from index.js, so bundling the RNG tools doesn't pull in the battle engine.
// Anything not exported here is internal.

// The engine
export { default as Battle, BATTLE_STATUS, PHASE_STATE } from './lib/Game/Battle/Battle.js';
export { default as Character, exportCharacters, importCharacters } from './lib/Game/Battle/Character.js';
export { default as Enemy } from './lib/Game/Battle/Enemy.js';
export { default as QueenAntScript } from './lib/Game/Battle/Scripts/QueenAnt.js';
export { EnemyParty, PlayerParty } from './lib/Game/Battle/Party.js';
export { default as ActionLog, LOG_TYPES, formatRoll, rollMargin } from './lib/Game/Battle/ActionLog.js';
export { ACTION_TYPES, DEFAULT_ACTION, ROLL_KINDS, ROUND_COMMANDS, UNBALANCED_ACTION_TYPES } from './lib/Game/Battle/Actions.js';

// What the player can input each round
export {
  DEFAULT_COMMANDS,
  characterActions,
  fightPlans,
  fightStarts,
  roundPlans,
  roundStarts,
} from './lib/Game/Battle/ActionPlans.js';

// Game data
export { AREAS } from './lib/Game/Bestiary/Areas.js';
export { Areas as ENCOUNTER_AREAS } from './lib/lib.js'; // by name: walking encounter checks (Area.isBattle, battleFreeSteps)
export { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS, RUNE_KEYS, UNITE_KEYS } from './lib/Game/Keys.js';
export { ITEMS } from './lib/Game/Items.js';
export { RUNES, RUNE_TYPES } from './lib/Game/Magic/Runes.js';
export { STATUS } from './lib/Game/Constants.js';
export { default as RNG } from './lib/rng.js';

/** @typedef {import('./lib/Game/Battle/Actions.js').Action} Action */
/** @typedef {import('./lib/Game/Battle/Actions.js').Round} Round */
/** @typedef {import('./lib/Game/Battle/Actions.js').RoundCommandType} RoundCommandType */
/** @typedef {import('./lib/Game/Battle/Battle.js').BattleStatus} BattleStatus */
/** @typedef {import('./lib/Game/Battle/Battle.js').BattleResult} BattleResult */
/** @typedef {import('./lib/Game/Battle/ActionPlans.js').PlanOptions} PlanOptions */
/** @typedef {import('./lib/Game/Battle/ActionPlans.js').ActionFilter} ActionFilter */
/** @typedef {import('./lib/Game/Battle/ActionLog.js').LogEntry} LogEntry */
/** @typedef {import('./lib/Game/Battle/Actions.js').AttackRoll} AttackRoll */
/** @typedef {import('./lib/Game/Battle/ActionLog.js').RollRecord} RollRecord */
/** @typedef {import('./lib/Game/Battle/Character.js').CharacterJSON} CharacterJSON */
/** @typedef {import('./lib/Game/Keys.js').CharacterKey} CharacterKey */
/** @typedef {import('./lib/Game/Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('./lib/Game/Keys.js').ItemKey} ItemKey */
/** @typedef {import('./lib/Game/Keys.js').UniteKey} UniteKey */
/** @typedef {import('./lib/Game/Keys.js').RuneKey} RuneKey */
