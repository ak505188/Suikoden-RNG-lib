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
import { loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// The Explosion after the second Special (party L-fire-slow, heap_word27: 160 runs of luc1 / luc2 / luc4 / vf1, 30 seeds with menu
// delay 0, 10 with delay 1): the live residual words are the same in every run, the animated particle word 27 included.
/** @type {{ rows: { scenario: string, delay: number, seed: string, bulk: number, ctx: number, words: string, series: Record<string, string> }[] }} */
const { rows } = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/explosion_word27.json', import.meta.url),
    'utf8',
  ),
);
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const rune = (/** @type {number} */ slot) => ({ type: ACTION_TYPES.RUNE, slot, target: 0 });
const attack = { type: ACTION_TYPES.ATTACK, target: 0 };
const RECORDED_HP = [598, 549, 580, 270, 432, 190];

/** @param {string} scenario @param {string} seed @param {number} delay */
function explosion(scenario, seed, delay) {
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
  /** @type {import('../../lib/Game/Heap/HeapPrediction.js').ParticlePrediction | undefined} */
  let predicted;
  const original = heap.predictParticles.bind(heap);
  heap.predictParticles = (spell) => (predicted = original(spell));
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 1;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
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
      battle.party.combatants[0].setRune(
        /** @type {any} */ (Object.values(RUNES).find((x) => x.id === 27)),
      );
      battle.party.combatants[3].setRune(
        /** @type {any} */ (Object.values(RUNES).find((x) => x.id === 2)),
      );
      actions[0] = rune(2);
    }
    rng.raw = (parseInt(seed, 16) + r) >>> 0;
    battle.playTurn(actions);
  }
  return /** @type {NonNullable<typeof predicted>} */ (predicted);
}

describe('the Explosion words after a Special, word 27 included (heap_word27)', () => {
  it('the live words are the same in all 160 runs', () => {
    assert.strictEqual(new Set(rows.map((r) => r.words)).size, 1);
  });

  it('the predicted residual is the live one and every word is known: 4 scenarios, 4 seeds, delay 0 and 1', () => {
    let checked = 0;
    for (const delay of [0, 1])
      for (const scenario of ['luc1', 'luc2', 'luc4', 'vf1']) {
        for (const row of rows
          .filter((r) => r.scenario === scenario && r.delay === delay)
          .slice(0, 4)) {
          const p = explosion(scenario, row.seed, delay);
          assert.strictEqual(
            p.residual.map((x) => x.toString(16)).join(','),
            row.words,
            `${scenario} d${delay} ${row.seed}`,
          );
          assert.strictEqual(p.unknownWords, 0, `${scenario} d${delay} ${row.seed}`);
          checked++;
        }
      }
    assert.strictEqual(checked, 32);
  });

  it("the animated words' low 12 bits after the Special's first allocation: 27 is 0 and 26 is 6 in every run (the table for words 26-29)", () => {
    for (const row of rows) {
      for (const [word, expected] of [
        ['p26', 6],
        ['p27', 0],
      ]) {
        for (const entry of row.series[word].split(';')) {
          const [frame, value] = entry.split('=');
          if (Number(frame) < row.bulk) continue;
          assert.strictEqual(
            parseInt(value, 16) & 0xfff,
            expected,
            `${row.seed} ${word} @${frame}`,
          );
        }
      }
    }
  });

  it('the context alloc comes 388 or more frames after the Special, later than the last change of word 27', () => {
    for (const row of rows) {
      assert.ok(row.ctx - row.bulk >= 388, `${row.scenario} ${row.seed}`);
      const frames = row.series.p27.split(';').map((e) => Number(e.split('=')[0]));
      assert.ok(Math.max(...frames) < row.ctx - 50, `${row.scenario} ${row.seed}`);
    }
  });
});
