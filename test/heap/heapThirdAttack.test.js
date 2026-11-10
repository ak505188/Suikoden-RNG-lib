import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { drawIndex, scanPrediction } from '../../lib/Game/Heap/ScanPrediction.js';
import RNG from '../../lib/rng.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

const HIT_PACKETS = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/hit_key_packets.json', import.meta.url), 'utf8'),
);

// A third Attack (rounds 1, 2 and 3 all Defend, party L-fire-slow; heap_attack_spawn/hit_key_table_round3.json, keys_blocks/*_r3_*):
// its 24 packets are the round-2 table's at (camera, slot, the round's own index, round 1's index), its 52/80-byte blocks the round-1
// block table's at (camera, slot, round 1's index), and idx_r = (r + menu delays up to r + failed scan passes up to r) mod 2.

const tables = new URL('../fixtures/heap/tables/', import.meta.url);
/** @type {{ runs: { seed: string, delays: number[], slot: number, firstDraw: number, idxRound3: number, idxRounds12: number[] }[] }} */
const SCAN = JSON.parse(fs.readFileSync(new URL('hit_scan_rows_round3.json', tables), 'utf8'));
/** @type {Record<string, { allocs: string, packets: string, blocks: string }>} the next prompt of round 3, no menu delay, per seed */
const WORDS = JSON.parse(fs.readFileSync(new URL('attack_words_round3_D000.json', tables), 'utf8'));
const seedNumber = (/** @type {string} */ s) => parseInt(s, 16) >>> 0;
const sum = (/** @type {number[]} */ a) => a.reduce((x, y) => x + y, 0);

describe('third Attack: scan, draw index and tables (144 runs, menu delays 0 or 1 in each round)', () => {
  it('slot, first draw and the draw index of each round follow from the passes and the delays', () => {
    assert.strictEqual(SCAN.runs.length, 144);
    for (const run of SCAN.runs) {
      const s = [1, 2, 3].map((r) => scanPrediction(seedNumber(run.seed), r));
      assert.deepStrictEqual([s[2].slot, 50 + s[2].passes], [run.slot, run.firstDraw], run.seed);
      const idx = [1, 2, 3].map((r) =>
        drawIndex(r, sum(s.slice(0, r).map((x) => x.passes)), sum(run.delays.slice(0, r))),
      );
      assert.deepStrictEqual(idx, [...run.idxRounds12, run.idxRound3], run.seed);
    }
  });

  it('the tables give the recorded packets and blocks (18 runs, no delay)', () => {
    for (const [seed, words] of Object.entries(WORDS)) {
      const s = [1, 2, 3].map((r) => scanPrediction(seedNumber(seed), r));
      const first = drawIndex(1, s[0].passes);
      const third = drawIndex(3, sum(s.map((x) => x.passes)));
      const { camera, slot } = s[2];
      assert.strictEqual(HIT_PACKETS.round2[`${camera}/${slot}/${third}/${first}`], words.packets);
      assert.strictEqual(HIT_PACKETS.blocks[`${camera}/${slot}/${first}`], words.blocks);
    }
  });
});

describe('a Battle with three Attacks, party L-fire-slow: the heap at the third next prompt', () => {
  const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
  const defend = { type: ACTION_TYPES.DEFEND };
  for (const [seed, words] of Object.entries(WORDS)) {
    const slot3 = scanPrediction(seedNumber(seed), 3).slot === 3;
    it(`seed ${seed}${slot3 ? ' (slot 3)' : ''}: every hit-effect word is known and the recorded one`, () => {
      const characters = structuredClone(/** @type {any} */ (run).characters);
      characters[0].stats.SPD = 1;
      characters[3].stats.SPD = 1;
      const rng = new RNG(0);
      // the layout is the same for every seed: one dump serves
      const heap = new VfxHeap(
        loadHeapDump('crystal_core_L-fire-slow_attack_9e3779b1_preconfirm'),
        {
          party: 'L-fire-slow',
        },
      );
      const battle = new Battle({
        party: PlayerParty.fromCharacterJSON(characters),
        enemies: new EnemyParty([new Enemy(ENEMY_KEYS.CRYSTAL_CORE)]),
        rng,
        freeWillGate: 10,
        heap,
      });
      for (const round of [1, 2, 3]) {
        rng.raw = (seedNumber(seed) + round) >>> 0;
        battle.playTurn(Array(6).fill(defend));
      }
      assert.strictEqual(heap.attacks.length, 3);
      // the 39 allocations of the Attack: ptr:size; 40-byte ones are the packets, the others the 13- and 20-word blocks
      let packet = 0;
      let odd = 0;
      let checked = 0;
      for (const alloc of words.allocs.split(',')) {
        const [ptr, size] = alloc.split(':');
        const base = parseInt(ptr, 16);
        const hex =
          Number(size) === 40
            ? words.packets.slice(packet * 80, ++packet * 80)
            : words.blocks.slice(odd, (odd += (Number(size) / 4) * 8));
        for (let i = 0; i < hex.length / 8; i++) {
          const addr = base + 4 * i;
          assert.strictEqual(
            heap.state.known.get(addr),
            parseInt(hex.slice(i * 8, i * 8 + 8), 16),
            `0x${addr.toString(16)}`,
          );
          checked++;
        }
      }
      assert.strictEqual(checked, 449);
    });
  }
});
