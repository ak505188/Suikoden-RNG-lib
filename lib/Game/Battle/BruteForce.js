import { BATTLE_STATUS } from './Battle.js';
import { roundPlans } from './ActionPlans.js';

/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Battle.js').BattleStatus} BattleStatus */
/** @typedef {import('./Actions.js').Round} Round */
/** @typedef {import('./ActionPlans.js').PlanOptions} PlanOptions */

/**
 * Scores one finished battle. Return null / undefined to discard it.
 * @template S
 * @callback BattleScorer
 * @param {Battle} battle - a battle that ended; finish() has run if `finish` was set
 * @param {Round[]} rounds - the round inputs that got there, from the starting battle
 * @returns {S | null | undefined}
 */

/**
 * @template S
 * @typedef {Object} BruteForceOptions
 * @property {number} maxRounds - rounds to play past the starting battle before giving up on a branch
 * @property {BattleStatus[]} [record] - which endings to score (default: only wins)
 * @property {BattleScorer<S>} [score] - default: every recorded ending, scored as its status
 * @property {boolean} [finish] - run finish() (drop, EXP) before scoring (default false)
 * @property {(battle: Battle, rounds: Round[]) => boolean} [prune] - return true to stop
 *   searching past a battle still in progress
 * @property {(stats: BruteForceStats) => void} [onProgress] - called every `progressEvery` rounds played
 * @property {number} [progressEvery]
 */

/**
 * @typedef {Object} BruteForceStats
 * @property {number} roundsPlayed - every playTurn across every branch
 * @property {number} recorded - endings kept
 * @property {number} depth - rounds deep the search is right now
 */

/**
 * @template S
 * @typedef {Object} BruteForceResult
 * @property {Round[]} rounds
 * @property {BattleStatus} status
 * @property {S} score
 */

/**
 * Plays every combination of round inputs from `battle` (between rounds), depth-first, up to
 * `maxRounds` rounds, and scores each branch that ends in one of the `record` statuses. Each
 * branch plays on its own clone, so `battle` itself is never touched. Which inputs are tried
 * each round comes from roundPlans, narrowed by the PlanOptions.
 * @template S
 * @param {Battle} battle
 * @param {BruteForceOptions<S> & PlanOptions} options
 * @returns {{ results: BruteForceResult<S>[], stats: BruteForceStats }}
 */
export function bruteForce(battle, options) {
  const {
    maxRounds,
    record = [BATTLE_STATUS.WON],
    score = (/** @type {Battle} */ b) => /** @type {any} */ (b.status),
    finish = false,
    prune,
    onProgress,
    progressEvery = 10000,
    ...planOptions
  } = options;
  if (battle.status !== BATTLE_STATUS.IN_PROGRESS) throw new Error(`bruteForce: battle is already over (${battle.status})`);

  /** @type {BruteForceResult<S>[]} */
  const results = [];
  /** @type {BruteForceStats} */
  const stats = { roundsPlayed: 0, recorded: 0, depth: 0 };
  /** @type {Round[]} */
  const rounds = [];

  /** @param {Battle} current */
  const search = (current) => {
    for (const plan of roundPlans(current, planOptions)) {
      const next = current.clone();
      next.playTurn(plan);
      rounds.push(plan);
      stats.depth = rounds.length;
      if (++stats.roundsPlayed % progressEvery === 0) onProgress?.(stats);

      if (next.status !== BATTLE_STATUS.IN_PROGRESS) {
        if (record.includes(next.status)) {
          if (finish) next.finish();
          const value = score(next, rounds);
          if (value != null) {
            results.push({ rounds: [...rounds], status: next.status, score: value });
            stats.recorded++;
          }
        }
      } else if (rounds.length < maxRounds && !prune?.(next, rounds)) {
        search(next);
      }
      rounds.pop();
    }
  };

  search(battle);
  stats.depth = 0;
  return { results, stats };
}
