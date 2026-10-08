/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('./shared.js').SpellRandResult} SpellRandResult */

import { hexToByteArray } from './shared.js';
import { CHARM_ARROW_GRID_HEX } from './Consts/CharmArrowGrid.js';

const CHARM_ARROW_CONSTANTS = {
  TOTAL_TICKS: 64,
  GRID_SIZE: 16384,
  SUCCESSES_PER_TICK: 0xa0, // 160
};

/** @param {RNG} rng @returns {SpellRandResult} */
export function yellRand(rng) {
  rng.jump(33);
  return { calls: 33 };
}

/** @param {RNG} rng @returns {SpellRandResult} */
export function screamRand(rng) {
  rng.jump(162);
  return { calls: 162 };
}

/** @param {RNG} rng @returns {SpellRandResult} */
export function charmArrowRand(rng) {
  const startCount = rng.count;

  const grid = hexToByteArray(CHARM_ARROW_GRID_HEX);

  for (let tick = 0; tick < CHARM_ARROW_CONSTANTS.TOTAL_TICKS; tick++) {
    let successes = 0;
    while (successes !== CHARM_ARROW_CONSTANTS.SUCCESSES_PER_TICK) {
      const idx = rng.next().rand % CHARM_ARROW_CONSTANTS.GRID_SIZE;
      const b = grid[idx];
      if (b < 0x10) {
        if (b !== 0) {
          grid[idx] = 0;
          successes++;
        }
        // else: already empty, wasted draw, retry
      } else {
        grid[idx] = b & 0xf;
        successes++;
      }
    }
  }

  return { calls: rng.count - startCount };
}
