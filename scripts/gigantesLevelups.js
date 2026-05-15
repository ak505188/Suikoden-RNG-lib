import RNG from '../lib/rng.js';
import { generateLevelPermutations } from '../lib/lib.js';
import { generateCharacterMultipleLevelup } from '../stats/growths.js'

const party = [
  { name: 'McDohl', level: 24, levels_gained: 1 },
  { name: 'Gremio', level: 24, levels_gained: 1 },
  { name: 'Viktor', level: 24, levels_gained: 1 },
  { name: 'Cleo', level: 24, levels_gained: 1 },
  { name: 'Kirkis', level: 18, levels_gained: 2 },
  { name: 'Valeria', level: 27, levels_gained: 1 }
];

const start_index = 30000;
const end_index = 30150;

const STARTING_RNG = 0x12;

const base_rng = new RNG(STARTING_RNG).next(start_index);
const results = [];

for (let i = 0; i < (end_index - start_index); i++) {
  const level_ups = {};
  const rng = base_rng.cloneKeepIndex().next(i);
  for (const character of party) {
    const stats_gained = generateCharacterMultipleLevelup(rng, character.name, character.level, character.levels_gained)
      .reduce((total, stats) => {
        Object.entries(stats).forEach(([stat, value]) => {
          if (total[stat] == undefined) {
            total[stat] = value;
          } else {
            total[stat] += value
          }
        })
        return total;
      }, {});
    level_ups[character.name] = stats_gained;
  }
  results.push({ index: base_rng.count + i, characters: level_ups });
}

const good_results = results
  .filter(({ characters }) => characters.McDohl.MGC === 3 && characters.Cleo.MGC === 3 && characters.Kirkis.MGC >= 4)
  .map(({ characters, index }) => ({
      index,
      McDohl_PWR: characters.McDohl.PWR,
      McDohl_SPD: characters.McDohl.SPD,
      Cleo_SPD: characters.Cleo.SPD,
      Kirkis_MGC: characters.Kirkis.MGC,
      Viktor_SPD: characters.Viktor.SPD,
      Valeria_SPD: characters.Valeria.SPD,
  }));

console.log(JSON.stringify(good_results, null, 2));
