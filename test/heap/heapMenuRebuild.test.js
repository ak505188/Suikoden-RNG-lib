import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Fight menu is rebuilt at every round's end with the same 44 allocations; only the enemy window's two blocks scale with the living
// enemies (brief 12a / menu_rebuild.md: 30 and 15 bytes per enemy, 6 of 6 Magician's Island groups + Crystal Core).
describe('the Fight menu rebuild at the round end', () => {
  const start = () => {
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
      party: 'L-fire-slow',
      index: 0,
    });
    heap.roundStart();
    return heap;
  };
  it('a lone enemy rebuilds the same blocks at the same addresses', () => {
    const heap = start();
    const before = [...heap.menuBlocks];
    heap.roundEnd({ enemies: 1 });
    assert.deepStrictEqual(heap.menuBlocks, before);
  });
  it('more enemies grow the enemy window and move every later block, and the next round frees the new blocks', () => {
    const heap = start();
    const before = [...heap.menuBlocks];
    const ptrs = heap.roundEnd({ enemies: 4 });
    // window 1's text (4 x 30 = 120 bytes) and attribute (4 x 15 = 60 bytes) blocks
    assert.strictEqual(heap.menuRebuild[7], 120);
    assert.strictEqual(heap.menuRebuild[8], 64);
    assert.notDeepStrictEqual(heap.menuBlocks, before);
    // every block of the rebuilt menu is freed by the next round start
    assert.deepStrictEqual([...heap.menuBlocks].sort(), [...ptrs].sort());
    heap.roundStart();
    assert.ok(heap.state.heap.freeList().length >= 1);
  });
});
