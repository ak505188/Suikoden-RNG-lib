// Exhaustive permutation search over party actions (attack/defend) for the
// solo Zombie Dragon boss fight, for a fixed starting RNG value + party.
//
// This generalizes the by-hand RNG-index searching already done in
// characterLevelups.js (there: which level-up ordering gets a desired
// outcome) to full battles: here, which combination of attack/defend choices
// - for each party member, for each of their first N turns - produces the
// best outcome, as judged by a caller-supplied scorer.
//
// Enemy behavior and turn order are fully RNG-determined for a fixed seed,
// so only player action choices vary across permutations.
import RNG from '../lib/rng.js';
import Character from '../lib/Game/Combat/Characters/Character.js';
import { CHARACTERS } from '../lib/Game/Combat/Characters/Characters.js';
import Enemy from '../lib/Game/Combat/Battle/Enemy.js';
import Battle from '../lib/Game/Combat/Battle/Battle.js';
import { enemies } from '../lib/enemies.js';

const STARTING_RNG = 0x12345678;
const PARTY_NAMES = ['MCDOHL', 'GREMIO', 'VIKTOR', 'CLEO', 'TAI_HO', 'CAMILLE'];
const TURNS_TO_VARY = 2; // per party member; later turns default to 'attack'
const MAX_ROUNDS = 5;

const ACTIONS = ['attack', 'defend'];

function buildParty() {
  return PARTY_NAMES.map(name => new Character(CHARACTERS[name]));
}

function buildDragon() {
  return new Enemy('ZombieDragon', enemies['Bosses'].enemies.ZombieDragon);
}

// Enumerates every ACTIONS^(party.length * TURNS_TO_VARY) combination as a
// flat array of choices, matching the recursive-helper style of
// generateLevelPermutations in lib/lib.js.
function generateActionPermutations(slotCount) {
  const result = [];

  function helper(index, current) {
    if (index === slotCount) {
      result.push([...current]);
      return;
    }
    for (const action of ACTIONS) {
      current.push(action);
      helper(index + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return result;
}

function actionPlanFromChoices(party, choices) {
  // choices is flat: [char0turn0, char0turn1, ..., char1turn0, ...]
  return (character, turnIndex) => {
    if (turnIndex >= TURNS_TO_VARY) return 'attack';
    const charIndex = party.indexOf(character);
    return choices[charIndex * TURNS_TO_VARY + turnIndex];
  };
}

// Default scorer: prefer permutations where the most party members survive,
// tie-broken by lowest Dragon HP remaining (most progress toward a kill).
// Swap this out for whatever the actual goal of a given search is (fastest
// kill, a specific character living, ending RNG in some range, etc.) -
// that's the ad-hoc part `scripts/characterLevelups.js` does by hand today.
function score(result, party, dragon) {
  const survivors = party.filter(character => character.isAlive).length;
  return { survivors, dragonHP: dragon.currentHP };
}

function isBetter(a, b) {
  if (a.survivors !== b.survivors) return a.survivors > b.survivors;
  return a.dragonHP < b.dragonHP;
}

const slotCount = PARTY_NAMES.length * TURNS_TO_VARY;
const permutations = generateActionPermutations(slotCount);

let best = null;
let bestChoices = null;

for (const choices of permutations) {
  const party = buildParty();
  const dragon = buildDragon();
  const rng = new RNG(STARTING_RNG);

  const battle = new Battle({
    party,
    enemies: [dragon],
    rng,
    actionPlan: actionPlanFromChoices(party, choices),
  });
  const result = battle.run(MAX_ROUNDS);

  const thisScore = score(result, party, dragon);
  if (best === null || isBetter(thisScore, best)) {
    best = thisScore;
    bestChoices = choices;
  }
}

console.log(`Searched ${permutations.length} permutations.`);
console.log('Best score:', best);
console.log(
  'Best action plan (per character, first',
  TURNS_TO_VARY,
  'turns):',
  PARTY_NAMES.map((name, i) => [name, bestChoices.slice(i * TURNS_TO_VARY, (i + 1) * TURNS_TO_VARY)])
);
