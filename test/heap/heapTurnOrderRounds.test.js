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

// The Luc-kill round at the other turn-order positions (heap_rounds_more/turnorder, recording brief 2 item C): parties M-after-p0..p4
// (McDohl and Luc slow, p fillers fast) and M-before-p0..p3 (McDohl 163, Luc 126), luc2 (Luc's Flaming Arrow kills in round 2, the cast
// round is round 4), 12 seeds, menu delay 0 and 1 in the cast round: the draw buffer index at every round's confirm, the round's ticks.
/** @type {{ party: string, delay: number, seed: string, idx0: number[], ticks: number[], passes: number[] }[]} */
const rows = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/heap/tables/turnorder_rounds.json', import.meta.url),
    'utf8',
  ),
).rows;
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const characters = (/** @type {string} */ name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../fixtures/heap/parties/${name}.json`, import.meta.url), 'utf8'),
  );

/** @param {{ party: string, delay: number, seed: string }} row */
function replay(row) {
  const fast = row.party.includes('before');
  const rng = new RNG(0);
  const heap = new VfxHeap(
    loadHeapDump(fast ? 'crystal_core_L-fire_r1_prompt' : 'crystal_core_L-fire-slow_r1_prompt'),
    { party: fast ? 'L-fire' : 'L-fire-slow', index: 0 },
  );
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 1;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters(row.party)),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const idx0 = [];
  for (let r = 1; r <= 4; r++) {
    battle.party.combatants.forEach((c, i) => {
      if (i < 6) c.HP = RECORDED_HP[i];
    });
    const actions = Array(6).fill({ type: ACTION_TYPES.DEFEND });
    if (r === 2) actions[3] = { type: ACTION_TYPES.RUNE, slot: 0, target: 0 };
    if (r === 4) heap.menuDelay = row.delay;
    rng.raw = (parseInt(row.seed, 16) + r) >>> 0;
    battle.playTurn(actions);
    idx0.push(heap.idx0);
  }
  return idx0;
}

describe('the Luc-kill round at other turn-order positions: 534 + 3 x fillers faster than Luc (+ failed passes), 427 + 3 x for fast parties', () => {
  it('the recorded round ticks follow the rule in all 216 runs', () => {
    for (const row of rows) {
      const speeds = characters(row.party).map((/** @type {any} */ c) => c.stats.SPD);
      const f = [1, 2, 4, 5].filter((i) => speeds[i] > speeds[3]).length;
      const base = row.party.includes('before') ? 427 : 534;
      assert.strictEqual(row.ticks[1], base + 3 * f + row.passes[1], `${row.party} ${row.seed}`);
      assert.strictEqual(row.ticks[2], 392);
      assert.strictEqual(row.ticks[0], 211 + row.passes[0]);
    }
  });

  it('the index at every round of the four is the recorded one, from round 1: 216 runs, 864 round starts', () => {
    let known = 0;
    for (const row of rows) {
      const got = replay(row);
      got.forEach((x, i) => {
        // never a wrong index; unknown only where the model leaves the chain
        if (x !== undefined) {
          assert.strictEqual(
            x,
            row.idx0[i],
            `${row.party} d${row.delay} ${row.seed} round ${i + 1}`,
          );
          known++;
        }
      });
    }
    assert.strictEqual(known, rows.length * 4);
  });
});
