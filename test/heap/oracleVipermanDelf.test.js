import { it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { diffArena } from '../../lib/Game/Heap/ArenaDiff.js';
import { readHeapDump } from '../../heap.js';

/**
 * The mixed group Viperman Lv30 + Delf Lv25 (ASK 36 part 4, ASK 38): the two monsters' Attacks run concurrently, Delf's first allocation 14 frames before Viperman's. The
 * battle model does not start them like that (it dispatches Delf after Viperman's attack, tick 292 against the recording's 14 frames later), so the recorded moves are replayed
 * with their recorded first-allocation frames: the arena at the next prompt has the recorded layout and no wrong word in free memory, for every round before Delf's death
 * (3 seeds, slow and fast party).
 */
const SPARK = /** @type {Record<number, string>} */ ({
  55: 'AttackHit',
  88: 'Attack',
  92: 'AttackC',
  103: 'AttackD',
});

for (const [party, dir, tag] of /** @type {const} */ ([
  ['L-fire-slow', 'oracle_viperman_delf_slow', 'L-fire-slow'],
  ['L-fire', 'oracle_viperman_delf_fast', 'L-fire'],
])) {
  const base = new URL(`../fixtures/heap/${dir}/`, import.meta.url);
  const info = JSON.parse(fs.readFileSync(new URL('rounds.json', base), 'utf8')).rounds;
  for (const seed of Object.keys(info)) {
    it(`${tag}, seed ${seed}: the replayed moves leave the recorded layout and free memory`, async () => {
      const stem = (/** @type {number} */ r) =>
        new URL(`viperman_delf_${tag}_${seed}_r${r}_prompt`, base).pathname;
      const heap = new VfxHeap(await readHeapDump(stem(1)), { party, index: 0 });
      let checked = 0;
      for (const round of info[seed]) {
        // (rounds up to Delf's death: his death block is not modelled; the Viperman-alone rounds follow it)
        if (round.death.length > 0 || round.delf > 200 || round.round > 3) break;
        heap.roundStart();
        heap.enemyMove('VIPERMAN', 'Attack', { tick: round.viperman });
        const variant = SPARK[round.sparks[0] - round.delf];
        assert.ok(
          variant,
          `round ${round.round}: Delf's spark at +${round.sparks[0] - round.delf}`,
        );
        heap.enemyMove('DELF', variant, { tick: round.delf });
        heap.roundEnd();
        const next = await readHeapDump(stem(round.round + 1));
        const real = {
          arena: next.arena,
          sidecar: JSON.parse(fs.readFileSync(`${stem(round.round + 1)}.json`, 'utf8')),
        };
        const report = diffArena(heap, real);
        assert.strictEqual(report.layoutDiffers, 0, `round ${round.round} layout`);
        assert.strictEqual(report.byKind.free.wrong, 0, `round ${round.round} free wrong`);
        checked++;
      }
      assert.ok(checked >= 1, 'a round was checked');
    });
  }
}
