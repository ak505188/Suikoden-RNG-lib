// A framework for brute-forcing war battles (see KwandaWarBattle.js for a search built on it).
// The game's rules live in the library (lib/Game/War); this is search strategy only: a depth-first
// search over the commands of each turn, branching on a clone of the battle.
//
// A search is described by a `setup`:
//   start:      () => WarBattle         a fresh battle at the first command menu
//   candidates: (war) => WarUnitKey[]   the commands worth trying this turn (the enemy's action is
//                                       already known, so a filter can use war.matchup(unit))
//   isGoal:     (war) => boolean        a battle that counts as a result (checked after every command)
//   maxCommands: number                 the deepest path tried
// Results are ordered by `compareResults`: fewest commands, then fewest sprite frames.

/** @typedef {import('../war.js').WarBattle} WarBattle */
/** @typedef {import('../war.js').WarUnitKey} WarUnitKey */

/**
 * @typedef {Object} WarSearchSetup
 * @property {() => WarBattle} start
 * @property {(war: WarBattle) => WarUnitKey[]} candidates
 * @property {(war: WarBattle) => boolean} isGoal
 * @property {number} maxCommands
 */

/**
 * @typedef {Object} WarSearchResult
 * @property {WarUnitKey[]} path - The commands, in order.
 * @property {number} frames - Sprite frames of the round animations, summed.
 * @property {number} playerSoldiers
 * @property {number} enemySoldiers
 * @property {number} randCount - rand() calls since the seed.
 * @property {string} rng - The seed after the last command.
 * @property {import('../war.js').WarOutcome | null} outcome
 */

/**
 * @typedef {Object} WarSearchStats
 * @property {number} commands - Commands simulated (each one a clone plus a command).
 * @property {number} ms
 */

/**
 * Searches every path of at most `maxCommands` commands, taking `candidates` at each turn.
 * @param {WarSearchSetup} setup
 * @returns {{results: WarSearchResult[], stats: WarSearchStats}}
 */
export function searchWar({ start, candidates, isGoal, maxCommands }) {
  /** @type {WarSearchResult[]} */
  const results = [];
  const stats = { commands: 0, ms: 0 };
  const began = performance.now();

  /** @param {WarBattle} war @param {WarUnitKey[]} path @param {number} frames */
  const visit = (war, path, frames) => {
    if (path.length >= maxCommands || war.outcome) return;
    for (const unit of candidates(war)) {
      const next = war.clone();
      const { frames: used } = next.use(unit);
      stats.commands++;
      const nextPath = [...path, unit];
      if (isGoal(next)) {
        results.push({
          path: nextPath,
          frames: frames + used,
          playerSoldiers: next.playerSoldiers,
          enemySoldiers: next.enemySoldiers,
          randCount: next.rng.count,
          rng: `0x${next.rng.raw.toString(16).padStart(8, '0')}`,
          outcome: next.outcome,
        });
      }
      visit(next, nextPath, frames + used);
    }
  };

  visit(start(), [], 0);
  stats.ms = performance.now() - began;
  return { results: results.sort(compareResults), stats };
}

/** Fewest commands first, then fewest frames. @param {WarSearchResult} a @param {WarSearchResult} b */
export const compareResults = (a, b) => a.path.length - b.path.length || a.frames - b.frames;

/** @param {WarSearchResult[]} results @param {number} [top] */
export function formatResults(results, top = results.length) {
  return results
    .slice(0, top)
    .map(
      (r, i) =>
        `${String(i + 1).padStart(3)}. ${r.path.length} cmds, ${String(r.frames).padStart(5)} frames, ` +
        `${r.playerSoldiers} left, rand ${r.randCount}, ${r.rng}: ${r.path.join(' > ')}`,
    )
    .join('\n');
}
