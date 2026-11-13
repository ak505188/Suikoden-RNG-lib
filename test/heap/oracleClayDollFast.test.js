import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';

/**
 * Clay Doll against two more parties (Suikoden-Bizhawk-HUD oracle_clay_doll_fast, ASK 21): the fast L-fire party (the cast runs before the enemy's
 * move of its round, so it reads the previous round's) and the four-member party E-mcd-vik-luc-flik (table counters t6 / t7 differ). The
 * simulator replays the recorded moves (Attack hit / miss from its events, the Special not modelled) and the casts of rounds 2-4 must read
 * right words. The recording found that the words do not depend on the move in any of the 9 contexts per party.
 */
const DIR = new URL('../fixtures/heap/oracle_clay_doll_fast/', import.meta.url);
const live = JSON.parse(fs.readFileSync(new URL('live_words.json', DIR), 'utf8'));
const STEM = { 'L-fire': 'clay_doll_L-fire', E4: 'clay_doll_E-mcd-vik-luc-flik' };

/** @param {string} tag @param {string[]} moves @param {number} round */
function heapAtCast(tag, moves, round) {
  const stem = `${STEM[/** @type {'L-fire' | 'E4'} */ (tag)]}_9e3779b1_r1_prompt`;
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8'));
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    tag === 'L-fire' ? { party: 'L-fire', index: 0 } : { index: 0 },
  );
  for (let r = 1; r < round; r++) {
    heap.roundStart();
    const move = moves[r - 1];
    if (move.startsWith('Attack'))
      heap.enemyMove('CLAY_DOLL', 'Attack', { landed: move.startsWith('AttackHit') });
    else heap.enemyMove('CLAY_DOLL', 'Special');
    heap.roundEnd();
  }
  heap.roundStart();
  return heap;
}

describe('Clay Doll, fast and 4-member parties: the casts of rounds 2-4 after the recorded moves', () => {
  for (const c of live.casts) {
    it(`${c.tag}, round ${c.round}, seed ${c.seed}, moves ${c.moves.join('/')}: ${c.spell}: no known word is wrong`, () => {
      const heap = heapAtCast(c.tag, c.moves, c.round);
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
        // (Explosion's words lie in the menu's stream, which a round with a move leaves unclaimed: 24 of 30 known)
        assert.ok(known >= (c.spell === 'Explosion' ? 24 : 20), `${known} known`);
      }
    });
  }
});
