import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// The Attack's hit effect in rounds 1-5, everyone Defends in every round (RNG seed + r), the menu delays per round as recorded, with a
// variant applied before round 1: heap_attack_spawn keys_rounds45, keys_menutime, keys_variants_rounds, keys_fast (1368 runs, columns
// as in scripts/heap/HitVariantsAnalyze.py: slot, first draw frame, buffer index at the last draw, packets, 52/80-byte blocks).

const table = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/attack_rounds_words.json', import.meta.url),
    'utf8',
  ),
);
/** @type {{ variant: string, party: 'slow' | 'fast', seed: string, R: number, delays: number[], slot: number, first: number, idxR: number, img: number }[]} */
const rows = table.rows;
/** @type {{ packets: string, allocs: string, blocks: string }[]} */
const images = table.images;
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };

/**
 * @param {typeof rows[number]} row
 */
function play(row) {
  const fast = row.party === 'fast';
  const characters = structuredClone(/** @type {any} */ (run).characters);
  if (!fast) {
    characters[0].stats.SPD = 1;
    characters[3].stats.SPD = 1;
  }
  if (row.variant === 'ord') [characters[1], characters[2]] = [characters[2], characters[1]];
  const party = PlayerParty.fromCharacterJSON(characters);
  const members = party.combatants;
  const dead = row.variant.match(/^dead(\d)$/);
  if (dead) members[Number(dead[1]) - 1].HP = 0;
  const swap = row.variant.match(/^swap(\d)(\d)$/);
  if (swap) {
    const [a, b] = [members[Number(swap[1]) - 1], members[Number(swap[2]) - 1]];
    [a.position, b.position] = [b.position, a.position];
  }
  if (row.variant === 'rot')
    for (const [a, b] of [
      [0, 3],
      [1, 4],
      [2, 5],
    ])
      [members[a].position, members[b].position] = [members[b].position, members[a].position];
  const rng = new RNG(0);
  // the first prompt's buffer index is 0 in every recorded battle but the other party order's, which is 1 (the order changes the ticks
  // before the first prompt: not decoded)
  const heap = new VfxHeap(
    loadHeapDump(fast ? 'crystal_core_L-fire_r1_prompt' : 'crystal_core_L-fire-slow_r1_prompt'),
    { party: fast ? 'L-fire' : 'L-fire-slow', index: row.variant === 'ord' ? 1 : 0 },
  );
  const battle = new Battle({
    party,
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.CRYSTAL_CORE)]),
    rng,
    freeWillGate: 10,
    heap,
  });
  for (let r = 1; r <= row.R; r++) {
    heap.menuDelay = row.delays[r - 1];
    rng.raw = (parseInt(row.seed, 16) + r) >>> 0;
    battle.playTurn(Array(6).fill(defend));
  }
  return heap;
}

/** @param {{ packets: string, allocs: string, blocks: string }} img */
function liveWords(img) {
  /** @type {Map<number, number>} */
  const live = new Map();
  const packets = /** @type {string[]} */ (img.packets.match(/.{8}/g));
  const big = img.blocks
    .split(',')
    .filter((b) => b.includes(':'))
    .map((b) => /** @type {string[]} */ (b.split(':')[1].match(/.{8}/g)));
  let p = 0;
  let b = 0;
  for (const entry of img.allocs.split(',')) {
    const [ptr, size] = entry.split(':');
    const words = Number(size) === 40 ? packets.slice(p, (p += 10)) : big[b++];
    words.forEach((w, i) => live.set(parseInt(ptr, 16) + 4 * i, parseInt(w, 16) >>> 0));
  }
  return live;
}

const groups = /** @type {Map<string, typeof rows>} */ (new Map());
for (const row of rows) {
  const key = `${row.party} ${row.variant} round ${row.R}`;
  groups.set(key, [...(groups.get(key) ?? []), row]);
}

// groups whose every word is known and right: the plain Attack in rounds 2-5, the swaps of the first two members, a dead second or third member
const EXACT = (/** @type {string} */ key) =>
  /none round [2-5]$/.test(key) || /swap12|slow dead[23]/.test(key);

describe('the Attack hit effect in rounds 1-5 against the recorded packets and blocks (menu delays 0, 1, 2, 3, 7, 60)', () => {
  for (const [key, group] of groups) {
    it(`${key}: ${group.length} runs: the slot, the first draw frame and the buffer index are the recorded ones; no known word is wrong${EXACT(key) ? ', all are known' : ''}`, () => {
      for (const row of group) {
        const heap = play(row);
        const attack = heap.attacks.find((a) => a.round === row.R);
        const id = `${key} ${row.seed} ${row.delays}`;
        assert.ok(attack, id);
        assert.strictEqual(attack.target, row.slot, `${id}: slot`);
        assert.strictEqual(
          attack.passes + (attack.shift ?? 0) + (row.party === 'fast' ? 56 : 50),
          row.first,
          `${id}: first draw`,
        );
        assert.strictEqual(heap.attackIndex.get(row.R), row.idxR, `${id}: index`);
        for (const [addr, word] of liveWords(images[row.img])) {
          const known = heap.state.known.get(addr);
          if (known === undefined) assert.ok(!EXACT(key), `${id}: 0x${addr.toString(16)} unknown`);
          else assert.strictEqual(known, word, `${id}: 0x${addr.toString(16)}`);
        }
      }
    });
  }
});
