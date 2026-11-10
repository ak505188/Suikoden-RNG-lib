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
import { ACTION_FOOTPRINTS } from '../../lib/Game/Heap/ActionFootprints.js';
import RNG from '../../lib/rng.js';
import { SPELLS, liveList, liveWords, loadHeapDump } from '../helpers/heapAfterMoves.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

// What a party action, a cast, a kill or a death changes in the words the five spells read later: the model has no events for it, so
// the spells it changes are flagged unknown (`VfxHeap.tainted`); a prediction is either flagged or right. Casts in the cast round after
// the second Special (heap_actions, heap_pairs, heap_kills, heap_deaths).

const run = Rounds.runs.find((r) => r.scenario === 'kill_spell');
const rune = (/** @type {number} */ slot, target = 0) => ({
  type: ACTION_TYPES.RUNE,
  slot,
  target,
});
const defend = { type: ACTION_TYPES.DEFEND };
const attack = { type: ACTION_TYPES.ATTACK, target: 0 };
const CASTS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    FlamingArrow: { runes: {}, acts: { 3: rune(0) } },
    Explosion: { runes: { 0: 27 }, acts: { 0: rune(2) } },
    Thor: { runes: { 0: 5, 3: 3 }, acts: { 0: rune(3), 3: rune(3) } },
    BlackShadow: { runes: { 0: 1 }, acts: { 0: rune(1) } },
    Hell: { runes: { 0: 1 }, acts: { 0: rune(2) } },
  });
const KILLS =
  /** @type {Record<string, { runes: Record<number, number>, acts: Record<number, any> }>} */ ({
    ...CASTS,
    Luc: { runes: {}, acts: { 3: rune(0) } },
    FlamingArrowOther: { runes: { 4: 2 }, acts: { 4: rune(0) } },
    Attack1: { runes: {}, acts: { 0: attack } },
    Viktor: { runes: {}, acts: { 1: attack, 2: attack } },
  });
const RECORDED_HP = [598, 549, 580, 270, 432, 190];
const setRune = (/** @type {Battle} */ battle, /** @type {number} */ i, /** @type {number} */ id) =>
  battle.party.combatants[i].setRune(
    /** @type {any} */ (Object.values(RUNES).find((x) => x.id === id)),
  );

/**
 * luc-style scenario (party L-fire-slow, Crystal Core at full HP until round k): `kill` method in round k, the first Special in round
 * k + 1, `extra` more Special rounds, then the five spells' cast round with `spell` cast; the casts' words and RNG count are recorded.
 * @param {string} seed
 * @param {{ kill?: string, k?: number, spell: string, extra?: number, low?: { members: number[], round: number }, job?: { round: number, member: number, action: any } }} options
 */
function scenario(seed, { kill = 'Luc', k = 1, spell, extra = 0, low, job }) {
  const characters = structuredClone(/** @type {any} */ (run).characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire-slow_r1_prompt'), {
    party: 'L-fire-slow',
    index: 0,
  });
  const out = { calls: -1, pred: /** @type {any} */ (null), cast: false, heap };
  let on = false;
  for (const method of /** @type {const} */ (['castSpell', 'castFlamingArrow'])) {
    const original = /** @type {(...a: any[]) => any} */ (heap[method]).bind(heap);
    /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
      const r = /** @type {RNG} */ (args[args.length - 1]);
      const before = r.count;
      const result = original(...args);
      if (on) {
        out.calls = r.count - before;
        out.cast = true;
      }
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
  const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
  boss.HP = 5000;
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([boss]),
    rng,
    freeWillGate: 10,
    heap,
  });
  const last = k + 2 + extra;
  for (let r = 1; r <= last; r++) {
    battle.party.combatants.forEach((c, i) => {
      if (i < 6) c.HP = RECORDED_HP[i];
    });
    if (low && r === low.round) for (const i of low.members) battle.party.combatants[i].HP = 1;
    if (r === k && !boss.secondForm) boss.HP = 1;
    const actions = Array(6).fill(defend);
    if (r === k) {
      for (const [i, id] of Object.entries(KILLS[kill].runes)) setRune(battle, Number(i), id);
      for (const [i, a] of Object.entries(KILLS[kill].acts)) actions[Number(i)] = a;
    }
    if (job && r === job.round) actions[job.member] = job.action;
    if (r === last) {
      on = true;
      // (a Thor cast earlier leaves Luc the Water rune: he gets his Fire rune back unless this cast is Thor's)
      if (spell !== 'Thor') setRune(battle, 3, 2);
      for (const [i, id] of Object.entries(CASTS[spell].runes)) setRune(battle, Number(i), id);
      for (const [i, a] of Object.entries(CASTS[spell].acts)) actions[Number(i)] = a;
    }
    rng.raw = (parseInt(seed, 16) + r) >>> 0;
    battle.playTurn(actions);
  }
  return out;
}

