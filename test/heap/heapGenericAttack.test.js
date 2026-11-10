import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// An ordinary monster's basic Attack hit (generic effect, brief 12d): three allocations (52, 80, 80) freed in the same order the builder frees
// them, so the heap's free list is what it was; the blocks' words are not modelled and stay unknown.
describe('a monster without recorded events: its basic Attack hit', () => {
  it('allocates and frees the spark child, leaving the same free blocks and its words unknown', () => {
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
      party: 'L-fire-slow',
      index: 0,
    });
    heap.roundStart();
    const blocks = () => JSON.stringify(heap.state.heap.freeList().sort((a, b) => a[0] - b[0]));
    const before = blocks();
    const unknownBefore = heap.state.unknown.size;
    assert.strictEqual(heap.enemyMove('HOLLY_BOY', 'Attack'), true);
    // (the same blocks; the allocator's rover has moved, so the list's order differs)
    assert.strictEqual(blocks(), before);
    // 52 + 80 + 80 bytes = 3 blocks: 13 + 20 + 20 words of unknown content
    // (plus a free-list header word the frees rewrite)
    assert.ok(heap.state.unknown.size - unknownBefore >= 13 + 20 + 20);
  });

  it('does not model another move of that monster', () => {
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
      party: 'L-fire-slow',
    });
    assert.strictEqual(heap.enemyMove('HOLLY_BOY', 'Special'), false);
  });
});
