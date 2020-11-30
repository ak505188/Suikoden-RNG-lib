import RNG from '../lib/rng.js';

const rng = new RNG(0x43);
const minLength = 2;
let currentMatch = [];
let allMatches = [];

for (let i = 0; i < 20000; i++) {
  if (rng.isMarieAntonioDialogue()) {
    currentMatch.push(rng.count);
  } else {
    if (currentMatch.length >= minLength) {
      allMatches.push(currentMatch);
    }
    currentMatch = [];
  }
  rng.next();
}

allMatches.forEach(match => console.log(match));
