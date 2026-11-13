import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { diffArena } from '../../lib/Game/Heap/ArenaDiff.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { STATUS } from '../../lib/Game/Constants.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { CASTS, defend } from '../helpers/heapScenarios.js';
import { liveList, liveWords } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

/**
 * The generality oracles of ASK 33 part 3 (party L-fire-slow, 3 seeds, six Defend rounds each, the Suikoden-Bizhawk-HUD oracle_gen packages): the arena at the next prompt after
 * each of rounds 1-3 against the one the simulator reaches by playing the rounds with `Battle` from the round-1 prompt, and the five spells cast after 1, 2 and 3 Defend rounds
 * (the party is slow: the monsters move first in the cast round) against the live words.
 *  - two Kobolds (bow), the generic basic Attack (the Clay Doll's blocks); the Fight menu offers "Let go" in place of "Run" there (the battle's mean levels: ASK 34);
 *    free memory is exact (no wrong, no unknown word)
 *  - a Banshee, the ring Special every round (the move's recorded hit frame as the battle's timing input): the layout, the HP and every known word are the recording's; its ring blocks' words are not modelled yet (ASK 34), so the
 *    menu keeps unknown words (`gap` ceilings); the rings' words are (ASK 34): free memory has 16 unknown words
 *  - a Clay Doll (Attack and Special rounds, the Special's recorded hit frame as timing input): the layout and free memory are exact in rounds 1-2; the Special's wrapper objects' words are not
 *    modelled yet (menu gap ceiling)
 *  - a Wyvern, the breath (Wind or Fire by the script's roll, the move's recorded hit frame as the battle's timing input): the layout, the HP, free memory and the menu are exact (the draw index follows the battle's ticks)
 * @type {{ name: string, label: string, dir: string, enemies: string[], timed?: boolean, index: number, rounds?: number, casts?: number[], gap: { free: number, menu: number }, }[]}
 */
const ORACLES = [
  {
    name: 'clay_doll',
    label: 'a Clay Doll',
    dir: 'oracle_clay_doll_battle',
    enemies: [ENEMY_KEYS.CLAY_DOLL],
    index: 0,
    timed: true,
    rounds: 2,
    casts: [1, 2],
    gap: { free: 0, menu: 3000 },
  },
  {
    name: 'kobold2',
    label: 'two Kobolds (bow)',
    dir: 'oracle_kobold2',
    enemies: [ENEMY_KEYS.KOBOLD_BOW, ENEMY_KEYS.KOBOLD_BOW],
    index: 0,
    gap: { free: 0, menu: 300 },
  },
  {
    name: 'banshee',
    label: 'a Banshee',
    dir: 'oracle_banshee',
    enemies: [ENEMY_KEYS.BANSHEE],
    index: 0,
    timed: true,
    gap: { free: 16, menu: 6000 },
  },
  {
    name: 'wyvern',
    label: 'a Wyvern',
    dir: 'oracle_wyvern',
    enemies: [ENEMY_KEYS.WYVERN],
    index: 1,
    timed: true,
    gap: { free: 0, menu: 3000 },
  },
];
const run = /** @type {any} */ (Rounds).runs.find(
  (/** @type {any} */ r) => r.scenario === 'kill_spell',
);

