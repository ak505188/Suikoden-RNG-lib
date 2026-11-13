import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';

/**
 * The generality oracle: a battle that is not Crystal Core (Clay Doll Lv44, screen 4/1/10, party L-fire-slow, 3 seeds; Suikoden-Bizhawk-HUD
 * enemy_profiles/vfx_effects/oracle_clay_doll, ASK 20). The simulator gets the first-prompt arena and nothing about the enemy: no recorded
 * image, no heap events of its moves, no taint entry. The five spells' stale words at the casts of rounds 2 and 3 come from the fight's own
 * earlier heap (the menu and the loader), identically in all six contexts (Attack hit / no hit / Special), so the moves do not matter yet.
 */
const DIR = new URL('../fixtures/heap/oracle_clay_doll/', import.meta.url);
const live = JSON.parse(fs.readFileSync(new URL('live_words.json', DIR), 'utf8'));

function heapAtCast(/** @type {number} */ round) {
  const sidecar = JSON.parse(
    fs.readFileSync(new URL('clay_doll_L-fire-slow_9e3779b1_r1_prompt.json', DIR), 'utf8'),
  );
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(
        fs.readFileSync(new URL('clay_doll_L-fire-slow_9e3779b1_r1_prompt.bin', DIR)),
      ),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    { party: 'L-fire-slow', index: 0 },
  );
  for (let r = 1; r < round; r++) {
    heap.roundStart();
    heap.roundEnd();
  }
  heap.roundStart();
  return heap;
}

describe('Clay Doll (not Crystal Core): the five spells at the casts of rounds 2 and 3, no enemy model', () => {
  for (const round of [2, 3]) {
    const heap = heapAtCast(round);
    for (const c of live.particles.filter((/** @type {any} */ x) => x.round === round)) {
      it(`round ${round}, seed ${c.seed}: ${c.spell}: every word known and right`, () => {
        const p = heap.predictParticles(c.spell);
        assert.strictEqual(p.complete, true);
        p.residual.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
          assert.strictEqual(w, c.words[i] & 0xfff, `word ${i}`);
        });
      });
    }
    for (const c of live.soulEater.filter((/** @type {any} */ x) => x.round === round)) {
      it(`round ${round}, seed ${c.seed}: ${c.spell}: struct, accumulator and all 80 words`, () => {
        const p = heap.predictSoulEater(c.spell);
        assert.strictEqual(p.complete, true);
        assert.strictEqual(p.structPtr, c.struct);
        assert.strictEqual(p.scaleAccumInit & 0xffff, c.accumInit & 0xffff);
        for (let i = 0; i < 40; i++) {
          assert.strictEqual(p.staleResidual[i], c.posX[i], `posX ${i}`);
          assert.strictEqual(p.staleScale[i], c.scale[i] >>> 0, `scale ${i}`);
        }
      });
    }
  }
});
