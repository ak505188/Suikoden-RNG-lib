// Outcome check for engine / search optimisations: runs a full bruteForce search (3 BonBon,
// two rounds, Run and every non-item Fight plan each round), hashes every result, alternative
// paths included, and times it. An optimisation must leave the hash unchanged.
//
// Usage: node scripts/searchCheck.js
// Exits 1 if the hash differs from EXPECTED_HASH. Update EXPECTED_HASH only for an intended
// change to how battles play out (and say so in the commit).
import { createHash } from 'node:crypto';
import Character from '../lib/Game/Battle/Character.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { bruteForce } from '../lib/Game/Battle/BruteForce.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';

const EXPECTED_HASH = 'eadff5438b07a168'; // branch-at-each-turn search: same results, paths found in a new order

const battle = new Battle({
  party: new PlayerParty([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.CLEO, CHARACTER_KEYS.TED].map(k => new Character(k))),
  enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
  rng: new RNG(0x30a82220).next(5419),
  escapable: true,
});
const t = performance.now();
const { results, stats } = bruteForce(battle, {
  maxRounds: 2,
  commands: [ROUND_COMMANDS.RUN, ROUND_COMMANDS.FIGHT],
  filter: ({ candidates }) => candidates.filter(a => a.type !== ACTION_TYPES.ITEM),
  finish: true,
  score: b => ({ drop: b.result.drop?.name ?? null, rng: b.rng.getCount(), log: b.log.entries.length }),
});
const ms = performance.now() - t;
const hash = createHash('sha256');
for (const r of results) hash.update(JSON.stringify([r.rounds, r.status, r.score, r.fights, r.frames, r.pathCount, [...r.paths()]]));
const digest = hash.digest('hex').slice(0, 16);
console.log(JSON.stringify({ hash: digest, stats }));
console.log(`${(ms / 1000).toFixed(2)}s, ${Math.round(stats.roundsPlayed / ms * 1000)} rounds/s`);
if (digest !== EXPECTED_HASH) {
  console.error(`MISMATCH: expected ${EXPECTED_HASH}`);
  process.exitCode = 1;
} else {
  console.log('Results match');
}
