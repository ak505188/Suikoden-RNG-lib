import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { scanPrediction } from '../../lib/Game/Heap/ScanPrediction.js';

const HIT_PACKETS = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/hit_key_packets.json', import.meta.url), 'utf8'),
);

// The other party order's packet words are the start parity of the draw buffer index (heap_ord/pre1, recording brief 2 item D): the party
// change before the battle takes 239 frames for the standard party and 240 for the order McDohl, Flik, Viktor, Luc, so the buffer index at the
// battle's start has the other parity. One extra frame turns the standard party into the other order's packets and back (18 of 18 keys each).
/** @type {{ party: 'standard' | 'ord', seed: string, slot: number, idx: number, packets: string }[]} */
const rows = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/ord_pre1.json', import.meta.url), 'utf8'),
).rows;
const key = (/** @type {typeof rows[number]} */ r) =>
  `${scanPrediction(parseInt(r.seed, 16) >>> 0, 1).camera}/${r.slot}/${r.idx}`;

describe('the other party order is the other start parity of the buffer index (packets)', () => {
  it("the standard party with one extra frame has the other order's round-1 packets: 18 of 18 keys", () => {
    const standard = rows.filter((r) => r.party === 'standard');
    assert.strictEqual(new Set(standard.map(key)).size, 18);
    for (const r of standard)
      assert.strictEqual(HIT_PACKETS.ord.slow.packets[key(r)], r.packets, key(r));
  });

  it("the other order with one extra frame has the standard party's round-1 packets: 18 of 18 keys", () => {
    const ord = rows.filter((r) => r.party === 'ord');
    assert.strictEqual(new Set(ord.map(key)).size, 18);
    for (const r of ord) assert.strictEqual(HIT_PACKETS.round1[key(r)], r.packets, key(r));
  });

  it('the other order has 18 keys of slots 1-3 and 18 of slots 4-6 (slow and fast party)', () => {
    for (const party of /** @type {const} */ (['slow', 'fast'])) {
      const keys = Object.keys(HIT_PACKETS.ord[party].packets);
      assert.strictEqual(keys.filter((k) => Number(k.split('/')[1]) <= 3).length, 18, party);
      assert.strictEqual(keys.filter((k) => Number(k.split('/')[1]) > 3).length, 18, party);
    }
  });
});
