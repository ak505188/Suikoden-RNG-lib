import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// A whole Battle with a heap casts the five stale-word spells and spends the real RNG calls (Suikoden-Bizhawk-HUD live counts). Party
// L-fire-slow (McDohl and Luc at SPD 1): Crystal Core moves first, so the cast follows its Attack or Special. Nothing here is fitted:
// the Battle makes the camera roll, the turn polls, the target scan and the move's rolls itself, and gives the heap the camera class,
// the target slot and the failed scan passes (hit key tables), the Special's phase from round 1's Attack.

const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const rune = (/** @type {number} */ slot) => ({ type: ACTION_TYPES.RUNE, slot, target: 0 });
/** The caster setups of CrystalCoreAfterMoveCasts.lua: runes by party index, the actions (Rune slot = the lua slot - 1) */
const CASTS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
  });

/**
 * @param {string} move 'attack' | 'special'
 * @param {string} seed
 * @param {string} spell
 * @param {number} rounds the cast's round: 1 (same round as the move), 2 (round 1 everyone Defends: a second Attack in round 2)
 * @returns {number} the RNG calls the spell made
 */
function castCalls(move, seed, spell, rounds) {
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  for (const [i, id] of Object.entries(CASTS[spell].runes)) characters[Number(i)].rune = { id };
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump(`crystal_core_L-fire-slow_${move}_${seed}_preconfirm`), {
    party: 'L-fire-slow',
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
  const second = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  if (move === 'special') second.secondForm = true;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([second]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const seedNumber = parseInt(seed, 16) >>> 0;
  const base = move === 'special' ? 2 : 1;
  if (rounds === 2) {
    rng.raw = (seedNumber + base) >>> 0;
    battle.playTurn(Array(6).fill(defend));
  }
  rng.raw = (seedNumber + base + rounds - 1) >>> 0;
  const actions = Array(6).fill(defend);
  for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
  battle.playTurn(actions);
  return calls;
}

describe('a Battle with a heap, party L-fire-slow: the spell makes the live number of RNG calls', () => {
  const attackSeeds = ['9e3779b1', '3c6ef362', 'daa66d13', 'cc623a9b']; // the last two hit slot 3
  for (const spell of SPELLS) {
    for (const seed of attackSeeds) {
      it(`Attack then ${spell}, same round, seed ${seed}`, () => {
        assert.strictEqual(
          castCalls('attack', seed, spell, 1),
          liveWords('attack', 'enemy_first')[spell][seed].calls,
        );
      });
      it(`second Attack (round 2) then ${spell}, seed ${seed}`, () => {
        assert.strictEqual(
          castCalls('attack', seed, spell, 2),
          liveWords('attack', 'after_move', '_L-fire-slow')[spell][seed].calls,
        );
      });
    }
    for (const seed of ['9e3779b1', '3c6ef362']) {
      it(`Special then ${spell}, same round, seed ${seed}`, () => {
        assert.strictEqual(
          castCalls('special', seed, spell, 1),
          liveWords('special', 'enemy_first')[spell][seed].calls,
        );
      });
    }
  }
});
