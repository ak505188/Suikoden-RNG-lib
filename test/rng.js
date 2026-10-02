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

describe('RNG.next', () => {
  const seeds = [0, 0x12, 0x43, 0xffffffff];

  /** One call at a time, never jumping */
  const step = (seed, n) => {
    const rng = new RNG(seed);
    for (let i = 0; i < n; i++) rng.next();
    return rng.getRNG();
  };

  it('jumping matches stepping below 2^32', () => {
    for (const seed of seeds) {
      for (const n of [31, 32, 33, 63, 64, 100, 255, 1000, 4097]) {
        assert.strictEqual(new RNG(seed).next(n).getRNG(), step(seed, n), `seed ${seed}, n ${n}`);
      }
    }
  });

  it('returns to the seed after 2^32 calls', () => {
    for (const seed of seeds) {
      assert.strictEqual(new RNG(seed).next(2 ** 32).getRNG(), seed);
    }
  });

  it('wraps around past 2^32 calls, counting every call', () => {
    for (const seed of seeds) {
      for (const k of [0, 1, 5, 31, 32, 1000]) {
        const rng = new RNG(seed).next(2 ** 32 + k);
        assert.strictEqual(rng.getRNG(), new RNG(seed).next(k).getRNG(), `seed ${seed}, k ${k}`);
        assert.strictEqual(rng.getCount(), 2 ** 32 + k);
      }
    }
  });

  it('new RNG(0x43).next(2 ** 32 + 5) lands where 5 single steps do', () => {
    assert.strictEqual(new RNG(0x43).next(2 ** 32 + 5).getRNG(), 3101720300);
    assert.strictEqual(step(0x43, 5), 3101720300);
  });
});
