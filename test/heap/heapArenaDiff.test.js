import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { diffArena } from '../../lib/Game/Heap/ArenaDiff.js';
import { SCENARIOS, play } from '../helpers/heapScenarios.js';
import { loadArena } from '../helpers/heapDumps.js';

// The whole-arena diff of the simulator against the recorded arena after every round of the ten recorded scenarios (lib/Game/Heap/
// ArenaDiff.js; `node scripts/heapArenaDiff.js --blocks` prints where the differences are). The simulator is not exact yet: this is a
// ratchet. The block layout (every block's address, size and whether it is free) must be the game's; the words the simulator states
// wrongly in free memory and in the Fight menu's blocks (the ones that become stale data) must be zero; and each group's wrong words,
// gaps and wrong partial words may not grow over the baseline in tables/arena_diff_baseline.json. The live scene blocks (battle struct,
// backgrounds, actors) are tracked apart: the game animates them every frame and the simulator does not run that yet.
// When a count drops, write the new baseline (`node scripts/heapArenaDiff.js --write`) in the same commit. The goal is zero everywhere.
const SEED = '9e3779b1';
/** @typedef {{ wrong: number, gap: number, partialWrong: number }} Bad */
const baseline =
  /** @type {Record<string, Record<string, { layoutDiffers: number, free: Bad, menu: Bad, live: Bad }>>} */ (
    JSON.parse(
      fs.readFileSync(
        new URL('../fixtures/heap/tables/arena_diff_baseline.json', import.meta.url),
        'utf8',
      ),
    )
  );

describe('the simulated arena against the recorded arena after every round (10 scenarios, seed 9e3779b1)', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario}: the layout is the game's, no wrong word in free memory or the menu, no count grows`, () => {
      const k = Number(scenario.slice(-1));
      let rounds = 0;
      play(scenario, SEED, {
        menuFrames: 19,
        after: (round, heap) => {
          if (round > k + 1) return;
          const real = loadArena(
            `rounds/crystal_core_L-fire-slow_${scenario}_${SEED}_r${round + 1}_preconfirm`,
          );
          const report = diffArena(heap.closedMenu(), real);
          const want = baseline[scenario][round];
          const at = `${scenario} after round ${round}`;
          assert.strictEqual(report.layoutDiffers, 0, `${at}: the block layout differs`);
          for (const kind of /** @type {const} */ (['free', 'menu'])) {
            assert.strictEqual(report.byKind[kind].wrong, 0, `${at}: wrong words in ${kind}`);
          }
          for (const kind of /** @type {const} */ (['free', 'menu', 'live'])) {
            const got = report.byKind[kind];
            for (const field of /** @type {const} */ (['wrong', 'gap', 'partialWrong'])) {
              assert.ok(
                got[field] <= want[kind][field],
                `${at}: ${kind} ${field} ${got[field]} > ${want[kind][field]}`,
              );
            }
          }
          rounds++;
        },
      });
      assert.strictEqual(
        rounds,
        Object.keys(baseline[scenario]).length,
        `${scenario}: rounds compared`,
      );
    });
  }
});
