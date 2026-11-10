import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import { explosionRand } from '../../lib/Game/Magic/SpellRNG/Fire.js';
import { loaderImage } from '../../lib/Game/Heap/LoaderImage.js';

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
