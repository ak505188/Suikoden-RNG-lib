import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { scanPrediction } from '../../lib/Game/Heap/ScanPrediction.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// The hit effect beyond the recorded party (heap_attack_spawn/keys_variants, keys_blocks/keys_L-fire_r1_*): the packets follow the party
// ARRAY slot, a dead member is skipped by the scan, a formation swap changes who is a candidate, another party order is unrecorded, the
// fast party (L-fire) takes the same tables, and the Black Shadow / Hell posX pattern follows the second Special's phase.

const json = (/** @type {string} */ name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../fixtures/heap/tables/${name}.json`, import.meta.url), 'utf8'),
  );
const scanRows =
  /** @type {{ variant: string, party: string, delay: number, seed: string, slot: number, first: number }[]} */ (
    json('variants_scan').rows
  );
const wordRows =
  /** @type {{ variant: string, party: string, seed: string, slot: number, packets: string, allocs: string, blocks: string }[]} */ (
    json('variants_words').rows
  );
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const seedNumber = (/** @type {string} */ seed) => parseInt(seed, 16) >>> 0;

/**
 * Round 1, everyone Defends, the variant's party: Battle and heap after it.
 * @param {string} variant 'dead1'.. 'swap34', 'rot' (slots 4-6 made hittable: formation 1<->4, 2<->5, 3<->6), 'ord' (McDohl, Flik, Viktor), 'L-fire' (the fast party)
 * @param {string} seed
 */
function roundOne(variant, seed) {
  const fast = variant === 'L-fire';
  const characters = structuredClone(/** @type {any} */ (run).characters);
  if (!fast) {
    characters[0].stats.SPD = 1;
    characters[3].stats.SPD = 1;
  }
  if (variant === 'ord') [characters[1], characters[2]] = [characters[2], characters[1]];
  const party = PlayerParty.fromCharacterJSON(characters);
  const members = party.combatants;
  const dead = variant.match(/^dead(\d)$/);
  if (dead) members[Number(dead[1]) - 1].HP = 0;
  const swap = variant.match(/^swap(\d)(\d)$/);
  if (swap) {
    const [a, b] = [members[Number(swap[1]) - 1], members[Number(swap[2]) - 1]];
    [a.position, b.position] = [b.position, a.position];
  }
  if (variant === 'rot')
    for (const [a, b] of [
      [0, 3],
      [1, 4],
      [2, 5],
    ])
      [members[a].position, members[b].position] = [members[b].position, members[a].position];
  const rng = new RNG(0);
  const heap = new VfxHeap(
    loadHeapDump(fast ? 'crystal_core_L-fire_r1_prompt' : 'crystal_core_L-fire-slow_r1_prompt'),
    { party: fast ? 'L-fire' : 'L-fire-slow' },
  );
  /** @type {number | undefined} */
  let tick;
  const original = heap.enemyMove.bind(heap);
  heap.enemyMove = (key, move, options) => {
    if (move === 'Attack') tick = options?.tick;
    return original(key, move, options);
  };
  const battle = new Battle({
    party,
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.CRYSTAL_CORE)]),
    rng,
    freeWillGate: 10,
    heap,
  });
  rng.raw = (seedNumber(seed) + 1) >>> 0;
  battle.playTurn(Array(6).fill(defend));
  return { heap, tick };
}

describe('the scan and the first draw frame, by array slot (all recorded runs)', () => {
  it(`the hit slot is the live one and the first draw is the Attack's tick + 10, ${scanRows.length} runs`, () => {
    for (const row of scanRows) {
      const { heap, tick } = roundOne(row.variant, row.seed);
      const [attack] = heap.attacks;
      assert.ok(attack, `${row.variant} ${row.seed}`);
      assert.strictEqual(attack.target, row.slot, `${row.variant} d${row.delay} ${row.seed}: slot`);
      assert.strictEqual(
        /** @type {number} */ (tick) + 10,
        row.first,
        `${row.variant} d${row.delay} ${row.seed}: first draw frame`,
      );
    }
  });

  it('with the second or third member dead the first draw is at 47 + failed passes, not 50 (so the buffer index parity flips)', () => {
    const early = scanRows.filter((r) => /^dead[23]$/.test(r.variant));
    assert.ok(early.length > 0);
    for (const row of early) {
      const { heap } = roundOne(row.variant, row.seed);
      assert.strictEqual(row.first, 47 + heap.attacks[0].passes, `${row.variant} ${row.seed}`);
    }
    for (const row of scanRows.filter((r) => /^(dead1|swap\d\d|ord)$/.test(r.variant))) {
      const { heap } = roundOne(row.variant, row.seed);
      assert.strictEqual(row.first, 50 + heap.attacks[0].passes, `${row.variant} ${row.seed}`);
    }
  });
});

