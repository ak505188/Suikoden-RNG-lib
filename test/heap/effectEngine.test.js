import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import HeapModel, { ARENA, ARENA_SIZE } from '../../lib/Game/Heap/HeapModel.js';
import { bindState } from '../../lib/Game/Heap/HeapPrediction.js';
import { EngineMemory, makeSpace, runHit } from '../../lib/Game/Heap/Engine/EffectEngine.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';
import { CHARACTER_FILES } from '../../lib/Game/Heap/Engine/EffectData.js';

// The effect-script engine port against the RE agent's verified reference (Suikoden-Bizhawk-HUD effect_script_engine_v10.py): the party
// Attack hit of each of the 78 characters on Crystal Core from the first prompt's arena, at two draw-buffer parities: the heap events
// (tick, kind, size, pointer, return address) and every arena word that changed
// (scripts/generateEffectEngineParity.py; the reference reproduces the recorded hit children: 70 of 70 checks, 234 of 234 pointers).
const parity = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/effect_engine_parity.json', import.meta.url),
    'utf8',
  ),
);
const PARTY = ['shu', 'vic', 'fri', 'luk', 'ten', 'hel'];
const CHAR_BASE = PARTY.map((_, i) => 0x8019a000 + 0x5000 * i);

describe('the effect-script engine port: the party Attack hit of every character', () => {
  const dump = loadHeapDump('crystal_core_L-fire-slow_r1_prompt');
  const arena = new Uint8Array(dump.arena);
  const original = new DataView(arena.buffer, arena.byteOffset, arena.byteLength);
  for (const c of parity.cases) {
    it(`${c.code} at parity ${c.parity}`, () => {
      assert.ok(CHARACTER_FILES[c.code]);
      const state = bindState({
        heap: new HeapModel(dump.arena, dump.rover),
        known: new Map(),
        unknown: new Set(),
      });
      const mem = new EngineMemory(state);
      const party = [c.code, ...PARTY.slice(1)].map((code, i) => ({ code, base: CHAR_BASE[i] }));
      const { sp, info } = makeSpace(party);
      runHit(mem, sp, info, { attacker: 1, target: 7, tick: c.t0 });
      assert.deepEqual(
        mem.events,
        c.events.map((e) => [...e]),
      );
      mem.commit();
      const words = [];
      for (let a = ARENA; a < ARENA + ARENA_SIZE; a += 4) {
        const now = (state.known.get(a) ?? state.heap.u32(a)) >>> 0;
        if (now !== original.getUint32(a - ARENA, true)) words.push([a, now]);
      }
      assert.deepEqual(words, c.words);
      assert.equal(state.heap.rover, c.rover);
    });
  }
});
