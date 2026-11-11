// The whole-arena diff of the VFX heap simulator against the recorded arena after every round of the ten recorded scenarios
// (test/fixtures/heap/rounds): how many words the simulator verifies, states wrongly, guesses or does not produce (lib/Game/Heap/ArenaDiff.js).
// usage: node scripts/heapArenaDiff.js [--blocks] [--write]
//   --blocks  also list the blocks with the most words that are wrong or not produced
//   --write   write the numbers to test/fixtures/heap/tables/arena_diff_baseline.json (the ratchet test/heap/heapArenaDiff.test.js reads)
import fs from 'node:fs';
import { diffArena, summary, worstBlocks } from '../lib/Game/Heap/ArenaDiff.js';
import { SCENARIOS, play } from '../test/helpers/heapScenarios.js';
import { loadArena } from '../test/helpers/heapDumps.js';

const SEED = '9e3779b1';
// what the big persistent blocks are, by their size (the census: battle struct 13356 bytes, background 2 x 10240, the menu's two 6000-byte
// packet buffers and 12776-byte object), plus the 8-byte header
/** @type {Record<number, string>} */
const LABEL = {
  13368: 'battle struct',
  10248: 'background',
  6008: 'packet buffer',
  12784: 'menu object',
};
const blocks = process.argv.includes('--blocks');
const write = process.argv.includes('--write');
/** @typedef {{ wrong: number, gap: number, partialWrong: number }} Bad */
/** @type {Record<string, Record<string, { layoutDiffers: number, free: Bad, menu: Bad, live: Bad }>>} */
const baseline = {};
/** @param {import('../lib/Game/Heap/ArenaDiff.js').Counts} c @returns {Bad} */
const bad = (c) => ({ wrong: c.wrong, gap: c.gap, partialWrong: c.partialWrong });

for (const scenario of SCENARIOS) {
  const k = Number(scenario.slice(-1));
  play(scenario, SEED, {
    after: (round, heap) => {
      if (round > k + 1) return;
      const real = loadArena(
        `rounds/crystal_core_L-fire-slow_${scenario}_${SEED}_r${round + 1}_preconfirm`,
      );
      const report = diffArena(heap, real);
      (baseline[scenario] ??= {})[round] = {
        layoutDiffers: report.layoutDiffers ?? -1,
        free: bad(report.byKind.free),
        menu: bad(report.byKind.menu),
        live: bad(report.byKind.live),
      };
      console.log(`${scenario} after round ${round}:\n${summary(report)}`);
      if (blocks)
        for (const b of worstBlocks(report, 6))
          console.log(
            `    0x${b.addr.toString(16)} ${b.bytes} B ${b.free ? 'free' : (LABEL[b.bytes] ?? 'used')}: gap ${b.counts.gap} wrong ${b.counts.wrong} partialWrong ${b.counts.partialWrong}`,
          );
    },
  });
}
if (write) {
  fs.writeFileSync(
    new URL('../test/fixtures/heap/tables/arena_diff_baseline.json', import.meta.url),
    `${JSON.stringify(baseline, null, 1)}\n`,
  );
  console.log('written');
}
