// Brute-force search of the 3 BonBon Celadon Urn fight (test/battle.js), as a template for
// searching other fights: edit the fight, the plan filter and the score below. Every ending is
// saved to a SQLite file (lib/Search/ResultsDB.js), one run per invocation, then summarised.
//
// Usage: node scripts/bonbonSearch.js [--db output/bonbon.db]
//
// Query it afterwards, e.g. the fastest Celadon Urn endings:
//   sqlite3 -header output/bonbon.db "SELECT fights, frames, plan_count, summary FROM endings
//     WHERE run_id = (SELECT MAX(id) FROM runs) AND json_extract(score, '$.drop') = 'Celadon urn'
//     ORDER BY fights, frames LIMIT 10"
import { ACTION_TYPES, AREAS, Battle, CHARACTER_KEYS, Character, EnemyParty, ITEMS, ITEM_KEYS, PlayerParty, RNG, ROUND_COMMANDS, RUNE_TYPES } from '../battle.js';
import { bruteForce } from '../lib/Game/Battle/BruteForce.js';
import ResultsDB from '../lib/Search/ResultsDB.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbFlag = process.argv.indexOf('--db');
const DB_PATH = dbFlag >= 0 ? process.argv[dbFlag + 1] : 'output/bonbon.db';

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
 * @type {import('../battle.js').ActionFilter}
 */
const filter = ({ candidates }) => candidates;

/**
 * What's saved per ending (the score column, as JSON):
 *   drop, battleEnd (the RNG count the battle ended on, which decides the drop), rng (after the
 *   drop and level-up rolls), growths (each member's level-up stat gains, null if they didn't
 *   level), hp (after level-ups) and the Medicines left.
 * Query e.g. json_extract(score, '$.growths.Cleo.MGC') = 4.
 * @param {Battle} battle
 */
const score = battle => ({
  drop: battle.result.drop?.name ?? null,
  battleEnd: battle.result.rng.battleEnd.count,
  rng: battle.rng.getCount(),
  growths: Object.fromEntries(battle.party.combatants.map(c =>
    [c.name, battle.result.rewards.find(r => r.character === c)?.growths ?? null])),
  hp: Object.fromEntries(battle.party.combatants.map(c => [c.name, c.HP])),
  medicine: battle.party.combatants.reduce((n, c) => n + (c.inventory.get(ITEM_KEYS.MEDICINE)?.quantity ?? 0), 0),
});

// ---- Output ------------------------------------------------------------------------------
const start = makeBattle();
const names = start.party.combatants.map(c => c.name);
const enemyNames = start.enemies.combatants.map(e => e.label);

/**
 * A Rune action's name: a Command rune's own name (e.g. "Boar Rune"), or the spell cast.
 * @param {import('../battle.js').Action} action
 * @param {number} slot - whose action it is
 */
const runeName = (action, slot) => {
  const { rune } = start.party.combatants[slot];
  if (rune.type === RUNE_TYPES.COMMAND) return `${rune.name} Rune`;
  return rune.spells?.[action.slot ?? 0]?.name ?? `${rune.name} Rune slot ${action.slot ?? 0}`;
};

/** @param {import('../battle.js').Action} action @param {number} slot */
const formatAction = (action, slot) => {
  switch (action.type) {
    case ACTION_TYPES.ATTACK: return `Attack ${enemyNames[action.target]}`;
    case ACTION_TYPES.RUNE: return action.target === undefined ? runeName(action, slot) : `${runeName(action, slot)} -> ${enemyNames[action.target]}`;
    case ACTION_TYPES.ITEM: return `${ITEMS[action.itemKey].name} -> ${names[action.target] ?? 'all'}`;
    case ACTION_TYPES.UNITE: return `Unite ${action.uniteKey} -> ${enemyNames[action.target]}`;
    default: return action.type;
  }
};

/** @param {import('../battle.js').Action} action @param {number} slot */
const formatSlot = (action, slot) => action.unused ? `(any: never acted, e.g. ${formatAction(action, slot)})` : formatAction(action, slot);

/** @param {import('../battle.js').Round} round */
const formatRound = round => {
  if (!Array.isArray(round) && round.command !== ROUND_COMMANDS.FIGHT) return round.command;
  const actions = Array.isArray(round) ? round : round.actions;
  return actions.map((action, i) => `${names[i]}: ${formatSlot(action, i)}`).join(', ');
};

/** @param {import('../battle.js').Round[]} path */
const formatPath = path => path.map((round, r) => `R${r + 1} ${formatRound(round)}`).join('  |  ');

const settings = {
  fight: '3 BonBon (Gregminster area 1, encounter 1)',
  party: names,
  rng: { seed: '0x30a82220', advanced: 5419 },
  maxRounds: MAX_ROUNDS,
  commands: [ROUND_COMMANDS.RUN, ROUND_COMMANDS.FIGHT, ROUND_COMMANDS.FREE_WILL],
  unites: false,
  filter: 'every action, items included',
};

const t = Date.now();
const { results, stats } = bruteForce(start, {
  maxRounds: MAX_ROUNDS,
  commands: settings.commands,
  unites: settings.unites,
  filter,
  finish: true,
  score,
  progressEvery: 1000000,
  onProgress: s => console.error(`  ${s.roundsPlayed} rounds played, ${s.states} states, ${s.recorded} endings, `
    + `${Math.round(process.memoryUsage().heapUsed / 2 ** 20)} MB heap, ${((Date.now() - t) / 1000).toFixed(0)}s`),
});
const elapsedMs = Date.now() - t;
console.error(`Searched in ${(elapsedMs / 1000).toFixed(1)}s:`, stats);

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new ResultsDB(DB_PATH);
const runId = db.saveRun({ name: 'bonbonSearch', settings, stats, elapsedMs, results, summarise: formatPath });
console.log(`Saved run ${runId}: ${results.length} endings to ${DB_PATH}\n`);

// Per drop: how many endings and plans, and the fastest ending (fewest Fight rounds, then frames)
const drops = db.query(`
  SELECT json_extract(score, '$.drop') AS drop_name, COUNT(*) AS endings, SUM(plan_count) AS plans
  FROM endings WHERE run_id = ? GROUP BY drop_name ORDER BY drop_name IS NULL, drop_name`, runId);
for (const { drop_name, endings, plans } of drops) {
  const [best] = db.query(`
    SELECT fights, frames, json_extract(score, '$.rng') AS rng, summary FROM endings
    WHERE run_id = ? AND json_extract(score, '$.drop') IS ? ORDER BY fights, frames LIMIT 1`, runId, /** @type {string | null} */ (drop_name));
  console.log(`${drop_name ?? 'No drop'}: ${endings} endings, ${plans} plans`);
  console.log(`  fastest: ${best.fights} Fight round(s), ${best.frames} frames, RNG ${best.rng}`);
  console.log(`  ${best.summary}\n`);
}
db.close();
