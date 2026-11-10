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

// Rounds in which a member dies (heap_rounds_more/deaths, recording brief 2 item C): vf2 (Viktor + Flik kill in round 2, the first Special
// in round 3, round 4 after it), the slot-k member (4 Luc, 5 Tengaar, 6 Hellion) at 1 HP either in round 1, where Crystal Core's Attack
// kills it (att<k>, the rot formation so that slots 4-6 are the scan's candidates), or in round 3, where the Special kills it (sp<k>);
// 6 seeds, menu delay 0 and 1 before round 4: the draw buffer index at every round's confirm and each round's ticks.
/** @type {{ case: string, delay: number, seed: string, idx0: number[], ticks: number[], passes: number[] }[]} */
const rows = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/death_rounds.json', import.meta.url), 'utf8'),
).rows;
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const attack = { type: ACTION_TYPES.ATTACK, target: 0 };

/** @param {typeof rows[number]} row */
function replay(row) {
  const [, kind, slot] = /** @type {RegExpMatchArray} */ (row.case.match(/^(att|sp)(\d)$/));
  const victim = Number(slot) - 1;
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const party = PlayerParty.fromCharacterJSON(characters);
  const members = party.combatants;
  if (kind === 'att')
    for (const [a, b] of [
      [0, 3],
      [1, 4],
      [2, 5],
    ])
      [members[a].position, members[b].position] = [members[b].position, members[a].position];
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  const battle = new Battle({
    party,
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const idx0 = [];
  const diedIn = kind === 'att' ? 1 : 3;
  for (let r = 1; r <= 4; r++) {
    members.forEach((c, i) => {
      if (i < 6 && c.HP > 0) c.HP = RECORDED_HP[i];
    });
    if (r === diedIn) members[victim].HP = 1;
    if (r === 2) boss.HP = 1;
    const actions = Array(6).fill({ type: ACTION_TYPES.DEFEND });
    if (r === 2) {
      actions[1] = attack;
      actions[2] = attack;
    }
    if (r === 4) heap.menuDelay = row.delay;
    rng.raw = (parseInt(row.seed, 16) + r) >>> 0;
    battle.playTurn(actions);
    idx0.push(heap.idx0);
  }
  return { idx0, dead: members[victim].HP <= 0 };
}

describe('rounds in which a member dies (slots 4-6): -3 ticks for Luc and Hellion in the round, every later Special round 389', () => {
  it('the recorded ticks: the death round 208 + passes (Luc, Hellion) or 211 (Tengaar); the later Special rounds 389 (72 runs)', () => {
    for (const row of rows) {
      const kind = row.case.slice(0, 2);
      const slot = Number(row.case.at(-1));
      const here = slot === 5 ? 0 : -3;
      const id = `${row.case} ${row.seed}`;
      if (kind === 'at') assert.strictEqual(row.ticks[0], 211 + here + row.passes[0], id);
      if (kind === 'sp') {
        assert.strictEqual(row.ticks[2], 392 + here, id);
        assert.strictEqual(row.ticks[3], 389, id);
      } else assert.deepStrictEqual(row.ticks.slice(2), [389, 389], id);
    }
  });

  it('the index at every round of the four is the recorded one: 72 runs, 288 round starts', () => {
    let known = 0;
    for (const row of rows) {
      const { idx0, dead } = replay(row);
      assert.ok(dead, `${row.case} ${row.seed} the member died`);
      idx0.forEach((x, i) => {
        // never a wrong index
        if (x !== undefined) {
          assert.strictEqual(
            x,
            row.idx0[i],
            `${row.case} d${row.delay} ${row.seed} round ${i + 1}`,
          );
          known++;
        }
      });
    }
    assert.ok(known > 0);
    assert.strictEqual(known, rows.length * 4);
  });
});
