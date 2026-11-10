import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import { explosionRand } from '../../lib/Game/Magic/SpellRNG/Fire.js';
import { loaderImage } from '../../lib/Game/Heap/LoaderImage.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Explosion's pool C particle words as the cast leaves them: the 30 trail words equal the arena at the cast's free (party L-fire, seed
// 17156075, the agent's recording spell_casts/cast_Explosion_L-fire_17156075): `explosionRand` with the update ticks of the cast's remaining
// calls (225-447) after the spawning phase. Without them (the call count does not need them) only 4 of 30 match.
const read = (/** @type {string} */ name) =>
  fs.readFileSync(new URL(`../fixtures/heap/${name}`, import.meta.url));

describe('the Explosion cast leaves its pool C trail words', () => {
  it('30 of 30 equal the arena at the free', () => {
    const cfg = JSON.parse(read('tables/explosion_cast_17156075.json').toString());
    const pre = read('explosion_cast_L-fire_17156075_pre.bin');
    const end = read('explosion_cast_L-fire_17156075_end.bin');
    const image = loaderImage();
    const LOADER = 0x8018b890;
    // the cast's stale words: the arena before it, with the loader buffer's constant image over its range
    const stale = (/** @type {number} */ a) =>
      a >= LOADER && a < LOADER + 16384
        ? new DataView(image.buffer, image.byteOffset).getUint32(a - LOADER, true)
        : pre.readUInt32LE(a - 0x80182000);
    const ptrs = /** @type {string[]} */ (cfg.ptrs).map((p) => parseInt(p, 16));
    const rng = new RNG(0);
    rng.raw = parseInt(cfg.rng, 16) >>> 0;
    const { trailX } = explosionRand(
      rng,
      ptrs.map((p) => stale(p + 0xc) & 0xfff),
      true,
    );
    ptrs.forEach((p, i) =>
      assert.strictEqual(trailX[i] >>> 0, end.readUInt32LE(p + 0xc - 0x80182000), `particle ${i}`),
    );
  });
});

// Two Explosions in one round (heap_pairs, party L-fire, 3 seeds): the second reads the first's trail words in its first 12 particle structs,
// and the menu's own stream words in the other 18 (the stream below its cursor packet, 0xaa4 bytes, is drawn again between the casts).
describe('an Explosion after an Explosion', () => {
  const rows = read('heap_pairs_pair_Explosion.txt')
    .toString()
    .split('\n')
    .filter((l) => l.startsWith('[first=Explosion between=0] Explosion seed'));
  for (const row of rows) {
    const seed = /** @type {RegExpMatchArray} */ (row.match(/seed (\w+)/))[1];
    it(`seed ${seed}: the second cast's 30 stale words are the live ones`, () => {
      const live = /** @type {RegExpMatchArray} */ (row.match(/live ([0-9a-f,]+) /))[1]
        .split(',')
        .map((x) => parseInt(x, 16));
      const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'), {
        party: 'L-fire',
        index: 0,
      });
      heap.roundStart();
      const rng = new RNG(0);
      rng.raw = (parseInt(seed, 16) + 1) >>> 0;
      for (let i = 0; i < 8; i++) rng.next();
      heap.castSpell('Explosion', rng);
      assert.deepStrictEqual(heap.predictParticles('Explosion').residual, live);
    });
  }
});
