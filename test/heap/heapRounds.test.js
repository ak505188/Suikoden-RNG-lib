import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import { loadArena } from '../helpers/heapDumps.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// Whole battles from round 1 (party L-fire-slow, the heap built from the round-1 prompt): ten scenarios luc1-5 and vf1-5, Crystal Core at
// 1 HP, everyone Defends except the kill in round k (Luc's Flaming Arrow, or Viktor and Flik's Attack), the first Special in round k + 1,
// the cast round k + 2 (heap_rounds, scripts/heap/data/dumps/*_r<r>_preconfirm).

const read = (/** @type {string} */ name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../fixtures/heap/tables/${name}.json`, import.meta.url), 'utf8'),
  );
const idxRows = /** @type {{ scenario: string, delay: number, seed: string, idx0: number[] }[]} */ (
  read('rounds_idx0').rows
);
const phaseRows = /** @type {{ scenario: string, seed: string, phase: 'fast' | 'slow' }[]} */ (
  read('special_phase_scenarios').rows
);
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const rune = (/** @type {number} */ slot, target = 0) => ({
  type: ACTION_TYPES.RUNE,
  slot,
  target,
});
const attack = { type: ACTION_TYPES.ATTACK, target: 0 };
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const seedNumber = (/** @type {string} */ seed) => parseInt(seed, 16) >>> 0;
const SCENARIOS = ['luc1', 'luc2', 'luc3', 'luc4', 'luc5', 'vf1', 'vf2', 'vf3', 'vf4', 'vf5'];
const CASTS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
  });

/**
 * @param {string} scenario
 * @param {string} seed
 * @param {{ delay?: number, spell?: string, after?: (round: number, heap: VfxHeap) => void, calls?: { n: number } }} [options]
 *   `delay`: the menu time before the cast round's confirm; `spell`: cast it in the cast round; `after`: called after each round
 */
function play(scenario, seed, { delay = 0, spell, after, calls } = {}) {
  const kill = scenario.slice(0, -1);
  const k = Number(scenario.slice(-1));
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  if (calls) {
    for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
      const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
      /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
        const r = /** @type {RNG} */ (args[args.length - 1]);
        const before = r.count;
        const out = original(...args);
        calls.n = r.count - before;
        return out;
      };
    }
  }
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 1;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const idx0 = [];
  for (let r = 1; r <= k + 2; r++) {
    battle.party.combatants.forEach((c, i) => {
      if (i < 6) c.HP = RECORDED_HP[i];
    });
    const actions = Array(6).fill(defend);
    if (r === k) {
      if (kill === 'luc') actions[3] = rune(0);
      else {
        actions[1] = attack;
        actions[2] = attack;
      }
    }
    if (r === k + 2) {
      heap.menuDelay = delay;
      if (spell) {
        for (const [i, id] of Object.entries(CASTS[spell].runes))
          battle.party.combatants[Number(i)].setRune(
            /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
          );
        for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
      }
    }
    rng.raw = (seedNumber(seed) + r) >>> 0;
    battle.playTurn(actions);
    idx0.push(heap.idx0);
    after?.(r, heap);
  }
  return { heap, idx0 };
}

describe("the draw buffer index chain (idx0 + the round shape's ticks + wait + menu delay, mod 2)", () => {
  it(`the index at every round's confirm, ${idxRows.length} recorded runs (10 scenarios, 12 seeds, cast-round menu delay 0 and 1)`, () => {
    for (const row of idxRows) {
      const { idx0 } = play(row.scenario, row.seed, { delay: row.delay });
      assert.deepStrictEqual(idx0, row.idx0, `${row.scenario} d${row.delay} ${row.seed}`);
    }
  });

  it("the second Special phase is the cast round's index: 0 fast, 1 slow, all 62 recorded seeds with a phase", () => {
    let checked = 0;
    for (const row of phaseRows) {
      const rec = idxRows.find(
        (r) => r.scenario === row.scenario && r.delay === 0 && r.seed === row.seed,
      );
      if (!rec) continue;
      assert.strictEqual(
        row.phase,
        rec.idx0.at(-1) === 1 ? 'slow' : 'fast',
        `${row.scenario} ${row.seed}`,
      );
      checked++;
    }
    assert.strictEqual(checked, 62);
  });
});

