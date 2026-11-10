import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { flamingArrowCast, sqrt0 } from '../../lib/Game/Heap/FlamingArrowCast.js';
import { loadArena } from '../helpers/heapDumps.js';

// Luc's Flaming Arrow kill cast as the game leaves its particle structs (kill_round note): the words of the first six particles equal the
// arena at the next prompt (party L-fire, seed 9e3779b1), from the RNG after the 19 rolls of the polls before the cast and the arena
// words before it.
describe('the Flaming Arrow cast particles', () => {
  it('the game square root', () => {
    assert.strictEqual(sqrt0(0), 0);
    for (const n of [1, 10, 100, 5000, 9999, 10000])
      assert.ok(Math.abs(sqrt0(n) * 1 - Math.sqrt(n)) < 1.5, String(n));
  });
  it('words 0-8 of particles 0-5 and the 468 rolls: the arena after the kill round', () => {
    const start = loadArena('crystal_core_L-fire_r1_prompt');
    const end = loadArena('crystal_core_L-fire_r2_preconfirm');
    const word = (/** @type {any} */ d, /** @type {number} */ a) =>
      new DataView(d.arena.buffer, d.arena.byteOffset).getUint32(a - 0x80182000, true);
    const ptrs = [0x80190110, 0x80190090, 0x80190010, 0x8018ff90, 0x8018ff10, 0x8018fe90];
    const rng = new RNG(0);
    rng.raw = (0x9e3779b1 + 1) >>> 0;
    rng.jump(19);
    const before = rng.count;
    const stale = Array.from({ length: 20 }, (_, i) =>
      i < 6 ? Array.from({ length: 9 }, (_, k) => word(start, ptrs[i] + 4 * k)) : Array(9).fill(0),
    );
    const particles = flamingArrowCast(rng, stale);
    assert.strictEqual(rng.count - before, 468);
    for (let i = 0; i < 6; i++)
      for (let k = 0; k < 9; k++)
        assert.strictEqual(
          particles[i].words[k],
          word(end, ptrs[i] + 4 * k),
          `particle ${i} word ${k}`,
        );
  });
});
