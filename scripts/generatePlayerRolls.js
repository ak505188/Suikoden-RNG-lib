import { possibleR18s, simulateRoll } from './lib/chinchironin.js';
import RNG from './lib/rng.js';

const rng = new RNG(0x12);
// const rng = new RNG(0xa0af4f63);
const headers = ['Index', 'RNG', ...possibleR18s.map(r18 => r18.cursor)];
const rows = [];

for (let i = 0; i < 50000; i++) {
  const row = [rng.count, rng.getRNG().toString(16), ...possibleR18s.map(r18 => simulateRoll(r18.cursor, rng.clone()))];
  rows.push(row);
  rng.next();
}

console.log(headers.join());
for (const row of rows) console.log(row.join());
