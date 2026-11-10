import HeapModel from './HeapModel.js';
import {
  applyEvents,
  bindState,
  cloneState,
  fightMenuFrees,
  predictParticlesFrom,
  predictSoulEaterFrom,
} from './HeapPrediction.js';
import { SPELL_EVENTS } from './SpellEvents.js';
import { ENEMY_ATTACK_HIT, ENEMY_MOVE_EVENTS } from './EnemyMoveEvents.js';
import { specialEffectFrom } from './SpecialEffect.js';
import { SPECIAL_LOADER_WORDS } from './SpecialLoaderWords.js';
import { ENEMY_MOVE_IMAGES } from './EnemyMoveImages.js';
import { hitChild, hitHeaders, hitPackets } from './HitEffect.js';

/** The battle struct: 13356 bytes allocated at the battle's setup, the same address in every recorded party */
const BATTLE_STRUCT = 0x80196bd0;
import { POOL_TO_END, wipeHalf, wipeRegion } from './SetupPool.js';
import { HIT_KEY_TABLES } from './HitKeyTables.js';
import { ACTION_TICKS } from './ActionTicks.js';
import { ACTION_FOOTPRINTS } from './ActionFootprints.js';
import { drawIndex } from './ScanPrediction.js';
import { explosionRand, flamingArrowParticles } from '../Magic/SpellRNG/Fire.js';
import { thorRand } from '../Magic/SpellRNG/Unites.js';
import { blackShadowRand, hellRand } from '../Magic/SpellRNG/SoulEater.js';
import { pushKeyInt } from '../../util/stateKey.js';

/** @typedef {{ member: number, type: string, slot?: number, target?: number, itemSlot?: number }} PartyAction a non-Defend action of the party member at array position `member` (0-based) */

/** The recorded party order of the hit key tables: the front three (and Luc); heap_attack_spawn/keys_variants 'ord' differs in 8 to 16 words */
const RECORDED_ORDER = ['MCDOHL', 'VIKTOR', 'FLIK', 'LUC'];
/** The other order recorded (heap_attack_spawn keys_variants 'ord'): Flik and Viktor swapped */
const ORD_ORDER = ['MCDOHL', 'FLIK', 'VIKTOR', 'LUC'];
/** The first draw's round frame for no failed pass: the slow party 50, the fast party 56 */
const FIRST_DRAW = { slow: 50, 'L-fire': 56 };
/** A Crystal Core Attack's first draw is this many frames after the battle tick it is dispatched on */
const TICK_TO_FRAME = 10;

/** @typedef {import('./HeapPrediction.js').HeapDump} HeapDump */
/** @typedef {import('./HeapPrediction.js').HeapState} HeapState */
/**
 * The parity of the ticks the party's actions add to a round (ACTION_TICKS), 0 when nobody does more than Defend.
 * @param {PartyAction[]} actions
 * @param {'attack' | 'special'} shape
 * @param {string[] | undefined} order - the party's member keys (the tags are in the recorded order)
 * @returns {number | undefined} undefined when an action is not in the table, or its parity depends on the seed
 */
function ownTicks(actions, shape, order) {
  let sum = 0;
  for (const action of actions) {
    if (order && !RECORDED_ORDER.every((key, i) => order[i] === key)) return undefined;
    const tag = actionTag(action, ACTION_TICKS[shape]);
    const parity =
      tag === undefined
        ? undefined
        : /** @type {Record<string, 0 | 1 | null>} */ (ACTION_TICKS[shape])[tag];
    if (parity === undefined || parity === null) return undefined;
    sum += parity;
  }
  return sum % 2;
}

/**
 * The recorded tag of a party action (member in the recorded order; Rune slot 1-based; an enemy target is 7, a party target 1-6, an area
 * spell 0; an item's slot is its inventory slot).
 * @param {PartyAction} action
 * @param {Record<string, unknown>} table - a table keyed by tag (to tell an enemy-target spell from a party-target one)
 * @returns {string | undefined}
 */
function actionTag(action, table) {
  const base = `m${action.member + 1}`;
  if (action.type === 'Attack') return `${base}A0t7`;
  if (action.type === 'Item') return `${base}I${action.itemSlot}t${(action.target ?? -1) + 1}`;
  if (action.type !== 'Rune') return undefined;
  const slot = `${base}R${(action.slot ?? 0) + 1}`;
  if (action.target === undefined) return `${slot}t0`;
  return `${slot}t7` in table ? `${slot}t7` : `${slot}t${action.target + 1}`;
}

/**
 * The party speeds (SPD, in party order) of the recorded parties: the round lengths of the Attack and kill rounds were recorded for
 * these (the standard and the other order, slow and fast); another party's differ (the Luc-kill round is 534 + 3 per member in a way
 * the Battle's own tick count is off by 18 or 19: heap_turnorder).
 */
const RECORDED_SPEEDS = [
  [1, 112, 149, 1, 124, 58],
  [1, 149, 112, 1, 124, 58],
  [163, 112, 149, 126, 124, 58],
  [163, 149, 112, 126, 124, 58],
].map((x) => x.join());

/**
 * The Explosion's particle words a finished Special leaves behind that the heap model does not hold: the Special's animated particle
 * words. Their low 12 bits (all the Explosion reads) are a constant, whatever the seed, the kill, the party or the menu delay: the live
 * words were identical in 160 of 160 casts that came 388 or more ticks after the Special's first allocation (heap_word27, 30 seeds
 * per scenario, luc1 / luc2 / luc4 / vf1, delay 0 and 1), and the animation stops changing them 240 ticks after it. Particle index
 * (0-based) -> low 12 bits.
 */
const EXPLOSION_SETTLED = new Map([[27, 0]]);

/**
 * The turn-order parties' class by the speeds of McDohl and Luc (party order): the recorded round lengths hold for any speeds of the
 * other four ('filler') members (M-after-p0..p4, M-before-p0..p3: heap_rounds_more/turnorder, 216 runs; the standard parties are two
 * of them). A Luc-kill round is 534 + 3 x f + failed passes ticks when both are slow (Luc acts after Crystal Core's Attack) and
 * 427 + 3 x f when both are fast (Luc kills before it acts), f = the fillers faster than Luc.
 * @param {number[] | undefined} speeds
 * @returns {'slow' | 'fast' | undefined}
 */
function speedClass(speeds) {
  if (speeds === undefined) return undefined;
  if (speeds[0] === 1 && speeds[3] === 1) return 'slow';
  if (speeds[0] === 163 && speeds[3] === 126) return 'fast';
  return undefined;
}

/** @param {number[]} speeds @returns {number} the fillers (Viktor, Flik, Tengaar, Hellion) that act faster than Luc */
function fastFillers(speeds) {
  return [1, 2, 4, 5].filter((i) => speeds[i] > speeds[3]).length;
}

const SPELL_NAMES = /** @type {const} */ ([
  'FlamingArrow',
  'Explosion',
  'Thor',
  'BlackShadow',
  'Hell',
]);
/** @typedef {typeof SPELL_NAMES[number]} SpellName */

/**
 * The spells a cast changes for the casts after it, until the next Special (heap_pairs, all 25 ordered pairs, party L-fire, 3 seeds, with
 * and without a round between): any cast but Flaming Arrow and Explosion, which leave nothing the other reads (a spell followed by
 * itself changes too).
 * @type {Record<SpellName, readonly SpellName[]>}
 */
const PAIR_TAINT = {
  FlamingArrow: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  Explosion: ['Explosion', 'Thor', 'BlackShadow', 'Hell'],
  Thor: SPELL_NAMES,
  BlackShadow: SPELL_NAMES,
  Hell: SPELL_NAMES,
};

