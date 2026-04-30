import RNG from '../lib/rng.js';
import { simulateOpponentRollsFromGameStart } from '../lib/chinchironin.js';

const START_INDEX = 12800;
const END_INDEX = 15000;

const rng = new RNG(0x12).next(START_INDEX);
const games = [];

const isUsableRoll = roll => roll[0] == roll[1] || roll[1] == roll[2];

for (let i = START_INDEX; i < END_INDEX; i++) {
  const roll_data = simulateOpponentRollsFromGameStart(rng.cloneKeepIndex(), true, 203, 0);
  const result = {
    index: rng.count,
    rng: `0x${rng.getRNG().toString(16)}`,
    ...roll_data
  };

  const usable_rolls_map = new Map();
  roll_data.rolls.forEach(({ roll, index }, speed) => {
    if (!isUsableRoll(roll)) return;

    const key = `${roll},${index}`;

    if (usable_rolls_map.has(key)) return;
    usable_rolls_map.set(key, { roll, index, speed });
  });

  usable_rolls_map.values().forEach(valid_roll => {
    games.push({
      pci: result.index - 56,
      start: result.index,
      rng: result.rng,
      wait: result.wait,
      ...valid_roll
    });
  });

  rng.next();
}

const game_to_row = ({ pci, start, rng, wait, roll, speed, index }) => `${pci},${start},${rng},${wait},${speed},${roll},${index}`;

const csv_headers = ['pci','start_index','rng','wait','speed','roll','roll_index'];
const toCsv = (headers = csv_headers, results) => {
  const csv = [
    headers.join(','),
    ...results.map(result => game_to_row(result))
  ];
  return csv.join('\n');
}

// console.log(games[0]);
console.log(toCsv(csv_headers, games));
