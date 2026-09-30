// Brute-force search of the 3 BonBon Celadon Urn fight (test/battle.js), as a template for
// searching other fights: edit the fight, the plan filter and the score below.
//
// Usage: node scripts/bonbonSearch.js [--drops-only] [--main-only]
//   --drops-only  only list endings that drop something
//   --main-only   list each ending's main path, not its alternatives
import Character from '../lib/Game/Battle/Character.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { bruteForce } from '../lib/Game/Battle/BruteForce.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import { ITEMS } from '../lib/Game/Items.js';
import RNG from '../lib/rng.js';

const DROPS_ONLY = process.argv.includes('--drops-only');
const MAIN_ONLY = process.argv.includes('--main-only');

// ---- The fight ---------------------------------------------------------------------------
const makeBattle = () => new Battle({
  party: new PlayerParty([
    CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.CLEO, CHARACTER_KEYS.TED,
  ].map(key => new Character(key))),
  enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
  rng: new RNG(0x30a82220).next(5419),
  escapable: true,
});

// ---- The search --------------------------------------------------------------------------
const MAX_ROUNDS = 2;

/**
 * Every action, items included, every round. Run is planned alongside the Fight plans (see
 * `commands`). Narrow the candidates here to shrink the search.
 * @type {import('../lib/Game/Battle/ActionPlans.js').ActionFilter}
 */
const filter = ({ candidates }) => candidates;

/** @param {Battle} battle */
const score = battle => ({
  drop: battle.result.drop?.name ?? null,
  rng: battle.rng.getCount(), // after the drop and level-up rolls
});

// ---- Output ------------------------------------------------------------------------------
const start = makeBattle();
const names = start.party.combatants.map(c => c.name);
const enemyNames = start.enemies.combatants.map(e => e.label);

/** @param {import('../lib/Game/Battle/Actions.js').Action} action */
const formatAction = action => {
  switch (action.type) {
    case ACTION_TYPES.ATTACK: return `Attack ${enemyNames[action.target]}`;
    case ACTION_TYPES.RUNE: return action.target === undefined ? `Rune ${action.slot ?? 0}` : `Rune ${action.slot ?? 0} -> ${enemyNames[action.target]}`;
    case ACTION_TYPES.ITEM: return `${ITEMS[action.itemKey].name} -> ${names[action.target] ?? 'all'}`;
    case ACTION_TYPES.UNITE: return `Unite ${action.uniteKey} -> ${enemyNames[action.target]}`;
    default: return action.type;
  }
};

/** @param {import('../lib/Game/Battle/Actions.js').Round} round */
const formatRound = round => {
  if (!Array.isArray(round) && round.command !== ROUND_COMMANDS.FIGHT) return round.command;
  const actions = Array.isArray(round) ? round : round.actions;
  return actions.map((action, i) => `${names[i]}: ${formatAction(action)}`).join(', ');
};

/** Frames a path plays from the start, by replaying it. @param {import('../lib/Game/Battle/Actions.js').Round[]} path */
const framesOf = path => {
  const battle = makeBattle();
  path.forEach(round => battle.playTurn(round));
  return battle.frames;
};

const t = Date.now();
const { results, stats } = bruteForce(start, {
  maxRounds: MAX_ROUNDS,
  commands: [ROUND_COMMANDS.RUN, ROUND_COMMANDS.FIGHT],
  unites: false,
  filter,
  finish: true,
  score,
  progressEvery: 100000,
  onProgress: s => console.error(`  ${s.roundsPlayed} rounds played, ${s.states} states, ${s.recorded} endings, `
    + `${Math.round(process.memoryUsage().heapUsed / 2 ** 20)} MB heap, ${((Date.now() - t) / 1000).toFixed(0)}s`),
});
console.error(`Searched in ${((Date.now() - t) / 1000).toFixed(1)}s:`, stats);

// Drops first, then fewer Fight rounds, then fewer frames
const shown = results
  .filter(r => !DROPS_ONLY || r.score.drop)
  .sort((a, b) => Number(!a.score.drop) - Number(!b.score.drop) || a.fights - b.fights || a.frames - b.frames);

console.log(`${shown.length} endings${DROPS_ONLY ? ' with a drop' : ''} (of ${results.length})\n`);
for (const result of shown) {
  console.log(`${result.score.drop ?? 'No drop'} | RNG ${result.score.rng} | ${result.fights} Fight round(s), ${result.frames} frames | ${result.pathCount} path(s)`);
  const paths = MAIN_ONLY ? [result.rounds] : [...result.paths()];
  paths.forEach((path, i) => {
    const frames = i === 0 ? result.frames : framesOf(path);
    console.log(`  ${i === 0 ? 'main' : 'alt '} ${String(frames).padStart(5)}f  ${path.map((round, r) => `R${r + 1} ${formatRound(round)}`).join('  |  ')}`);
  });
  console.log();
}