/**
 * The spells the kill of Crystal Core changes against a kill by Luc's Flaming Arrow, by method (heap_kills, 3 seeds): the Explosion words
 * are the same for every method that kills: all but Explosion are flagged for the other methods too. Thor kills the boss (the Unite heals the
 * six members by 1; kill_diag, boss at 1 and 2 HP, 3 seeds); Hell does nothing to it (no damage, no kill, no Special: an entry for Hell is never
 * reached because the Battle plays no kill).
 * A McDohl Attack kill leaves the Thor words as they were.
 * @type {Record<string, readonly SpellName[]>}
 */
const KILL_TAINT = {
  Explosion: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  BlackShadow: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  Hell: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  Thor: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  FlamingArrowOther: ['FlamingArrow', 'Thor', 'BlackShadow', 'Hell'],
  Attack1: ['FlamingArrow', 'BlackShadow', 'Hell'],
};

/**
 * Crystal Core's Attack as the battle ran it: the round's camera class (first rand() % 3), the party slot hit (1..3, party order,
 * 1-based, the party ARRAY slot, not the formation position), the failed scan passes, the round, and, if the heap did not see the earlier
 * Attacks, their failed passes (rounds 1 to round - 1). `frame`: the round frame of the first draw (the draw buffer index follows its parity;
 * 50 + passes in the recorded rounds, 56 + passes for the fast party; a dead member's shorter polls move it). `order`: which party order's tables the key indexes
 * (the recorded one, the Flik / Viktor swapped one, or another composition: none); `dead`: a party member is out of the fight.
 * @typedef {{ camera: number, target: number, passes: number, round: number, previousPasses?: number[], frame?: number, order?: 'recorded' | 'ord' | 'other', dead?: boolean }} Hit
 */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../../util/stateKey.js').KeyOut} KeyOut */

/**
 * The heap state a battle's spells read stale words from. Starts from a dump taken at a Fight prompt and follows what happens to the
 * heap after it, round by round: the Fight menu is freed at each round start, a party spell's cast and an enemy move replay their
 * recorded heap events on the allocator, and the Fight menu is rebuilt. Blocks an action allocates and fills are `unknown` (their
 * content is that action's object data, which the model cannot see); a Flaming Arrow cast leaves its 20 particle structs' trail_x
 * words as known words; a spell's loader buffer makes the 16 KB it covers known (the constant image). The next cast's stale words
 * are then read through that state.
 *
 * Validated on Crystal Core: Flaming Arrow's round-2 words from round 1's cast alone (20 seeds), and the layout after the
 * Attack and the Special (heap footprints).
 *
 * Not modelled: heap activity nobody recorded as events (hit effects, status objects, other enemies' moves, items, other
 * casters' spells), so a cast after any of those can be predicted wrongly. The simulator does not flag that: a dump is optional, and
 * whatever sets a battle up decides whether to warn.
 */
export default class VfxHeap {
  /**
   * @param {HeapDump} dump
   * @param {{ party?: string, index?: number, stalePool?: 'arena' | 'wipe' }} [options] - `index`: the draw buffer index (u32 0x8018023c) at the first confirm, if the
   *   dump is a first prompt (0 in every recorded battle): the index then follows from the rounds' ticks. Unset: unknown, the older rules
   *   `stalePool`: where the Attack packets' stale halves come from. 'arena' (default): the dump, which must be the fight's own first-prompt
   *   pool (what the simulator requires). 'wipe': the spiral-wipe model first, for a dump that is another party's pool (no first-prompt
   *   dump exists for the other party order, so its tests start from the standard one)
   *   - which recording of the party the enemy moves' block images come from (their words depend on
   *   the party's timing): 'L-fire' (default; the party acts before the enemy) or 'L-fire-slow' (the enemy moves first in the round)
   */
  constructor(dump, options = {}) {
    this.party = options.party ?? 'L-fire';
    /** The draw buffer index at the current prompt (before the menu time), undefined while unknown @type {number | undefined} */
    this.index = options.index;
    /** @type {'arena' | 'wipe'} */
    this.stalePool = options.stalePool ?? 'arena';
    /** The draw buffer index at the current round's confirm @type {number | undefined} */
    this.idx0 = options.index;
    /** @type {{ attack?: number, special: boolean, casts: number, castList: string[], round?: number, trail: [number, number][] }} */
    this.roundMoves = { special: false, casts: 0, castList: [], trail: [] };
    /** The draw buffer index at the last draw of each round's Attack, by round (when the heap follows the index) @type {Map<number, number>} */
    this.attackIndex = new Map();
    /** The last enemy move's blocks, [pointer, words] @type {[number, number][]} */
    this.lastMoveBlocks = [];
    /** Frames the menu took before the next confirm (a recorded input; the draw buffer index counts them) */
    this.menuDelay = 0;
    const heap = new HeapModel(dump.arena, dump.rover);
    /** The Fight menu's blocks, freed at every round start (the rebuilt menu sits at the same addresses) */
    this.menuBlocks = fightMenuFrees(heap, dump);
    /**
     * The request sizes that rebuild the Fight menu at a round's end, in allocation order: the blocks carve from the tail of the free
     * block, so allocation order is descending address; each block's size is read off its header (units: a request of (units - 1) * 8
     * bytes takes the same). Rebuilt at the same addresses (the Crystal Core footprints: the 44 rebuilt blocks are the 44 freed ones).
     */
    this.menuRebuild = [...this.menuBlocks]
      .sort((a, b) => b - a)
      .map((p) => (heap.u32(p - 4) - 1) * 8);
    /** @type {HeapState} */
    this.state = bindState({ heap, known: new Map(), unknown: new Set() });
    /** The enemy count changed the menu's block sizes at the last rebuild @type {boolean} */
    this.menuSizeChanged = false;
    /** The Fight menu's payload address ranges [start, end), for words an in-round image must not claim (the rebuilt menu overwrites them later) */
    this.menuRanges = this.menuBlocks.map((p) => [p, p + (heap.u32(p - 4) - 1) * 8]);
    /**
     * The next-prompt image of this round's enemy move, applied when the menu is rebuilt: the final state of the move's blocks (words
     * the rebuild does not touch, e.g. block headers it leaves alone) and the rebuilt menu's blocks. `ptrs` are the move's allocations.
     * @type {{ image: import('./EnemyMoveImages.js').BlockSet, ptrs: (number | null)[], kill?: import('./EnemyMoveImages.js').BlockSet, byPhase?: { fast?: import('./EnemyMoveImages.js').BlockSet, slow?: import('./EnemyMoveImages.js').BlockSet } } | null}
     */
    this.pendingMenuImage = null;
    /** The hit effect's words the key fixed, applied again after the next-prompt image at the round's end @type {{ blocks: import('./EnemyMoveImages.js').BlockImage[], ptrs: (number | null)[] } | null} */
    this.pendingHit = null;
    /** The enemy moves this heap has applied (a move's image is only valid the first time unless it is marked `repeatable`) */
    this.movesSeen = new Set();
    /** Moves that ran before this heap's dump was taken, 'ENEMY/Move' (a Battle started from a later dump sets them: like `repeat` for `enemyMove`) @type {Set<string>} */
    this.assumedMoves = new Set();
    /** The round's camera roll % 3 (the first rand() of the round), given by the battle; undefined until it is */
    this.camera = undefined;
    /** Crystal Core's failed target scan passes this round (each one frame later), counted by the battle */
    this.scanPasses = 0;
    /**
     * The Crystal Core Attacks whose hit effect this heap has seen, by round: the later hit effect's packets and the second Special's
     * particle phase follow from the failed scan passes of the first.
     * @type {{ round: number, passes: number, camera: number, target: number, shift?: number }[]}
     */
    this.attacks = [];
    /**
     * How the next repeated Special's particles end, as a recorded input (heap_special_phase_scenarios.txt): which of the two images
     * the round gets is not a function of the bulk alloc frame, the failed passes or the round lengths in every scenario. Set it
     * from the recording; unset, it follows from the draw buffer index at the cast round's start and the members that acted before Crystal Core.
     * @type {'fast' | 'slow' | undefined}
     */
    this.specialPhase = undefined;
    /** How many party members had acted before the last Special (Crystal Core's turn comes after theirs) @type {number | undefined} */
    this.specialBefore = undefined;
    /** Spells whose stale words something the model has no events for changed (a party action, a kill, a death): their words are unknown @type {Set<SpellName>} */
    this.tainted = new Set();
    /** Spells an earlier cast changed, until the next Special @type {Set<SpellName>} */
    this.pairTainted = new Set();
  }

