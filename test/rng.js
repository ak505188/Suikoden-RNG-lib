import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';

describe('RNG accuracy', () => {
  it('new RNG(0x12).jump(10000).raw == 0x7f364ec2', () => {
    const rng = new RNG(0x12).jump(10000);
    assert.strictEqual(rng.raw, 0x7f364ec2);
  });
});

describe('RNG.snapshot', () => {
  it('records the seed, the raw value and the call count', () => {
    const rng = new RNG(0x12).jump(10000);
    assert.deepStrictEqual(rng.snapshot(), { seed: 0x12, raw: 0x7f364ec2, count: 10000 });
  });

  it("doesn't change when the RNG moves on", () => {
    const rng = new RNG(0x12);
    const snapshot = rng.snapshot();
    rng.jump(5);
    assert.deepStrictEqual(snapshot, { seed: 0x12, raw: 0x12, count: 0 });
  });
});

describe('RNG.next', () => {
  it('steps one call: the LCG step, with the count up by one', () => {
    const rng = new RNG(0x12);
    assert.strictEqual(rng.next(), rng);
    assert.strictEqual(rng.raw, (Math.imul(0x12, 0x41c64e6d) + 0x3039) >>> 0);
    assert.strictEqual(rng.count, 1);
  });
});

describe('RNG.jump', () => {
  const seeds = [0, 0x12, 0x43, 0xffffffff];

  /** One call at a time, never jumping */
  const step = (seed, n) => {
    const rng = new RNG(seed);
    for (let i = 0; i < n; i++) rng.next();
    return rng.raw;
  };

  it('jumping 0 changes nothing', () => {
    const rng = new RNG(0x12).jump(0);
    assert.deepStrictEqual(rng.snapshot(), { seed: 0x12, raw: 0x12, count: 0 });
  });

  it('jumping matches stepping below 2^32', () => {
    for (const seed of seeds) {
      for (const n of [31, 32, 33, 63, 64, 100, 255, 1000, 4097]) {
        assert.strictEqual(new RNG(seed).jump(n).raw, step(seed, n), `seed ${seed}, n ${n}`);
      }
    }
  });

  it('returns to the seed after 2^32 calls', () => {
    for (const seed of seeds) {
      assert.strictEqual(new RNG(seed).jump(2 ** 32).raw, seed);
    }
  });

  it('wraps around past 2^32 calls, counting every call', () => {
    for (const seed of seeds) {
      for (const k of [0, 1, 5, 31, 32, 1000]) {
        const rng = new RNG(seed).jump(2 ** 32 + k);
        assert.strictEqual(rng.raw, new RNG(seed).jump(k).raw, `seed ${seed}, k ${k}`);
        assert.strictEqual(rng.count, 2 ** 32 + k);
      }
    }
  });

  it('new RNG(0x43).jump(2 ** 32 + 5) lands where 5 single steps do', () => {
    assert.strictEqual(new RNG(0x43).jump(2 ** 32 + 5).raw, 3101720300);
    assert.strictEqual(step(0x43, 5), 3101720300);
  });
});

describe('RNG.clone', () => {
  it('copies the seed, raw value and count', () => {
    const rng = new RNG(0x12).jump(500);
    assert.deepStrictEqual(rng.clone().snapshot(), rng.snapshot());
  });

  it('is independent of the original', () => {
    const rng = new RNG(0x12).jump(500);
    const copy = rng.clone().jump(10);
    assert.deepStrictEqual(rng.snapshot(), new RNG(0x12).jump(500).snapshot());
    assert.strictEqual(copy.count, 510);
    assert.strictEqual(copy.raw, new RNG(0x12).jump(510).raw);
  });
});

describe('RNG.peek', () => {
  it('returns the raw and rand values calls ahead, without advancing', () => {
    const rng = new RNG(0x12).jump(20);
    const before = rng.snapshot();
    for (const calls of [1, 2, 7]) {
      const ahead = new RNG(0x12).jump(20 + calls);
      assert.deepStrictEqual(rng.peek(calls), { raw: ahead.raw, rand: ahead.rand });
    }
    assert.deepStrictEqual(rng.peek(), rng.peek(1));
    assert.deepStrictEqual(rng.snapshot(), before);
  });
});
