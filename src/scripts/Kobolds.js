import RNG from '../lib/rng.js';
import { characterLevelUps, generateCharacterMultipleLevelup } from '../lib/stats/growths.js';

// generate Valeria Starting SPD
const rng = new RNG(0xcdad925a);
const iterations = 26;
const valeriaStartingSPD = 20;

// for (let i = 0; i < 1000; i++) {
//   const spd = characterLevelUps('Valeria', 1, 26, rng.clone()).SPD + valeriaStartingSPD;
//   console.log(i, spd, `0x${rng.getRNG().toString(16)}`);
//   rng.next();
// }

// generateCharacterMultipleLevelup(rng.clone(), 'McDohl', 22, iterations).forEach(levelup => console.log(levelup));

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

// const characters = ['McDohl', 'Viktor', 'Gremio', 'Cleo'];
// const rngValues = [0xfa0cd6ce, 0x5ca391da, 0xc627d846, 0x5c13aa1e, 0xcd6dc62b, 0x86688018, 0x3d1f8564, 0x3d1f8564, 0xcd6d6f91];

// rngValues.forEach(value => {
//   const rng = new RNG(value);
//   console.log(`0x${value.toString(16)}`);
//   characters.forEach(character => {
//     const r = rng.clone();
//     console.log(Object.values(characterLevelUps(character, 12, 10, r)).join());
//     console.log(Object.values(characterLevelUps(character, 12, 10, r)).join());
//     console.log(Object.values(characterLevelUps(character, 12, 10, r)).join());
//     console.log(Object.values(characterLevelUps(character, 12, 10, r)).join());
//   });
// });

const characters = ['McDohl', 'Viktor', 'Gremio', 'Cleo'];
const rngValues = [0x70566a06, new RNG(0x70566a06).getNext(2).rng]

rngValues.forEach(value => {
  const rng = new RNG(value);
  console.log(`0x${value.toString(16)}`);
  characters.forEach(character => {
    const r = rng.clone();
    console.log(Object.values(characterLevelUps(character, 8, 3, r)).join());
    console.log(Object.values(characterLevelUps(character, 8, 3, r)).join());
    console.log(Object.values(characterLevelUps(character, 8, 3, r)).join());
    console.log(Object.values(characterLevelUps(character, 8, 3, r)).join());
  });
});