  /**
   * The game tick at which the last Special's first particle roll happens, before any lag frame: 113 + 3 per party member that acted
   * before Crystal Core (heap_turnorder, 40 of 40; 122 for the slow party, 128 for L-fire), plus the lag frames (rendering load, a
   * recorded input per run) that came before it: the first roll's frame. The bulk alloc is 65 ticks earlier. Lags move the frame
   * clock only, nothing else (not the words, not the RNG).
   * @param {number} [lags]
   * @returns {number | undefined}
   */
  specialStartTick(lags = 0) {
    return this.specialBefore === undefined ? undefined : 113 + 3 * this.specialBefore + lags;
  }

  clone() {
    const copy = Object.create(VfxHeap.prototype);
    copy.party = this.party;
    copy.movesSeen = new Set(this.movesSeen);
    copy.assumedMoves = new Set(this.assumedMoves);
    copy.camera = this.camera;
    copy.scanPasses = this.scanPasses;
    copy.attacks = [...this.attacks];
    copy.specialPhase = this.specialPhase;
    copy.specialBefore = this.specialBefore;
    copy.tainted = new Set(this.tainted);
    copy.pairTainted = new Set(this.pairTainted);
    copy.index = this.index;
    copy.roundMoves = { ...this.roundMoves };
    copy.attackIndex = new Map(this.attackIndex);
    copy.lastMoveBlocks = this.lastMoveBlocks;
    copy.idx0 = this.idx0;
    copy.menuDelay = this.menuDelay;
    copy.menuBlocks = this.menuBlocks;
    copy.menuRebuild = this.menuRebuild;
    copy.menuRanges = this.menuRanges;
    copy.pendingMenuImage = this.pendingMenuImage;
    copy.pendingHit = this.pendingHit;
    copy.state = cloneState(this.state);
    return copy;
  }

  /** The round starts and the game frees the Fight menu (the 44 blocks, in the order they were freed in the dump). */
  roundStart() {
    for (const p of this.menuBlocks) this.state.heap.free(p);
    this.scanPasses = 0;
    /** What the round has done so far: Crystal Core's Attack (its failed passes), its Special, the party's casts, the Attack's round @type {{ attack?: number, special: boolean, casts: number, castList: string[], round?: number, trail: [number, number][] }} */
    this.roundMoves = { special: false, casts: 0, castList: [], trail: [] };
    // the draw buffer index at this round's confirm: the index at the prompt, moved by the menu time
    this.idx0 = this.index === undefined ? undefined : (this.index + this.menuDelay) % 2;
    this.menuDelay = 0;
  }

  /**
   * What the round did that the heap has no events for changes the stale words some spells read later: a party action (per action, from
   * the 104 recorded jobs), the kill of Crystal Core by something but Luc's Flaming Arrow, a party member dying. Those spells' words are
   * unknown from now on (their value is kept: the best guess).
   * @param {{ partyAttacked: boolean, bossDied: boolean, actions: PartyAction[], order?: string[], died: number[] }} round
   */
  taintRound({ partyAttacked, bossDied, actions, order, died }) {
    const { casts, castList, attack, special } = this.roundMoves;
    if (died.length > 0) for (const spell of SPELL_NAMES) this.tainted.add(spell);
    if (bossDied) {
      /** @type {readonly SpellName[]} */
      let changed;
      const casters = actions.filter((a) => a.type === 'Rune').map((a) => a.member);
      const attackers = actions.filter((a) => a.type === 'Attack').map((a) => a.member);
      if (castList.length === 1 && castList[0] === 'FlamingArrow' && casters.length === 1) {
        // Luc's Flaming Arrow is the recorded kill; another member's is a kill of its own
        changed = casters[0] === 3 ? [] : KILL_TAINT.FlamingArrowOther;
      } else if (castList.length === 1) changed = KILL_TAINT[castList[0]] ?? SPELL_NAMES;
      else if (castList.length === 0 && partyAttacked) {
        const who = [...new Set(attackers)].sort().join();
        // Viktor + Flik's Attack is the recorded kill by Attack; McDohl's alone is another
        changed = who === '1,2' ? [] : who === '0' ? KILL_TAINT.Attack1 : SPELL_NAMES;
      } else changed = SPELL_NAMES;
      for (const spell of changed) this.tainted.add(spell);
    } else if (actions.length > 0 && casts === 0) {
      const shape = special ? 'special' : attack !== undefined ? 'attack' : undefined;
      for (const action of actions) {
        const table = shape && ACTION_FOOTPRINTS[shape];
        const tag =
          table && !(order && !RECORDED_ORDER.every((k, i) => order[i] === k))
            ? actionTag(action, table)
            : undefined;
        const changed = tag === undefined ? undefined : table?.[tag];
        for (const spell of changed ?? SPELL_NAMES)
          this.tainted.add(/** @type {SpellName} */ (spell));
      }
    }
  }

  /**
   * A prediction with the spells' words the model cannot vouch for flagged unknown.
   * @template {{ unknown?: boolean[], staleResidualUnknown?: boolean[], staleScaleUnknown?: boolean[], complete: boolean }} T
   * @param {SpellName} spell
   * @param {T} p
   * @returns {T}
   */
  withTaint(spell, p) {
    if (!this.tainted.has(spell) && !this.pairTainted.has(spell)) return p;
    const all = (/** @type {boolean[] | undefined} */ list) => list?.map(() => true);
    return {
      ...p,
      ...(p.unknown ? { unknown: all(p.unknown) } : {}),
      ...(p.staleResidualUnknown
        ? {
            staleResidualUnknown: all(p.staleResidualUnknown),
            staleScaleUnknown: all(p.staleScaleUnknown),
          }
        : {}),
      complete: false,
    };
  }

  /** The words of the last enemy move's blocks stop being known (something else allocated over them). */
  forgetMoveBlocks() {
    for (const [ptr, words] of this.lastMoveBlocks)
      for (let i = 0; i < words; i++) {
        this.state.known.delete(ptr + 4 * i);
        this.state.partial.delete(ptr + 4 * i);
        this.state.unknown.add(ptr + 4 * i);
      }
    this.lastMoveBlocks = [];
  }

  /**
   * The round's camera roll (the first rand() of the round) has been made.
   * @param {number} rand
   */
  cameraRoll(rand) {
    this.camera = rand % 3;
  }

  /**
   * Crystal Core's target scan found nobody this tick and tries again on the next one (one frame later).
   * @param {string} enemyKey
   */
  scanPass(enemyKey) {
    if (enemyKey === 'CRYSTAL_CORE') this.scanPasses++;
  }

