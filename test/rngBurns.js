import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import { memoizeBurn } from '../lib/Game/Magic/SpellRNG/shared.js';
import { dragonLightningBurn, dragonLightningParticles } from '../lib/Game/Battle/EnemyAI.js';
import { flamingArrowRand, explosionRand } from '../lib/Game/Magic/SpellRNG/Fire.js';
import { SPELL_BURNS } from '../lib/Game/Magic/Behavior.js';

/** The LCG one step at a time, as RNG.next did before it jumped */
const stepped = (/** @type {number} */ seed, /** @type {number} */ n) => {
  let x = seed;
  for (let i = 0; i < n; i++) x = (Math.imul(x, 0x41c64e6d) + 0x3039) >>> 0;
  return x;
};

describe('RNG.next jump-ahead', () => {
  it('lands where stepping one call at a time does, with the same count', () => {
    for (const seed of [0x43, 0, 1, 0x30a82220, 0xffffffff, 0x80000000]) {
      for (const n of [
        0,
        1,
        2,
        31,
        32,
        33,
        63,
        64,
        65,
        150,
        717,
        1231,
        4095,
        4096,
        5560,
        7750,
        65537,
        1e6 + 3,
      ]) {
        const rng = new RNG(seed).jump(n);
        assert.strictEqual(rng.raw, stepped(seed, n), `seed ${seed}, ${n} calls`);
        assert.strictEqual(rng.count, n);
      }
    }
  });

  it('a jump from partway along matches too', () => {
    const rng = new RNG(0x43).jump(7750);
    rng.jump(717);
    assert.strictEqual(rng.raw, stepped(0x43, 7750 + 717));
    assert.strictEqual(rng.count, 7750 + 717);
  });
});

describe('memoizeBurn', () => {
  /** @type {[string, (rng: RNG) => unknown, import('../lib/Game/Magic/SpellRNG/shared.js').MemoizedBurn][]} */
  const burns = [
    ['Dragon Lightning', dragonLightningParticles, dragonLightningBurn],
    ['Flaming Arrows', flamingArrowRand, SPELL_BURNS.flamingArrows],
    ['Explosion', explosionRand, SPELL_BURNS.explosion],
  ];

  for (const [name, raw, memoized] of burns) {
    it(`${name}: the same RNG state and count as the unmemoized burn, on a miss and on a hit`, () => {
      for (let start = 7000; start < 7600; start++) {
        const expected = new RNG(0x43).jump(start);
        raw(expected);
        for (let pass = 0; pass < 2; pass++) {
          const rng = new RNG(0x43).jump(start);
          const { calls } = memoized(rng);
          assert.strictEqual(rng.raw, expected.raw, `${name} from ${start}, pass ${pass}`);
          assert.strictEqual(rng.count, expected.count);
          assert.strictEqual(calls, expected.count - start);
        }
      }
    });
  }

  it('runs the burn once per start state, then jumps', () => {
    let runs = 0;
    const burn = memoizeBurn((rng) => {
      runs++;
      rng.jump(100 + (rng.rand % 7));
    });
    for (let i = 0; i < 3; i++) for (const start of [10, 20, 30]) burn(new RNG(5).jump(start));
    assert.strictEqual(runs, 3);
    assert.deepStrictEqual(burn.stats, { hits: 6, misses: 3 });
  });

  it('empties the cache when it fills, and stays exact', () => {
    const burn = memoizeBurn((rng) => rng.jump(1 + (rng.rand % 50)), 4);
    for (let start = 0; start < 20; start++) {
      const rng = new RNG(9).jump(start),
        expected = new RNG(9).jump(start);
      expected.jump(1 + (expected.rand % 50));
      burn(rng);
      assert.strictEqual(rng.raw, expected.raw);
      assert.ok(burn.cache.size <= 4);
    }
  });

  it('keys on the RNG state, not the count: the same state from another seed reuses it', () => {
    const burn = memoizeBurn(dragonLightningParticles);
    const a = new RNG(0x43).jump(7750);
    const b = new RNG(a.raw); // the same state at count 0
    burn(a);
    burn(b);
    assert.strictEqual(burn.stats.hits, 1);
    assert.strictEqual(b.raw, a.raw);
    assert.strictEqual(b.count, a.count - 7750);
  });
});
