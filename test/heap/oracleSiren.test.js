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

describe('the ring update (FUN_80120d08, ASK 26)', () => {
  it("projects a ring's first segment at its last tick to the agent's check value (xy words and bucket depth)", async () => {
    const { ringTick } = await import('../../lib/Game/Heap/RingUpdate.js');
    const [seg] = ringTick({
      n: 24,
      pos: [-0x80, -0x32, -0x28],
      inner: [0xb4, -0x12c],
      outer: [0x78, -0xc8],
      rot: [0, -0x400, 0],
      scale: 0xfc1,
    });
    const words = seg.xy.map(([x, y]) => (((y & 0xffff) << 16) | (x & 0xffff)) >>> 0);
    assert.deepStrictEqual(words, [0x00c50061, 0x00b80091, 0x005d0041, 0x0056005f]);
    assert.strictEqual(seg.d, 251);
  });
});

describe('Siren, the cast of round 3 of L-fire-slow seed daa66d13: all five spells', () => {
  const cast = JSON.parse(fs.readFileSync(new URL('cast_daa66d13_slow_r3.json', DIR), 'utf8'));
  const stem = 'siren53_L-fire-slow_daa66d13_r3_prompt';
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8'));
  const six = (
    /** @type {{ rand: number[][], round: number }} */ rec,
    /** @type {number} */ frame,
  ) => {
    let before = 0;
    for (const [f, c] of rec.rand) if (f < frame) before += c;
    const rng = new RNG((parseInt(cast.seed, 16) + rec.round) >>> 0).jump(before);
    return Array.from({ length: 6 }, () => Math.trunc((rng.next().rand * 100) / 0x7fff) % 100);
  };
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    { party: 'L-fire-slow', index: 0 },
  );
  // (the members that gained the status in the earlier rounds' Specials)
  for (const rec of cast.rounds.slice(0, 2))
    for (const m of rec.moves)
      if (!m.attack) six(rec, m.frame + 221).forEach((r, i) => r < 10 && heap.statusHeld.add(i));
  heap.index = (((cast.idx1[3] - 1) % 2) + 2) % 2;
  heap.roundStart();
  const round = cast.rounds[2];
  for (const m of round.moves) {
    const key = m.slot === 7 ? 'SIREN_1' : 'SIREN_2';
    if (m.attack) heap.enemyMove(key, 'Attack', { landed: m.landed, tick: m.frame });
    else heap.enemyMove(key, 'Special', { tick: m.frame, statusRolls: six(round, m.frame + 221) });
  }

  for (const spell of /** @type {const} */ (['FlamingArrow', 'Explosion', 'Thor'])) {
    it(`${spell}: no known word is wrong`, () => {
      const p = heap.predictParticles(spell);
      let known = 0;
      p.residual.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
        if (p.unknown[i]) return;
        known++;
        assert.strictEqual(w, cast.casts[spell][i] & 0xfff, `word ${i}`);
      });
      assert.ok(known >= { FlamingArrow: 10, Explosion: 30, Thor: 20 }[spell], `${known} known`);
    });
  }
  for (const spell of /** @type {const} */ (['BlackShadow', 'Hell'])) {
    it(`${spell}: no known word is wrong`, () => {
      const p = heap.predictSoulEater(spell);
      let known = 0;
      for (let i = 0; i < 40; i++) {
        if (!p.staleResidualUnknown[i]) {
          known++;
          assert.strictEqual(p.staleResidual[i], cast.casts[spell].posX[i], `posX ${i}`);
        }
        if (!p.staleScaleUnknown[i]) {
          known++;
          assert.strictEqual(p.staleScale[i], cast.casts[spell].scale[i] >>> 0, `scale ${i}`);
        }
      }
      assert.ok(known >= 20, `${known} known`);
    });
  }
});