describe('the Attack words by array slot (delay 0 runs)', () => {
  for (const row of wordRows) {
    it(`${row.variant}, seed ${row.seed}, hit slot ${row.slot}: no known word is wrong; known and exact where recorded`, () => {
      const { heap } = roundOne(row.variant, row.seed);
      const live = new Map();
      const packets = /** @type {string[]} */ (row.packets.match(/.{8}/g));
      const big = row.blocks
        .split(',')
        .map((b) => /** @type {string[]} */ (b.split(':')[1].match(/.{8}/g)));
      let p = 0;
      let b = 0;
      for (const entry of row.allocs.split(',')) {
        const [ptr, size] = entry.split(':');
        const words =
          Number(size) === 40 ? packets.slice(p, (p += 10)) : /** @type {string[]} */ (big[b++]);
        words.forEach((w, i) => live.set(parseInt(ptr, 16) + 4 * i, parseInt(w, 16) >>> 0));
      }
      let unknown = 0;
      for (const [addr, word] of live) {
        const known = heap.state.known.get(addr);
        if (known === undefined) unknown++;
        else assert.strictEqual(known, word, `0x${addr.toString(16)}`);
      }
      if (row.variant === 'ord')
        assert.strictEqual(unknown, live.size, 'another party order: nothing claimed');
      else assert.strictEqual(unknown, 0);
    });
  }
});

describe('the fast party (L-fire) takes the same tables: a Battle casts the five spells in round 2 with the live RNG counts', () => {
  const live = liveWords('attack', 'after_move');
  const rune = (/** @type {number} */ slot) => ({ type: ACTION_TYPES.RUNE, slot, target: 0 });
  const CASTS =
    /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
      FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
      Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
      Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
      BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
      Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
    });
  for (const spell of SPELLS) {
    for (const seed of ['9e3779b1', '3c6ef362', 'daa66d13', 'cc623a9b']) {
      it(`${spell}, seed ${seed}`, () => {
        const characters = structuredClone(/** @type {any} */ (run).characters);
        for (const [i, id] of Object.entries(CASTS[spell].runes))
          characters[Number(i)].rune = { id };
        const rng = new RNG(0);
        const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'), {
          party: 'L-fire',
        });
        let calls = -1;
        for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
          const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
          /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
            const r = /** @type {RNG} */ (args[args.length - 1]);
            const before = r.count;
            const out = original(...args);
            calls = r.count - before;
            return out;
          };
        }
        const battle = new Battle({
          party: PlayerParty.fromCharacterJSON(characters),
          enemies: new EnemyParty([new Enemy(ENEMY_KEYS.CRYSTAL_CORE)]),
          rng,
          freeWillGate: 10,
          heap,
        });
        rng.raw = (seedNumber(seed) + 1) >>> 0;
        battle.playTurn(Array(6).fill(defend));
        rng.raw = (seedNumber(seed) + 2) >>> 0;
        const actions = Array(6).fill(defend);
        for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
        battle.playTurn(actions);
        assert.strictEqual(calls, live[spell][seed].calls);
      });
    }
  }
});

describe('the Black Shadow / Hell posX pattern follows the second Special phase (base phase flipped by the parity of the failed scan passes)', () => {
  const SCENARIOS = /** @type {const} */ ({
    vf1: ['vf', 1, 'slow'],
    vf2: ['vf', 2, 'fast'],
    luc2: ['luc', 2, 'slow'],
    luc4: ['luc', 4, 'slow'],
    vf4: ['vf', 4, 'fast'],
  });
  for (const [scenario, [kill, kr, base]] of Object.entries(SCENARIOS)) {
    const live = liveWords('special', 'after_move', `_L-fire-slow_kill_${scenario}`);
    for (const spell of /** @type {const} */ (['BlackShadow', 'Hell'])) {
      for (const seed of ['9e3779b1', 'f1bbcd88', '3c6ef362']) {
        it(`${scenario}, ${spell}, seed ${seed}: the 40 posX words are the live ones, vf2 included`, () => {
          const heap = new VfxHeap(
            loadHeapDump(
              `crystal_core_L-fire-slow_inround_later_kill${kill}_kr${kr}_special_${seed}_prompt0`,
            ),
            { party: 'L-fire-slow' },
          );
          heap.assumedMoves.add('CRYSTAL_CORE/Special');
          heap.specialBase = base;
          // the rounds that scanned: every round, but a Viktor + Flik kill round (the boss dies before it acts)
          for (let r = 1; r <= kr; r++) {
            if (kill === 'vf' && r === kr) continue;
            const p = scanPrediction(seedNumber(seed), r, 23);
            heap.attacks.push({ round: r, passes: p.passes, camera: p.camera, target: p.slot });
          }
          heap.roundStart();
          heap.enemyMove('CRYSTAL_CORE', 'Special', { round: kr + 2 });
          const p = heap.predictSoulEater(spell);
          const want = live[spell][seed].posX;
          assert.strictEqual(p.staleResidual.length, want.length);
          p.staleResidual.forEach((w, i) => {
            assert.ok(!p.staleResidualUnknown[i], `posX ${i} unknown`);
            assert.strictEqual(w, want[i], `posX ${i}`);
          });
        });
      }
    }
  }
});
