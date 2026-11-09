import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { HIT_KEY_TABLES } from '../../lib/Game/Heap/HitKeyTables.js';
import { drawIndex, scanPrediction } from '../../lib/Game/Heap/ScanPrediction.js';
import {
  SPELLS,
  liveList,
  liveWords,
  loadArena,
  loadHeapDump,
  predictCast,
} from '../helpers/heapAfterMoves.js';

// Crystal Core's Attack: the target slot, the failed scan passes and the camera class come from the round's RNG (ScanPredict.py in
// Suikoden-Bizhawk-HUD), the hit effect's 24 forty-byte packets from the round-1 and round-2 key tables, and the second Special's
// particle phase from the parity of round 1's failed passes.

const tables = new URL('../fixtures/heap/tables/', import.meta.url);
/** @type {{ rows: [string, number, string, number, number, number][] }} */
const SCAN = JSON.parse(fs.readFileSync(new URL('hit_scan_rows.json', tables), 'utf8'));
/** @type {{ round1: Record<string, string>, round2: Record<string, string> }} the 24 packets at castpre, hex, per seed (slow party) */
const PACKETS = JSON.parse(
  fs.readFileSync(new URL('attack_packets_L-fire-slow.json', tables), 'utf8'),
);
const seedNumber = (/** @type {string} */ s) => parseInt(s, 16) >>> 0;

describe('the target scan from the RNG (scripts/heap/ScanPredict.py)', () => {
  const PREFIX = /** @type {Record<string, [number, number]>} */ ({
    'L-fire-slow': [23, 50],
    'L-fire': [28, 56],
  });
  it('slot, failed passes and first draw frame match the recordings (round 1 and 2, both parties)', () => {
    let n = 0;
    for (const [seed, round, party, slot, first] of SCAN.rows) {
      const [prefix, base] = PREFIX[party];
      const p = scanPrediction(seedNumber(seed), round, prefix);
      assert.deepStrictEqual(
        [p.slot, base + p.passes],
        [slot, first],
        `${party} r${round} ${seed}`,
      );
      n++;
    }
    assert.strictEqual(n, 310);
  });

  it('the draw-buffer index at the last draw follows from the passes (round 2: of both rounds)', () => {
    for (const [seed, round, party, , , index] of SCAN.rows) {
      const [prefix] = PREFIX[party];
      const p1 = scanPrediction(seedNumber(seed), 1, prefix).passes;
      const p = scanPrediction(seedNumber(seed), round, prefix).passes;
      assert.strictEqual(
        drawIndex(round, round === 1 ? p : p + p1),
        index,
        `${party} r${round} ${seed}`,
      );
    }
  });
});

describe('the key tables give the hit effect packets (slow party, 20 seeds)', () => {
  const seeds = Object.keys(PACKETS.round1);
  for (const round of /** @type {const} */ ([1, 2])) {
    it(`round ${round}: every packet word of the key is the live word`, () => {
      for (const seed of seeds) {
        const p1 = scanPrediction(seedNumber(seed), 1);
        const p = scanPrediction(seedNumber(seed), round);
        const first = drawIndex(1, p1.passes);
        const key =
          round === 1
            ? `${p.camera}/${p.slot}/${first}`
            : `${p.camera}/${p.slot}/${drawIndex(2, p.passes + p1.passes)}/${first}`;
        const table = round === 1 ? HIT_KEY_TABLES.round1 : HIT_KEY_TABLES.round2;
        assert.strictEqual(table[key], PACKETS[`round${round}`][seed], `${seed} ${key}`);
      }
    });
  }

  it('the heap knows the packet words of the key; a second Attack without round 1 leaves them unknown', () => {
    const seed = '9e3779b1';
    const p1 = scanPrediction(seedNumber(seed), 1);
    const p2 = scanPrediction(seedNumber(seed), 2);
    const start = () =>
      new VfxHeap(loadHeapDump(`crystal_core_L-fire-slow_inround_later_attack_${seed}_prompt0`), {
        party: 'L-fire-slow',
      });
    const known = (/** @type {{ round: number, previousPasses?: number[] }} */ extra) => {
      const heap = start();
      heap.roundStart();
      heap.enemyMove('CRYSTAL_CORE', 'Attack', {
        repeat: true,
        hit: { camera: p2.camera, target: p2.slot, passes: p2.passes, ...extra },
      });
      return heap.state.known.size;
    };
    assert.ok(known({ round: 2, previousPasses: [p1.passes] }) > known({ round: 2 }) + 200);
  });
});

