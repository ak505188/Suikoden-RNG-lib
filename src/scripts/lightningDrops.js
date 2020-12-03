import { Areas } from '../lib/lib.js';
import { characterLevelUps, generateCharacterMultipleLevelup } from '../lib/stats/growths.js';
import RNG from '../lib/rng.js';

function generateLucStatsForLightningDrops() {
  const startingIndex = 15001;
  const startingRNG = 0x573557cb;
  const rng = new RNG(startingRNG);

  const startingSPD = 16 + 15;
  const startingMAG = 27 + 15;
  for (let i = 0; i < 2000; i++) {
    const drop = Areas.Bosses.encounterTable[1].calculateDrop(rng.clone());
    if (drop === 'Lightning Rune') {
      const currentRNG = new RNG(rng.getNext(114).rng);
      const stats = characterLevelUps('Luc', 1, 11, currentRNG);
      console.log(startingIndex + i, `0x${rng.getRNG().toString(16)}`, stats.SPD + startingSPD, stats.MAG + startingMAG);
    }
    rng.next();
  }
}

generateLucStatsForLightningDrops()
// generateCharacterMultipleLevelup(new RNG(0x29b3e2a9), 'McDohl', 22, 9).forEach(levelup => console.log(levelup));

