import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { specialEffect } from '../../lib/Game/Heap/SpecialEffect.js';
import { SPECIAL_LOADER_WORDS } from '../../lib/Game/Heap/SpecialLoaderWords.js';
import { ENEMY_MOVE_EVENTS } from '../../lib/Game/Heap/EnemyMoveEvents.js';
import { applyEvents } from '../../lib/Game/Heap/HeapPrediction.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The whole Special derived against the arena at its free (the `busyend` dumps of two slow seeds): every word the model knows equals the
// real arena, except the words inside the Fight menu's two 6000-byte packet buffers (the menu draw's). Words it does not know are the roll
// values, the projections and the glow.
const RESOURCES = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/party_resource_layout.json', import.meta.url),
    'utf8',
  ),
).parties['L-fire-slow'];
const packets = (/** @type {number} */ slot) =>
  /** @type {[number, number]} */ ([
    parseInt(RESOURCES[slot - 1].pk0, 16),
    parseInt(RESOURCES[slot - 1].pk1, 16),
  ]);
const word = (/** @type {any} */ d, /** @type {number} */ a) =>
  new DataView(d.arena.buffer, d.arena.byteOffset).getUint32(a - 0x80182000, true);

describe('the whole Special against the arena at the free', () => {
  for (const seed of ['17156075', '1fe68e72']) {
    it(`slow party, seed ${seed}`, () => {
      const start = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_prompt0`);
      const end = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_busyend`);
      const heap = new VfxHeap(start, { party: 'L-fire-slow', index: 0 });
      heap.roundStart();
      const state = heap.state;
      const before = state.heap.clone();
      const ptrs = applyEvents(state, ENEMY_MOVE_EVENTS.CRYSTAL_CORE.Special);
      const loader = new Map(
        SPECIAL_LOADER_WORDS.map(([off, w]) => [/** @type {number} */ (ptrs[2]) + off, w]),
      );
      const pre = (/** @type {number} */ a) => loader.get(a) ?? before.u32(a);
      const model = specialEffect({ ptrs, bulkIndex: 1, pre, packets });
      assert.ok(model);
      let compared = 0;
      for (const [addr, w] of model.known) {
        if (addr >= 0x80187770 && addr < 0x8018a658) continue; // the menu's packet buffers
        assert.strictEqual(w, word(end, addr), `0x${addr.toString(16)}`);
        compared++;
      }
      assert.ok(compared > 4000, String(compared));
      assert.ok(model.unknown.size > 0);
    });
  }
});
