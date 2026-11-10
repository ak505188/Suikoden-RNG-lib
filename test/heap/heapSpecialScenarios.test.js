import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { loaderImage } from '../../lib/Game/Heap/LoaderImage.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import RNG from '../../lib/rng.js';
import {
  SPELLS,
  liveWords,
  liveList,
  loadHeapDump,
  predictCast,
} from '../helpers/heapAfterMoves.js';
import { loadArena } from '../helpers/heapDumps.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// The second Special in five more scenarios (heap_special_phase_scenarios.txt; party L-fire-slow; kill = Luc's Fire or Viktor + Flik's
// Attack in round k, round k + 1 the first Special, round k + 2 the cast round with the second one), and the Luc-kill scenario run from
// round 1. The phase (which of the two particle images the round gets) is a recorded input per seed.

const table =
  /** @type {{ rows: { scenario: string, seed: string, alloc: number, free: number, passes: number[], phase: 'fast' | 'slow' }[] }} */ (
    JSON.parse(
      fs.readFileSync(
        new URL('../fixtures/heap/tables/special_phase_scenarios.json', import.meta.url),
        'utf8',
      ),
    )
  );
const SCENARIOS = /** @type {const} */ ({
  vf1: ['vf', 1],
  vf2: ['vf', 2],
  luc2: ['luc', 2],
  luc4: ['luc', 4],
  vf4: ['vf', 4],
});
const seedNumber = (/** @type {string} */ seed) => parseInt(seed, 16) >>> 0;
const dumpName = (
  /** @type {string} */ scenario,
  /** @type {string} */ seed,
  /** @type {string} */ moment,
) => {
  const [kill, kr] = SCENARIOS[/** @type {keyof typeof SCENARIOS} */ (scenario)];
  return `crystal_core_L-fire-slow_inround_later_kill${kill}_kr${kr}_special_${seed}_${moment}`;
};
const phaseOf = (/** @type {string} */ scenario, /** @type {string} */ seed) =>
  /** @type {'fast' | 'slow'} */ (
    table.rows.find((r) => r.scenario === scenario && r.seed === seed)?.phase
  );

describe('the phase table', () => {
  it('62 rows, five new scenarios and the Luc kill in round 1', () => {
    assert.strictEqual(table.rows.length, 62);
  });

  it('the bulk alloc frame does not give the phase: one frame, both images (luc2 58/392, luc4 57/390, vf2 60/394, vf4 60/395)', () => {
    for (const scenario of ['luc2', 'luc4', 'vf2', 'vf4']) {
      const byFrame = new Map();
      for (const r of table.rows.filter((x) => x.scenario === scenario))
        (
          byFrame.get(`${r.alloc}/${r.free}`) ??
          byFrame.set(`${r.alloc}/${r.free}`, new Set()).get(`${r.alloc}/${r.free}`)
        ).add(r.phase);
      assert.ok(
        [...byFrame.values()].some((set) => set.size === 2),
        scenario,
      );
    }
  });

  it("phase = the scenario's base phase, flipped by the parity of the failed scan passes of the rounds that scanned: 62 of 62", () => {
    // base: no failed pass at all. A Viktor + Flik kill round has no scan (the boss dies before it acts), so its passes do not count.
    const BASE = {
      luc1: 'fast',
      luc2: 'slow',
      luc4: 'slow',
      vf1: 'slow',
      vf2: 'fast',
      vf4: 'fast',
    };
    for (const r of table.rows) {
      const kill = r.scenario.slice(0, -1);
      const kr = Number(r.scenario.slice(-1));
      const passes = kill === 'vf' ? r.passes.map((p, i) => (i === kr - 1 ? 0 : p)) : r.passes;
      const odd = passes.reduce((a, b) => a + b, 0) % 2 === 1;
      const base = BASE[/** @type {keyof typeof BASE} */ (r.scenario)];
      const want = odd ? (base === 'fast' ? 'slow' : 'fast') : base;
      assert.strictEqual(r.phase, want, `${r.scenario} ${r.seed}`);
    }
  });
});

describe('the in-round castpre image of the second Special, five scenarios', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    for (const seed of ['9e3779b1', 'f1bbcd88']) {
      it(`${scenario} seed ${seed}: no known word differs from the castpre dump, and the other phase's image would`, () => {
        const real = loadArena(dumpName(scenario, seed, 'castpre'));
        const view = new DataView(real.arena.buffer, real.arena.byteOffset);
        const wrongWords = (/** @type {'fast' | 'slow'} */ phase) => {
          const heap = new VfxHeap(loadHeapDump(dumpName(scenario, seed, 'prompt0')), {
            party: 'L-fire-slow',
          });
          heap.roundStart();
          heap.enemyMove('CRYSTAL_CORE', 'Special', { repeat: true, phase });
          // the castpre dump is taken after the cast's own loader buffer was filled with the constant loader image, at the place the Special's
          // loader buffer was (the first fit); the heap before the cast does not hold that fill (the prediction applies it), so the words
          // the image explains are not compared
          const [loaderPtr] = heap.lastMoveBlocks[2];
          const image = loaderImage();
          const imageWord = (/** @type {number} */ off) =>
            new DataView(image.buffer, image.byteOffset).getUint32(off, true);
          let wrong = 0;
          for (const [addr, word] of heap.state.known) {
            const real = view.getUint32(addr - 0x80182000, true);
            const off = addr - loaderPtr;
            if (off >= 0 && off < 16384 && real === imageWord(off)) continue;
            if (word !== real) wrong++;
          }
          return wrong;
        };
        const phase = phaseOf(scenario, seed);
        assert.strictEqual(wrongWords(phase), 0);
        assert.ok(wrongWords(phase === 'fast' ? 'slow' : 'fast') > 0);
      });
    }
  }
});

