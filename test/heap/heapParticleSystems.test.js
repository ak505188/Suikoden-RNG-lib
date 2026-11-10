import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { ENEMY_MOVE_IMAGES } from '../../lib/Game/Heap/EnemyMoveImages.js';
import { g4Links, particleSystem } from '../../lib/Game/Heap/ParticleSystems.js';
import fs from 'node:fs';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Special's particle systems derived from the game's build and update code (ParticleSystems.js) against the recorded image of the
// arena at the cast (slow party, phase images). Systems 0 and 1: the struct, every DR_MODE block and the G4 code, colour and link top
// byte are exact; the G4 xy words and link words are not derived, and the three pad bytes per record are the arena's byte before the
// Special's allocations, which the heap model reproduces for all but 8 of 144 of them (its arena at the round start lacks the menu
// rebuild's writes there), so the pad bytes are not compared. System 2's blocks are overwritten after the Special's free (the tick-373
// allocations), so the image is not the Special's own words there.
const RESOURCES = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/party_resource_layout.json', import.meta.url),
    'utf8',
  ),
).parties['L-fire-slow'];
const packets = (/** @type {number} */ slot) =>
  /** @type {[number, number]} */ ([
    parseInt(RESOURCES[slot - 1].pk0, 16),
    parseInt(RESOURCES[slot - 1].pk1, 16),
  ]);
const words = (/** @type {string} */ hex) => hex.match(/.{8}/g).map((h) => parseInt(h, 16) >>> 0);

describe('the Special particle systems 0 and 1 from the build code', () => {
  for (const key of ['inRoundSlow', 'inRoundFast']) {
    it(`${key}: struct, DR_MODE and G4 colour words equal the recorded image`, () => {
      const heap = new VfxHeap(
        loadHeapDump('crystal_core_L-fire-slow_inround_later_special_9e3779b1_prompt0'),
        { party: 'L-fire-slow', index: 0 },
      );
      heap.roundStart();
      const known = new Map(heap.state.known);
      const snapshot = heap.state.heap.clone();
      const pre = (/** @type {number} */ a) => known.get(a) ?? snapshot.u32(a);
      heap.enemyMove('CRYSTAL_CORE', 'Special', {});
      const image =
        ENEMY_MOVE_IMAGES.CRYSTAL_CORE.Special['L-fire-slow'][/** @type {'inRoundSlow'} */ (key)];
      const block = (/** @type {number} */ n) =>
        /** @type {any} */ (image.blocks.find((b) => b[0] === n));
      let compared = 0;
      const bulk = key === 'inRoundSlow' ? 1 : 0;
      const at = [0, 1, 2].map((system) => {
        const b = [0, 1, 2, 3, 4].map((i) => block(4 + 5 * system + i));
        return {
          g4: /** @type {[number, number]} */ ([b[1][1], b[3][1]]),
          dr: /** @type {[number, number]} */ ([b[2][1], b[4][1]]),
        };
      });
      const links = g4Links(at, bulk, packets);
      for (const system of [0, 1]) {
        const base = 4 + 5 * system;
        const [s, ga, da, gb, db] = [0, 1, 2, 3, 4].map((i) => block(base + i));
        const model = particleSystem(
          system,
          { struct: s[1], g4: [ga[1], gb[1]], dr: [da[1], db[1]] },
          pre,
          // the phase: the slow image's last call is in buffer 1, the fast image's in buffer 0
          bulk,
          links[system],
        );
        const check = (
          /** @type {string} */ what,
          /** @type {number} */ want,
          /** @type {any} */ got,
        ) => {
          assert.strictEqual(got, want, what);
          compared++;
        };
        // the struct: words 2, 16 (high half) and 17 are stale (the arena's), the rest is written
        words(s[2]).forEach((w, i) => {
          if (![2, 16, 17].includes(i)) check(`sys${system} struct ${i}`, w, model.struct[i]);
        });
        check(
          `sys${system} struct 16 low half`,
          words(s[2])[16] & 0xffff,
          model.struct[16] & 0xffff,
        );
        [ga, gb].forEach((b, bi) => {
          const g = words(b[2]);
          model.g4[bi].forEach((record, i) =>
            record.forEach((w, wi) => {
              if (Array.isArray(w))
                return check(`sys${system} g4 ${bi}.${i} link top`, g[i * 9] >>> 24, w[0] >>> 24);
              if (w === undefined) return;
              // the pad byte (top byte of words 3, 5, 7) is the arena's: compare the colour only
              const mask = wi === 3 || wi === 5 || wi === 7 ? 0xffffff : 0xffffffff;
              check(
                `sys${system} g4 ${bi}.${i} w${wi}`,
                (g[i * 9 + wi] & mask) >>> 0,
                (w & mask) >>> 0,
              );
            }),
          );
        });
        [da, db].forEach((b, bi) => {
          const d = words(b[2]);
          model.dr[bi].forEach((record, i) =>
            record.forEach((w, wi) => check(`sys${system} dr ${bi}.${i} w${wi}`, d[i * 3 + wi], w)),
          );
        });
      }
      assert.ok(compared > 800);
    });
  }
});

// The same derivation against the real arena at the Special's free (the `busyend` dumps of two slow seeds): every word of systems 0 and 1,
// the never-written ones (struct words 2 and 17, the pad bytes) from the arena at the round's prompt.
describe('the Special particle systems 0 and 1 against the arena at the free', () => {
  for (const seed of ['17156075', '1fe68e72']) {
    it(`slow party, seed ${seed}: every word`, () => {
      const start = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_prompt0`);
      const end = loadHeapDump(`crystal_core_L-fire-slow_inround_special_${seed}_busyend`);
      const word = (/** @type {typeof start} */ d, /** @type {number} */ a) =>
        new DataView(d.arena.buffer, d.arena.byteOffset).getUint32(a - 0x80182000, true);
      const pre = (/** @type {number} */ a) => word(start, a);
      // the block addresses the Special's allocations get from this pool (the same in every party and seed)
      const at = [
        { struct: 0x80191230, g4: [0x80190ec8, 0x80190a38], dr: [0x80190da0, 0x80190910] },
        { struct: 0x801908b0, g4: [0x80190548, 0x801900b8], dr: [0x80190420, 0x8018ff90] },
        { struct: 0x8018ff30, g4: [0x8018f728, 0x8018f538], dr: [0x8018f6a8, 0x8018f4b8] },
      ];
      const links = g4Links(/** @type {any} */ (at), 1, packets);
      let compared = 0;
      for (const system of [0, 1]) {
        const model = particleSystem(
          system,
          /** @type {any} */ (at[system]),
          pre,
          1,
          links[system],
        );
        model.struct.forEach((w, i) => {
          // word 16's low half is the final rotation; its high half is the arena's
          assert.strictEqual(w, word(end, at[system].struct + 4 * i), `sys${system} struct ${i}`);
          compared++;
        });
        model.g4.forEach((buffer, b) =>
          buffer.forEach((record, i) =>
            record.forEach((w, wi) => {
              assert.strictEqual(
                /** @type {number} */ (w),
                word(end, at[system].g4[b] + 36 * i + 4 * wi),
                `sys${system} g4 ${b}.${i} w${wi}`,
              );
              compared++;
            }),
          ),
        );
        model.dr.forEach((buffer, b) =>
          buffer.forEach((record, i) =>
            record.forEach((w, wi) => {
              assert.strictEqual(w, word(end, at[system].dr[b] + 12 * i + 4 * wi));
              compared++;
            }),
          ),
        );
      }
      assert.ok(compared > 1000);
    });
  }
});
