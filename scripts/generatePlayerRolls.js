import { CURSOR_POSITIONS, Cursor, possibleR18s, simulateRoll } from '../lib/chinchironin.js';
import RNG from '../lib/rng.js';

const rng = new RNG(0x12);
// const rng = new RNG(0xa0af4f63);
const headers = ['Index', 'RNG', ...possibleR18s.map((r18) => r18.cursor)];

/** A Cursor stopped at cursor position `pos` (its getValue() is that position's r18). @param {number} pos */
const cursorAt = (pos) => {
  const cursor = new Cursor();
  cursor.index = CURSOR_POSITIONS.indexOf(pos);
  return cursor;
};
const cursors = possibleR18s.map((r18) => cursorAt(r18.cursor));
const rows = [];

for (let i = 0; i < 50000; i++) {
  const row = [
    rng.count,
    rng.raw.toString(16),
    ...cursors.map((cursor) => simulateRoll(cursor, rng.clone()).roll),
  ];
  rows.push(row);
  rng.next();
}

console.log(headers.join());
for (const row of rows) console.log(row.join());