/**
 * The prediction against the live cast: how many words it flags unknown, how many known words are wrong, whether the count is right.
 * @param {{ calls: number, pred: any }} sim
 * @param {{ calls: number, words?: number[], posX?: number[], scale?: number[] }} live
 */
function judge(sim, live) {
  const want = liveList(live);
  const p = sim.pred;
  let unknown = 0;
  let wrong = 0;
  if (p) {
    const words = p.staleResidual ? [...p.staleResidual, ...p.staleScale] : p.residual;
    const flags = p.staleResidual ? [...p.staleResidualUnknown, ...p.staleScaleUnknown] : p.unknown;
    words.forEach((/** @type {number} */ w, /** @type {number} */ i) => {
      if (flags[i]) unknown++;
      else if (w !== want[i]) wrong++;
    });
  }
  return { unknown, wrong, calls: sim.calls === live.calls };
}

/**
 * @param {string} name
 * @param {{ kill?: string, k?: number, extra?: number, low?: { members: number[], round: number }, job?: { round: number, member: number, action: any } }} options
 * @param {string} seedList
 */
function checkAll(name, options, seedList = '') {
  const live = liveWords('special', 'after_move', `_L-fire-slow_${name}`);
  let casts = 0;
  let exact = 0;
  for (const spell of SPELLS)
    for (const seed of Object.keys(live[spell] ?? {})) {
      if (seedList && !seedList.includes(seed)) continue;
      const sim = scenario(seed, { ...options, spell });
      if (!sim.cast) continue;
      casts++;
      const j = judge(sim, live[spell][seed]);
      assert.strictEqual(j.wrong, 0, `${name} ${spell} ${seed}: a known word is wrong`);
      // a prediction that claims every word right the count is right too (Explosion's word 27 is never claimed)
      if (j.unknown === 0)
        assert.ok(j.calls, `${name} ${spell} ${seed}: complete but the count is wrong`);
      if (j.unknown === 0 && j.calls) exact++;
    }
  return { casts, exact };
}

describe('party actions in round 1 and 3 (luc2): the spells the recorded footprint changes are flagged, the rest are right', () => {
  const TAGS = [
    'r1m1A0t7',
    'r1m1I4t1',
    'r1m2A0t7',
    'r1m3R1t7',
    'r1m4A0t7',
    'r1m4R2t0',
    'r1m5R1t1',
    'r1m6R1t0',
  ].flatMap((t) => [t, `r3${t.slice(2)}`]);
  /** @param {string} tag */
  const jobOf = (tag) => {
    const [, round, member, kind, slot, t] = /** @type {string[]} */ (
      tag.match(/^r(\d)m(\d)([ARI])(\d+)t(\d)$/)
    );
    const target = t === '0' ? {} : { target: t === '7' ? 0 : Number(t) - 1 };
    const action =
      kind === 'A'
        ? attack
        : kind === 'R'
          ? { type: ACTION_TYPES.RUNE, slot: Number(slot) - 1, ...target }
          : { type: ACTION_TYPES.ITEM, itemKey: 'MEGA_MEDICINE', ...target };
    return { round: Number(round), member: Number(member) - 1, action };
  };
  let exact = 0;
  for (const tag of TAGS)
    it(`${tag}`, () => {
      const r = checkAll(`kill_luc2_act${tag}`, { k: 2, job: jobOf(tag) }, '9e3779b1 3c6ef362');
      assert.strictEqual(r.casts, 10);
      exact += r.exact;
      // the footprint table says which spells differ from the baseline: those are the flagged ones (flagged = tainted in the heap)
      const shape = tag.startsWith('r1') ? 'attack' : 'special';
      const changed = /** @type {Record<string, string[]>} */ (ACTION_FOOTPRINTS[shape])[
        tag.slice(2)
      ];
      const heap = scenario('9e3779b1', { k: 2, spell: 'Explosion', job: jobOf(tag) }).heap;
      for (const spell of changed)
        assert.ok(heap.tainted.has(/** @type {any} */ (spell)), `${tag} ${spell}`);
    });
  it('the actions that change nothing leave exact spells (all four Attack jobs and item 4 on target 1 are among 34 exact casts)', () => {
    assert.ok(exact >= 34, `${exact}`);
  });
  it('22 of the 104 recorded actions have an empty footprint', () => {
    const all = [
      ...Object.values(ACTION_FOOTPRINTS.attack),
      ...Object.values(ACTION_FOOTPRINTS.special),
    ];
    assert.strictEqual(all.length, 104);
    assert.strictEqual(all.filter((x) => x.length === 0).length, 22);
    assert.ok(all.every((x) => !x.includes('Explosion')));
  });
});

