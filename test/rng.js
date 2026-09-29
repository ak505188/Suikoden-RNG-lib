import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';

describe('RNG accuracy', () => {
  it('new RNG(0x12).next(10000).getRNG() == 0x7f364ec2', () => {
    const rng = new RNG(0x12).next(10000);
    assert.strictEqual(rng.getRNG(), 0x7f364ec2);
  });
});

describe('RNG.snapshot', () => {
  it('records the seed, the current state and the call count', () => {
    const rng = new RNG(0x12).next(10000);
    assert.deepStrictEqual(rng.snapshot(), { original: 0x12, current: 0x7f364ec2, count: 10000 });
  });

  it("doesn't change when the RNG moves on", () => {
    const rng = new RNG(0x12);
    const snapshot = rng.snapshot();
    rng.next(5);
    assert.deepStrictEqual(snapshot, { original: 0x12, current: 0x12, count: 0 });
  });
});
