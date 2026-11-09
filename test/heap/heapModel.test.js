import { describe, it } from 'node:test';
import assert from 'node:assert';
import HeapModel, { ARENA, ARENA_SIZE } from '../../lib/Game/Heap/HeapModel.js';

// The allocator is the game's K&R next-fit malloc (Suikoden-Bizhawk-HUD scripts/heap/HeapModel.lua, same code on v1.0 and v1.1).
const END = ARENA + ARENA_SIZE;

describe('HeapModel', () => {
  it('carves an allocation from the tail of the free block', () => {
    const heap = HeapModel.singleBlock(ARENA + 0x2000);
    const p = /** @type {number} */ (heap.alloc(200)); // ((200 + 7) >> 3) + 1 = 26 units with the header
    assert.strictEqual(p, END - 26 * 8 + 8);
    assert.deepStrictEqual(heap.freeList(), [[ARENA + 0x2000, (END - ARENA - 0x2000) / 8 - 26]]);
  });

  it('merges a freed block back into the free block', () => {
    const heap = HeapModel.singleBlock(ARENA + 0x2000);
    const before = heap.freeList();
    const a = heap.alloc(2804);
    const b = heap.alloc(120);
    heap.free(b);
    heap.free(a);
    assert.deepStrictEqual(heap.freeList(), before);
  });

  it('leaves a hole when blocks are freed out of order, and reuses it', () => {
    const heap = HeapModel.singleBlock(ARENA + 0x2000);
    const a = heap.alloc(120);
    const b = heap.alloc(120);
    heap.free(b === null ? null : /** @type {number} */ (a)); // the higher block: next to the tail
    assert.strictEqual(heap.freeList().length, 2);
    assert.strictEqual(heap.alloc(120), a);
    assert.ok(b);
  });

  it('returns null when nothing fits', () => {
    const heap = HeapModel.singleBlock(END - 64);
    assert.strictEqual(heap.alloc(4096), null);
  });

  it('a block ending below the arena end moves every struct the same distance', () => {
    const top = HeapModel.singleBlock(ARENA + 0x2000);
    const low = HeapModel.singleBlock(ARENA + 0x2000, END - 0x1000);
    assert.strictEqual(
      /** @type {number} */ (top.alloc(16384)) - /** @type {number} */ (low.alloc(16384)),
      0x1000,
    );
  });
});