  /**
   * The round ends and the Fight menu is built again for the next prompt (its content is the menu's own data: unknown).
   * @param {{ partyAttacked?: boolean, bossDied?: boolean, actions?: PartyAction[], order?: string[], dead?: boolean[], died?: number[], speeds?: number[], enemies?: number }} [round] - what else happened in the round
   *   (`actions`: the party's non-Defend actions, whose recorded ticks join the round's). The draw buffer index toggles once
   *   per game tick, so the next round's index is this one's plus the round's ticks and the 2 frames of the wait (plus the menu time,
   *   `menuDelay`); the ticks are a recorded function of the round's shape (heap_rounds, 240 runs, 960 of 960 transitions): an Attack
   *   round 211 + failed passes, an Attack round in which Luc's Flaming Arrow kills 546 + failed passes, a Special round 392, a round in
   *   which the party's Attack kills before Crystal Core acts 221-223 (odd with the wait): the parity is odd + passes, passes, even, odd.
   *   Another shape leaves the index unknown.
   *   `enemies`: the living enemies at the round's end: the enemy window's two blocks scale with it (30 and 15 bytes each per enemy,
   *   Crystal Core alone is 1); unset: as many as the menu before.
   * @returns {(number | null)[]} the rebuilt blocks' payload pointers
   */
  roundEnd({
    partyAttacked = false,
    bossDied = false,
    actions = [],
    order,
    dead = [],
    died = [],
    speeds,
    enemies,
  } = {}) {
    // a party Attack's own effect allocates over the freed blocks of an earlier move: its words are not known any more
    if (partyAttacked) this.forgetMoveBlocks();
    this.taintRound({ partyAttacked, bossDied, actions, order, died });
    const fast = this.party === 'L-fire';
    // (the round lengths are a function of McDohl's and Luc's speeds and of the fillers faster than Luc; the images are the party's)
    const cls = speeds === undefined ? (fast ? 'fast' : 'slow') : speedClass(speeds);
    const fillers = speeds === undefined ? (fast ? 1 : 4) : fastFillers(speeds);
    // the images are the recorded parties': another party's speeds change when the moves' particles end (the second Special's words
    // differ from them in the turn-order parties: Black Shadow word 56 in M-after-p0), so the words they read are unknown
    if (speeds !== undefined && !RECORDED_SPEEDS.includes(speeds.join()))
      for (const spell of SPELL_NAMES) this.tainted.add(spell);
    if (this.index !== undefined) {
      const { attack, special, casts } = this.roundMoves;
      /** @type {number | undefined} */
      let toggles;
      // the party's own actions add ticks to the round: their parity, from the recorded table (unknown: the index is lost)
      const own = ownTicks(actions, special ? 'special' : 'attack', order);
      const out = dead.flatMap((d, i) => (d ? [i] : []));
      // an Attack round is 1 + the failed passes ticks (odd with the wait) shifted by the frames the Attack's draw is early: a dead second
      // or third member polls 3 frames less (fast party: any dead member 1), and the slow party's dead front member shortens the round by
      // one more tick (heap_attack_spawn keys_variants_rounds, keys_fast: 72 of 72 each); other deaths were not recorded
      // (the slow party's dead member in slots 4-6 too: heap_rounds_more/dead456, 72 of 72 each)
      const known = out.length === 0 || (out.length === 1 && (out[0] < 3 || !fast));
      // a death costs 3 ticks (an odd change of every later round's index): a member of slots 4 and 6 killed in the round shortens that
      // round; slot 5's death costs the 3 ticks from the next round on; every Special round after it is 3 ticks shorter per dead member
      // (heap_rounds_more/deaths: 216 of 216 transitions). Slots 1-3 and the fast party were not recorded.
      const deathKnown = died.every((i) => i >= 3) && (!fast || died.length === 0);
      const diedHere = died.filter((i) => i === 3 || i === 5).length;
      const deadSpecial =
        out.length === 0 ? 0 : out.every((i) => i >= 3) && !fast ? out.length : undefined;
      // the round lengths of the Attack and kill rounds are the speed class's (the Special round is 392 for every party)
      const recordedParty = cls === (fast ? 'fast' : 'slow');
      // (a party action that came first shifts the Attack's draw too; its ticks are in `own` already)
      const shift =
        actions.length > 0 || (speeds !== undefined && !RECORDED_SPEEDS.includes(speeds.join()))
          ? 0
          : (this.attacks.find((a) => a.round === this.roundMoves.round)?.shift ?? 0);
      const plus =
        1 +
        shift -
        (!fast && out.length === 1 && (out[0] === 0 || out[0] === 3 || out[0] === 5) ? 1 : 0);
      if (special && !attack)
        toggles =
          own === undefined || deadSpecial === undefined || !deathKnown
            ? undefined
            : (own + deadSpecial + diedHere) % 2;
      else if (!recordedParty) toggles = undefined;
      else if (
        attack !== undefined &&
        !special &&
        (!partyAttacked || actions.length > 0) &&
        (casts === 0 || (actions.length > 0 && own !== undefined)) &&
        !bossDied
      )
        toggles =
          own === undefined || !known || !deathKnown
            ? undefined
            : (((plus + attack + own + diedHere) % 2) + 2) % 2;
      else if (attack !== undefined && !special && !partyAttacked && casts === 1 && bossDied)
        toggles = out.length ? undefined : (attack + fillers) % 2;
      else if (
        attack === undefined &&
        !special &&
        casts === 1 &&
        bossDied &&
        !partyAttacked &&
        fast
      )
        // the fast party's Luc kills before Crystal Core acts: a round of 427 + 3 per filler faster than Luc (430 for the standard party)
        toggles = out.length ? undefined : (1 + fillers) % 2;
      else if (attack === undefined && !special && partyAttacked && bossDied && casts === 0)
        // a Viktor + Flik kill: 221-223 ticks for the slow party (odd with the wait; 223 with a dead member of slots 4-6 too), 226 for the fast one
        toggles =
          died.length > 0 || (fast ? out.length > 0 : out.some((i) => i < 3))
            ? undefined
            : fast
              ? 0
              : 1;
      this.index = toggles === undefined ? undefined : ((this.idx0 ?? this.index) + toggles) % 2;
    }
    // the enemy window (the second of the eight: blocks 7 and 8 of the 44) is 15 cells per living enemy, 2 and 1 bytes per cell
    if (enemies !== undefined && enemies > 0) {
      const [text, attr] = [30 * enemies, 15 * enemies].map((n) => Math.ceil(n / 8) * 8);
      if (this.menuRebuild[7] !== text || this.menuRebuild[8] !== attr) {
        this.menuRebuild = [...this.menuRebuild];
        this.menuRebuild[7] = text;
        this.menuRebuild[8] = attr;
        this.menuSizeChanged = true;
      }
    }
    const ptrs = applyEvents(this.state, this.menuRebuild);
    if (this.menuSizeChanged) {
      // the blocks carve from the tail of the free block, so a window of another size moves every later block: the next round frees the
      // new ones (in the menu's destroy order: per window the text, attribute, two prim arrays, the window; then the object, the menu, the buffers)
      const at = /** @type {number[]} */ (ptrs);
      this.menuBlocks = [];
      for (let k = 0; k < 8; k++)
        this.menuBlocks.push(
          at[2 + 5 * k],
          at[3 + 5 * k],
          at[4 + 5 * k],
          at[5 + 5 * k],
          at[1 + 5 * k],
        );
      this.menuBlocks.push(at[41], at[0], at[42], at[43]);
      this.menuRanges = this.menuBlocks.map((p) => [p, p + (this.state.heap.u32(p - 4) - 1) * 8]);
      this.menuSizeChanged = false;
    }
    if (this.pendingMenuImage) {
      const { ptrs: moveBlocks, kill, byPhase } = this.pendingMenuImage;
      const killed = this.roundMoves.casts > 0 && bossDied && kill !== undefined;
      const image =
        (killed ? kill : undefined) ??
        (byPhase && this.idx0 !== undefined
          ? this.idx0 === 1
            ? byPhase.slow
            : byPhase.fast
          : undefined) ??
        this.pendingMenuImage.image;
      if (killed) this.pendingHit = null;
      const trail = killed ? this.roundMoves.trail : [];
      // the blocks of the move first (a block of the move that lies under the menu holds the menu's words now: the menu image after it
      // says the same, constant words only)
      if (this.party !== 'L-fire')
        this.applyImage(
          image.blocks,
          moveBlocks,
          (_i, n) => n - 1,
          () => false,
        );
      this.applyImage(
        image.menu,
        ptrs,
        (i) => i,
        () => false,
      );
      // the kill cast's own particle words: the low bits are the cast's (the next cast reads them), the top byte is the history the
      // cast did not write: the word is not known, but the heap holds the cast's value for the prediction
      for (const [addr, word] of trail) {
        this.state.heap.over.set(addr, word);
        this.state.known.delete(addr);
        this.state.partial.add(addr);
        this.state.unknown.add(addr);
      }
      this.pendingMenuImage = null;
    }
    if (this.pendingHit) {
      this.applyImage(
        this.pendingHit.blocks,
        this.pendingHit.ptrs,
        (_p, n) => n - 1,
        () => false,
      );
      this.pendingHit = null;
    }
    return ptrs;
  }

