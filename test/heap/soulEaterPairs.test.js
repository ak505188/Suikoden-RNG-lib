import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { predictParticlesFrom, predictSoulEaterFrom } from '../../lib/Game/Heap/HeapPrediction.js';
import { blackShadowRand, hellRand } from '../../lib/Game/Magic/SpellRNG/SoulEater.js';
import { loadHeapDump } from '../helpers/heapDumps.js';

/**
 * A Black Shadow or Hell cast, then a second one a round later (or two, with an everyone-Defends round between): the second reads its
 * 80 slot words from the first cast's struct, which lands on the same pointer. The recorded live words and RNG counts (3 seeds).
 */
const { cases, particles } = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/soul_eater_pairs.json', import.meta.url),
    'utf8',
  ),
);

/** @param {{ first: 'BlackShadow' | 'Hell', between: number, seed: string }} c */
function heapAfterFirst(c) {
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_preconfirm'));
  const seed = parseInt(c.seed, 16);
  heap.roundStart();
  heap.castSpell(c.first, new RNG((seed + 1) >>> 0).jump(8));
  heap.enemyMove('CRYSTAL_CORE', 'Attack');
  heap.roundEnd();
  if (c.between) {
    heap.roundStart();
    heap.enemyMove('CRYSTAL_CORE', 'Attack');
    heap.roundEnd();
  }
  heap.roundStart();
  return heap;
}

/** @type {Record<string, number>} */
const MIN_KNOWN = {
  'BlackShadow/0/BlackShadow': 80,
  'BlackShadow/0/Hell': 41,
  'Hell/0/BlackShadow': 0,
  'Hell/0/Hell': 80,
  'BlackShadow/1/BlackShadow': 45,
  'BlackShadow/1/Hell': 33,
  'Hell/1/BlackShadow': 27,
  'Hell/1/Hell': 41,
};

describe('a Black Shadow / Hell cast leaves its slots for the next cast', () => {
  for (const c of cases) {
    const name = `${c.first} then ${c.second}, ${c.between} rounds between, seed ${c.seed}`;
    it(`${name}: no word it knows is wrong`, () => {
      const p = predictSoulEaterFrom(heapAfterFirst(c).state, c.second);
      let known = 0;
      for (let i = 0; i < 40; i++) {
        known += Number(!p.staleResidualUnknown[i]) + Number(!p.staleScaleUnknown[i]);
        if (!p.staleResidualUnknown[i])
          assert.strictEqual(p.staleResidual[i], c.posX[i], `posX ${i}`);
        if (!p.staleScaleUnknown[i])
          assert.strictEqual(p.staleScale[i], c.scale[i] >>> 0, `scale ${i}`);
      }
      // (what the model knows: Crystal Core's Attack in a round between leaves the words its launch groups do not write; the draws' links and
      // projected points are not known)
      assert.ok(known >= MIN_KNOWN[`${c.first}/${c.between}/${c.second}`], `${known} words known`);
    });
    if (c.first !== c.second || c.between !== 0) continue;
    it(`${name}: complete, and the RNG count is the game's`, () => {
      const heap = heapAfterFirst(c);
      const p = heap.predictSoulEater(c.second);
      assert.strictEqual(p.complete, true);
      const rng = new RNG((parseInt(c.seed, 16) + 2) >>> 0).jump(8);
      const before = rng.count;
      if (c.second === 'BlackShadow') blackShadowRand(rng, p.scale, p.residual, p.scaleAccumInit);
      else hellRand(rng, p);
      assert.strictEqual(rng.count - before, c.calls);
    });
  }
});

/** @type {Record<string, number>} the words the model knows of the particle spells' residuals after a Soul Eater cast */
const MIN_PARTICLES = {
  'BlackShadow/0/FlamingArrow': 19,
  'BlackShadow/0/Explosion': 25,
  'BlackShadow/0/Thor': 12,
  'BlackShadow/1/FlamingArrow': 19,
  'BlackShadow/1/Explosion': 25,
  'BlackShadow/1/Thor': 10,
  'Hell/0/FlamingArrow': 17,
  'Hell/0/Explosion': 27,
  'Hell/0/Thor': 12,
  'Hell/1/FlamingArrow': 17,
  'Hell/1/Explosion': 27,
  'Hell/1/Thor': 9,
};

describe('Flaming Arrow, Explosion and Thor after a Black Shadow / Hell cast: no known word is wrong', () => {
  for (const c of particles) {
    it(`${c.first} then ${c.second}, ${c.between} rounds between, seed ${c.seed}`, () => {
      const p = predictParticlesFrom(heapAfterFirst(c).state, c.second);
      let known = 0;
      p.residual.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
        if (p.unknown[i]) return;
        known++;
        assert.strictEqual(w, c.words[i] & 0xfff, `word ${i}`);
      });
      assert.ok(known >= MIN_PARTICLES[`${c.first}/${c.between}/${c.second}`], `${known} known`);
    });
  }
});