describe("casts after another kill method than Luc's Flaming Arrow (heap_kills): no known word is wrong, a complete prediction is right", () => {
  for (const method of ['Explosion', 'BlackShadow', 'Hell', 'Thor', 'FlamingArrowOther', 'Attack1'])
    for (const k of [1, 2])
      it(`${method}, kill in round ${k}`, () => {
        checkAll(`kills_${method}_${k}`, { kill: method, k });
        const heap = scenario('9e3779b1', { kill: method, k, spell: 'Explosion' }).heap;
        // the Explosion word is never changed by the kill; the others are flagged (the McDohl Attack leaves Thor alone)
        assert.ok(!heap.tainted.has('Explosion'));
        assert.ok(
          heap.tainted.has('BlackShadow') &&
            heap.tainted.has('Hell') &&
            heap.tainted.has('FlamingArrow'),
        );
        assert.strictEqual(heap.tainted.has('Thor'), method !== 'Attack1');
      });
  it("Luc's Flaming Arrow and Viktor + Flik's Attack are the recorded kills: nothing is flagged", () => {
    for (const kill of ['Luc', 'Viktor'])
      assert.strictEqual(
        scenario('9e3779b1', { kill, k: 2, spell: 'Explosion' }).heap.tainted.size,
        0,
        kill,
      );
  });
});

describe('casts after a Special that kills party members (heap_deaths): the same-round deaths are replayed, later rounds flagged', () => {
  const MEMBERS = /** @type {Record<string, number[]>} */ ({
    m6: [5],
    m56: [4, 5],
    m1: [0],
    m4: [3],
  });
  for (const [name, members] of Object.entries(MEMBERS))
    for (const when of ['same', 'next'])
      it(`${when} ${name}`, () => {
        const r = checkAll(`deaths_${when}_${name}`, {
          k: 1,
          extra: when === 'same' ? 0 : 1,
          low: { members, round: 3 },
        });
        assert.ok(r.casts > 0);
        if (when === 'next') {
          const heap = scenario('9e3779b1', {
            k: 1,
            extra: 1,
            low: { members, round: 3 },
            spell: 'Explosion',
          }).heap;
          assert.strictEqual(heap.tainted.size, 5, 'a death in a Special round flags every spell');
        }
      });
});

describe("a member killed by Crystal Core's Attack in round 1 (heap_more_seeds/deaths deathattack): the casts two rounds later are flagged", () => {
  for (const [name, member] of /** @type {const} */ ([
    ['m2', 1],
    ['m3', 2],
  ]))
    it(`Viktor / Flik (slot ${member + 1}) at 1 HP dies to the Attack in round 1: no known word wrong, every spell flagged`, () => {
      const r = checkAll(`deathattack_${name}`, { k: 1, low: { members: [member], round: 1 } });
      assert.ok(r.casts > 0);
      // the death changes the later casts' words and counts (25 of 28 and 23 of 28 compared results differ): nothing is claimed exact
      assert.strictEqual(r.exact, 0, 'a member died in round 1');
      // (the seeds are the recorded ones: Crystal Core's scan picks the 1-HP member in each)
      const live = liveWords('special', 'after_move', `_L-fire-slow_deathattack_${name}`);
      for (const seed of Object.keys(live.FlamingArrow)) {
        const heap = scenario(seed, {
          k: 1,
          low: { members: [member], round: 1 },
          spell: 'Explosion',
        }).heap;
        assert.strictEqual(
          heap.tainted.size,
          5,
          `${seed}: a death in an Attack round flags every spell`,
        );
      }
    });
});

