import RNG from '../lib/rng.js';
import { characterLevelUps, generateCharacterMultipleLevelup } from '../lib/stats/growths.js';

// generate Valeria Starting SPD
const rng = new RNG(0xcdad925a);
const iterations = 26;
const valeriaStartingSPD = 20;

for (let i = 0; i < 1000; i++) {
  const spd = characterLevelUps('Valeria', 1, 26, rng.clone()).SPD + valeriaStartingSPD;
  console.log(i, spd, `0x${rng.getRNG().toString(16)}`);
  rng.next();
}

generateCharacterMultipleLevelup(rng.clone(), 'McDohl', 22, iterations).forEach(levelup => console.log(levelup));

function calculateCleoMgcGrowths(rng) {
  const cleoMagicGrowths = [];
  const goodIndexes = [];
  const r = new RNG(rng);
  for (let i = 0; i < 200; i++) {
    cleoMagicGrowths.push(characterLevelUp('Cleo', 5, r.clone()).MAG);
    r.next();
  }

  for (let i = 0; i < 193; i++) {
    if (cleoMagicGrowths[i] === 4 && cleoMagicGrowths[i+7] === 4) {
      goodIndexes.push(i);
    }
  }

  return goodIndexes;
}
