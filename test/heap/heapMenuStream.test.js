import { describe, it } from 'node:test';
import assert from 'node:assert';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { menuStream, windowText } from '../../lib/Game/Heap/MenuStream.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';

// The Fight menu's window text and the packet stream its draw writes at the prompt (menu_draw note), against the arena at the first prompt of
// both recorded parties. The stream is the menu's at the prompt: the next round's casts read the buffers as that round's own drawing
// (the closing animation first) left them, which is not modelled, so this is not wired into the heap yet.
const PARTY = ['AG0', 'Viktor', 'Flik', 'Luc', 'Tengaar', 'Hellion'];

for (const name of ['crystal_core_L-fire-slow_r1_prompt', 'crystal_core_L-fire_r1_prompt']) {
  describe(`the Fight menu at the first prompt (${name})`, () => {
    const dump = loadHeapDump(name);
    const mb = new VfxHeap(dump).menuBlocks;
    const view = new DataView(dump.arena.buffer, dump.arena.byteOffset);
    const w16 = (/** @type {number} */ a) => view.getUint16(a - 0x80182000, true);
    const w32 = (/** @type {number} */ a) => view.getUint32(a - 0x80182000, true);
    const cells = (/** @type {number} */ ptr, /** @type {number} */ n) =>
      Array.from({ length: n }, (_, i) => w16(ptr + 2 * i));
    const number = (/** @type {number[]} */ c) =>
      c.reduce((s, x) => (x === 0x10 ? s : s * 10 + x - 0x45), 0);
    const t0 = cells(mb[0], 102);
    const party = PARTY.map((n, r) => ({
      name: n,
      hp: number(t0.slice(r * 17 + 10, r * 17 + 13)),
      maxHp: number(t0.slice(r * 17 + 14, r * 17 + 17)),
    }));
    const windows = /** @type {NonNullable<ReturnType<typeof windowText>>} */ (
      windowText({ party, enemies: ['Crystal Core'] })
    );

    it('the text of the three windows equals the arrays the build and the writer left', () => {
      assert.deepStrictEqual(windows[0].text, t0);
      assert.deepStrictEqual(windows[1].text, cells(mb[5], 15));
      assert.deepStrictEqual(windows[2].text, cells(mb[10], 40));
    });

    it('the stream in the first bytes of both 6000-byte blocks: every word', () => {
      let compared = 0;
      for (const buffer of [0, 1]) {
        const words = menuStream({
          windows,
          buffer,
          block: mb[42 + buffer],
          prims: (k) => mb[5 * k + 2 + buffer],
        });
        for (const [address, word] of words) {
          assert.strictEqual(w32(address), word, `buffer ${buffer} 0x${address.toString(16)}`);
          compared++;
        }
      }
      assert.ok(compared > 1300, String(compared));
    });
  });
}
