import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import {
  SPELLS,
  liveList,
  liveWords,
  loadHeapDump,
  predictCast,
} from '../helpers/heapAfterMoves.js';

// The Attack's hit-effect packets (the GPU packet words of the 12 sprite resources) at the cast are fixed by (camera roll % 3, the party
// slot hit, the parity of the last draw frame, i.e. of the failed scan passes): hit_effect_inputs_L-fire-slow.txt. The table's words for a key come from the first seed
// of the group; seed 9e3779b1 (0 / 1 / 1) is not that seed (81af14c1 is), so it is a held-out check.
const HIT = { camera: 0, target: 1, passes: 0, round: 1 };

describe('Attack hit-effect packets from (camera % 3, target slot, draw parity)', () => {
  for (const spell of SPELLS) {
    it(`Attack then ${spell}, seed 9e3779b1: every word is known and the live word`, () => {
      const heap = new VfxHeap(
        loadHeapDump('crystal_core_L-fire-slow_attack_9e3779b1_preconfirm'),
        {
          party: 'L-fire-slow',
        },
      );
      heap.roundStart();
      heap.enemyMove('CRYSTAL_CORE', 'Attack', { hit: HIT });
      const p = predictCast(heap, spell, 'attack', 0x9e3779b1);
      const want = liveList(liveWords('attack', 'enemy_first')[spell]['9e3779b1']);
      assert.deepStrictEqual(p.words, want);
      // Black Shadow and Hell: their 40 posX words are not flagged by the image, the rest are known
      if (spell === 'FlamingArrow' || spell === 'Explosion' || spell === 'Thor')
        assert.ok(p.complete);
    });
  }

  it('a key the table does not have leaves the packet words unknown', () => {
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_attack_9e3779b1_preconfirm'), {
      party: 'L-fire-slow',
    });
    heap.roundStart();
    heap.enemyMove('CRYSTAL_CORE', 'Attack', { hit: { ...HIT, target: 0 } });
    assert.ok(!predictCast(heap, 'Thor', 'attack', 0x9e3779b1).complete);
  });
});
