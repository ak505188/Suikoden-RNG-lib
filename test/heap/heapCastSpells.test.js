import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { spellRand } from '../../lib/Game/Magic/Behavior.js';
import { CAST_ROUND, PRE_CAST_ROLLS, carriedHeap, liveWords } from '../helpers/heapAfterMoves.js';

// spellRand with the battle's heap model: Explosion, Thor, Black Shadow and Hell read their stale words from it, as Flaming Arrow does.
const CELLS = /** @type {const} */ ([
  ['attack', 'FlamingArrow', SPELLS.FLAMING_ARROWS, 20],
  ['attack', 'Explosion', SPELLS.EXPLOSION, 20],
  ['special', 'FlamingArrow', SPELLS.FLAMING_ARROWS, 19],
  ['special', 'Explosion', SPELLS.EXPLOSION, 20],
  ['special', 'Thor', SPELLS.THOR, 20],
  ['special', 'BlackShadow', SPELLS.BLACK_SHADOW, 20],
  ['special', 'Hell', SPELLS.HELL, 20],
]);

describe('spellRand with a heap model, after a Crystal Core move (20 seeds)', () => {
  for (const [move, name, spell, expected] of CELLS) {
    it(`${move} then ${name}: the RNG count is the live one in ${expected} of 20 seeds`, () => {
      const live = liveWords(move)[name];
      let exact = 0;
      for (const [seed, data] of Object.entries(live)) {
        const heap = carriedHeap(move, parseInt(seed, 16) >>> 0);
        const rng = new RNG((parseInt(seed, 16) + CAST_ROUND[move]) >>> 0).jump(
          PRE_CAST_ROLLS[name],
        );
        const calls = spellRand({
          spell,
          rng,
          heap,
          party: /** @type {any} */ (null),
          enemies: /** @type {any} */ (null),
        });
        if (calls === data.calls) exact++;
      }
      assert.strictEqual(exact, expected);
    });
  }

  it("a cast leaves the heap changed: the next cast sees the first one's blocks", () => {
    const heap = carriedHeap('special', 0x9e3779b1);
    const before = JSON.stringify(heap.state.heap.freeList());
    heap.castSpell('Thor', new RNG(1));
    assert.notStrictEqual(JSON.stringify(heap.state.heap.freeList()), before);
  });
});
