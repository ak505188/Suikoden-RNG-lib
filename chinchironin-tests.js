import {
  Cursor,
  getStandardRoll,
  getStandardRollDie,
  getStandardRollFull,
  isTripleWin,
  isDoubleWin,
  isTripleLose,
  isDoubleLose,
  isPiss,
  isValidTaiHoRoll,
  possibleR18s,
  possibleCursors,
  possibleCursorsOrderedAfterWaitTime,
  simulateRoll,
} from './lib/chinchironin.js';
import RNG from './lib/rng.js';

function calculateWait(rng) {
  rng = rng.next();
  return rng.getRNG2() % 100;
}

function calculateRoll(rng, wait) {
  let cursor = new Cursor()
  wait = wait == 0 ? 255 : wait - 1;
  do {
    cursor.next()
    rng.next()
  } while (cursor.pos != 203);
  for (let i = wait; i > 0; i--) {
    cursor.next()
    rng.next();
  }
  // console.log(`After Wait Cursor:${cursor.pos} RNG:${rng.getRNG().toString(16)} Index:${rng.getCount()}`);
  while (true) {
    const roll = simulateRoll(cursor.pos, rng);
    // console.log(`Roll:${roll} RNG:${rng.getRNG().toString(16)} Index:${rng.getCount()}`);
    if (isValidTaiHoRoll(roll)) return roll;
  }
}

function simulateRollFromStart(rng) {
  rng.next(202);
  const wait = calculateWait(rng);
  return calculateRoll(rng, wait);
}

// const rng = new RNG(0x320054ff);
// for (let i = 0; i < 250; i++) {
//   console.log(calculateWait(rng));
// }

// console.log(calculateRoll(new RNG(0xbf50aac2), 8));
// console.log(simulateRollFromStart(new RNG(0x320054ff)));
// console.log(calculateRoll(new RNG(0xfd4f4fa9), 0x4f));
// console.log(calculateRoll(new RNG(0xd8ca0a3c), 0x1e));

const startRNG = new RNG(0x280c65ae);
for (let i = 0; i < 10000; i++) {
  const rng = startRNG.clone().next(i);
  console.log(`RNG:${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  console.log(simulateRollFromStart(rng) + '\n');
}
