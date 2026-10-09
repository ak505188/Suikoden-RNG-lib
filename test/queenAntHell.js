import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import { simulateTedQueenAntHell } from '../lib/Game/Rolls.js';
import HellRuns from './data/queen_ant_hell.json' with { type: 'json' };

/**
 * Ground truth for the scripted Queen Ant fight where Ted casts Hell: for each RNG call index the
 * fight can start at (6000 to 10000), where it ends. Indices are RNG call counts from SEED; the RNG
 * values are hex strings, as read in game.
 * @typedef {{ startIndex: number, endIndex: number, startRng: string, endRng: string }} HellRun
 */

/** The seed every index in queen_ant_hell.json counts from (the Queen Ant fight's) */
const SEED = 0x19;

const runs = /** @type {HellRun[]} */ (HellRuns);

describe('queen_ant_hell.json', () => {
  it('has a run for every start index from 6000 to 10000', () => {
    assert.strictEqual(runs.length, 4001);
    runs.forEach((run, i) => assert.strictEqual(run.startIndex, 6000 + i));
  });

  it('has RNG values that match their indices, counting from the seed', () => {
    for (const { startIndex, endIndex, startRng, endRng } of runs) {
      assert.strictEqual(
        new RNG(SEED).jump(startIndex).raw,
        Number(startRng),
        `start ${startIndex}`,
      );
      assert.strictEqual(new RNG(SEED).jump(endIndex).raw, Number(endRng), `end ${endIndex}`);
    }
  });
});

describe('Ted casting Hell in the Queen Ant fight matches the in-game runs', () => {
  it('ends where the game did, from every start index', () => {
    for (const { startIndex, endIndex, endRng } of runs) {
      const rng = new RNG(SEED).jump(startIndex);
      simulateTedQueenAntHell(rng);
      assert.strictEqual(rng.count, endIndex, `start ${startIndex}: end index`);
      assert.strictEqual(rng.raw, Number(endRng), `start ${startIndex}: end RNG`);
    }
  });
});
