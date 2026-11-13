import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { loadHeapDump } from './heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// Whole battles from round 1 (party L-fire-slow, the heap built from the round-1 prompt): ten scenarios luc1-5 and vf1-5, Crystal Core at
// 1 HP, everyone Defends except the kill in round k (Luc's Flaming Arrow, or Viktor and Flik's Attack), the first Special in round k + 1,
// the cast round k + 2 (heap_rounds, scripts/heap/data/dumps/*_r<r>_preconfirm). Shared by the round tests and the arena diff.

export const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
export const defend = { type: ACTION_TYPES.DEFEND };
export const rune = (/** @type {number} */ slot, target = 0) => ({
  type: ACTION_TYPES.RUNE,
  slot,
  target,
});
export const attack = { type: ACTION_TYPES.ATTACK, target: 0 };
export const RECORDED_HP = [598, 549, 580, 270, 432, 190];
export const seedNumber = (/** @type {string} */ seed) => parseInt(seed, 16) >>> 0;
export const SCENARIOS = [
  'luc1',
  'luc2',
  'luc3',
  'luc4',
  'luc5',
  'vf1',
  'vf2',
  'vf3',
  'vf4',
  'vf5',
];
export const CASTS =
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
 * @param {{ delay?: number, spell?: string, after?: (round: number, heap: VfxHeap) => void, calls?: { n: number }, menuFrames?: number }} [options]
 *   `delay`: the menu time before the cast round's confirm; `spell`: cast it in the cast round; `after`: called after each round
 */
export function play(scenario, seed, { delay = 0, spell, after, calls, menuFrames } = {}) {
  const kill = scenario.slice(0, -1);
  const k = Number(scenario.slice(-1));
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
    menuFrames,
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
