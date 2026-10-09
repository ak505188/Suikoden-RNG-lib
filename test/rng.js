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

describe('RNG.prev', () => {
  const seeds = [0, 0x12, 0x43, 0xffffffff];

  it('undoes next(), raw value and count', () => {
    for (const seed of seeds) {
      const rng = new RNG(seed).jump(1000);
      const before = rng.snapshot();
      assert.strictEqual(rng.next().prev(), rng);
      assert.deepStrictEqual(rng.snapshot(), before);
    }
  });

  it('steps back from the seed: new RNG(0x12).prev() is 0xc58a339d, one call before', () => {
    const rng = new RNG(0x12).prev();
    assert.strictEqual(rng.raw, 0xc58a339d);
    assert.strictEqual(rng.count, -1);
    assert.strictEqual(rng.next().raw, 0x12);
    assert.strictEqual(rng.count, 0);
  });

  it('undoes next() for random states', () => {
    for (let i = 0; i < 10000; i++) {
      const seed = Math.floor(Math.random() * 2 ** 32);
      assert.strictEqual(new RNG(seed).next().prev().raw, seed, `seed ${seed}`);
      assert.strictEqual(new RNG(seed).prev().next().raw, seed, `seed ${seed}`);
    }
  });
});

describe('RNG.jump backwards', () => {
  const seeds = [0, 0x12, 0x43, 0xffffffff];

  /** One prev() at a time */
  const stepBack = (seed, n) => {
    const rng = new RNG(seed);
    for (let i = 0; i < n; i++) rng.prev();
    return rng;
  };

  it('jump(-n) lands where n prev()s do, counting them', () => {
    for (const seed of seeds) {
      for (const n of [1, 2, 31, 32, 33, 100, 4097]) {
        const jumped = new RNG(seed).jump(-n);
        assert.strictEqual(jumped.raw, stepBack(seed, n).raw, `seed ${seed}, n ${n}`);
        assert.strictEqual(jumped.count, -n);
      }
    }
  });

  it('jump(-n) undoes jump(n)', () => {
    for (const seed of seeds) {
      for (const n of [1, 5, 32, 1000, 123456789, 2 ** 32 - 1]) {
        const rng = new RNG(seed).jump(n).jump(-n);
        assert.deepStrictEqual(
          rng.snapshot(),
          { seed, raw: seed, count: 0 },
          `seed ${seed}, n ${n}`,
        );
      }
    }
  });

  it('jump(-2 ** 32) comes back to the same state', () => {
    for (const seed of seeds) assert.strictEqual(new RNG(seed).jump(-(2 ** 32)).raw, seed);
  });
});

describe('RNG.raw', () => {
  it('reads as an unsigned 32-bit value, whatever the sign of its internal form', () => {
    for (const seed of [0, 1, 0x7fffffff, 0x80000000, 0xc58a339d, 0xffffffff]) {
      const rng = new RNG(seed);
      assert.strictEqual(rng.raw, seed);
      assert.strictEqual(rng.snapshot().raw, seed);
      assert.strictEqual(rng.next().raw, (Math.imul(seed, 0x41c64e6d) + 0x3039) >>> 0);
    }
  });

  it('can be set, and rand follows it', () => {
    const rng = new RNG(0x12);
    rng.raw = 0xdeadbeef;
    assert.strictEqual(rng.raw, 0xdeadbeef);
    assert.strictEqual(rng.rand, (0xdeadbeef >>> 16) & 0x7fff);
  });

  it('reset() goes back to the seed, including one above 2^31', () => {
    const rng = new RNG(0xf0289ce7).jump(100);
    rng.reset();
    assert.deepStrictEqual(rng.snapshot(), { seed: 0xf0289ce7, raw: 0xf0289ce7, count: 0 });
  });
});
