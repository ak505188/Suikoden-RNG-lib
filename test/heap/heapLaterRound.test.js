import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import {
  SPELLS,
  liveList,
  liveWords,
  loadArena,
  loadHeapDump,
  predictCast,
} from '../helpers/heapAfterMoves.js';

// With the slow party Crystal Core moves first in the cast's round too, so the cast follows a SECOND move (the first one is in the
// dump the heap starts from: the round's own prompt, `inround_later ... prompt0`, kill by Luc's Fire in round 1).
// heap_after_move_words_{attack,special}_L-fire-slow.txt: the live words of those casts.

const SEEDS = ['9e3779b1', '17156075'];
/** How the second Special's particles end (heap_special_particle_end_frames.txt, "slow party, round 3, kill by Luc Fire"): recorded, not derived */
const PHASE = /** @type {Record<string, 'fast' | 'slow'>} */ ({
  '9e3779b1': 'fast',
  17156075: 'slow',
});
const MOVES = /** @type {const} */ ([
  ['attack', 'Attack', 2],
  ['special', 'Special', 3],
]);
const seedNumber = (/** @type {string} */ s) => parseInt(s, 16) >>> 0;

/** @param {string} move @param {string} name @param {string} seed @param {import('../../lib/Game/Heap/VfxHeap.js').default['enemyMove'] extends (a: any, b: any, c?: infer O) => any ? O : never} [options] */
function heapAtCast(move, name, seed, options) {
  const heap = new VfxHeap(
    loadHeapDump(`crystal_core_L-fire-slow_inround_later_${move}_${seed}_prompt0`),
    {
      party: 'L-fire-slow',
    },
  );
  heap.roundStart();
  heap.enemyMove('CRYSTAL_CORE', name, options);
  return heap;
}

describe('a cast after a second move, party L-fire-slow', () => {
  for (const [move, name, round] of MOVES) {
    for (const spell of SPELLS) {
      for (const seed of SEEDS) {
        it(`${name} then ${spell}, seed ${seed}: a word the model knows is the live word`, () => {
          const heap = heapAtCast(move, name, seed, {
            repeat: true,
            phase: move === 'special' ? PHASE[seed] : undefined,
          });
          const p = predictCast(heap, spell, move, seedNumber(seed), { round, rolls: 0 });
          const want = liveList(liveWords(move, 'after_move', '_L-fire-slow')[spell][seed]);
          p.words.forEach((w, i) => {
            if (w !== want[i])
              assert.ok(p.unknown[i], `${spell} word ${i}: model ${w} live ${want[i]}`);
          });
        });
      }
    }
  }

  it("Flaming Arrow word 5 is the kill spell's residue in the heap, not the image's constant", () => {
    // the in-round menu image keeps the words the round did not change: after a Luc Fire kill the word is the seed's residue (0x2d05007e
    // after a Viktor + Flik kill, which is what the image was recorded with)
    const heap = heapAtCast('special', 'Special', '9e3779b1', { repeat: true, phase: 'fast' });
    const p = predictCast(heap, 'FlamingArrow', 'special', seedNumber('9e3779b1'), {
      round: 3,
      rolls: 0,
    });
    const live = liveList(
      liveWords('special', 'after_move', '_L-fire-slow').FlamingArrow['9e3779b1'],
    );
    assert.strictEqual(p.words[5], live[5]);
    assert.notStrictEqual(live[5], 0x7e);
  });

  it("without the recorded phase the second Special's image is not used (its blocks are unknown)", () => {
    const withPhase = heapAtCast('special', 'Special', '9e3779b1', { repeat: true, phase: 'fast' });
    const without = heapAtCast('special', 'Special', '9e3779b1', { repeat: true });
    assert.ok(withPhase.state.known.size > without.state.known.size + 1000);
    const once = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_special_9e3779b1_preconfirm'), {
      party: 'L-fire-slow',
    });
    once.roundStart();
    once.enemyMove('CRYSTAL_CORE', 'Special');
    const known = once.state.known.size;
    once.enemyMove('CRYSTAL_CORE', 'Special'); // seen before: no image
    assert.ok(once.state.known.size <= known);
  });
});

describe('the rover at castpre', () => {
  // the cast's own loader buffer (16384 bytes, allocated and freed before the cast context) leaves the rover on the list head
  for (const [move, name] of /** @type {const} */ ([
    ['attack', 'Attack'],
    ['special', 'Special'],
  ])) {
    for (const seed of ['9e3779b1', '3c6ef362']) {
      it(`${name}, seed ${seed}: after the loader's alloc and free the rover is the dump's`, () => {
        const heap = new VfxHeap(
          loadHeapDump(`crystal_core_L-fire-slow_${move}_${seed}_preconfirm`),
          {
            party: 'L-fire-slow',
          },
        );
        heap.roundStart();
        heap.enemyMove('CRYSTAL_CORE', name);
        const model = heap.state.heap.clone();
        model.free(model.alloc(16384));
        const real = loadArena(`crystal_core_L-fire-slow_inround_${move}_${seed}_castpre`).sidecar;
        assert.strictEqual(model.rover, Number(real.rover));
      });
    }
  }
});
