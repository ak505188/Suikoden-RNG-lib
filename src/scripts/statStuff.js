import RNG from '../lib/rng.js';
import { characterLevelUp, characterLevelUps, generateCharacterMultipleLevelup } from '../lib/stats/growths.js';

// generate Valeria Starting SPD
// const rng = new RNG(0xcdad925a);
// const iterations = 26;
// const valeriaStartingSPD = 20;

// for (let i = 0; i < 1000; i++) {
//   const spd = characterLevelUps('Valeria', 1, 26, rng.clone()).SPD + valeriaStartingSPD;
//   console.log(i, spd, `0x${rng.getRNG().toString(16)}`);
//   rng.next();
// }

const characters = ['McDohl', 'Cleo', 'Viktor'];
const rng = 0x172abe94

// console.log(`0x${rng.toString(16)}`);
// characters.forEach(character => {
//   generateCharacterMultipleLevelup(new RNG(rng), character, 8, 12).forEach((levelup, index) => console.log(character + ',' + ++index + ',' + levelup));
// });

function calculateCleoMgcGrowths(rng) {
  const cleoMagicGrowths = [];
  const goodIndexes = [];
  const r = new RNG(rng);
  for (let i = 0; i < 400; i++) {
    cleoMagicGrowths.push(characterLevelUp('Cleo', 5, r.clone()).MAG);
    r.next();
  }

  for (let i = 0; i < 393; i++) {
    if (cleoMagicGrowths[i] === 4 && cleoMagicGrowths[i+7] === 4) {
      goodIndexes.push(18651 + i);
    }
  }

  return goodIndexes;
}

console.log(calculateCleoMgcGrowths(0x172abe94));
const cleoRNG = new RNG(0x3310ce22);
const levelups = [];
for (let i = 0; i < 200; i++) {
  const levelUp = characterLevelUp('Cleo', 4, cleoRNG.clone());
  if (levelUp.MAG === 4) {
    levelups.push([i, cleoRNG.getRNG().toString(16)]);
  }
  cleoRNG.next();
}

// console.log(levelups);
