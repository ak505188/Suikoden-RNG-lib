import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import HeapModel from '../../lib/Game/Heap/HeapModel.js';
import { fightMenuFrees, predictParticles } from '../../lib/Game/Heap/HeapPrediction.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { loadHeapDump } from '../helpers/heapDumps.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// Dumps from Suikoden-Bizhawk-HUD scripts/heap/data/dumps (HeapDump.capture, the Fight prompt after Free Will and the actions are set).
const names = fs
  .readdirSync(new URL('../fixtures/heap/', import.meta.url))
  .filter((f) => f.endsWith('.json') && !f.includes('_inround_')) // the in-round dumps have the menu freed already: no menu state
  .map((f) => f.replace('.json', ''));

/** @param {[number, number][]} list */
const hex = (list) => list.map(([a, u]) => ['0x' + a.toString(16), u]);
/** @param {number[]} words */
const h = (words) => words.map((w) => w.toString(16));

describe('heap model on the recorded dumps', () => {
  for (const name of names) {
    it(`${name}: raw free list, the 44 menu frees and the free list after them`, () => {
      const dump = loadHeapDump(name);
      const heap = new HeapModel(dump.arena, dump.rover);
      assert.deepStrictEqual(hex(heap.freeList()), dump.sidecar.freeListRaw);
      const frees = fightMenuFrees(heap, dump);
      assert.deepStrictEqual(
        frees.map((p) => '0x' + p.toString(16)),
        dump.sidecar.fightMenuFrees,
      );
      for (const p of frees) heap.free(p);
      assert.deepStrictEqual(hex(heap.freeList()), dump.sidecar.freeListAfterMenuFrees);
    });
  }
});

describe('Flaming Arrow stale words predicted from a dump', () => {
  const zeros = (/** @type {number} */ n) => Array(n).fill(0);
  // the expected words are the Lua HeapPrediction.predictParticles' (the live words in the Crystal Core cases)
  const expected = {
    crystal_core_L_fire_r1_preconfirm: [0xd56, 0x8a0, 0x8a0, 0, 0, 0x7e, ...zeros(14)],
    crystal_core_L_fire_r2_preconfirm: [0x2e9, 0x2e4, 0x443, 0x370, 0x4c1, 0xc7c, ...zeros(14)],
    magicians_island_g1_preconfirm: [...zeros(17), 0x4e, 0xb34, 0x63],
  };
  for (const [key, words] of Object.entries(expected)) {
    const name = key.replace('L_fire', 'L-fire');
    it(`${name}`, () => {
      const p = predictParticles(loadHeapDump(name), 'FlamingArrow');
      assert.deepStrictEqual(h(p.residual), h(words));
      assert.ok(p.complete);
    });
  }

  it("is the baked table on the other single-block layouts (Magician's Island, SpellDuration)", () => {
    for (const name of names.filter((n) => /magicians|spellduration/.test(n))) {
      const p = predictParticles(loadHeapDump(name), 'FlamingArrow');
      assert.deepStrictEqual(h(p.residual), h([...zeros(17), 0x4e, 0xb34, 0x63]), name);
    }
  });

  it('the Crystal Core layout is not the baked one: two free blocks, particles from the top of the second', () => {
    const p = predictParticles(loadHeapDump('crystal_core_L-fire_r1_preconfirm'), 'FlamingArrow');
    assert.deepStrictEqual(
      p.particlePtrs.slice(0, 3).map((x) => x.toString(16)),
      ['80190110', '80190090', '80190010'],
    );
  });

  // regression values of this port: no independent expected words were given for these dumps
  it('Neclord: the split seed differs from the single-block ones only where the heap differs', () => {
    const words = (/** @type {string} */ seed) =>
      h(
        predictParticles(
          loadHeapDump(`neclord_open12345678_r1_${seed}_preconfirm`),
          'FlamingArrow',
        ).residual.slice(0, 5),
      );
    assert.deepStrictEqual(words('cc623a9b'), ['f60', 'ff6', '7f', '7f0', '60']);
    assert.deepStrictEqual(words('00000002'), ['2f4', '295', 'a00', '7f0', '40']);
  });
});

// Round 1 and round 2 casts of Crystal Core's kill_spell scenario (Luc's Flaming Arrow, 20 seeds): the spell's RNG calls the game made
// (the Bizhawk heap_flaming_arrow_words*.txt tables), against the heap model that starts from the round-1 dump and carries round 1's
// particle writes into round 2: no round-2 dump.
// [seed, round 1 calls, round 2 calls]
/** @type {[string, number, number][]} */
const REAL_CALLS = [
  ['9e3779b1', 468, 500],
  ['3c6ef362', 508, 472],
  ['daa66d13', 504, 496],
  ['78dde6c4', 500, 496],
  ['17156075', 500, 520],
  ['b54cda26', 508, 524],
  ['538453d7', 500, 500],
  ['f1bbcd88', 552, 504],
  ['8ff34739', 504, 508],
  ['2e2ac0ea', 504, 500],
  ['cc623a9b', 524, 528],
  ['6a99b44c', 540, 508],
  ['08d12dfd', 512, 472],
  ['a708a7ae', 540, 504],
  ['4540215f', 488, 496],
  ['e3779b10', 512, 516],
  ['81af14c1', 500, 492],
  ['1fe68e72', 488, 516],
  ['be1e0823', 476, 500],
  ['5c5581d4', 484, 508],
];

describe('Flaming Arrow RNG calls with the heap carried between rounds (Crystal Core, 20 seeds)', () => {
  const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
  const start = (/** @type {string} */ seed, /** @type {number} */ round) =>
    new RNG(
      /** @type {any} */ (run).seeds.find((s) => s.seed === seed).rounds[round - 1].rngAtConfirm,
    ).jump(19);
  for (const [seed, round1, round2] of REAL_CALLS) {
    it(`seed ${seed}: ${round1} then ${round2}`, () => {
      const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_preconfirm'));
      heap.roundStart();
      assert.strictEqual(heap.castFlamingArrow(start(seed, 1)), round1);
      heap.roundEnd();
      heap.roundStart();
      assert.strictEqual(heap.castFlamingArrow(start(seed, 2)), round2);
    });
  }
});
