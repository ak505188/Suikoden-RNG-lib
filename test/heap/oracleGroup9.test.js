import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';

/**
 * A group of four enemies (Clay Doll group 9: three Red Elementals in slots 7-9 and the Clay Doll in slot 10; Suikoden-Bizhawk-HUD oracle_group9,
 * ASK 22): every enemy attacks every round, hit or miss, so a round holds four moves. The simulator replays them in the recorded order, one after the
 * other (the real ones overlap in time; the layout at the round's end is the same), and the casts of rounds 2-4 must read right words. Only
 * Explosion's words depend on the moves (one word of the eleven that lie in the menu's stream).
 */
const DIR = new URL('../fixtures/heap/oracle_group9/', import.meta.url);
const live = JSON.parse(fs.readFileSync(new URL('live_words.json', DIR), 'utf8'));

/** @param {string} tag @param {string} seed @param {number} round */
function heapAtCast(tag, seed, round) {
  const stem = `group9_${tag}_9e3779b1_r1_prompt`;
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8'));
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    { party: tag, index: 0 },
  );
  for (let r = 1; r < round; r++) {
    heap.roundStart();
    const rec = live.rounds[`${tag}_${seed}`].find((/** @type {any} */ x) => x.round === r);
    for (const m of rec.moves) {
      const key = m.slot === 10 ? 'CLAY_DOLL' : 'RED_ELEMENTAL';
      if (m.attack) heap.enemyMove(key, 'Attack', { landed: m.landed });
      else heap.enemyMove(key, 'Special');
    }
    heap.roundEnd();
  }
  heap.roundStart();
  return heap;
}

describe('Clay Doll group 9 (three Red Elementals + Clay Doll): the casts of rounds 2-4 after the recorded moves', () => {
  for (const c of live.casts) {
    it(`${c.tag}, round ${c.round}, seed ${c.seed}: ${c.spell}: no known word is wrong`, () => {
      const heap = heapAtCast(c.tag, c.seed, c.round);
      if (c.posX) {
        const p = heap.predictSoulEater(c.spell);
        assert.strictEqual(p.complete, true);
        for (let i = 0; i < 40; i++) {
          assert.strictEqual(p.staleResidual[i], c.posX[i], `posX ${i}`);
          assert.strictEqual(p.staleScale[i], c.scale[i] >>> 0, `scale ${i}`);
        }
      } else {
        const p = heap.predictParticles(c.spell);
        let known = 0;
        p.residual.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
          if (p.unknown[i]) return;
          known++;
          assert.strictEqual(w, c.words[i] & 0xfff, `word ${i}`);
        });
        assert.ok(known >= (c.spell === 'Explosion' ? 17 : 20), `${known} known`);
      }
    });
  }
});
