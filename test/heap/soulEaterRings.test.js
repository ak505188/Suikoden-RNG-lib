import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import HeapModel from '../../lib/Game/Heap/HeapModel.js';
import { applyEvents, bindState } from '../../lib/Game/Heap/HeapPrediction.js';
import { SPELL_EVENTS } from '../../lib/Game/Heap/SpellEvents.js';
import { applyRingInit, ringBlocks, ringKeep } from '../../lib/Game/Heap/SoulEaterRings.js';

/**
 * The ring builder's words against the recorded arenas (Suikoden-Bizhawk-HUD luc2r3_trace_d: round 4 of the luc2 run, McDohl casts Black
 * Shadow / Hell): the arena before the round's confirm, the heap traffic up to the cast's struct, and the arena at the end of the setup
 * frame. The blocks that lie under the loader buffer read its image as their stale words (the blocks below keep what the arena held,
 * which the recording does not reach).
 */
const DIR = new URL('../fixtures/heap/soul_eater_rings/', import.meta.url);
const BASE = 0x80182000;
const LOADER = 0x8018b890;
const LOADER_END = LOADER + 16384;

/** @param {string} name */
const bytes = (name) => new Uint8Array(fs.readFileSync(new URL(name, DIR)));

for (const [tag, spell, events] of /** @type {const} */ ([
  ['BS', 'BlackShadow', 'Soul Eater slot 2'],
  ['Hell', 'Hell', 'Soul Eater slot 3'],
])) {
  describe(`ring blocks of a ${spell} cast`, () => {
    const arena = bytes(`${tag}_r4_preconfirm.bin`);
    const truth = new DataView(bytes(`${tag}_r4_ctxframe.bin`).buffer);
    /** @type {[string, number, number?][]} */
    const ops = JSON.parse(fs.readFileSync(new URL(`${tag}_r4_ops.json`, DIR), 'utf8'));
    const cut = ops.map((o) => o[0] === 'a' && o[1] === 16384).lastIndexOf(true);
    const heap = new HeapModel(arena, BASE);
    for (const o of ops.slice(0, cut)) {
      if (o[0] === 'f') heap.free(o[1]);
      else heap.alloc(o[1]);
    }
    const state = bindState({ heap, known: new Map(), unknown: new Set() });
    const list = SPELL_EVENTS[events];
    const ptrs = applyEvents(state, list, { loader: true, keep: ringKeep(list) });
    const rings = ringBlocks(list, ptrs);
    applyRingInit(state, rings, { spell });

    it('finds the group, ring(10) and ring(36)', () => {
      assert.strictEqual(rings.length, 8);
      assert.deepStrictEqual(
        rings.map((r) => r.kind),
        spell === 'Hell'
          ? [...Array(6).fill('group'), 'ring36', 'ring10']
          : [...Array(6).fill('group'), 'ring10', 'ring36'],
      );
    });

    it('lands the struct where the game did', () => {
      assert.strictEqual(ptrs[1], 0x80190840);
    });

    it('every word it knows in the blocks under the loader buffer is the game’s', () => {
      let known = 0;
      for (const r of rings) {
        const n = r.kind === 'ring10' ? 10 : 36;
        for (let b = 0; b < 2; b++)
          for (const [a, len] of [
            [r.packets[b], n * 36],
            [r.links[b], n * 12],
            ...(b === 0 ? [[r.header, 84]] : []),
          ]) {
            if (a < LOADER || a >= LOADER_END) continue;
            for (let w = a; w < a + len; w += 4) {
              const k = state.known.get(w);
              if (k === undefined) continue;
              known++;
              assert.strictEqual(k, truth.getUint32(w - BASE, true), `word 0x${w.toString(16)}`);
            }
          }
      }
      assert.ok(known > 3900, `${known} words known`);
    });
  });
}
