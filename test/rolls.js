import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import {
  calculateDamageRoll,
  countWheelAttempts,
  isCliveAppearance,
  isMarieDialogue,
  isRun,
} from '../lib/Game/Rolls.js';
import { div32ulo } from '../lib/util/math.js';

describe('isRun', () => {
  it('succeeds above 50, on rand % 100', () => {
    assert.strictEqual(isRun(50), false);
    assert.strictEqual(isRun(51), true);
    assert.strictEqual(isRun(100), false); // 100 % 100 == 0
    assert.strictEqual(isRun(199), true); // 99
    assert.strictEqual(isRun(0x7fff), 0x7fff % 100 > 50);
  });
});

describe('isCliveAppearance / isMarieDialogue', () => {
  it('hold when rand is under a third / a ninth of the 15-bit range', () => {
    const clive = div32ulo(0x7fff, 3),
      marie = div32ulo(0x7fff, 9);
    assert.strictEqual(isCliveAppearance(0), true);
    assert.strictEqual(isCliveAppearance(clive - 1), true);
    assert.strictEqual(isCliveAppearance(clive), false);
    assert.strictEqual(isMarieDialogue(0), true);
    assert.strictEqual(isMarieDialogue(marie - 1), true);
    assert.strictEqual(isMarieDialogue(marie), false);
  });
});

describe('countWheelAttempts', () => {
  it('advances the RNG to the call that stops the wheel, and counts the calls before it', () => {
    for (const seed of [1, 0x12, 0x43, 0xdeadbeef]) {
      const rng = new RNG(seed);
      const attempts = countWheelAttempts(rng);
      const pos = div32ulo(rng.rand, 0x5a);
      assert.ok(pos >= 0x7f && pos <= 0xa0, `seed ${seed}: stopped at ${pos}`);
      assert.strictEqual(rng.count, attempts + 1);
      // Nothing earlier was in the window
      const earlier = new RNG(seed);
      for (let i = 0; i < attempts; i++) {
        const p = div32ulo(earlier.next().rand, 0x5a);
        assert.ok(p < 0x7f || p > 0xa0, `seed ${seed}: call ${i + 1} was already in it`);
      }
    }
  });
});

describe('calculateDamageRoll', () => {
  it('is (diff / 2 - rand % diff) / 5 truncated towards zero', () => {
    // 120 - 78 = 42: (21 - rand % 42) / 5
    assert.strictEqual(calculateDamageRoll(120, 78, 0), 4); // 21 / 5
    assert.strictEqual(calculateDamageRoll(120, 78, 21), 0);
    assert.strictEqual(calculateDamageRoll(120, 78, 41), -4); // -20 / 5
    assert.strictEqual(calculateDamageRoll(120, 78, 40), -3); // -19 / 5 -> -3
  });
});
