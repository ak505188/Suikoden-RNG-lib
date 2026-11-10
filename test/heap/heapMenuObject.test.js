import { describe, it } from 'node:test';
import assert from 'node:assert';
import { menuObjectWrites } from '../../lib/Game/Heap/MenuObject.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Fight menu object's build writes against the arena at a prompt: each written byte of the 12776-byte object equals the dump's.
const word = (/** @type {any} */ d, /** @type {number} */ a) =>
  new DataView(d.arena.buffer, d.arena.byteOffset).getUint32(a - 0x80182000, true);

describe('the Fight menu object at the prompt', () => {
  for (const name of [
    'crystal_core_L-fire-slow_r1_prompt',
    'crystal_core_L-fire_r1_prompt',
    'crystal_core_L-fire_after_special_9e3779b1_preconfirm',
    'crystal_core_L-fire-slow_after_special_9e3779b1_preconfirm',
  ]) {
    it(`${name}: every byte the build writes`, () => {
      const dump = loadHeapDump(name);
      // the 44 freed blocks in the destroy order: per window text, attribute, two prim arrays, the window; then the cursor object, the menu
      const frees = new VfxHeap(dump).menuBlocks;
      const windows = Array.from({ length: 8 }, (_, k) => frees[5 * k + 4]);
      const menu = frees[41];
      const cursor = frees[40];
      let compared = 0;
      for (const [offset, value, mask] of menuObjectWrites({ windows, cursor })) {
        const real = word(dump, menu + offset);
        assert.strictEqual((real & mask) >>> 0, (value & mask) >>> 0, `+0x${offset.toString(16)}`);
        compared++;
      }
      assert.ok(compared > 1500);
    });
  }
});
