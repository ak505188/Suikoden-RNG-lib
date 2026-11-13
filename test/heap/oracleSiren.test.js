import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';

/**
 * Siren Lv53 x2 (Suikoden-Bizhawk-HUD oracle_siren53, ASK 23): two monsters whose moves overlap (an Attack's spark and the other one's Special). The
 * round's moves, applied together in tick order from their recorded frames, allocate and free exactly the recorded pointers (round 1 of L-fire-slow, seed
 * 3c6ef362: an Attack with a hit by slot 7, a Special by slot 8), including the status icon (52, 40, 40) the Special builds for the one member
 * that gains the status in the frame of its bulk's frees (ASK 24: six rolls of the round's RNG, a roll below 10 gains it).
 */
const DIR = new URL('../fixtures/heap/oracle_siren53/', import.meta.url);

describe('Siren, round 1 of L-fire-slow seed 3c6ef362: the round-level scheduler', () => {
  const round = JSON.parse(fs.readFileSync(new URL('round1_3c6ef362_slow.json', DIR), 'utf8'));
  const stem = 'siren53_L-fire-slow_3c6ef362_r1_prompt';
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8'));
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    { party: 'L-fire-slow', index: 0 },
  );
  /** the six status rolls of the frame: the round's RNG after the calls of the frames before it */
  const rolls = (/** @type {number} */ frame) => {
    let before = 0;
    for (const [f, c] of round.randCallsPerFrame) if (f < frame) before += c;
    const rng = new RNG((parseInt(round.seed, 16) + round.round) >>> 0).jump(before);
    return Array.from({ length: 6 }, () => Math.trunc((rng.next().rand * 100) / 0x7fff) % 100);
  };
  heap.roundStart();
  for (const m of round.moves) {
    const key = m.slot === 7 ? 'SIREN_1' : 'SIREN_2';
    if (m.attack) heap.enemyMove(key, 'Attack', { landed: m.landed, tick: m.frame });
    else heap.enemyMove(key, 'Special', { tick: m.frame, statusRolls: rolls(m.frame + 221) });
  }
  /** @type {[string, number][]} */
  const got = [];
  const alloc = heap.state.heap.alloc.bind(heap.state.heap);
  const free = heap.state.heap.free.bind(heap.state.heap);
  heap.state.heap.alloc = (/** @type {number} */ n) => {
    const p = alloc(n);
    got.push(['a', /** @type {number} */ (p)]);
    return p;
  };
  heap.state.heap.free = (/** @type {number | null} */ p) => {
    got.push(['f', /** @type {number} */ (p)]);
    return free(p);
  };
  heap.flushEnemyMoves();
  const want = round.events.map((/** @type {any[]} */ e) => [e[0], e[3]]);

  it('allocates and frees the recorded pointers (121 allocations, 118 frees)', () => {
    assert.strictEqual(got.length, want.length);
    assert.deepStrictEqual(got, want);
  });
});
