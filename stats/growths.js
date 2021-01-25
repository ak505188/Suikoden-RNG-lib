import RNG from '../lib/rng.js';
import { Characters, getCharacterStatGrowth, getGrowthValue, LevelupStatOrder  } from './characters.js';

export function characterLevelUps(name, startingLevel, levelsGained, rng) {
  let level = startingLevel;
  const statGrowths = { 'PWR': 0, 'SKL': 0, 'DEF': 0, 'SPD': 0, 'MAG': 0, 'LCK': 0, 'HP': 0 };
  while (level++ < startingLevel + levelsGained) {
    const levelGrowths = characterLevelUp(name, level, rng);
    for (const [stat, growth] of Object.entries(levelGrowths)) {
      statGrowths[stat] += growth;
    }
  }
  return statGrowths;
}

export function characterLevelUp(name, level, rng) {
  const growths = Characters[name];
  const levelupGrowths = {};
  LevelupStatOrder.forEach(stat => {
    rng.next();
    const growthValue = getGrowthValue(name, stat, level);
    levelupGrowths[stat] = calculateLevelupGrowth(rng.getRNG2(), growthValue, stat === 'HP');
  });
  return levelupGrowths;
}

export function calculateLevelupGrowth(rngNormalized, growthValue, isHP = false) {
  const maxRNG = isHP ? rngNormalized & 0x1ff : rngNormalized & 0xff;
  return Math.floor((growthValue + maxRNG) / 256);
}

export function generateCharacterMultipleLevelup(rng, name, startingLevel, iterations) {
  const levelups = [];
  for (let i = 0; i < iterations; i++) {
    levelups.push(Object.values(characterLevelUp(name, startingLevel, rng)).toString());
  }
  return levelups;
}
