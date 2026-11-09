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
import { ACTION_TICKS } from '../../lib/Game/Heap/ActionTicks.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveList, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// One member does an action instead of Defending in round 1 (an Attack round) or round 3 (the first Special round) of luc2 (Luc's Fire
// kill in round 2, the five spells cast in round 4 after the second Special), party L-fire-slow, played from the round-1 prompt
// (heap_rounds/actions_luc2_rounds.tsv, heap_actions/acm_*.txt). Tag r<round>m<member><A|R|I><slot>t<target>.

const idxRows = /** @type {{ tag: string, seed: string, delay: number, idx0: number[] }[]} */ (
  JSON.parse(
    fs.readFileSync(new URL('../fixtures/heap/tables/actions_idx0.json', import.meta.url), 'utf8'),
  ).rows
);
const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const rune = (/** @type {number} */ slot, target = 0) => ({
  type: ACTION_TYPES.RUNE,
  slot,
  target,
});
const CASTS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
  });

/**
 * The recorded tag as the Battle's action: Rune slots are 1-based in the tag, target 7 is the enemy, 1-6 a party member, 0 none.
 * @param {string} tag
 */
function jobOf(tag) {
  const m = /** @type {RegExpMatchArray} */ (tag.match(/^r(\d)m(\d)([ARI])(\d+)t(\d)$/));
  const [round, member, kind, slot, t] = [Number(m[1]), Number(m[2]) - 1, m[3], Number(m[4]), m[5]];
  const target = t === '0' ? {} : { target: t === '7' ? 0 : Number(t) - 1 };
  if (kind === 'A')
    return { round, member, slot: 0, action: { type: ACTION_TYPES.ATTACK, target: 0 } };
  if (kind === 'R')
    return { round, member, slot, action: { type: ACTION_TYPES.RUNE, slot: slot - 1, ...target } };
  return { round, member, slot, action: { type: ACTION_TYPES.ITEM, ...target } };
}

/**
 * @param {string} seed
 * @param {string | null} tag
 * @param {{ delay?: number, spell?: string }} [options]
 */
function play(seed, tag, { delay = 0, spell } = {}) {
  const job = tag ? jobOf(tag) : null;
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  const out = { calls: -1, pred: /** @type {any} */ (null), idx0: /** @type {any[]} */ ([]) };
  for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
      const r = /** @type {RNG} */ (args[args.length - 1]);
      const before = r.count;
      const result = original(...args);
      out.calls = r.count - before;
      return result;
    };
  }
  for (const method of /** @type {const} */ (['predictParticles', 'predictSoulEater'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) =>
      (out.pred = original(...args));
  }
  // Crystal Core has its full HP until the kill round, so that a party Attack does not kill it
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 5000;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  for (let r = 1; r <= 4; r++) {
    battle.party.combatants.forEach((c, i) => {
      if (i < 6) c.HP = RECORDED_HP[i];
    });
    if (r === 2 && !boss.secondForm) boss.HP = 1;
    const actions = Array(6).fill({ type: ACTION_TYPES.DEFEND });
    if (r === 2) actions[3] = rune(0);
    if (job && job.round === r) {
      const action = /** @type {any} */ ({ ...job.action });
      if (action.type === ACTION_TYPES.ITEM)
        action.itemKey = battle.party.combatants[job.member].inventory.entries[job.slot]?.key;
      actions[job.member] = action;
    }
    if (r === 4) {
      heap.menuDelay = delay;
      if (spell) {
        for (const [i, id] of Object.entries(CASTS[spell].runes))
          battle.party.combatants[Number(i)].setRune(
            /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
          );
        for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
      }
    }
    rng.raw = (parseInt(seed, 16) + r) >>> 0;
    battle.playTurn(actions);
    out.idx0.push(heap.idx0);
  }
  return out;
}

/** McDohl's slot-1 item is an Escape Talisman, which the simulator does not let anyone use in battle */
const playable = (/** @type {string} */ tag) => !tag.includes('I1t0');

describe('the draw buffer index with a party action in round 1 or 3 (luc2, 312 recorded runs)', () => {
  const rows = idxRows.filter((r) => playable(r.tag));
  const sorted = rows.map((row) => ({
    row,
    idx0: play(row.seed, row.tag, { delay: row.delay }).idx0,
  }));

  it('no index is ever wrong: it is the recorded one or unknown', () => {
    for (const { row, idx0 } of sorted)
      idx0.forEach((x, i) => {
        if (x !== undefined)
          assert.strictEqual(x, row.idx0[i], `${row.tag} ${row.seed} round ${i + 1}`);
      });
  });

  it('every round of 270 runs is known and right (the ticks the action adds are the same parity in all 3 recorded seeds)', () => {
    const known = sorted.filter(({ idx0 }) => idx0.every((x) => x !== undefined));
    assert.strictEqual(known.length, 270);
    for (const { row, idx0 } of known)
      assert.deepStrictEqual(idx0, row.idx0, `${row.tag} ${row.seed}`);
  });

  it('the other 36 runs (12 actions x 3 seeds) are those whose added ticks (parity) depend on the seed; 6 more use an item the simulator cannot', () => {
    const lost = new Set(
      sorted.filter(({ idx0 }) => idx0.some((x) => x === undefined)).map(({ row }) => row.tag),
    );
    for (const tag of lost) {
      const shape = tag.startsWith('r1') ? 'attack' : 'special';
      assert.strictEqual(
        /** @type {Record<string, 0 | 1 | null>} */ (ACTION_TICKS[shape])[tag.slice(2)],
        null,
        tag,
      );
    }
    assert.strictEqual(sorted.length - 270, 36);
    assert.strictEqual(idxRows.length - rows.length, 6);
  });

  it('the table has 52 actions per round shape, 11 (Attack round) and 1 (Special round) of them seed dependent', () => {
    assert.strictEqual(Object.keys(ACTION_TICKS.attack).length, 52);
    assert.strictEqual(Object.keys(ACTION_TICKS.special).length, 52);
    assert.strictEqual(Object.values(ACTION_TICKS.attack).filter((x) => x === null).length, 11);
    assert.strictEqual(Object.values(ACTION_TICKS.special).filter((x) => x === null).length, 1);
  });
});

