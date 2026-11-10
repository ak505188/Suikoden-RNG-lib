import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { loadHeapDump } from '../helpers/heapAfterMoves.js';
import { loadArena } from '../helpers/heapDumps.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// A party member's Attack in round 1 replays the hit effect's allocations (brief 13a): after round 1 (Crystal Core's Attack and the
// member's) and round 2 (Luc's kill), the allocator's free list is the real one at the Special round's prompt (luc2 scenario, seed
// 3c6ef362, McDohl or Viktor attacking in round 1). The Attack's blocks are all freed again, so the free list is the same with or without
// the replay: this guards that the replay leaves the allocator where the game has it.
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const defend = { type: ACTION_TYPES.DEFEND };

/** @param {number} member the attacker's index in the party @param {boolean} events */
function freeListAfterRound2(member, events) {
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  if (!events) heap.partyAction = () => false;
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 1;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const reset = () => RECORDED_HP.forEach((hp, i) => (battle.party.combatants[i].HP = hp));
  const seed = 0x3c6ef362;
  const round1 = Array(6).fill(defend);
  round1[member] = { type: ACTION_TYPES.ATTACK, target: 0 };
  rng.raw = (seed + 1) >>> 0;
  battle.playTurn(round1);
  reset();
  const round2 = Array(6).fill(defend);
  round2[3] = { type: ACTION_TYPES.RUNE, slot: 0, target: 0 };
  rng.raw = (seed + 2) >>> 0;
  battle.playTurn(round2);
  return heap.state.heap.freeList().sort((a, b) => a[0] - b[0]);
}

describe("a party member's Attack leaves the allocator where the game has it", () => {
  for (const [member, tag] of /** @type {[number, string][]} */ ([
    [0, 'm1'],
    [1, 'm2'],
  ])) {
    const name = `crystal_core_L-fire-slow_inround_later_killluc_kr2_actr1${tag}A0t7_special_3c6ef362_prompt0`;
    it(`${tag}: the free list at the Special round's prompt`, () => {
      const real = loadArena(name)
        .sidecar.freeListRaw.map((/** @type {[string, number]} */ [a, u]) => [Number(a), u])
        .sort((/** @type {number[]} */ a, /** @type {number[]} */ b) => a[0] - b[0]);
      assert.deepStrictEqual(freeListAfterRound2(member, true), real);
    });
  }
});
