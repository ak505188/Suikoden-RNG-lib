// suikoden-rng-lib: the RNG tools. The battle simulator has its own entry, suikoden-rng-lib/battle
// (battle.js). Anything not exported from an entry point is internal.
export { default as RNG, simulateAssassinFight, simulateAssassinTurn, determineAssassinMove } from './lib/rng.js';
export { Areas } from './lib/lib.js';
export { default as Helpers } from './lib/lib.js';

export {
  CURSOR_POSITIONS,
  Cursor,
  calculateWait,
  simulateRoll,
  isValidTaiHoRoll,
  simulateOpponentRollsFromGameStart,
  simulateOpponentRoll,
} from './lib/chinchironin.js';

export { default as Area } from './lib/Area/Area.js';
export { default as Kaku } from './lib/Kaku/Kaku.js';

// Character stats and level-up growths
export {
  Characters,
  StatGrowths,
  HPGrowths,
  LevelupStatOrder,
  getCharacterStatGrowths,
  getCharacterStatGrowth,
  getGrowthValue,
} from './stats/characters.js';
export {
  characterLevelUps,
  characterLevelUp,
  calculateLevelupGrowth,
  generateCharacterMultipleLevelup,
} from './stats/growths.js';

// Duels (McDohl vs Kwanda, McDohl vs Teo, Pahn vs Teo)
export {
  default as Duel,
  DUELS,
  DUEL_KEYS,
  DUEL_MOVES,
  DUEL_MOVE_NAMES,
  DUEL_SIDES,
  DUEL_HITS,
  DUEL_RESULTS,
  DUEL_COUNTER,
  DUEL_OUTCOME_HITS,
  duelEnemyMove,
  duelHitDamage,
  duelistFromCharacter,
} from './lib/Game/Duel.js';