describe('the five spells after a party action in round 1 or 3, from round 1 (2 seeds)', () => {
  const baseline = liveWords('special', 'after_move', '_L-fire-slow_kill_luc2');
  /**
   * @param {string} tag
   * @param {string} spell
   * @param {string} seed
   */
  function compare(tag, spell, seed) {
    const live = liveWords('special', 'after_move', `_L-fire-slow_kill_luc2_act${tag}`)[spell][
      seed
    ];
    const sim = play(seed, tag, { spell });
    const p = sim.pred;
    // (Flaming Arrow reads its words inside the cast: compared by its RNG call count only)
    if (!p) return { calls: sim.calls === live.calls, wrong: 0 };
    const words = p.staleResidual ? [...p.staleResidual, ...p.staleScale] : p.residual;
    const flags = /** @type {boolean[]} */ (
      p.staleResidual ? [...p.staleResidualUnknown, ...p.staleScaleUnknown] : p.unknown
    );
    const want = liveList(live);
    return {
      calls: sim.calls === live.calls,
      wrong: words.filter(
        (/** @type {number} */ w, /** @type {number} */ i) => !flags[i] && w !== want[i],
      ).length,
    };
  }

  // the actions that leave all five spells as after an all-Defend round: a McDohl or Luc Attack, McDohl's item 1 (not playable here)
  for (const tag of ['r1m1A0t7', 'r3m1A0t7', 'r1m4A0t7', 'r3m4A0t7']) {
    it(`${tag}: the live words equal the all-Defend baseline, and so are the simulator's`, () => {
      for (const spell of SPELLS)
        for (const seed of ['9e3779b1', '3c6ef362']) {
          const live = liveWords('special', 'after_move', `_L-fire-slow_kill_luc2_act${tag}`)[
            spell
          ][seed];
          assert.deepStrictEqual(live, baseline[spell][seed], `${spell} ${seed}`);
          const c = compare(tag, spell, seed);
          assert.strictEqual(c.calls, true, `${spell} ${seed} calls`);
          assert.ok(c.wrong <= (spell === 'Explosion' ? 1 : 0), `${spell} ${seed} words`);
        }
    });
  }

  // the actions whose live words differ and that the simulator reproduces: the RNG counts of all five spells, and no wrong word
  // apart from the known Explosion word 27 (and one Hell word after a rune spell)
  for (const tag of ['r1m1I4t1', 'r1m3R1t7', 'r1m4R2t0', 'r1m6R1t0']) {
    it(`${tag}: the five spells' RNG call counts are the live ones`, () => {
      for (const spell of SPELLS)
        for (const seed of ['9e3779b1', '3c6ef362']) {
          const c = compare(tag, spell, seed);
          assert.strictEqual(c.calls, true, `${spell} ${seed}`);
          assert.ok(c.wrong <= 1, `${spell} ${seed} words ${c.wrong}`);
        }
    });
  }

  it('the actions change the words: item 4 on target 1 changes Thor, Black Shadow and Hell of both seeds against the baseline', () => {
    const live = liveWords('special', 'after_move', '_L-fire-slow_kill_luc2_actr1m1I4t1');
    for (const spell of ['Thor', 'BlackShadow', 'Hell'])
      for (const seed of ['9e3779b1', '3c6ef362'])
        assert.notDeepStrictEqual(live[spell][seed], baseline[spell][seed], `${spell} ${seed}`);
  });
});

describe("the second Special's start tick and phase by turn-order position (heap_turnorder, 40 runs)", () => {
  const rows =
    /** @type {{ side: string, p: number, seed: string, start: number, idxBulk: number, idx0: number }[]} */ (
      JSON.parse(
        fs.readFileSync(
          new URL('../fixtures/heap/tables/special_start_by_position.json', import.meta.url),
          'utf8',
        ),
      ).rows
    );
  // the members that act before Crystal Core: 'after' = the filler members that are fast (Hellion, SPD 58, acts after it), 'before' = the
  // two casters too
  const before = (/** @type {{ side: string, p: number }} */ r) =>
    Math.min(r.p, 3) + (r.side === 'before' ? 2 : 0);
  it('the start tick is 113 + 3 x members before Crystal Core, the bulk alloc index is idx0 + that + 1 (40 of 40)', () => {
    assert.strictEqual(rows.length, 40);
    for (const row of rows) {
      const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
        party: 'L-fire-slow',
        index: row.idx0,
      });
      heap.assumedMoves.add('CRYSTAL_CORE/Special');
      heap.roundStart();
      heap.enemyMove('CRYSTAL_CORE', 'Special', { before: before(row) });
      assert.strictEqual(heap.specialStartTick(), row.start, `${row.side} p${row.p} ${row.seed}`);
      assert.strictEqual((row.idx0 + before(row) + 1) % 2, row.idxBulk, `${row.side} p${row.p}`);
    }
  });
});
