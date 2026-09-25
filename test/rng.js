import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';

describe('RNG accuracy', () => {
  it('new RNG(0x12).next(10000).getRNG() == 0x7f364ec2', () => {
    const rng = new RNG(0x12).next(10000);
    assert.strictEqual(rng.getRNG(), 0x7f364ec2);
  });
});