const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const defend = { type: ACTION_TYPES.DEFEND };
const rune = (/** @type {number} */ slot, target = 0) => ({
  type: ACTION_TYPES.RUNE,
  slot,
  target,
});
/** The caster setups of CrystalCoreAfterMoveCasts.lua (as in battleCasts.test.js): the runes in the cast round, the actions */
const CASTS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
  });
const RECORDED_HP = [598, 549, 580, 270, 432, 190];

/** @param {string} spell @param {Battle} battle */
function equip(spell, battle) {
  for (const [i, id] of Object.entries(CASTS[spell].runes))
    battle.party.combatants[Number(i)].setRune(
      /** @type {any} */ (Object.values(RUNES).find((r) => r.id === id)),
    );
}

/**
 * @param {VfxHeap} heap
 * @returns {{ calls: number }} the RNG calls the cast made (the last cast of the heap)
 */
function watchCalls(heap) {
  const seen = { calls: -1 };
  for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
      const r = /** @type {RNG} */ (args[args.length - 1]);
      const before = r.count;
      const out = original(...args);
      seen.calls = r.count - before;
      return out;
    };
  }
  return seen;
}

describe('a Battle in the cast round of each scenario: the spell makes the live number of RNG calls', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const [, kr] = SCENARIOS[/** @type {keyof typeof SCENARIOS} */ (scenario)];
    for (const spell of SPELLS) {
      const live = liveWords('special', 'after_move', `_L-fire-slow_kill_${scenario}`)[spell];
      for (const seed of ['9e3779b1', 'f1bbcd88']) {
        it(`${scenario}: second Special then ${spell}, seed ${seed}`, () => {
          const characters = structuredClone(/** @type {any} */ (run).characters);
          characters[0].stats.SPD = 1;
          characters[3].stats.SPD = 1;
          for (const [i, id] of Object.entries(CASTS[spell].runes))
            characters[Number(i)].rune = { id };
          const rng = new RNG(0);
          const heap = new VfxHeap(loadHeapDump(dumpName(scenario, seed, 'prompt0')), {
            party: 'L-fire-slow',
          });
          // the heap starts from the cast round's prompt dump: the first Special ran before it, the particle phase is the recorded input
          heap.assumedMoves.add('CRYSTAL_CORE/Special');
          heap.specialPhase = phaseOf(scenario, seed);
          const seen = watchCalls(heap);
          const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
          boss.secondForm = true;
          const battle = new Battle({
            party: PlayerParty.fromCharacterJSON(characters),
            enemies: new EnemyParty([boss]),
            rng,
            freeWillGate: 10,
            heap,
          });
          rng.raw = (seedNumber(seed) + kr + 2) >>> 0;
          const actions = Array(6).fill(defend);
          for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
          battle.playTurn(actions);
          assert.strictEqual(seen.calls, live[seed].calls);
        });
      }
    }
  }
});

describe('the Luc-kill scenario from round 1 (crystal_core_L-fire-slow_r1_prompt): Attack, Luc kills, first Special, second Special, cast', () => {
  const rows = liveWords('special', 'after_move', '_L-fire-slow');
  const slowRows = liveWords('special', 'after_move', '_L-fire-slow_slowphase');
  // fast and slow phase seeds
  const seeds = ['9e3779b1', 'f1bbcd88', '17156075', '3c6ef362'];

  /** @param {string} spell @param {string} seed */
  function playToTheCast(spell, seed) {
    const characters = structuredClone(/** @type {any} */ (run).characters);
    characters[0].stats.SPD = 1;
    characters[3].stats.SPD = 1;
    const rng = new RNG(0);
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
      party: 'L-fire-slow',
      index: 0,
    });
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
    const s = seedNumber(seed);
    // round 1: Crystal Core's Attack, then Luc's Fire kills it; round 2: its first Special
    rng.raw = (s + 1) >>> 0;
    const killRound = Array(6).fill(defend);
    killRound[3] = rune(0, 0);
    battle.playTurn(killRound);
    reset();
    rng.raw = (s + 2) >>> 0;
    battle.playTurn(Array(6).fill(defend));
    reset();
    equip(spell, battle);
    return { battle, heap, rng, s };
  }

  for (const spell of SPELLS) {
    for (const seed of seeds) {
      const live = rows[spell][seed] ?? slowRows[spell][seed];
      it(`${spell}, seed ${seed}: the second Special's words are known and equal the live ones, no known word is wrong`, () => {
        const { heap, s } = playToTheCast(spell, seed);
        const mine = heap.clone();
        mine.roundStart();
        mine.enemyMove('CRYSTAL_CORE', 'Special', { round: 3 });
        const p = predictCast(mine, /** @type {any} */ (spell), 'special', s, {
          round: 3,
          rolls: 0,
        });
        const want = liveList(live);
        p.words.forEach((w, i) => {
          if (!p.unknown[i]) assert.strictEqual(w, want[i], `${spell} word ${i}`);
        });
      });
      it(`${spell}, seed ${seed}: the spell makes the live number of RNG calls`, () => {
        const { battle, heap, rng, s } = playToTheCast(spell, seed);
        const seen = watchCalls(heap);
        rng.raw = (s + 3) >>> 0;
        const actions = Array(6).fill(defend);
        for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
        battle.playTurn(actions);
        assert.strictEqual(seen.calls, live.calls);
      });
    }
  }
});
