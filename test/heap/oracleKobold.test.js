import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { diffArena } from '../../lib/Game/Heap/ArenaDiff.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { CASTS, defend } from '../helpers/heapScenarios.js';
import { liveList, liveWords } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

/**
 * The generality oracle of two Kobolds (bow) (ASK 33 part 3, Kobold Lv20 x2, world map 1 area 5 screen 1 group 4, party L-fire-slow, 3 seeds, six Defend rounds): the arena
 * at the next prompt after each of rounds 1-3 against the one the simulator reaches by playing the rounds with `Battle`: the generic basic Attack (the Clay Doll's blocks),
 * two enemies alternating, no special. The Fight menu offers "Let go" in place of "Run" here (the game's test is not modelled: `letGo`).
 */
const DIR = new URL('../fixtures/heap/oracle_kobold2/', import.meta.url);
const run = /** @type {any} */ (Rounds).runs.find(
  (/** @type {any} */ r) => r.scenario === 'kill_spell',
);

for (const seed of ['9e3779b1', '3c6ef362', 'daa66d13']) {
  describe(`two Kobolds (bow), seed ${seed}`, () => {
    it('the recorded layout, no wrong word in free memory or the menu, nothing unknown in free memory', () => {
      const load = (/** @type {number} */ r) => {
        const stem = `kobold2_L-fire-slow_${seed}_r${r}_prompt`;
        return {
          sidecar: JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8')),
          arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
        };
      };
      const first = load(1);
      const heap = new VfxHeap(
        {
          arena: first.arena,
          rover: Number(first.sidecar.rover),
          menuState: Number(first.sidecar.menuState),
          battleBlocks: [
            Number(first.sidecar.battleBlocks[0]),
            Number(first.sidecar.battleBlocks[1]),
          ],
        },
        { party: 'L-fire-slow', index: 0, letGo: true },
      );
      const characters = structuredClone(run.characters);
      characters[0].stats.SPD = 1;
      characters[3].stats.SPD = 1;
      const rng = new RNG(0);
      const battle = new Battle({
        party: PlayerParty.fromCharacterJSON(characters),
        enemies: new EnemyParty([
          new Enemy(ENEMY_KEYS.KOBOLD_BOW),
          new Enemy(ENEMY_KEYS.KOBOLD_BOW),
        ]),
        rng,
        freeWillGate: 10,
        heap,
      });
      for (let r = 1; r <= 3; r++) {
        for (const c of battle.party.combatants.slice(0, 6)) if (c.HP > 0) c.HP = c.stats.HP - 1;
        rng.raw = (parseInt(seed, 16) + r) >>> 0;
        battle.playTurn(Array(6).fill({ type: ACTION_TYPES.DEFEND }));
        const report = diffArena(heap, load(r + 1));
        assert.strictEqual(report.layoutDiffers, 0, `round ${r} layout`);
        assert.strictEqual(report.byKind.free.wrong, 0, `round ${r} free wrong`);
        assert.strictEqual(report.byKind.free.gap, 0, `round ${r} free gap`);
        assert.strictEqual(report.byKind.menu.wrong, 0, `round ${r} menu wrong`);
      }
    });
  });
}

/**
 * The five spells cast after 1, 2 and 3 Defend rounds (the party is slow: the Kobolds move first in the cast round): what the prediction reads of the stale words, against the live
 * words of the recording (heap_after_move_words_kobold2_L-fire-slow_cast_r2 / r3 / r4): no known word is wrong, a complete prediction has the live RNG count.
 */
const setRune = (/** @type {Battle} */ battle, /** @type {number} */ i, /** @type {number} */ id) =>
  battle.party.combatants[i].setRune(
    /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
  );

/** @param {string} seed @param {number} before - Defend rounds before the cast @param {string} spell */
function cast(seed, before, spell) {
  const stem = `kobold2_L-fire-slow_${seed}_r1_prompt`;
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${stem}.json`, DIR), 'utf8'));
  const heap = new VfxHeap(
    {
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, DIR))),
      rover: Number(sidecar.rover),
      menuState: Number(sidecar.menuState),
      battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    },
    { party: 'L-fire-slow', index: 0, letGo: true },
  );
  const out = { calls: -1, pred: /** @type {any} */ (null) };
  let on = false;
  for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
      const r = /** @type {RNG} */ (args[args.length - 1]);
      const start = r.count;
      const result = original(...args);
      if (on) out.calls = r.count - start;
      return result;
    };
  }
  for (const method of /** @type {const} */ (['predictParticles', 'predictSoulEater'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
      const result = original(...args);
      if (on) out.pred = result;
      return result;
    };
  }
  const characters = structuredClone(run.characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_BOW), new Enemy(ENEMY_KEYS.KOBOLD_BOW)]),
    rng,
    freeWillGate: 10,
    heap,
  });
  for (let r = 1; r <= before + 1; r++) {
    for (const c of battle.party.combatants.slice(0, 6)) if (c.HP > 0) c.HP = c.stats.HP - 1;
    const actions = Array(6).fill(defend);
    if (r === before + 1) {
      on = true;
      if (spell !== 'Thor') setRune(battle, 3, 2);
      for (const [i, id] of Object.entries(CASTS[spell].runes))
        setRune(battle, Number(i), /** @type {number} */ (id));
      for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
    }
    rng.raw = (parseInt(seed, 16) + r) >>> 0;
    battle.playTurn(actions);
  }
  return out;
}

for (const before of [1, 2, 3]) {
  const live = liveWords(
    /** @type {any} */ ('kobold2'),
    'after_move',
    `_L-fire-slow_cast_r${before + 1}`,
  );
  describe(`two Kobolds (bow): the spells cast after ${before} Defend round(s)`, () => {
    for (const spell of /** @type {const} */ ([
      'FlamingArrow',
      'Explosion',
      'Thor',
      'BlackShadow',
      'Hell',
    ])) {
      for (const seed of Object.keys(live[spell] ?? {})) {
        it(`${spell} seed ${seed}: no known word is wrong`, () => {
          const sim = cast(seed, before, spell);
          const want = liveList(live[spell][seed]);
          const p = sim.pred;
          assert.ok(p, 'a prediction was made');
          const words = p.staleResidual ? [...p.staleResidual, ...p.staleScale] : p.residual;
          const flags = p.staleResidual
            ? [...p.staleResidualUnknown, ...p.staleScaleUnknown]
            : p.unknown;
          let wrong = 0;
          words.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
            if (!flags[i] && w !== want[i]) wrong++;
          });
          assert.strictEqual(wrong, 0, 'known words wrong');
          if (!flags.some(Boolean)) assert.strictEqual(sim.calls, live[spell][seed].calls, 'calls');
        });
      }
    }
  });
}
