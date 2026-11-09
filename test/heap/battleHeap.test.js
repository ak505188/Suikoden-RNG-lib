import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import { scanPrediction } from '../../lib/Game/Heap/ScanPrediction.js';
import { carriedHeap, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// Battle drives the heap on its own: it frees the Fight menu at each round's start, rebuilds it at the round's end and applies an
// enemy move's recorded heap events when the move runs (Crystal Core's Attack and Special). Played through Battle, the heap must be
// the one carried by hand in test/helpers/heapAfterMoves.js.

const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const allDefend = [defend, defend, defend, defend, defend, defend];
/** Luc (slot 4) casts Flaming Arrows at the enemy, the rest defend */
const lucCasts = [
  defend,
  defend,
  defend,
  { type: ACTION_TYPES.RUNE, slot: 0, target: 0 },
  defend,
  defend,
];

/** @param {string} dumpName @param {number} seed @param {import('../../lib/Game/Battle/Actions.js').Action[][]} rounds @param {number[]} [hp1] rounds whose enemy starts at 1 HP */
function play(dumpName, seed, rounds, hp1 = []) {
  const party = PlayerParty.fromCharacterJSON(structuredClone(/** @type {any} */ (run).characters));
  const enemies = new EnemyParty([new Enemy(ENEMY_KEYS.CRYSTAL_CORE)]);
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump(dumpName));
  const battle = new Battle({ party, enemies, rng, freeWillGate: 10, heap });
  rounds.forEach((actions, i) => {
    rng.raw = (seed + i + 1) >>> 0;
    if (hp1.includes(i + 1)) battle.combatants[7].HP = 1;
    battle.playTurn(actions);
  });
  return battle;
}

/**
 * The words each of the five spells would read at the next round's cast.
 * @param {VfxHeap} heap
 * @param {boolean} menuFreed - the heap is already at the cast (carriedHeap's is); otherwise the next round starts first
 */
function nextCastWords(heap, menuFreed = false) {
  const h = heap.clone();
  if (!menuFreed) h.roundStart();
  return {
    particles: ['FlamingArrow', 'Explosion', 'Thor'].map(
      (s) => h.predictParticles(/** @type {any} */ (s)).residual,
    ),
    soul: ['BlackShadow', 'Hell'].map((s) => {
      const p = h.predictSoulEater(/** @type {any} */ (s));
      return [p.staleResidual, p.staleScale];
    }),
  };
}

describe("Battle gives the heap Crystal Core's camera class, target slot and failed scan passes", () => {
  // the party L-fire scans after 28 rolls; the battle's own AI pass gives the same slot and passes as ScanPredict.py
  for (const seed of [0x9e3779b1, 0x3c6ef362, 0xdaa66d13, 0x78dde6c4, 0xcc623a9b, 0x538453d7]) {
    it(`Attack, seed ${seed.toString(16)}`, () => {
      const battle = play('crystal_core_L-fire_r1_prompt', seed, [allDefend]);
      const want = scanPrediction(seed, 1, 28);
      assert.deepStrictEqual(/** @type {VfxHeap} */ (battle.heap).attacks, [
        { round: 1, passes: want.passes, camera: want.camera, target: want.slot },
      ]);
    });
  }
});

describe('Battle: the second Attack (round 2)', () => {
  for (const seed of [0x9e3779b1, 0x3c6ef362, 0xf1bbcd88]) {
    it(`seed ${seed.toString(16)}: its round, camera, slot and passes are round 2's`, () => {
      const battle = play('crystal_core_L-fire_r1_prompt', seed, [allDefend, allDefend]);
      const [one, two] = [1, 2].map((r) => scanPrediction(seed, r, 28));
      assert.deepStrictEqual(
        /** @type {VfxHeap} */ (battle.heap).attacks.map((a) => [
          a.round,
          a.camera,
          a.target,
          a.passes,
        ]),
        [
          [1, one.camera, one.slot, one.passes],
          [2, two.camera, two.slot, two.passes],
        ],
      );
    });
  }
});

describe('Battle applies Crystal Core moves to the heap', () => {
  for (const seed of [0x9e3779b1, 0x3c6ef362, 0xdaa66d13]) {
    it(`Attack, seed ${seed.toString(16)}: the heap after round 1 is the hand-carried one`, () => {
      const battle = play('crystal_core_L-fire_r1_prompt', seed, [allDefend]);
      // the same heap by hand: the Attack's events and images with the hit key the scan gives (camera, slot, passes; the fast party's
      // first draw is at frame 56 + passes)
      const scan = scanPrediction(seed, 1, 28);
      const by = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'));
      by.roundStart();
      by.enemyMove('CRYSTAL_CORE', 'Attack', {
        hit: {
          camera: scan.camera,
          target: scan.slot,
          passes: scan.passes,
          round: 1,
          frame: 56 + scan.passes,
        },
      });
      by.roundEnd();
      by.roundStart();
      assert.deepStrictEqual(
        nextCastWords(/** @type {VfxHeap} */ (battle.heap)),
        nextCastWords(by, true),
      );
    });

    it(`Special, seed ${seed.toString(16)}: Luc's kill in round 1, the Special in round 2`, () => {
      const battle = play('crystal_core_L-fire_r1_preconfirm', seed, [lucCasts, allDefend], [1]);
      assert.ok(/** @type {any} */ (battle.combatants[7]).secondForm);
      assert.deepStrictEqual(
        nextCastWords(/** @type {VfxHeap} */ (battle.heap)),
        nextCastWords(carriedHeap('special', seed), true),
      );
    });
  }

  it('the Flaming Arrow words after the Attack are the live ones, for the seeds recorded', () => {
    const live = liveWords('attack').FlamingArrow;
    for (const seedHex of Object.keys(live)) {
      const battle = play('crystal_core_L-fire_r1_prompt', parseInt(seedHex, 16) >>> 0, [
        allDefend,
      ]);
      assert.deepStrictEqual(
        nextCastWords(/** @type {VfxHeap} */ (battle.heap)).particles[0],
        live[seedHex].words,
        seedHex,
      );
    }
  });
});
