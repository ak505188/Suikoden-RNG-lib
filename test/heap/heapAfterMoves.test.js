import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import {
  SPELLS,
  carriedHeap,
  liveList,
  liveWords,
  loadHeapDump,
  predictCast,
} from '../helpers/heapAfterMoves.js';

// The five stale-word spells' words and RNG counts at the cast after a Crystal Core enemy move (heap_after_move_words_*.txt), against
// the heap carried forward with the moves' footprint events (VfxHeap), and, for the ports themselves, against the real dump taken
// at the next prompt.

const MOVES = /** @type {const} */ (['attack', 'special']);
const seedNumber = (/** @type {string} */ s) => parseInt(s, 16) >>> 0;

describe('the five stale-word spells from the real after-move dumps (the ports are exact)', () => {
  for (const move of MOVES) {
    const live = liveWords(move);
    for (const seed of ['9e3779b1', '3c6ef362']) {
      const heap = new VfxHeap(
        loadHeapDump(`crystal_core_L-fire_after_${move}_${seed}_preconfirm`),
      );
      heap.roundStart();
      for (const spell of SPELLS) {
        it(`${move} ${seed} ${spell}: words and RNG calls`, () => {
          const p = predictCast(heap, spell, move, seedNumber(seed));
          assert.ok(p.complete);
          assert.deepStrictEqual(p.words, liveList(live[spell][seed]));
          assert.strictEqual(p.calls, live[spell][seed].calls);
        });
      }
    }
  }
});

describe('the heap carried forward with the moves footprints', () => {
  for (const move of MOVES) {
    const live = liveWords(move);
    for (const spell of SPELLS) {
      it(`${move} ${spell}: a word the model knows is never wrong, an unknown one is flagged`, () => {
        for (const seed of Object.keys(live[spell])) {
          const p = predictCast(carriedHeap(move, seedNumber(seed)), spell, move, seedNumber(seed));
          const want = liveList(live[spell][seed]);
          p.words.forEach((word, i) => {
            if (word !== want[i])
              assert.ok(
                p.unknown[i],
                `${spell} seed ${seed} word ${i}: model ${word} live ${want[i]}`,
              );
          });
        }
      });
    }
  }

  it('attack: Flaming Arrow is fully known and exact (words and RNG calls, 20 seeds)', () => {
    const live = liveWords('attack').FlamingArrow;
    for (const seed of Object.keys(live)) {
      const p = predictCast(
        carriedHeap('attack', seedNumber(seed)),
        'FlamingArrow',
        'attack',
        seedNumber(seed),
      );
      assert.ok(p.complete, seed);
      assert.deepStrictEqual(p.words, live[seed].words, seed);
      assert.strictEqual(p.calls, live[seed].calls, seed);
    }
  });

  it('attack: Explosion is fully known and exact too (the Attack block image), words and RNG calls', () => {
    const live = liveWords('attack').Explosion;
    for (const seed of Object.keys(live)) {
      const p = predictCast(
        carriedHeap('attack', seedNumber(seed)),
        'Explosion',
        'attack',
        seedNumber(seed),
      );
      assert.ok(p.complete, seed);
      assert.deepStrictEqual(p.words, live[seed].words, seed);
      assert.strictEqual(p.calls, live[seed].calls, seed);
    }
  });

  it('special: Explosion, Thor, Black Shadow and Hell are fully predicted, words and RNG calls (20 seeds)', () => {
    for (const spell of /** @type {const} */ (['Explosion', 'Thor', 'BlackShadow', 'Hell'])) {
      const live = liveWords('special')[spell];
      for (const seed of Object.keys(live)) {
        const p = predictCast(
          carriedHeap('special', seedNumber(seed)),
          spell,
          'special',
          seedNumber(seed),
        );
        assert.deepStrictEqual(p.words, liveList(live[seed]), `${spell} ${seed}`);
        assert.strictEqual(p.calls, live[seed].calls, `${spell} ${seed}`);
      }
    }
  });

  // What the model still cannot know, as counted over the 20 seeds: the move's hit-effect particle data (positions, velocities,
  // scale), which varies between seeds and follows the move's own rolls. The block images mark those words unknown. Regression
  // values of the comparison in notes/*_blockimages_simulator.md.
  const DIFFERING_WORDS = {
    attack: { FlamingArrow: 0, Explosion: 0, Thor: 40, BlackShadow: 540, Hell: 500 },
    special: { FlamingArrow: 20, Explosion: 0, Thor: 0, BlackShadow: 0, Hell: 0 },
  };
  for (const move of MOVES) {
    for (const spell of SPELLS) {
      it(`${move} ${spell}: ${DIFFERING_WORDS[move][spell]} words differ over 20 seeds, all of them flagged unknown`, () => {
        const live = liveWords(move)[spell];
        let differing = 0;
        for (const seed of Object.keys(live)) {
          const p = predictCast(carriedHeap(move, seedNumber(seed)), spell, move, seedNumber(seed));
          const want = liveList(live[seed]);
          p.words.forEach((w, i) => {
            if (w !== want[i]) differing++;
          });
        }
        assert.strictEqual(differing, DIFFERING_WORDS[move][spell]);
      });
    }
  }
});
