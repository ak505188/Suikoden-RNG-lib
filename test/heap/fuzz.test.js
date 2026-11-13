import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BATTLE_STATUS,
  Battle,
  Enemy,
  EnemyParty,
  PlayerParty,
  ACTION_TYPES,
  RNG,
} from '../../battle.js';
import { VfxHeap, readHeapDump } from '../../heap.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { CASTS, defend, rune } from '../helpers/heapScenarios.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

/**
 * Whatever a search plays on the heap model must not throw: random party actions (Defend, Attack, the five spells, a spell cast by a silenced or dead member) for several
 * rounds against each oracle's monsters (Kobolds, Banshee, Wyvern, Clay Doll, Sirens) from their first-prompt dumps; the allocator's free list stays inside the arena and
 * the heap clones with the battle at any round.
 */
const run = /** @type {any} */ (Rounds).runs.find(
  (/** @type {any} */ r) => r.scenario === 'kill_spell',
);
const FIXTURES = new URL('../fixtures/heap/', import.meta.url).pathname;
const SETS = [
  {
    stem: 'oracle_kobold2/kobold2_L-fire-slow_9e3779b1_r1_prompt',
    enemies: [ENEMY_KEYS.KOBOLD_BOW, ENEMY_KEYS.KOBOLD_BOW],
    index: 0,
  },
  {
    stem: 'oracle_banshee/banshee_L-fire-slow_9e3779b1_r1_prompt',
    enemies: [ENEMY_KEYS.BANSHEE],
    index: 0,
  },
  {
    stem: 'oracle_wyvern/wyvern_L-fire-slow_9e3779b1_r1_prompt',
    enemies: [ENEMY_KEYS.WYVERN],
    index: 1,
  },
  {
    stem: 'oracle_clay_doll_battle/clay_doll_L-fire-slow_9e3779b1_r1_prompt',
    enemies: [ENEMY_KEYS.CLAY_DOLL],
    index: 0,
  },
  {
    stem: 'oracle_siren53/siren53_L-fire-slow_3c6ef362_r1_prompt',
    enemies: [ENEMY_KEYS.SIREN_2, ENEMY_KEYS.SIREN_2],
    index: 1,
  },
];

/** A small seeded generator (mulberry32) @param {number} seed */
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('random party actions against the oracles monsters never break the heap model', () => {
  for (const set of SETS) {
    for (const seed of [1, 2, 3]) {
      it(`${set.stem.split('/')[0]}, play ${seed}`, async () => {
        const rand = prng(seed * 7919);
        const heap = new VfxHeap(await readHeapDump(FIXTURES + set.stem), {
          party: 'L-fire-slow',
          index: set.index,
        });
        const characters = structuredClone(run.characters);
        characters[0].stats.SPD = 1;
        characters[3].stats.SPD = 1;
        const rng = new RNG(0);
        const battle = new Battle({
          party: PlayerParty.fromCharacterJSON(characters),
          enemies: new EnemyParty(set.enemies.map((k) => new Enemy(/** @type {any} */ (k)))),
          rng,
          freeWillGate: 10,
          heap,
        });
        const spells = Object.keys(CASTS);
        for (let r = 1; r <= 5 && battle.status === BATTLE_STATUS.IN_PROGRESS; r++) {
          for (const c of battle.party.combatants.slice(0, 6)) if (c.HP > 0) c.HP = c.stats.HP - 1;
          const actions = Array(6).fill(defend);
          const roll = rand();
          if (roll < 0.35) {
            const spell = spells[Math.floor(rand() * spells.length)];
            for (const [i, id] of Object.entries(CASTS[spell].runes))
              battle.party.combatants[Number(i)].setRune(
                /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
              );
            for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
          } else if (roll < 0.65) {
            const who = Math.floor(rand() * 6);
            actions[who] = { type: ACTION_TYPES.ATTACK, target: 0 };
          }
          rng.raw = (seed * 0x9e3779b1 + r) >>> 0;
          try {
            battle.playTurn(actions);
          } catch (error) {
            // (a silenced member cannot cast: the party refuses the plan, which is the battle's rule, not the heap's)
            if (!/Silenced|can't use a Rune/.test(String(/** @type {Error} */ (error).message)))
              throw error;
            for (const c of battle.party.combatants) c.status.SILENCE = false;
            battle.playTurn(Array(6).fill(defend));
          }
          const copy = battle.clone();
          assert.strictEqual(copy.stateKey().length > 0, true);
          assert.ok(rune !== undefined);
          let total = 0;
          for (const [, size] of heap.state.heap.freeList()) total += size;
          assert.ok(total <= 0x18000, `free list ${total} bytes`);
        }
        assert.ok(heap.uncertainCasts >= 0);
      });
    }
  }
});