  /**
   * Replays recorded block images as known writes: every payload word that is constant between the recorded seeds becomes known; a
   * varying word stays unknown. A block whose pointer is not where the image was recorded (another layout) is skipped.
   * @param {import('./EnemyMoveImages.js').BlockImage[]} blocks
   * @param {(number | null)[]} ptrs - the pointers the allocations got, by allocation index
   * @param {(index: number, n: number) => number} indexOf - the block's index in `ptrs`, from its position in `blocks` and its number
   * @param {(addr: number) => boolean} skip - words the image must not claim
   * @param {Map<number, number>} [history] - the known words from before the move's allocations: a word the move only wrote the low three
   *   bytes of (`topOnly`) keeps its top byte from there, when it was known (the word stays unknown, holding that estimate)
   * @param {boolean} [applyKept] - the image's kept words are applied too: the heap built that history itself (it ran the recorded
   *   scenario, whose history the image holds), so it has no better value; a heap started from a dump keeps the dump's words
   * @returns {number} the number of words made known
   */
  applyImage(blocks, ptrs, indexOf, skip, history, applyKept = false) {
    let known = 0;
    blocks.forEach(([n, ptr, hex, varying, keep, topOnly, low12], position) => {
      if (ptrs[indexOf(position, n)] !== ptr) return;
      const skipWord = new Set(varying);
      const kept = new Set(keep);
      const top = new Set(topOnly);
      const low = new Set(low12);
      for (let i = 0; i < hex.length / 8; i++) {
        const addr = ptr + 4 * i;
        // a kept word is the battle's history, left as the heap has it
        if (skip(addr)) continue;
        if (kept.has(i) && !applyKept) {
          // the move did not write it: it holds what the dump had there (the heap's own words were made unknown by the allocation)
          if (!this.state.known.has(addr)) {
            const { view, base } = this.state.heap;
            this.state.known.set(addr, view.getUint32(addr - base, true));
            this.state.partial.delete(addr);
            this.state.unknown.delete(addr);
          }
          continue;
        }
        if (top.has(i) && !skip(addr)) {
          const before = history?.get(addr) ?? this.state.heap.over.get(addr);
          if (before !== undefined) {
            const low = parseInt(hex.slice(i * 8, i * 8 + 8), 16) & 0xffffff;
            // the top byte is the battle's history as this heap has it, which the recording does not confirm: the word stays unknown,
            // with the best value in the heap (the spells read the low bits)
            this.state.heap.over.set(addr, (((before >>> 24) << 24) | low) >>> 0);
            this.state.known.delete(addr);
            this.state.partial.add(addr);
            this.state.unknown.add(addr);
            continue;
          }
        }
        if (low.has(i) && skipWord.has(i)) {
          // varies between seeds in the high bits only: the low 12 bits are the same in every seed and are all a particle spell reads
          this.state.heap.over.set(addr, parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
          this.state.known.delete(addr);
          this.state.partial.add(addr);
          this.state.unknown.add(addr);
          continue;
        }
        if (skipWord.has(i)) {
          // a word that varies between seeds: its value is not known, whatever an earlier image said
          this.state.known.delete(addr);
          this.state.partial.delete(addr);
          this.state.unknown.add(addr);
          continue;
        }
        this.state.known.set(addr, parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
        this.state.partial.delete(addr);
        this.state.unknown.delete(addr);
        known++;
      }
    });
    return known;
  }

  /**
   * The words of the freed Fight menu's blocks as they stand in a round before the menu is rebuilt: constant words known, varying
   * words unknown (nothing allocated them, so no event marks them unknown), kept words left as the heap has them.
   * @param {import('./EnemyMoveImages.js').BlockImage[]} blocks
   */
  applyStaleMenu(blocks) {
    const menu = new Set(this.menuBlocks);
    for (const [, ptr, hex, varying, keep] of blocks) {
      if (!menu.has(ptr)) continue;
      const varies = new Set(varying);
      const kept = new Set(keep);
      for (let i = 0; i < hex.length / 8; i++) {
        if (kept.has(i)) continue;
        const addr = ptr + 4 * i;
        if (varies.has(i)) {
          this.state.known.delete(addr);
          this.state.partial.delete(addr);
          this.state.unknown.add(addr);
        } else {
          this.state.known.set(addr, parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
          this.state.partial.delete(addr);
          this.state.unknown.delete(addr);
        }
      }
    }
  }

  /**
   * An action's recorded heap events (the HeapSpellEvents format) happen, e.g. an enemy move's footprint including the rebuilt menu
   * at its end.
   * @param {number[]} events
   * @returns {(number | null)[]} the payload pointer of each allocation
   */
  applyEvents(events) {
    return applyEvents(this.state, events);
  }

  /**
   * An enemy's move runs: its recorded heap events, if there are any (Crystal Core's Attack and Special so far). A move without
   * recorded events leaves the model as it is.
   * @param {string} enemyKey - the ENEMY_KEYS value
   * @param {string} moveName
   * @param {{ repeat?: boolean, phase?: 'fast' | 'slow', hit?: Hit, target?: number, round?: number, tick?: number, order?: string[], before?: number, dead?: boolean }} [options] - `repeat`: the move has
   *   run before in this battle although this heap has not seen it (the heap started from a dump taken after it): its image is then
   *   only used if the image is `repeatable`.
   *   `phase`: how a repeated Special's particles end ('fast' or 'slow'; heap_special_particle_end_frames.txt): each has its own
   *   in-round image. Not given: slow when round 1's Attack had an odd number of failed scan passes (23 of 23 slow seeds, 17 of 17
   *   fast ones), if this heap saw that Attack.
   *   `hit`: the Attack's hit-effect packets. Not given: made from the battle's own camera roll and scan passes (`cameraRoll`,
   *   `scanPass`) with `target` (the party slot hit, 1-based in party order) and `round`.
   * @returns {boolean} whether the move had recorded events
   */
  enemyMove(
    enemyKey,
    moveName,
    { repeat = false, phase, hit, target, round = 1, tick, order, before, dead } = {},
  ) {
    // (a monster without recorded events: its basic Attack's hit effect is the generic one, its other moves are not modelled)
    const events =
      ENEMY_MOVE_EVENTS[enemyKey]?.[moveName] ??
      (moveName === 'Attack' && !ENEMY_MOVE_EVENTS[enemyKey] ? ENEMY_ATTACK_HIT : undefined);
    if (!events) return false;
    const history = new Map(this.state.known);
    // (the words the heap has no information on yet: the dump's arena words are the real ones everywhere else)
    const unknownBefore =
      moveName === 'Attack' || moveName === 'Special' ? new Set(this.state.unknown) : undefined;
    const ptrs = applyEvents(this.state, events);
    const images = ENEMY_MOVE_IMAGES[enemyKey]?.[moveName];
    {
      const shape = images?.[this.party]?.next ?? images?.['L-fire']?.next;
      this.lastMoveBlocks = (shape?.blocks ?? [])
        .filter(([n, ptr]) => ptrs[n - 1] === ptr)
        .map(([, ptr, hex]) => /** @type {[number, number]} */ ([ptr, hex.length / 8]));
    }
    let mine = images?.[this.party];
    const key = `${enemyKey}/${moveName}`;
    // an image is what the move wrote the first time (the Special's particles end at a frame that depends on the round's timing): a
    // move that runs again leaves its blocks unknown unless the image was checked on a repeat
    // `modeled`: this heap applied the move's image itself earlier (a heap started from a dump after it holds the real words instead)
    const modeled = this.movesSeen.has(key);
    const repeated = repeat || modeled || this.assumedMoves.has(key);
    if (moveName === 'Special' && repeated) {
      phase ??= this.specialPhase;
      // the draw buffer index at the Special's bulk alloc is the phase (0 fast, 1 slow): the cast round's start index plus one tick per
      // party member that has acted before Crystal Core, plus one (heap_turnorder, 40 of 40; with 3 members before it the earlier 62 of 62)
      if (this.idx0 !== undefined && before !== undefined)
        phase ??= (this.idx0 + before + 1) % 2 === 1 ? 'slow' : 'fast';
    }
    if (moveName === 'Special' && before !== undefined) this.specialBefore = before;
    const phased =
      phase === 'fast'
        ? mine?.inRoundFast
        : phase === 'slow' && repeated
          ? mine?.inRoundSlow
          : undefined;
    // (the hit effect's blocks are the same allocations on every Attack: its tables, not the image, give their words)
    const hitImage = mine;
    if (!phased && repeated && !mine?.repeatable) mine = undefined;
    this.movesSeen.add(key);
    // the menu is rebuilt at the round's end; its image is that party's next-prompt one, else the first recording's
    const next = (mine ?? images?.[this.party])?.next ?? images?.['L-fire']?.next;
    if (phased) {
      this.applyImage(
        phased.blocks,
        ptrs,
        (_position, n) => n - 1,
        () => false,
        history,
        modeled,
      );
      // the menu words the repeated round rewrites (two blocks swap contents): the phase image has their values
      // and, for a heap that built the first Special's history itself, the history words that follow the phase
      this.applyStaleMenu((modeled && phased.menuModeled) || phased.menu);
    } else if (mine?.inRound) {
      // the arena as a cast in this round sees it: the move's blocks, and the freed Fight menu's blocks as they stand (not rebuilt yet),
      // except the words the round did not change (the image lists them): those are the battle's history (e.g. the kill spell's residue).
      // The Special's own blocks come from the model of its code when it covers them (the image otherwise)
      const modeled =
        moveName === 'Special' &&
        !repeated &&
        this.applySpecialModel(ptrs, history, unknownBefore ?? new Set(), phase);
      // (the words the Fight menu's blocks cover stay the image's for now: the freed menu keeps being drawn into them every frame, and
      // its window draw is not modelled; elsewhere the model's words are the move's own)
      // (a block's 8-byte header, which the rebuild's allocation rewrites, counts with it)
      const inMenu = (/** @type {number} */ a) =>
        this.menuRanges.some(([lo, hi]) => a >= lo - 8 && a < hi);
      this.applyImage(
        mine.inRound.blocks,
        ptrs,
        (_position, n) => n - 1,
        modeled ? (a) => !inMenu(a) : () => false,
      );
      this.applyStaleMenu(mine.inRound.menu);
      if (repeated)
        for (const addr of mine.repeatUnknown ?? []) {
          this.state.known.delete(addr);
          this.state.partial.delete(addr);
          this.state.unknown.add(addr);
        }
    } else if (mine?.next) {
      // the image is the arena at the next prompt; a cast later in this round runs before the menu is rebuilt, so the words the rebuilt
      // menu covers are not the image's yet (the menu's own image is applied when it is rebuilt)
      const inMenu = (/** @type {number} */ a) =>
        this.menuRanges.some(([lo, hi]) => a >= lo && a < hi);
      this.applyImage(mine.next.blocks, ptrs, (_position, n) => n - 1, inMenu);
    }
    if (moveName === 'Special') {
      this.roundMoves.special = true;
      // a Special rewrites what the earlier casts left (the kill scenarios' casts after it are exact)
      this.pairTainted.clear();
    }
    if (moveName === 'Attack') {
      this.roundMoves.attack = hit?.passes ?? this.scanPasses;
      this.roundMoves.round = hit?.round ?? round;
      hit ??=
        this.camera === undefined || target === undefined
          ? undefined
          : {
              camera: this.camera,
              target,
              passes: this.scanPasses,
              round,
              // the battle's tick of the Attack is 10 frames before its first draw in all 316 recorded runs (both parties)
              frame: tick === undefined ? undefined : tick + TICK_TO_FRAME,
              // the tables hold for the recorded party order (McDohl, Viktor, Flik, Luc) and the other order (McDohl, Flik, Viktor, Luc,
              // its own round-1 images); any other composition has other words
              order:
                order === undefined || RECORDED_ORDER.every((key, i) => order[i] === key)
                  ? 'recorded'
                  : ORD_ORDER.every((key, i) => order[i] === key)
                    ? 'ord'
                    : 'other',
              dead,
            };
      if (hit) this.hitEffect(hit, hitImage, ptrs, history, unknownBefore);
      this.scanPasses = 0;
    }
    this.pendingMenuImage = next
      ? {
          image: next,
          ptrs,
          // the same round's next-prompt image when Luc's cast kills Crystal Core after its Attack, and by the first Special's phase
          kill: moveName === 'Attack' ? mine?.nextKill : undefined,
          byPhase:
            moveName === 'Special' && !repeated
              ? { fast: mine?.nextFast, slow: mine?.nextSlow }
              : undefined,
        }
      : null;
    return true;
  }

  /**
   * The words of Crystal Core's Attack hit effect (its GPU packets) as the key fixes them: the 24 forty-byte packets from the round's
   * key table, the other blocks (52 and 80 bytes) from the round-1 block table of that camera, slot and buffer index (round 1's index in round 2 too). A round the
   * tables do not cover (the first three Attacks of the battle, each round an Attack with everyone Defending) leaves them unknown.
   * @param {Hit} hit
   * @param {import('./EnemyMoveImages.js').MoveImage | undefined} mine
   * @param {(number | null)[]} ptrs
   * @param {Map<number, number>} [history] - the known words from before the Attack's allocations (the packets' stale padding)
   * @param {Set<number>} [unknownBefore] - the words that were unknown then: any other word is the arena's, the dump's value if nothing wrote it
   */
  hitEffect(
    { camera, target, passes, round, previousPasses, frame, order = 'recorded', dead = false },
    mine,
    ptrs,
    history,
    unknownBefore,
  ) {
    // the failed passes of rounds 1..round-1, from the Attacks this heap saw (all of them must have been Attacks) or given
    const before =
      previousPasses ??
      Array.from(
        { length: round - 1 },
        (_, i) => this.attacks.find((a) => a.round === i + 1)?.passes,
      );
    // frames the round's first draw is off from the recorded 50 (56) + passes: the buffer index parity follows the actual frame
    const shift =
      frame === undefined
        ? 0
        : frame - FIRST_DRAW[this.party === 'L-fire' ? 'L-fire' : 'slow'] - passes;
    this.attacks.push({ round, passes, camera, target, ...(shift ? { shift } : {}) });
    if (order === 'other') {
      // another party order has other words in the same places (8 to 16 packet words differ, same positions): nothing the image or the
      // tables hold for the recorded order is claimed, also not after the next-prompt image
      const unknownAll = /** @type {import('./EnemyMoveImages.js').BlockImage[]} */ (
        ((mine?.inRound ?? mine?.next)?.blocks ?? []).map(([n, ptr, hex]) => [
          n,
          ptr,
          hex,
          Array.from({ length: hex.length / 8 }, (_, i) => i),
        ])
      );
      this.applyImage(
        unknownAll,
        ptrs,
        (_p, n) => n - 1,
        () => false,
      );
      this.pendingHit = { blocks: unknownAll, ptrs };
      return;
    }
    // the index at the last draw: from the draw buffer index at the round's confirm and the draw's frame when the heap follows the
    // index (idx0 + frame + 1: 0 + 50 + failed passes even gives 1 in round 1), else from the passes of all the rounds so far
    /** @type {number} */
    let index;
    /** @type {number | undefined} */
    let first;
    if (this.idx0 !== undefined && frame !== undefined) {
      index = (this.idx0 + frame + 1) % 2;
      this.attackIndex.set(round, index);
      first = this.attackIndex.get(1);
    } else {
      if (before.length !== round - 1 || before.some((p) => p === undefined)) return;
      const earlier = /** @type {number[]} */ (before);
      first = drawIndex(1, (round === 1 ? passes : earlier[0]) + (round === 1 ? shift : 0));
      index = drawIndex(round, earlier.reduce((x, y) => x + y, 0) + passes + shift);
    }
    if (first === undefined) return;
    // a front-row member behind a dead one: with a dead member the formation moves up and the slot-4 images are not the recorded ones
    const back = target > 3;
    const ordered =
      order === 'ord' ? HIT_KEY_TABLES.ord[this.party === 'L-fire' ? 'fast' : 'slow'] : undefined;
    // the 52- and 80-byte blocks follow round 1's draw index (the second Attack's too: 104 of 104 runs; slots 4-6 too); the other order
    // has its own
    const rest =
      back && dead && round > 1
        ? undefined
        : (ordered ?? HIT_KEY_TABLES).blocks[`${camera}/${target}/${first}`];
    // (the fast party has the next-prompt image only: the same blocks at the same allocation numbers)
    const blocks = (mine?.inRound ?? mine?.next)?.blocks;
    if (!blocks) return;
    /** @type {import('./EnemyMoveImages.js').BlockImage[]} */
    const keyed = [];
    // every block but the packets is derived below: placeholders, all words unknown until then
    for (const [n, ptr, hex] of blocks)
      if (hex.length !== 80)
        keyed.push([
          n,
          ptr,
          '0'.repeat(hex.length),
          Array.from({ length: hex.length / 8 }, (_, i) => i),
        ]);
    // the packets from the game's own code (HitEffect.js, SetupPool.js); the stale padding of words 7 and 9 is the
    // arena's word at the block of the buffer that was current at the build (the buffer index of the last draw)
    let derived = false;
    /** @type {{ hex: string, varying: number[] }[] | undefined} */
    let derivedHeaders;
    /** @type {((address: number) => number | undefined) | undefined} */
    let halfOf;
    /** @type {((half: (address: number) => number | undefined) => ReturnType<typeof hitChild>) | undefined} */
    let childOf;
    if (!(back && dead && round > 1) && target >= 1 && target <= 6 && camera >= 0 && camera <= 2) {
      const mine80 = blocks.filter(([, , hex]) => hex.length === 80);
      if (mine80.length === 24) {
        const addresses = mine80.map(([, ptr]) => ptr);
        const words = hitPackets({ camera, slot: target, newest: 1 - index, addresses });
        // the spiral wipe's pool lies under the Attack's allocations (the first block, resource 0's header, is 48 bytes above the first
        // packet and ends 56 bytes above it); T pair: the buffer of the wipe's last tick, by the party order (recorded for the slow party)
        const slow = round === 1 && (order === 'recorded' || order === 'ord');
        const pool = addresses[0] + 48 + 56 - POOL_TO_END;
        const region = slow
          ? wipeRegion(pool, order === 'ord' ? [236, 240] : [240, 236])
          : undefined;
        // the halfword the arena had at an address before this Attack. The vfxPool is taken at the first prompt, so the input arena is the
        // authority: what the heap knows from before the move's allocations, else the arena's word where nothing wrote it since. The
        // spiral wipe's model fills only what neither knows (a heap started without that pool), and is a test cross-check otherwise
        const half = (/** @type {number} */ address) => {
          const wiped = () => (region ? wipeHalf(region, pool, address) : undefined);
          if (this.stalePool === 'wipe') {
            const w = wiped();
            if (w !== undefined) return w;
          }
          const base = address - (address % 4);
          const shift = address % 4 === 2 ? 16 : 0;
          const word = history?.get(base);
          if (word !== undefined) return (word >>> shift) & 0xffff;
          if (unknownBefore && !unknownBefore.has(base))
            return (this.state.heap.u32(base) >>> shift) & 0xffff;
          return wiped();
        };
        mine80.forEach(([n, ptr], p) => {
          const source = addresses[(p & ~1) + index];
          const stale7 = half(source + 0x1e);
          const stale9 = half(source + 0x26);
          /** @type {number[]} */
          const varying = [];
          if (stale7 === undefined) varying.push(7);
          if (stale9 === undefined) varying.push(9);
          const hex = words[p]
            .map((w, i) =>
              w.length === 4
                ? ((i === 7 ? stale7 : stale9) ?? 0).toString(16).padStart(4, '0') + w
                : w,
            )
            .join('');
          keyed.push([n, ptr, hex, varying]);
        });
        derivedHeaders = hitHeaders({
          camera,
          slot: target,
          headers: blocks
            .filter(([, , hex]) => hex.length === 104)
            .map(([, ptr]) => ptr)
            .slice(0, 12),
          packets: Array.from({ length: 12 }, (_, r) => [addresses[2 * r], addresses[2 * r + 1]]),
          half,
        });
        const childBlocks = blocks.filter(([, , hex]) => hex.length === 104)[12];
        const arrayBlocks = blocks.filter(([, , hex]) => hex.length === 160);
        if (childBlocks && arrayBlocks.length === 2)
          childOf = (h) =>
            hitChild({
              camera,
              slot: target,
              order,
              bufferAtSpawn: index,
              header: childBlocks[1],
              arrays: [arrayBlocks[0][1], arrayBlocks[1][1]],
              half: h,
              resource: (slot) => this.partyPackets(slot),
            });
        derived = true;
        halfOf = half;
      }
    }
    // the 12 launch resources' headers and the child's header and packet words from the code too (the child's ordering-table links
    // stay the table's: they point at other prims of the frame)
    if (derivedHeaders) {
      let r = 0;
      for (const entry of keyed)
        if (entry[2].length === 104 && r < 12) {
          entry[2] = derivedHeaders[r].hex;
          entry[3] = derivedHeaders[r].varying;
          r++;
        }
    }
    if (childOf && halfOf) {
      const child = childOf(halfOf);
      const childHeader = keyed.filter((e) => e[2].length === 104)[12];
      if (childHeader) {
        childHeader[2] = child.header.hex.join('');
        childHeader[3] = child.header.varying;
      }
      // the arrays' ordering-table links (the previous head of a bucket: another prim of the frame) are the table's: 4 words per key
      keyed
        .filter((e) => e[2].length === 160)
        .forEach((entry, b) => {
          const link = (/** @type {number} */ i) =>
            rest?.slice((2 * b + (i < 10 ? 0 : 1)) * 8, (2 * b + (i < 10 ? 0 : 1)) * 8 + 8);
          // (derived from the party's resource addresses in the arena; the table only when they cannot be read)
          const words = child.arrays[b].hex.map((w, i) => w ?? link(i) ?? '00000000');
          entry[2] = words.join('');
          entry[3] = [
            ...child.arrays[b].varying,
            ...(rest || child.arrays[b].hex[0] !== null ? [] : [0, 10]),
          ];
        });
    }
    // the other order's image has words the recorded order's image would claim (8 to 16 packet words differ): a part the order's
    // tables do not cover is unknown, not the recorded order's
    if (ordered)
      for (const [n, ptr, hex] of blocks)
        if (hex.length === 80 ? !derived : !rest)
          keyed.push([n, ptr, hex, Array.from({ length: hex.length / 8 }, (_, i) => i)]);
    this.applyImage(
      keyed,
      ptrs,
      (_p, n) => n - 1,
      () => false,
    );
    // the next-prompt image (applied when the round ends) must not take them back: they are what the key fixes
    this.pendingHit = { blocks: keyed, ptrs };
  }

  /**
   * The Crystal Core Special's blocks from the model of the game's code (SpecialEffect.js): every word it derives becomes known, the words
   * that depend on a roll, on the glow's projection or on an unknown stale word stay unknown.
   * @param {(number | null)[]} ptrs - the move's allocations
   * @param {Map<number, number>} history - the known words from before the move
   * @param {Set<number>} unknownBefore - the words that were unknown then
   * @param {'fast' | 'slow' | undefined} phase - the draw buffer index at the bulk allocation: slow 1, fast 0 (the party's, if not given)
   * @returns {boolean} whether the model covered the move
   */
  applySpecialModel(ptrs, history, unknownBefore, phase) {
    const loaderBase = ptrs[2];
    if (loaderBase === null || loaderBase === undefined) return false;
    const loader = new Map(SPECIAL_LOADER_WORDS.map(([off, w]) => [loaderBase + off, w]));
    const heap = this.state.heap;
    const pre = (/** @type {number} */ a) => loader.get(a) ?? history.get(a) ?? heap.u32(a);
    const model = specialEffectFrom({
      ptrs,
      bulkIndex: (phase ?? (this.party === 'L-fire' ? 'fast' : 'slow')) === 'slow' ? 1 : 0,
      pre,
      isUnknown: (a) => !loader.has(a) && !history.has(a) && unknownBefore.has(a - (a % 4)),
      packets: (slot) => this.partyPackets(slot),
    });
    if (!model) return false;
    for (const [addr, w] of model.known) {
      this.state.known.set(addr, w);
      this.state.partial.delete(addr);
      this.state.unknown.delete(addr);
    }
    for (const addr of model.unknown) {
      this.state.known.delete(addr);
      this.state.partial.delete(addr);
      this.state.unknown.add(addr);
    }
    return true;
  }

  /**
   * The two packet block addresses of a battle actor's sprite resource (party slots 1.., the enemy after them), read from the arena: the
   * battle struct (0x80196bd0) holds the actor records at +0x50 + 0x8c * slot, whose +0x84 is the 52-byte resource header with the
   * packet blocks at +0x28 and +0x2c [observed, 4 parties; the same addresses in every first prompt]
   * @param {number} slot
   * @returns {[number, number]}
   */
  partyPackets(slot) {
    const header = this.state.heap.u32(BATTLE_STRUCT + 0x50 + 0x8c * slot + 0x84);
    return [this.state.heap.u32(header + 0x28), this.state.heap.u32(header + 0x2c)];
  }

  /**
   * A party spell's cast: its recorded event list (HeapSpellEvents, e.g. 'Fire slot 1', 'Unite Lightning+Water'), loader buffer first.
   * @param {string} name
   * @returns {(number | null)[]} the payload pointer of each allocation
   */
  castEvents(name) {
    const events = SPELL_EVENTS[name];
    if (!events) throw new Error(`no recorded heap events for ${name}`);
    return applyEvents(this.state, events, { loader: true });
  }

  /**
   * What each of the five spells would read if it were cast now (does not change the heap).
   * @param {'FlamingArrow' | 'Explosion' | 'Thor'} spell
   */
  predictParticles(spell) {
    const prediction = predictParticlesFrom(this.state, spell);
    const afterSpecial = [...this.movesSeen, ...this.assumedMoves].some((k) =>
      k.endsWith('/Special'),
    );
    if (spell === 'Explosion' && afterSpecial) {
      for (const [index, low] of EXPLOSION_SETTLED) {
        if (!prediction.unknown[index]) continue;
        prediction.residual[index] = low;
        prediction.unknown[index] = false;
        prediction.unknownWords--;
      }
      prediction.complete = prediction.unknownWords === 0;
    }
    return this.withTaint(spell, prediction);
  }

  /** @param {'BlackShadow' | 'Hell'} spell */
  predictSoulEater(spell) {
    return this.withTaint(spell, predictSoulEaterFrom(this.state, spell));
  }

  /**
   * Runs one Flaming Arrow cast on the heap: predicts its 20 stale words, burns the RNG with them, replays the cast's heap events and
   * leaves the particles' final words behind.
   * @param {RNG} rng
   * @returns {number} the RNG calls it made
   */
  castFlamingArrow(rng) {
    this.roundMoves.casts++;
    this.roundMoves.castList.push('FlamingArrow');
    const { residual, particlePtrs } = this.predictParticles('FlamingArrow');
    const { calls, trailX } = flamingArrowParticles(rng, residual);
    const ptrs = this.castEvents('Fire slot 1');
    // the pool recipe numbers its allocations from the 200-byte context, which is the cast's second allocation (after the loader)
    particlePtrs.forEach((ptr, i) => {
      if (!ptrs.includes(ptr)) throw new Error('particle struct not in the cast events');
      this.state.known.set(ptr + 0xc, trailX[i] >>> 0);
      this.state.partial.delete(ptr + 0xc);
      this.state.unknown.delete(ptr + 0xc);
      this.roundMoves.trail.push([ptr + 0xc, trailX[i] >>> 0]);
    });
    for (const other of PAIR_TAINT.FlamingArrow) this.pairTainted.add(other);
    return calls;
  }

  /**
   * Runs one cast of Explosion, Thor, Black Shadow or Hell on the heap: predicts the stale words the spell reads from the heap as it
   * stands, burns the RNG with them, then replays the cast's heap events (the blocks it allocates are unknown afterwards; unlike
   * Flaming Arrow's, the words these casts leave behind are not tracked).
   * @param {'Explosion' | 'Thor' | 'BlackShadow' | 'Hell'} spell
   * @param {RNG} rng
   * @returns {number} the RNG calls it made
   */
  castSpell(spell, rng) {
    this.roundMoves.casts++;
    this.roundMoves.castList.push(spell);
    const start = rng.count;
    switch (spell) {
      case 'Explosion':
        explosionRand(rng, this.predictParticles('Explosion').residual);
        this.castEvents('Fire slot 3');
        break;
      case 'Thor':
        thorRand(rng, this.predictParticles('Thor').residual);
        this.castEvents('Unite Lightning+Water');
        break;
      case 'BlackShadow': {
        const p = this.predictSoulEater('BlackShadow');
        blackShadowRand(rng, p.scale, p.residual, p.scaleAccumInit);
        this.castEvents('Soul Eater slot 2');
        break;
      }
      case 'Hell':
        hellRand(rng, this.predictSoulEater('Hell'));
        this.castEvents('Soul Eater slot 3');
        break;
    }
    for (const other of PAIR_TAINT[spell]) this.pairTainted.add(other);
    return rng.count - start;
  }

  /** @param {KeyOut} out */
  stateKeyInto(out) {
    const { known, unknown } = this.state;
    pushKeyInt(out, this.state.heap.rover);
    for (const [addr, size] of this.state.heap.freeList()) {
      pushKeyInt(out, addr);
      pushKeyInt(out, size);
    }
    pushKeyInt(out, this.movesSeen.size);
    pushKeyInt(out, this.assumedMoves.size);
    pushKeyInt(out, this.camera ?? -1);
    pushKeyInt(out, this.scanPasses);
    for (const a of this.attacks) pushKeyInt(out, a.round * 64 + a.passes);
    pushKeyInt(out, this.specialPhase === undefined ? -1 : this.specialPhase === 'fast' ? 0 : 1);
    pushKeyInt(out, this.index ?? -1);
    pushKeyInt(out, this.idx0 ?? -1);
    pushKeyInt(out, this.menuDelay);
    for (const spell of SPELL_NAMES)
      pushKeyInt(out, (this.tainted.has(spell) ? 1 : 0) + (this.pairTainted.has(spell) ? 2 : 0));
    pushKeyInt(out, known.size);
    for (const [addr, word] of [...known].sort((a, b) => a[0] - b[0])) {
      pushKeyInt(out, addr);
      pushKeyInt(out, word);
    }
    pushKeyInt(out, unknown.size);
  }
}