describe("each round of a scenario, from round 1: no known word differs from the round's preconfirm dump", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario}, seed 9e3779b1`, () => {
      const seed = '9e3779b1';
      play(scenario, seed, {
        after: (round, heap) => {
          if (round > Number(scenario.slice(-1)) + 1) return;
          const real = loadArena(
            `rounds/crystal_core_L-fire-slow_${scenario}_${seed}_r${round + 1}_preconfirm`,
          );
          const view = new DataView(real.arena.buffer, real.arena.byteOffset);
          for (const [addr, word] of heap.state.known)
            assert.strictEqual(
              word,
              view.getUint32(addr - 0x80182000, true),
              `${scenario} after round ${round}: 0x${addr.toString(16)}`,
            );
        },
      });
    });
  }
});

describe('the cast round of the Luc-kill scenarios, from round 1: the spell makes the live number of RNG calls', () => {
  const tables = {
    luc2: [liveWords('special', 'after_move', '_L-fire-slow_kill_luc2')],
    luc4: [liveWords('special', 'after_move', '_L-fire-slow_kill_luc4')],
  };
  for (const [scenario, [live]] of Object.entries(tables)) {
    for (const spell of SPELLS) {
      for (const seed of ['9e3779b1', 'f1bbcd88', '3c6ef362']) {
        it(`${scenario}, ${spell}, seed ${seed}`, () => {
          const calls = { n: -1 };
          play(scenario, seed, { spell, calls });
          assert.strictEqual(calls.n, live[spell][seed].calls);
        });
      }
    }
  }
});

describe("a party Attack that kills allocates over the last move's blocks", () => {
  it("after the Viktor + Flik kill round the Attack's hit words are no longer known", () => {
    let known = -1;
    play('vf2', '9e3779b1', {
      after: (round, heap) => {
        if (round === 1) assert.ok(heap.state.known.size > 8000);
        if (round === 2) known = heap.state.known.size;
      },
    });
    assert.strictEqual(known, 0);
  });
});

describe('the draw buffer index chain of the fast party L-fire (Luc and McDohl act before Crystal Core; heap_fast, 36 runs)', () => {
  const fastRows =
    /** @type {{ scenario: string, delay: number, seed: string, idx0: number[] }[]} */ (
      read('rounds_fast_idx0').rows
    );
  it('Luc kills in round k (430 ticks, no Attack), Viktor + Flik kill (226): the index of every round, luc1-3 and vf1-3', () => {
    for (const row of fastRows) {
      const kill = row.scenario.slice(0, -1);
      const k = Number(row.scenario.slice(-1));
      const characters = structuredClone(/** @type {any} */ (run).characters);
      const rng = new RNG(0);
      const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'), {
        party: 'L-fire',
        index: 0,
      });
      const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
      boss.HP = 1;
      const battle = new Battle({
        party: PlayerParty.fromCharacterJSON(characters),
        enemies: new EnemyParty([boss]),
        rng,
        freeWillGate: 10,
        heap,
      });
      const idx0 = [];
      for (let r = 1; r <= k + 2; r++) {
        battle.party.combatants.forEach((c, i) => {
          if (i < 6) c.HP = RECORDED_HP[i];
        });
        const actions = Array(6).fill(defend);
        if (r === k) {
          if (kill === 'luc') actions[3] = rune(0);
          else {
            actions[1] = attack;
            actions[2] = attack;
          }
        }
        if (r === k + 2) heap.menuDelay = row.delay;
        rng.raw = (seedNumber(row.seed) + r) >>> 0;
        battle.playTurn(actions);
        idx0.push(heap.idx0);
      }
      assert.deepStrictEqual(idx0, row.idx0, `${row.scenario} ${row.seed}`);
    }
  });
});