describe('a cast then a cast (heap_pairs, party L-fire): after any cast the next cast is changed but for Flaming Arrow <-> Explosion, Explosion -> Explosion and Flaming Arrow (either caster) -> Flaming Arrow', () => {
  /** @type {Record<string, number>} */
  const live = {};
  for (const name of [
    'FlamingArrow',
    'Explosion',
    'Thor',
    'BlackShadow',
    'Hell',
    'Thor_FA_fixed',
    'FlamingArrow_s456',
    'Explosion_s456',
    'Thor_s456',
    'BlackShadow_s456',
    'Hell_s456',
    'FlamingArrowOther',
  ]) {
    const text = fs.readFileSync(
      new URL(`../fixtures/heap/heap_pairs_pair_${name}.txt`, import.meta.url),
      'utf8',
    );
    for (const line of text.split('\n')) {
      const m = line.match(
        /^\[first=(\w+) between=(\d)\] (\w+) seed (\w+) \|.*rand calls real (\d+)/,
      );
      if (m) live[`${m[1]}/${m[2]}/${m[3]}/${m[4]}`] = Number(m[5]);
    }
  }
  /** @param {string} seed @param {string} first @param {string} second @param {number} between */
  function pair(seed, first, second, between) {
    const characters = structuredClone(/** @type {any} */ (run).characters);
    const rng = new RNG(0);
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'), {
      party: 'L-fire',
      index: 0,
    });
    const out = { calls: -1, pred: /** @type {any} */ (null), heap, flagged: false };
    let last = false;
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
      /** @type {any} */ (heap)[method] = (/** @type {any[]} */ ...args) => {
        if (last) out.flagged = heap.pairTainted.has(/** @type {any} */ (second));
        return (out.pred = original(...args));
      };
    }
    const boss = new Enemy(ENEMY_KEYS.CRYSTAL_CORE);
    boss.HP = 5000;
    const battle = new Battle({
      party: PlayerParty.fromCharacterJSON(characters),
      enemies: new EnemyParty([boss]),
      rng,
      freeWillGate: 10,
      heap,
    });
    const rounds = 2 + between;
    for (let r = 1; r <= rounds; r++) {
      battle.party.combatants.forEach((c, i) => {
        if (i < 6) c.HP = RECORDED_HP[i];
      });
      const actions = Array(6).fill(defend);
      const spell = r === 1 ? first : r === rounds ? second : 'none';
      last = r === rounds;
      if (spell !== 'none') {
        if (spell !== 'Thor') setRune(battle, 3, 2);
        for (const [i, id] of Object.entries(KILLS[spell].runes)) setRune(battle, Number(i), id);
        for (const [i, a] of Object.entries(KILLS[spell].acts)) actions[Number(i)] = a;
      }
      rng.raw = (parseInt(seed, 16) + r) >>> 0;
      battle.playTurn(actions);
    }
    return out;
  }
  it('every recorded pair: no known word is wrong, a complete prediction has the live count, the exempt pairs keep the other spell', () => {
    let checked = 0;
    for (const [key, calls] of Object.entries(live)) {
      const [first, between, second, seed] = key.split('/');
      if (first === 'none') continue;
      const sim = pair(seed, first, second, Number(between));
      checked++;
      const p = sim.pred;
      if (
        p &&
        !(p.staleResidual ? [...p.staleResidualUnknown, ...p.staleScaleUnknown] : p.unknown).some(
          Boolean,
        )
      )
        assert.strictEqual(sim.calls, calls, key);
      // the Special-less pairs: the second spell is flagged unless it is the exempt partner of the first
      const exempt =
        (first.startsWith('FlamingArrow') && second === 'Explosion') ||
        (first === 'Explosion' && second === 'FlamingArrow') ||
        (first === 'Explosion' && second === 'Explosion') ||
        (first.startsWith('FlamingArrow') && second === 'FlamingArrow');
      assert.strictEqual(sim.flagged, !exempt, key);
    }
    assert.ok(checked >= 300, `${checked}`);
  });
});
