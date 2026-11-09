import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import HeapModel from '../../lib/Game/Heap/HeapModel.js';
import { fightMenuFrees } from '../../lib/Game/Heap/HeapPrediction.js';
import { replayHeapEvents } from '../../lib/Game/Heap/HeapEvents.js';
import { loadHeapDump } from '../helpers/heapDumps.js';

// Crystal Core's two moves as the game's heap saw them (Suikoden-Bizhawk-HUD enemy_profiles/enemies/crystal_core_lv60_hp5000/
// heap_footprints, scripts/CrystalCoreMoveFootprints.lua): the phase-1 Attack (39 allocations) and the phase-2 Special (487), three
// seeds each, the whole round. `events` replays from the free list at the prompt after the menu frees; the last 44 allocations are the
// Fight menu rebuilt for the next prompt (`neverFreed`). The free list there must equal the one at the round's own prompt: neither
// move leaves residue.
const DIR = new URL('../fixtures/heap/footprints/', import.meta.url);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));

/** @param {[number, number][]} list */
const hex = (list) => list.map(([a, u]) => ['0x' + a.toString(16), u]);

describe('Crystal Core move footprints replayed on the heap model', () => {
  for (const file of files) {
    const fp = JSON.parse(fs.readFileSync(new URL(file, DIR), 'utf8'));
    // the prompt of the round the move ran in: round 1 for the Attack, the phase-2 round (2) for the Special; both share a layout
    const dump = loadHeapDump(
      fp.job === 'attack'
        ? 'crystal_core_L-fire_r1_preconfirm'
        : 'crystal_core_L-fire_r2_preconfirm',
    );
    const heap = new HeapModel(dump.arena, dump.rover);
    for (const p of fightMenuFrees(heap, dump)) heap.free(p);

    const start = hex(heap.freeList());
    it(`${file}: starts from the free list after the menu frees`, () => {
      assert.deepStrictEqual(start, fp.heapAtPrompt.afterMenuFrees);
    });

    const ptrs = replayHeapEvents(heap, fp.events);
    const afterRound = hex(heap.freeList());
    const rover = heap.rover;

    it(`${file}: every allocation lands where the game's trace says, every free names the pointer it freed`, () => {
      const rows = fp.trace.slice(fp.foreignFrees.length); // after the 44 menu frees at confirm
      assert.deepStrictEqual(
        ptrs.map((p) => '0x' + p?.toString(16)),
        rows.filter((/** @type {any[]} */ r) => r[1] === 'a').map((r) => r[4]),
      );
      const freed = fp.events.map((/** @type {number} */ e) =>
        e < 0 ? '0x' + ptrs[-e - 1]?.toString(16) : null,
      );
      assert.deepStrictEqual(
        freed.filter((/** @type {string | null} */ x) => x !== null),
        rows.filter((/** @type {any[]} */ r) => r[1] === 'f').map((r) => r[4]),
      );
    });

    it(`${file}: the 44 rebuilt menu blocks are the ones the game left allocated`, () => {
      const allocSizes = fp.events.filter((/** @type {number} */ e) => e > 0);
      for (const [allocNumber, ptr, size] of fp.neverFreed) {
        assert.strictEqual(allocSizes[allocNumber - 1], size);
        assert.strictEqual('0x' + ptrs[allocNumber - 1]?.toString(16), ptr);
      }
      assert.deepStrictEqual(
        new Set(fp.neverFreed.map((/** @type {any[]} */ x) => x[1])),
        new Set(fp.foreignFrees),
      );
    });

    it(`${file}: the free list and rover after the round equal the next prompt's, and after its menu frees too`, () => {
      assert.deepStrictEqual(afterRound, fp.heapAtNextPrompt.raw);
      assert.strictEqual('0x' + rover.toString(16), fp.heapAtNextPrompt.rover);
      for (const p of fp.foreignFrees) heap.free(Number(p));
      assert.deepStrictEqual(hex(heap.freeList()), fp.heapAtNextPrompt.afterMenuFrees);
      // neither move leaves residue: the layout is the round's own prompt's
      assert.deepStrictEqual(hex(heap.freeList()), fp.heapAtPrompt.afterMenuFrees);
    });
  }
});
