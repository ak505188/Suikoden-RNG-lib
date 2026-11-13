import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import { loadArena } from '../helpers/heapDumps.js';
import {
  RECORDED_HP,
  SCENARIOS,
  attack,
  defend,
  play,
  rune,
  run,
  seedNumber,
} from '../helpers/heapScenarios.js';

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
  it("after the Viktor + Flik kill round the Special has overwritten the Attack's hit words", () => {
    let known = -1;
    play('vf2', '9e3779b1', {
      after: (round, heap) => {
        if (round === 1) assert.ok(heap.state.known.size > 8000);
        if (round === 2) known = heap.state.known.size;
      },
    });
    // (the hit child ran on the effect-script engine: the words it wrote and the Special did not overwrite stay known; the rounds test above shows none is wrong)
    // (the rebuilt menu's packet buffers hold the words the menu left past its stream, which the real arenas confirm (arena diff): ~1.6k known)
    assert.ok(known < 2000, `${known}`);
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
