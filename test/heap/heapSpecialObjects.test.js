import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { wrapperObject } from '../../lib/Game/Heap/SpecialObjects.js';
import { SPECIAL_LOADER_WORDS } from '../../lib/Game/Heap/SpecialLoaderWords.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Special's 110 wrapper objects derived from the code's per-word rules against the arena at the effect's free (the `busyend` dumps of
// two slow seeds): every word that does not carry a roll value or a screen position is exact; those are returned as unknown.
const word = (/** @type {any} */ d, /** @type {number} */ a) =>
  new DataView(d.arena.buffer, d.arena.byteOffset).getUint32(a - 0x80182000, true);

describe('the Special wrapper objects from the word rules', () => {
  for (const seed of ['17156075', '1fe68e72']) {
    it(`slow party, seed ${seed}: all 110 objects, headers and packets`, () => {
      const start = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_prompt0`);
      const end = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_busyend`);
      const heap = new VfxHeap(start, { party: 'L-fire-slow', index: 0 });
      heap.roundStart();
      heap.enemyMove('CRYSTAL_CORE', 'Special', {});
      // the arena before the Special: the round's prompt, with the Special's loader buffer (file data) where it lies
      const loader = new Map(SPECIAL_LOADER_WORDS.map(([off, w]) => [0x8018b890 + off, w]));
      const pre = (/** @type {number} */ a) => loader.get(a) ?? word(start, a);
      // the 110 objects: the 80-byte blocks in allocation order, each followed by its header and two packet arrays
      const alloc = heap.lastMoveBlocks;
      // (each group of ten objects is preceded by its 40-byte array of pointers: find the 80-byte objects)
      const objects = alloc.flatMap(([, w], i) => (w === 20 ? [i] : []));
      assert.strictEqual(objects.length, 110);
      let compared = 0;
      for (let o = 0; o < 110; o++) {
        const [[object], [header], [a0], [a1]] = alloc.slice(objects[o], objects[o] + 4);
        const kind = o < 100 ? 'ring' : 'impact';
        const model = wrapperObject({
          kind,
          group: kind === 'ring' ? Math.floor(o / 10) : o - 100,
          position: o % 10,
          blocks: { object, header, arrays: [a0, a1] },
          bulkIndex: 1,
          pre,
        });
        const check = (
          /** @type {{ words: number[], unknown: number[] }} */ b,
          /** @type {number} */ base,
          /** @type {string} */ what,
        ) =>
          b.words.forEach((w, i) => {
            if (b.unknown.includes(i)) return;
            // (words inside the Fight menu's two 6000-byte packet buffers are rewritten by the menu's window draw every frame: the menu model's)
            if (base + 4 * i >= 0x80187770 && base + 4 * i < 0x8018a658) return;
            assert.strictEqual(w, word(end, base + 4 * i), `object ${o} ${what} word ${i}`);
            compared++;
          });
        check(model.object, object, 'object');
        check(model.header, header, 'header');
        check(model.arrays[0], a0, 'array0');
        check(model.arrays[1], a1, 'array1');
      }
      assert.ok(compared > 3000);
    });
  }
});