/** @param {(typeof ORACLES)[number]} oracle @param {string} seed */
function start(oracle, seed) {
  const dir = new URL(`../fixtures/heap/${oracle.dir}/`, import.meta.url);
  const load = (/** @type {number} */ r) => {
    const stem = `${oracle.name}_L-fire-slow_${seed}_r${r}_prompt`;
    return {
      sidecar: JSON.parse(fs.readFileSync(new URL(`${stem}.json`, dir), 'utf8')),
      arena: new Uint8Array(fs.readFileSync(new URL(`${stem}.bin`, dir))),
    };
  };
  const first = load(1);
  const heap = new VfxHeap(
    {
      arena: first.arena,
      rover: Number(first.sidecar.rover),
      menuState: Number(first.sidecar.menuState),
      battleBlocks: [Number(first.sidecar.battleBlocks[0]), Number(first.sidecar.battleBlocks[1])],
    },
    // (the draw index at the first prompt: the recorded F1 index of round 1; the later rounds' follow from the battle's ticks, ASK 35)
    { party: 'L-fire-slow', index: oracle.index, menuFrames: 19 },
  );
  const characters = structuredClone(run.characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const round = { n: 1 };
  /** @type {{ rounds: Record<string, { damageFrame: number | null }[]> } | undefined} */
  const hits = oracle.timed
    ? JSON.parse(fs.readFileSync(new URL('hits.json', dir), 'utf8'))
    : undefined;
  const battle = new Battle({
    // (a timed move's hit tick is the recorded input: the frame of its damage rolls, two ahead of the tick)
    timingEvents: hits
      ? () => {
          const frame = hits.rounds[seed][round.n - 1].damageFrame;
          return frame === null ? undefined : { hit: frame - 2 };
        }
      : undefined,
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty(oracle.enemies.map((key) => new Enemy(/** @type {any} */ (key)))),
    rng,
    freeWillGate: 10,
    heap,
  });
  return { heap, battle, rng, load, round };
}

const setRune = (/** @type {Battle} */ battle, /** @type {number} */ i, /** @type {number} */ id) =>
  battle.party.combatants[i].setRune(
    /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
  );

for (const oracle of ORACLES) {
  for (const seed of ['9e3779b1', '3c6ef362', 'daa66d13']) {
    describe(`${oracle.label}, seed ${seed}`, () => {
      it('the recorded layout and HP, no wrong word in free memory or the menu', () => {
        const { heap, battle, rng, load, round } = start(oracle, seed);
        for (let r = 1; r <= (oracle.rounds ?? 3); r++) {
          round.n = r;
          for (const c of battle.party.combatants.slice(0, 6)) if (c.HP > 0) c.HP = c.stats.HP - 1;
          rng.raw = (parseInt(seed, 16) + r) >>> 0;
          battle.playTurn(Array(6).fill(defend));
          const report = diffArena(heap, load(r + 1));
          assert.strictEqual(report.layoutDiffers, 0, `round ${r} layout`);
          assert.strictEqual(report.byKind.free.wrong, 0, `round ${r} free wrong`);
          assert.ok(report.byKind.menu.wrong <= 0, `round ${r} menu wrong`);
          assert.ok(report.byKind.free.gap <= oracle.gap.free, `round ${r} free gap`);
          assert.ok(report.byKind.menu.gap <= oracle.gap.menu, `round ${r} menu gap`);
        }
      });
    });
  }

  /** @param {string} seed @param {number} before @param {string} spell */
  const cast = (seed, before, spell) => {
    const { heap, battle, rng, round } = start(oracle, seed);
    const out = { calls: -1, pred: /** @type {any} */ (null), uncertain: -1 };
    let on = false;
    for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
      const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
      /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
        const r = /** @type {RNG} */ (args[args.length - 1]);
        const begin = r.count;
        const result = original(...args);
        if (on) out.calls = r.count - begin;
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
    for (let r = 1; r <= before + 1; r++) {
      round.n = r;
      for (const c of battle.party.combatants.slice(0, 6)) {
        if (c.HP > 0) c.HP = c.stats.HP - 1;
        // (the recording's caster is never silenced: the monsters' status rolls of the earlier rounds may land, the harness casts anyway)
        if (r === before + 1) c.status[STATUS.SILENCE] = false;
      }
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
    out.uncertain = heap.uncertainCasts;
    return out;
  };

  for (const before of oracle.casts ?? [1, 2, 3]) {
    const live = liveWords(
      /** @type {any} */ (oracle.name),
      'after_move',
      `_L-fire-slow_cast_r${before + 1}`,
    );
    describe(`${oracle.label}: the spells cast after ${before} Defend round(s)`, () => {
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
            // (a cast that read a word the model could not give is counted: the search rates such a path uncertain)
            assert.strictEqual(sim.uncertain, flags.some(Boolean) ? 1 : 0, 'uncertain casts');
            if (!flags.some(Boolean))
              assert.strictEqual(sim.calls, live[spell][seed].calls, 'calls');
          });
        }
      }
    });
  }
}
