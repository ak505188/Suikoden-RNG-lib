import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { ENEMY_MOVE_IMAGES } from '../../lib/Game/Heap/EnemyMoveImages.js';
import { ENEMY_MOVE_EVENTS } from '../../lib/Game/Heap/EnemyMoveEvents.js';
import {
  SPELLS,
  liveList,
  liveWords,
  loadHeapDump,
  loadArena,
  predictCast,
} from '../helpers/heapAfterMoves.js';

// The block images (what Crystal Core's moves write into the blocks they allocate and into the Fight menu's blocks, Suikoden-Bizhawk-HUD
// heap_block_images) replayed as known writes, and the enemy-first scenarios: the move and the cast in the same round (a slow party,
// 'L-fire-slow', its in-round images; a cast in a later round uses the party's next-prompt image).

const MOVES = /** @type {const} */ ([
  ['attack', 'Attack'],
  ['special', 'Special'],
]);
const seedNumber = (/** @type {string} */ s) => parseInt(s, 16) >>> 0;

const IMAGES = ENEMY_MOVE_IMAGES.CRYSTAL_CORE;
const SEEDS = ['9e3779b1', '3c6ef362'];
/** Rolls the round has made before the cast when Crystal Core's Special moved first (party L-fire-slow); the Attack's vary by seed */
const SPECIAL_FIRST_ROLLS = {
  FlamingArrow: 136,
  Explosion: 137,
  Thor: 136,
  BlackShadow: 137,
  Hell: 137,
};

/** @param {string} name */
function arenaWords(name) {
  const dump = loadArena(name);
  const view = new DataView(dump.arena.buffer, dump.arena.byteOffset);
  return (/** @type {number} */ addr) => view.getUint32(addr - 0x80182000, true);
}

describe('Crystal Core block images', () => {
  for (const [move, name] of MOVES) {
    /** @type {[string, import('../../lib/Game/Heap/EnemyMoveImages.js').BlockSet | undefined, string][]} */
    const sets = [
      [
        'L-fire next prompt',
        IMAGES[name]['L-fire'].next,
        `crystal_core_L-fire_after_${move}_9e3779b1_preconfirm`,
      ],
      [
        'L-fire-slow in round',
        IMAGES[name]['L-fire-slow'].inRound,
        `crystal_core_L-fire-slow_inround_${move}_9e3779b1_castpre`,
      ],
      [
        'L-fire-slow next prompt',
        IMAGES[name]['L-fire-slow'].next,
        `crystal_core_L-fire-slow_after_${move}_9e3779b1_preconfirm`,
      ],
    ];
    for (const [label, image, dumpName] of sets) {
      if (!image) continue;
      it(`${name}, ${label}: every image block sits where the footprint's allocation put it`, () => {
        const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'));
        heap.roundStart();
        const ptrs = heap.applyEvents(ENEMY_MOVE_EVENTS.CRYSTAL_CORE[name]);
        for (const [n, ptr] of image.blocks) assert.strictEqual(ptrs[n - 1], ptr, `block ${n}`);
        assert.strictEqual(image.blocks.length, ptrs.length);
      });

      it(`${name}, ${label}: the constant words equal the real dump's (seed 9e3779b1)`, () => {
        const word = arenaWords(dumpName);
        for (const [, ptr, hex, varying] of [...image.blocks, ...image.menu]) {
          for (let i = 0; i < hex.length / 8; i++) {
            if (varying.includes(i)) continue;
            assert.strictEqual(parseInt(hex.slice(i * 8, i * 8 + 8), 16), word(ptr + 4 * i));
          }
        }
      });
    }
  }
});

/** The words the model calls known must be the real ones, over the whole arena; returns how many it called known */
function assertKnownWordsReal(/** @type {VfxHeap} */ heap, /** @type {string} */ dumpName) {
  const word = arenaWords(dumpName);
  let known = 0;
  for (const [addr, value] of heap.state.known) {
    known++;
    assert.strictEqual(value, word(addr), `0x${addr.toString(16)}`);
  }
  return known;
}

describe('the carried heap against in-round dumps (party L-fire-slow)', () => {
  for (const [move, name] of MOVES) {
    for (const seed of SEEDS) {
      const start = `crystal_core_L-fire-slow_${move}_${seed}_preconfirm`;
      it(`${name}, seed ${seed}: right before a cast in the same round, no known word is wrong, same free list`, () => {
        const heap = new VfxHeap(loadHeapDump(start), { party: 'L-fire-slow' });
        heap.roundStart();
        heap.enemyMove('CRYSTAL_CORE', name);
        const dumpName = `crystal_core_L-fire-slow_inround_${move}_${seed}_castpre`;
        assert.ok(assertKnownWordsReal(heap, dumpName) > 200);
        const real = loadArena(dumpName).sidecar.freeListRaw.map(
          (/** @type {[string, number]} */ [a, u]) => [Number(a), u],
        );
        const byAddress = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a[0] - b[0];
        assert.deepStrictEqual(heap.state.heap.freeList().sort(byAddress), real.sort(byAddress));
      });
    }
  }
  for (const seed of SEEDS) {
    it(`Special, seed ${seed}: at the next prompt (menu rebuilt), no known word is wrong`, () => {
      const heap = new VfxHeap(
        loadHeapDump(`crystal_core_L-fire-slow_special_${seed}_preconfirm`),
        {
          party: 'L-fire-slow',
        },
      );
      heap.roundStart();
      heap.enemyMove('CRYSTAL_CORE', 'Special');
      heap.roundEnd();
      assert.ok(
        assertKnownWordsReal(heap, `crystal_core_L-fire-slow_after_special_${seed}_preconfirm`) >
          5000,
      );
    });
  }
});

describe('the move and the cast in one round (enemy first, party L-fire-slow)', () => {
  for (const [move, name] of MOVES) {
    for (const spell of SPELLS) {
      const live = liveWords(move, 'enemy_first')[spell];
      for (const seed of SEEDS) {
        const cast = () => {
          const heap = new VfxHeap(
            loadHeapDump(`crystal_core_L-fire-slow_${move}_${seed}_preconfirm`),
            {
              party: 'L-fire-slow',
            },
          );
          heap.roundStart();
          heap.enemyMove('CRYSTAL_CORE', name);
          return heap;
        };
        it(`${name} then ${spell}, seed ${seed}: a word the model knows is the live word, an unknown one is flagged`, () => {
          const p = predictCast(cast(), spell, move, seedNumber(seed));
          const want = liveList(live[seed]);
          p.words.forEach((w, i) => {
            if (w !== want[i])
              assert.ok(p.unknown[i], `${spell} word ${i}: model ${w} live ${want[i]}`);
          });
        });
        if (move === 'special') {
          it(`Special then ${spell}, seed ${seed}: the RNG count is the live one`, () => {
            const p = predictCast(cast(), spell, move, seedNumber(seed), {
              round: 2,
              rolls: SPECIAL_FIRST_ROLLS[spell],
            });
            assert.strictEqual(p.calls, live[seed].calls);
          });
        }
      }
    }
  }
});
