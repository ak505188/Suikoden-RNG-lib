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

// Round 1 with Crystal Core at 1 or 2 HP and one party action (heap_more_seeds/kills/kill_diag.tsv, 3 seeds): Thor, Explosion, Black Shadow,
// Luc's and Tengaar's Flaming Arrow and a single character's Attack kill the boss (it comes back with 5000 HP); Hell does nothing to it.
/** @type {{ rows: { method: string, boss: number, seed: string, before: number[], after: number[], firstChange: number | null }[] }} */
const { rows } = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heap/tables/kill_diag.json', import.meta.url), 'utf8'),
);
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const rune = (/** @type {number} */ slot) => ({ type: ACTION_TYPES.RUNE, slot, target: 0 });
const attack = { type: ACTION_TYPES.ATTACK, target: 0 };
const METHODS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    FlamingArrowOther: { runes: { 4: 2 }, acts: { 4: rune(0) } },
    Attack1: { runes: {}, acts: { 0: attack } },
    Attack2: { runes: {}, acts: { 1: attack } },
    Attack3: { runes: {}, acts: { 2: attack } },
  });

/** @param {string} method @param {number} bossHP @param {string} seed */
function round1(method, bossHP, seed) {
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = bossHP;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  battle.party.combatants.forEach((c, i) => {
    if (i < 6) c.HP = [598, 549, 580, 270, 432, 190][i];
  });
  const actions = Array(6).fill({ type: ACTION_TYPES.DEFEND });
  for (const [i, id] of Object.entries(METHODS[method].runes))
    battle.party.combatants[Number(i)].setRune(
      /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
    );
  for (const [i, a] of Object.entries(METHODS[method].acts)) actions[Number(i)] = a;
  rng.raw = (parseInt(seed, 16) + 1) >>> 0;
  battle.playTurn(actions);
  return { boss: boss.HP, special: [...heap.movesSeen].some((k) => k.endsWith('/Special')) };
}

describe('which party actions kill Crystal Core at 1 or 2 HP in round 1 (kill_diag)', () => {
  it('the boss HP after the round: 5000 for every killing method, unchanged for Hell (54 recorded runs)', () => {
    let checked = 0;
    for (const row of rows) {
      const method = row.method;
      if (!METHODS[method]) continue;
      const result = round1(method, row.boss, row.seed);
      assert.strictEqual(result.boss, row.after.at(-1), `${method} ${row.boss} ${row.seed}`);
      checked++;
    }
    assert.ok(checked >= 54, `${checked}`);
  });

  it('Hell is no kill: the boss keeps its HP and no Special follows', () => {
    for (const row of rows.filter((r) => r.method === 'Hell')) {
      assert.strictEqual(row.firstChange, null);
      assert.strictEqual(row.after.at(-1), row.boss);
      const result = round1('Hell', row.boss, row.seed);
      assert.strictEqual(result.boss, row.boss);
    }
  });

  it('Thor kills (the Unite heals the six members by 1, the boss comes back at 5000)', () => {
    for (const row of rows.filter((r) => r.method === 'Thor')) {
      assert.strictEqual(row.after.at(-1), 5000);
      assert.deepStrictEqual(
        row.after.slice(0, 6),
        row.before.slice(0, 6).map((x) => x + 1),
      );
      assert.strictEqual(round1('Thor', row.boss, row.seed).boss, 5000);
    }
  });
});
