import { BATTLE_STATUS } from './Battle.js';
import { ROUND_COMMANDS } from './Actions.js';
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
 *   searching past a battle still in progress. Should depend on the battle's state only: a state
 *   reached again by another path is never asked about twice.
 * @property {(stats: BruteForceStats) => void} [onProgress] - called every `progressEvery` rounds played
 * @property {number} [progressEvery]
 */

/**
 * @typedef {Object} BruteForceStats
 * @property {number} roundsPlayed - every playTurn across every branch
 * @property {number} states - distinct in-progress states searched past
 * @property {number} merged - rounds that ended in a state (or ending) already found, whose
 *   future wasn't searched again
 * @property {number} recorded - distinct endings kept
 * @property {number} depth - rounds deep the search is right now
 */

/**
 * Tie-break cost of a path, for choosing between paths to the same state: fewer Fight rounds
 * first (each means inputting every member's action by hand), then fewer frames. Never part of
 * the score.
 * @typedef {{ fights: number, frames: number }} PathCost
 */

/**
 * @template S
 * @typedef {Object} BruteForceResult
 * @property {Round[]} rounds - the main path: the cheapest one to this ending
 * @property {BattleStatus} status
 * @property {S} score - of the battle the main path plays out
 * @property {number} fights - Fight rounds on the main path
 * @property {number} frames - frames the main path plays, from the starting battle
 * @property {number} pathCount - every path to this ending, the main one included
 * @property {() => Generator<Round[]>} paths - every path to this ending, main path first. They
 *   all reach the same state (and so the same drop and EXP), differing only in history.
 */

/**
 * One distinct state (between rounds, or an ending), with every way into it.
 * @typedef {Object} StateNode
 * @property {Edge[]} edges - in the order found; the cheapest is moved first once costed
 * @property {PathCost} [best] - cheapest cost from the starting battle
 * @property {number} [pathCount]
 */

/**
 * @typedef {Object} Edge
 * @property {StateNode} from
 * @property {Round} round
 * @property {PathCost} cost - of this round alone
 */

/** @param {Round} round */
const isFight = round => Array.isArray(round) || round.command === ROUND_COMMANDS.FIGHT;

/** @param {PathCost} a @param {PathCost} b */
const compareCost = (a, b) => a.fights - b.fights || a.frames - b.frames;

/**
 * Plays every combination of round inputs from `battle` (between rounds), depth-first, up to
 * `maxRounds` rounds, and scores each ending in one of the `record` statuses. Each branch plays
 * on its own clone, so `battle` itself is never touched. Which inputs are tried each round comes
 * from roundPlans, narrowed by the PlanOptions.
 *
 * Branches that reach the same state (Battle.stateKey) are merged: that state's future is
 * searched once, and every path into it is kept. Each ending is one result, with its cheapest
 * path (PathCost) as the main one, replayed from the start for scoring, and every other path
 * listed by `paths`.
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

  /** @type {BruteForceStats} */
  const stats = { roundsPlayed: 0, states: 0, merged: 0, recorded: 0, depth: 0 };
  /** @type {StateNode} */
  const root = { edges: [], best: { fights: 0, frames: 0 }, pathCount: 1 };
  /** @type {Map<string, StateNode>} in-progress states searched past */
  const states = new Map();
  /** @type {Map<string, StateNode & { status: BattleStatus }>} recorded endings */
  const endings = new Map();
  /** @type {Round[]} the path being searched, for prune */
  const rounds = [];

  /** @param {Battle} current @param {StateNode} node */
  const search = (current, node) => {
    for (const plan of roundPlans(current, planOptions)) {
      const next = current.clone();
      next.playTurn(plan);
      rounds.push(plan);
      stats.depth = rounds.length;
      if (++stats.roundsPlayed % progressEvery === 0) onProgress?.(stats);

      /** @type {Edge} */
      const edge = { from: node, round: plan, cost: { fights: isFight(plan) ? 1 : 0, frames: next.frames - current.frames } };
      if (next.status !== BATTLE_STATUS.IN_PROGRESS) {
        if (record.includes(next.status)) {
          const key = next.stateKey();
          const ending = endings.get(key);
          if (ending) {
            ending.edges.push(edge);
            stats.merged++;
          } else {
            endings.set(key, { edges: [edge], status: next.status });
            stats.recorded++;
          }
        }
      } else if (rounds.length < maxRounds && !prune?.(next, rounds)) {
        const key = next.stateKey();
        const seen = states.get(key);
        if (seen) {
          seen.edges.push(edge);
          stats.merged++;
        } else {
          /** @type {StateNode} */
          const child = { edges: [edge] };
          states.set(key, child);
          stats.states++;
          search(next, child);
        }
      }
      rounds.pop();
    }
  };

  search(battle, root);
  stats.depth = 0;

  /** @type {BruteForceResult<S>[]} */
  const results = [];
  for (const [key, ending] of endings) {
    const best = costNode(ending);
    const main = mainPath(ending);

    const replay = battle.clone();
    for (const round of main) replay.playTurn(round);
    if (replay.stateKey() !== key) {
      throw new Error('bruteForce: a merged path played out differently; Battle.stateKey is missing some state');
    }
    if (finish) replay.finish();
    const value = score(replay, main);
    if (value == null) continue;

    results.push({
      rounds: main,
      status: ending.status,
      score: value,
      fights: best.fights,
      frames: best.frames,
      pathCount: countPaths(ending),
      paths: () => allPaths(ending),
    });
  }
  stats.recorded = results.length;
  return { results, stats };
}

/**
 * The cheapest cost from the starting battle to `node`, moving the edge it comes through to the
 * front of node.edges (the first one found wins a tie). Every node on the way gets costed too.
 * @param {StateNode} node
 * @returns {PathCost}
 */
function costNode(node) {
  if (node.best) return node.best;
  let bestIndex = 0;
  /** @type {PathCost} */
  let best = null;
  node.edges.forEach((edge, i) => {
    const from = costNode(edge.from);
    const cost = { fights: from.fights + edge.cost.fights, frames: from.frames + edge.cost.frames };
    if (!best || compareCost(cost, best) < 0) {
      best = cost;
      bestIndex = i;
    }
  });
  node.edges.unshift(...node.edges.splice(bestIndex, 1));
  node.best = best;
  return best;
}

/**
 * Follows each node's cheapest edge (edges[0], once costed) back to the starting battle.
 * @param {StateNode} node
 * @returns {Round[]}
 */
function mainPath(node) {
  const path = [];
  for (let n = node; n.edges.length; n = n.edges[0].from) path.push(n.edges[0].round);
  return path.reverse();
}

/** @param {StateNode} node @returns {number} */
function countPaths(node) {
  node.pathCount ??= node.edges.reduce((sum, edge) => sum + countPaths(edge.from), 0);
  return node.pathCount;
}

/**
 * Every path from the starting battle to `node`. Taking edges[0] first at every step makes the
 * first one the main path.
 * @param {StateNode} node
 * @returns {Generator<Round[]>}
 */
function* allPaths(node) {
  if (!node.edges.length) {
    yield [];
    return;
  }
  for (const edge of node.edges) {
    for (const prefix of allPaths(edge.from)) yield [...prefix, edge.round];
  }
}
