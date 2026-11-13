import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { closeMenuFrames } from '../../lib/Game/Heap/MenuClose.js';

/**
 * The closing menu's frames over the packet blocks (ASK 29): the prompt's two 6000-byte blocks (frame 0) plus the frames' writes equal the recorded blocks
 * at frames 3, 16, 17 and 19 (the preconfirm moment), word for word, in two Crystal Core rounds (L-fire-slow 3c6ef362 round 3, 9e3779b1 round 4).
 */
const DIR = new URL('../fixtures/heap/oracle_cc_menu/', import.meta.url);

for (const tag of ['3c6ef362_r3', '9e3779b1_r4']) {
  describe(`closing menu frames, ${tag}`, () => {
    const bin = fs.readFileSync(new URL(`${tag}.bin`, DIR));
    const meta = JSON.parse(fs.readFileSync(new URL(`${tag}.json`, DIR), 'utf8'));
    const blocks = meta.blocks
      .split(',')
      .map((/** @type {string} */ h) => 0x80000000 | parseInt(h, 16));
    const word = (
      /** @type {number} */ frame,
      /** @type {number} */ block,
      /** @type {number} */ off,
    ) => bin.readUInt32LE(meta.frames.indexOf(frame) * 12000 + block * 6000 + off);
    let cells = 0;
    for (let off = 0; off < 6000; off += 4)
      if (word(0, 0, off) === 0xe1000220) {
        cells = (off - 4) / 24;
        break;
      }
    const read = (/** @type {number} */ a) => {
      const block = a >= blocks[1] && a < blocks[1] + 6000 ? 1 : 0;
      return word(0, block, a - blocks[block]);
    };
    for (const frames of [3, 16, 17, 19]) {
      it(`frame ${frames}: every word of both blocks`, () => {
        const writes = closeMenuFrames({
          blocks,
          read,
          cells,
          enemies: 1,
          promptIdx: meta.idx[0],
          frames,
        });
        for (let block = 0; block < 2; block++)
          for (let off = 0; off < 6000; off += 4) {
            const a = blocks[block] + off;
            const v = writes.has(a) ? writes.get(a) : word(0, block, off);
            assert.strictEqual(v, word(frames, block, off), `block ${block} +${off}`);
          }
      });
    }
  });
}
