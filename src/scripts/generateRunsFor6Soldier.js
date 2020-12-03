import RNG from '../lib/rng.js';

const startingIndex = 0;
const rng = new RNG(0x12).next(startingIndex);
const KuromimiAdvancement = 23 * 7;

for (let i = 0; i < 50000; i++) {
  const rngStr = `0x${rng.getRNG().toString(16)}`;
  const index = rng.count;
  const run = RNG.isRun(rng.getNext().rng2);
  const runAfterKuromimi = RNG.isRun(rng.getNext(KuromimiAdvancement + 1).rng2);
  console.log(`${index}, ${rngStr}, ${run}, ${runAfterKuromimi}`);
  rng.next();
}

function rngToStr(rng) {
  return `0x${rng.toString(16)}`;
}