describe('the second Special: particle phase from the parity of round 1 failed passes', () => {
  const base = liveWords('special', 'after_move', '_L-fire-slow');
  const slowSeeds = Object.keys(liveWords('special', 'after_move', '_L-fire-slow_slowphase').Thor);

  it('odd passes are exactly the 23 slow-phase seeds, of the 40 recorded', () => {
    const all = [...new Set([...Object.keys(base.Thor), ...slowSeeds])];
    assert.strictEqual(all.length, 40);
    assert.strictEqual(slowSeeds.length, 23);
    for (const seed of all)
      assert.strictEqual(
        scanPrediction(seedNumber(seed), 1).passes % 2 === 1,
        slowSeeds.includes(seed),
        seed,
      );
  });

  // the Special after round 1's Attack: the heap sees that Attack, so it takes the phase from its passes
  for (const seed of ['17156075', '185eaefe', '19a7fd87', '9e3779b1']) {
    for (const spell of SPELLS) {
      it(`Special then ${spell}, seed ${seed}: a known word is the live word, the phase from the index, set from the Attack's passes`, () => {
        const live = (
          slowSeeds.includes(seed)
            ? liveWords('special', 'after_move', '_L-fire-slow_slowphase')
            : base
        )[spell][seed];
        const heap = new VfxHeap(
          loadHeapDump(`crystal_core_L-fire-slow_inround_later_special_${seed}_prompt0`),
          { party: 'L-fire-slow' },
        );
        // the index at this round's start: the older recordings carry no index; the recorded phase (odd passes = slow) fixes it as
        // the parity of the first round's passes (round 1's Attack is 1 + passes ticks, 3 members act before Crystal Core)
        heap.index = scanPrediction(seedNumber(seed), 1).passes % 2;
        heap.roundStart();
        heap.enemyMove('CRYSTAL_CORE', 'Special', { repeat: true, before: 3 });
        const p = predictCast(heap, spell, 'special', seedNumber(seed), { round: 3, rolls: 0 });
        const want = liveList(live);
        p.words.forEach((w, i) => {
          if (w !== want[i])
            assert.ok(p.unknown[i], `${spell} word ${i}: model ${w} live ${want[i]}`);
        });
        // not just unknown words: the slow-phase image makes all the Thor words known
        if (spell === 'Thor' && slowSeeds.includes(seed)) assert.ok(p.complete);
      });
    }
  }
});

describe('the second Attack, slow party', () => {
  it('its menu words that differ from the first Attack are flagged unknown (no known word is wrong at castpre)', () => {
    const seed = '9e3779b1';
    const p1 = scanPrediction(seedNumber(seed), 1);
    const p2 = scanPrediction(seedNumber(seed), 2);
    const heap = new VfxHeap(
      loadHeapDump(`crystal_core_L-fire-slow_inround_later_attack_${seed}_prompt0`),
      { party: 'L-fire-slow' },
    );
    heap.roundStart();
    heap.enemyMove('CRYSTAL_CORE', 'Attack', {
      repeat: true,
      hit: {
        camera: p2.camera,
        target: p2.slot,
        passes: p2.passes,
        round: 2,
        previousPasses: [p1.passes],
      },
    });
    const real = loadArena(`crystal_core_L-fire-slow_inround_later_attack_${seed}_castpre`);
    const view = new DataView(real.arena.buffer, real.arena.byteOffset);
    for (const [addr, word] of heap.state.known)
      assert.strictEqual(word, view.getUint32(addr - 0x80182000, true), `0x${addr.toString(16)}`);
  });
});
