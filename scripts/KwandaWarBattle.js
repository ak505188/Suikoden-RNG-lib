// Kwanda's war battle (Panna Yakuta): every way to win it in N rounds using only matchups that
// tie or win. The enemy's action is known at the start of each turn, so a losing unit is never
// tried.
//
//   node scripts/KwandaWarBattle.js [--rounds 3] [--seed 0x43] [--top 20]
//
// The roster is the savestate's (5625 soldiers). Only Charge, Bow and Magic rounds are tried: no
// Others command (Strategists, Thieves, ...) is used.
import { parseArgs } from 'node:util';
import {
  MATCHUP,
  WAR_CHARACTER_KEYS,
  WAR_OUTCOMES,
  WAR_SCENARIO_KEYS,
  WAR_TYPES,
  WarBattle,
} from '../war.js';
import { formatResults, searchWar } from './WarSearch.js';

const { values } = parseArgs({
  options: {
    rounds: { type: 'string', default: '3' },
    seed: { type: 'string' },
    top: { type: 'string', default: '20' },
  },
});
const rounds = Number(values.rounds);
const seed = values.seed === undefined ? undefined : Number(values.seed);

const K = WAR_CHARACTER_KEYS;
const RECRUITED = [
  K.MCDOHL,
  K.CLEO,
  K.PAHN,
  K.EILEEN,
  K.VIKTOR,
  K.CAMILLE,
  K.VARKAS,
  K.SYDONIA,
  K.HUMPHREY,
  K.MATHIU,
  K.TAI_HO,
  K.YAM_KOO,
  K.LUC,
  K.LEPANT,
  K.GREMIO,
  K.GIOVANNI,
  K.KRIN,
  K.JUPPO,
  K.KIRKIS,
  K.VALERIA,
  K.KUROMIMI,
  K.ROCK,
  K.SERGEI,
  K.VIKI,
];

const { results, stats } = searchWar({
  start: () => WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: RECRUITED, seed }),
  candidates: (war) =>
    [WAR_TYPES.CHARGE, WAR_TYPES.BOW, WAR_TYPES.MAGIC]
      .flatMap((type) => war.units(type))
      .filter((unit) => war.matchup(unit) !== MATCHUP.LOSE),
  isGoal: (war) => war.outcome === WAR_OUTCOMES.VICTORY,
  maxCommands: rounds,
});

console.log(formatResults(results, Number(values.top)));
console.log(
  `${results.length} wins in at most ${rounds} rounds; ${stats.commands} rounds simulated in ` +
    `${(stats.ms / 1000).toFixed(1)}s (${(stats.ms / stats.commands).toFixed(1)} ms each)`,
);
