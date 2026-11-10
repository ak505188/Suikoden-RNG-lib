import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POOL_TO_END, wipeHalf, wipeRegion } from '../../lib/Game/Heap/SetupPool.js';
import { describe, it } from 'node:test';
import {
  hitChild,
  hitHeaders,
  hitPackets,
  launchPositions,
  projector,
} from '../../lib/Game/Heap/HitEffect.js';

/** @type {{ addresses: number[], headers: number[], seeds: Record<string, { camera: number, resources: Record<string, number[]> }> }} */
const FIXTURE = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/hit_effect_trace.json', import.meta.url),
    'utf8',
  ),
);
const HIT_PACKETS = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/hit_key_packets.json', import.meta.url), 'utf8'),
);
/** the target slot of each recorded seed (proj_L-fire-slow_<seed>.txt); every other seed hit slot 1 */
const SLOT = /** @type {Record<string, number>} */ ({ '3c6ef362': 3 });

describe('Attack hit effect launch, derived from the game code (header trace, 5 seeds)', () => {
  // the 12 launch resources' header screen positions (word 2) in the 100 ticks from the first draw: both 30-tick legs and the hold
  for (const seed of ['9e3779b1', 'daa66d13', '78dde6c4', '17156075', '3c6ef362']) {
    it(`seed ${seed}: all 12 resources, 100 ticks`, () => {
      const { camera, resources } = FIXTURE.seeds[seed];
      const first = resources[0][0];
      const positions = launchPositions(SLOT[seed] ?? 1, 100);
      const project = projector(camera);
      for (let r = 0; r < 12; r++) {
        const series = resources[r];
        let at = 0;
        /** @type {number[] | undefined} */
        let seen;
        for (let frame = first; frame < first + 100; frame++) {
          while (at < series.length && series[at] <= frame) {
            seen = [series[at + 1], series[at + 2]];
            at += 3;
          }
          const world = positions[frame - first][Math.floor(r / 6)][r % 6].map((x) =>
            Math.floor(x / 4096),
          );
          assert.deepEqual(project(world), seen, `resource ${r} frame ${frame - first}`);
        }
      }
    });
  }
});

describe('Attack hit effect packets, derived from the game code (round-1 key table, 36 keys)', () => {
  // the packet addresses of the allocation order (the same in every run of the recorded party)
  const { addresses } = FIXTURE;
  for (const key of Object.keys(HIT_PACKETS.round1)) {
    it(`key ${key}: every word but the stale upper halves of words 7 and 9`, () => {
      const [camera, slot, index] = key.split('/').map(Number);
      // the key's index is the buffer index after the last draw
      const packets = hitPackets({ camera, slot, newest: 1 - index, addresses });
      const hex = HIT_PACKETS.round1[key];
      for (let p = 0; p < 24; p++)
        for (let i = 0; i < 10; i++) {
          const want = hex.slice(p * 80 + i * 8, p * 80 + i * 8 + 8);
          assert.equal(
            packets[p][i],
            packets[p][i].length === 4 ? want.slice(4) : want,
            `packet ${p} word ${i}`,
          );
        }
    });
  }
});

describe('Attack hit effect 52-byte headers, derived (the spiral wipe supplies the stale halves)', () => {
  const { addresses, headers } = FIXTURE;
  const pool = headers[0] + 52 + 4 - POOL_TO_END;
  for (const [name, t] of [
    ['standard order', [240, 236]],
    ['other order', [236, 240]],
  ]) {
    it(`${name}: the 12 launch headers of every key, all 13 words`, () => {
      const region = wipeRegion(pool, /** @type {[number, number]} */ (t));
      const table = name === 'other order' ? HIT_PACKETS.ord.slow.blocks : HIT_PACKETS.blocks;
      let checked = 0;
      for (const key of Object.keys(table)) {
        const [camera, slot] = key.split('/').map(Number);
        const derived = hitHeaders({
          camera,
          slot,
          headers,
          packets: Array.from({ length: 12 }, (_, r) => [addresses[2 * r], addresses[2 * r + 1]]),
          half: (address) => wipeHalf(region, pool, address),
        });
        derived.forEach(({ hex, varying }, r) => {
          assert.deepEqual(varying, [], `${key} resource ${r}`);
          assert.equal(hex, table[key].slice(r * 104, r * 104 + 104), `${key} resource ${r}`);
          checked++;
        });
      }
      assert.ok(checked >= 12 * 18);
    });
  }
});

const RESOURCES = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/party_resource_layout.json', import.meta.url),
    'utf8',
  ),
).parties['L-fire-slow'];

describe('Attack hit effect child (the hit spark), derived: header and packet words but the links and the stale halves', () => {
  for (const [
    name,
    order,
    tableOf,
  ] of /** @type {[string, string, (p: typeof HIT_PACKETS) => Record<string, string>][]} */ ([
    ['standard order', 'recorded', (p) => p.blocks],
    ['other order, slow', 'ord', (p) => p.ord.slow.blocks],
    ['other order, fast', 'ord', (p) => p.ord.fast.blocks],
  ])) {
    it(`${name}: every key`, () => {
      const table = tableOf(HIT_PACKETS);
      for (const key of Object.keys(table)) {
        const [camera, slot, index] = key.split('/').map(Number);
        const hex = table[key].slice(12 * 104);
        const words = hex.match(/.{8}/g) ?? [];
        const arrays = [words[10], words[11]].map((w) => parseInt(w, 16));
        const child = hitChild({
          camera,
          slot,
          order,
          bufferAtSpawn: index,
          header: arrays[0] + 0x58,
          arrays,
          half: () => undefined,
          resource: (/** @type {number} */ s) => [
            parseInt(RESOURCES[s - 1].pk0, 16),
            parseInt(RESOURCES[s - 1].pk1, 16),
          ],
        });
        // header: all 13 words, the stale halves (words 4 and 7, upper) aside
        child.header.hex.forEach((w, i) => {
          const mask = i === 4 || i === 7 ? 0xffff : 0xffffffff;
          assert.equal(
            (parseInt(w, 16) & mask) >>> 0,
            (parseInt(words[i], 16) & mask) >>> 0,
            `${key} header word ${i}`,
          );
        });
        child.arrays.forEach((array, b) =>
          array.hex.forEach((w, i) => {
            const at = 13 + b * 20 + i;
            const stale = i % 10 === 7 || i % 10 === 9;
            const mask = stale ? 0xffff : 0xffffffff;
            assert.equal(
              (parseInt(w, 16) & mask) >>> 0,
              (parseInt(words[at], 16) & mask) >>> 0,
              `${key} array ${b} word ${i}`,
            );
          }),
        );
      }
    });
  }
});
