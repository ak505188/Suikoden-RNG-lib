import RNG from '../lib/rng.js';
import { possibleR18s, simulateRoll } from '../lib/chinchironin.js';

console.log('rng,' + possibleR18s.map(r18 => r18.r18).join());
const rng = new RNG(0xA0AF4F63);
for (let i = 0; i < 3600; i++) {
  let str = `0x${rng.getRNG().toString(16)},`
  for (const r18 of possibleR18s) {
    const rngClone = new RNG(rng.rng);
    str += simulateRoll(r18.cursor, rngClone) + ',';
  }
  console.log(str);
  rng.next();
}
