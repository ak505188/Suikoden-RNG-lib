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
import {
  ENEMY_ATTACK_HIT,
  ENEMY_MOVE_EVENTS,
  ENEMY_MOVE_EVENT_TICKS,
  ENEMY_MOVE_ANCHORS,
} from './EnemyMoveEvents.js';
import { EventSchedule } from './EventSchedule.js';
import { menuObjectWrites } from './MenuObject.js';
import { specialEffectFrom } from './SpecialEffect.js';
import { g4Links } from './ParticleSystems.js';
import { BULK_SWAP_DISTANCE, BULK_SWAP_LINKS, BULK_SWAP_LOW } from './FastBulkSwap.js';
import { SPECIAL_LOADER_WORDS } from './SpecialLoaderWords.js';
import { ENEMY_MOVE_IMAGES } from './EnemyMoveImages.js';
import { hitChild, hitHeaders, hitPackets } from './HitEffect.js';

/** The battle struct: 13356 bytes allocated at the battle's setup, the same address in every recorded party */
const BATTLE_STRUCT = 0x80196bd0;
import { POOL_TO_END, wipeHalf, wipeRegion } from './SetupPool.js';
import { HIT_KEY_TABLES } from './HitKeyTables.js';
import { ACTION_TICKS } from './ActionTicks.js';
import { ACTION_FOOTPRINTS } from './ActionFootprints.js';
import { PARTY_ACTION_EVENTS } from './PartyActionEvents.js';
import { OTHER_SPELL_EVENTS } from './OtherSpellEvents.js';
import { drawIndex } from './ScanPrediction.js';
import { specialRolls } from './SpecialObjects.js';
import {
  AttackController,
  Engine,
  EngineMemory,
  makeSpace,
  runAttack,
  UnknownInput,
} from './Engine/EffectEngine.js';
import { CHARACTER_FILES } from './Engine/EffectData.js';
import { explosionRand, flamingArrowParticles } from '../Magic/SpellRNG/Fire.js';
import { thorRand } from '../Magic/SpellRNG/Unites.js';
import { blackShadowRand, hellRand } from '../Magic/SpellRNG/SoulEater.js';
import { pushKeyInt } from '../../util/stateKey.js';

/** @typedef {{ member: number, type: string, slot?: number, target?: number, itemSlot?: number, tick?: number, targetSlot?: number, crit?: boolean, endsFight?: boolean }} PartyAction a non-Defend action of the party member at array position `member` (0-based) */

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
 * The bytes Luc's Flaming Arrow kill leaves that depend on the party, as [no boss move first: idx 0, idx 1, boss acts first: idx 0, idx 1]
 * (Suikoden-Bizhawk-HUD enemy_profiles/vfx_effects/kill_pad_bytes_by_boss_first_idx_v10.json, 72 kill recordings; the index is the one
 * at the cast's first spawn, cast allocation tick + 65). Black Shadow word 56 is 0x80190cdc's, Thor word 0 0x80190bb4's. `undefined`: not
 * recorded (the byte stays as it is). 0x80190edf is a seed-dependent roll when the boss acted first at index 0 (11, 16 or 21): left alone.
 * @type {Record<number, (number | undefined)[]>}
 */
const KILL_PAD_BYTES = {
  0x80190237: [111, 152, 111, 152],
  0x8019030f: [1, 0, 1, 0],
  0x80190317: [0, 225, 0, 225],
  0x801905e7: [112, 154, 112, 154],
  0x801905f7: [45, 0, 45, 0],
  0x8019062f: [225, 1, 225, 1],
  0x8019070f: [112, 154, 112, 154],
  0x801907e7: [1, 46, 1, 46],
  0x801907ef: [46, 0, 46, 0],
  0x80190ad7: [0, 0, 44, 121],
  0x80190b2f: [0, 0, 44, 44],
  0x80190b9b: [5, 5, 0, 0],
  0x80190bb7: [112, 154, 112, 154],
  0x80190bf7: [255, 255, 44, 44],
  0x80190bff: [5, 5, 121, 121],
  0x80190c1b: [40, 40, 128, 128],
  0x80190cdf: [154, 112, 154, 112],
  0x80190d8b: [0, 0, 128, 128],
  0x80190edf: [255, 255, undefined, 0],
  0x80190ee7: [5, 5, 0, 44],
  0x80190f03: [40, 40, 255, 255],
  0x80190f27: [255, 255, 0, 0],
  0x80190faf: [255, 255, 0, 0],
  0x80191007: [5, 5, 128, 128],
  0x80191073: [0, 0, 255, 255],
  0x8019108f: [154, 112, 154, 112],
  0x801910cf: [0, 0, 0, 121],
  0x801910d7: [0, 0, 128, 0],
  0x801910f3: [0, 0, 9, 9],
};

/**
 * The spells whose words differ from the live ones in the recorded turn-order parties (heap_turnorder, luc1: 3 seeds each, the five casts;
 * every other spell of these parties and every spell of the parties not listed here matches or is not claimed): M-after-p0 and p2's Hell
 * (a word the boss's Attack effect residue and the kill's first-spawn index decide: the agent's kill_round note section 3 lists 16 such
 * bytes, 28 of 29 by (boss acts first, index) but not given by value), M-before-p3 and p4's Thor, Black Shadow and Hell (k0 or the
 * fillers' order differ there: not understood). A party with other speeds is not recorded: all five are unknown.
 * @type {Record<string, readonly SpellName[]>}
 */
const TURN_ORDER_TAINT = {
  '1,1,1,1,1,1': [],
  '1,149,1,1,1,1': [],
  '1,149,149,1,1,1': [],
  '1,149,149,1,124,1': [],
  '1,149,149,1,124,58': [],
  '163,1,1,126,1,1': [],
  '163,149,1,126,1,1': [],
  '163,149,149,126,1,1': [],
  '163,149,149,126,124,1': [],
  '163,149,149,126,124,58': [],
};

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
 * and without a round between): any cast but Flaming Arrow and Explosion, which leave nothing the other reads (Flaming Arrow and
 * Explosion followed by themselves are modelled: the trail words they leave).
 * @type {Record<SpellName, readonly SpellName[]>}
 */
const PAIR_TAINT = {
  FlamingArrow: ['Thor', 'BlackShadow', 'Hell'],
  Explosion: ['Thor', 'BlackShadow', 'Hell'],
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
/**
 * The word the menu's gradient initialiser (FUN_800efad0) leaves at an offset of the 12776-byte menu object: 13 sub-structs (at 0x100 +
 * 0x3bc * i) of 16 + 16 G3 primitives of 28 bytes from 4 (two buffers); the RGB of the primitive t is A at +4 and +0xc and B at +0x14 (t < 8:
 * A = 16 t, B = A + 16; else A = (16 - t) * 16, B = (15 - t) * 16). The code byte 0x30 is written into the word at +4; the other two words
 * keep their top byte (`kept`).
 * @param {number} offset - the word's offset in the menu object
 * @param {number} kept - the word as it was (its top byte stays)
 * @returns {number | undefined} undefined when the word is not one of the gradient's
 */
export function gradientWord(offset, kept) {
  const rel = offset - 0x100;
  if (rel < 0 || rel >= 13 * 0x3bc) return undefined;
  const q = (rel % 0x3bc) - 4;
  if (q < 0 || q >= 32 * 0x1c) return undefined;
  const t = Math.floor(q / 0x1c) % 16;
  const field = q % 0x1c;
  if (field !== 4 && field !== 0xc && field !== 0x14) return undefined;
  const a = t < 8 ? 16 * t : (16 - t) * 16;
  const b = t < 8 ? 16 + 16 * t : (15 - t) * 16;
  const c = field === 0x14 ? b : a;
  const rgb = c | (c << 8) | (c << 16);
  return (((field === 4 ? 0x30 : kept >>> 24) << 24) | rgb) >>> 0;
}

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
    /**
     * Where the menu's 2D stream ends in the two 6000-byte packet blocks (the cursor's TILE packet, 20 bytes, and its four 16-byte lines
     * close it): the draw writes the stream again from the block's start whenever the menu is drawn, so a word below this offset holds the
     * menu's own word again, and one above keeps what a cast left there. Unknown (0) when the dump has no cursor packet.
     */
    this.streamEnd = 0;
    /** The words an Explosion's pool C particles left, which the menu's redraw covers or not @type {Set<number>} */
    this.trailWords = new Set();
    /** The known words from before the menu rebuild's allocation, while its image is applied @type {Map<number, number> | undefined} */
    this.keptHistory = undefined;
    /** @type {number[]} */
    this.packetBlocks = [...dump.battleBlocks];
    {
      const base = 0x80182000;
      const view = new DataView(dump.arena.buffer, dump.arena.byteOffset, dump.arena.byteLength);
      const block = dump.battleBlocks[0];
      const first = block - base;
      for (let off = 0; first >= 0 && first + off + 4 <= view.byteLength && off < 6000; off += 4)
        if (view.getUint32(first + off, true) === 0xe1000220) {
          this.streamEnd = off + 20 + 64;
          break;
        }
    }
    /** The draw buffer index at the current prompt (before the menu time), undefined while unknown @type {number | undefined} */
    this.index = options.index;
    /** @type {'arena' | 'wipe'} */
    this.stalePool = options.stalePool ?? 'arena';
    /** The draw buffer index at the current round's confirm @type {number | undefined} */
    this.idx0 = options.index;
    /** The words a party action's blocks covered this round: a move's recorded image, applied at the round's end, must not claim them @type {Set<number>} */
    this.actionDirty = new Set();
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
    /** The last derived Special's known words and its loader buffer's address @type {{ known: Map<number, number>, loader: number } | undefined} */
    this.specialWords = undefined;
    /** @type {Set<number> | undefined} */
    this.specialUnknown = undefined;
    /** The Special's object words its rolls gave, and whether a draw of another action came between them @type {Map<number, number> | undefined} */
    this.specialRollWords = undefined;
    this.rollsInterleaved = false;
    /** the members whose Attack ran on the effect-script engine in this round @type {Set<number>} */
    this.engineAttacks = new Set();
    /** a Special's blocks were not where the recorded image has them (a party Attack before it moved them): the later Specials' recorded images do not apply @type {boolean} */
    this.specialShifted = false;
    /** the party Attacks that wait for the round's enemy move (they run amid its events) @type {PartyAction[]} */
    this.pendingAttacks = [];
    /** @type {number[] | undefined} */
    this.roster = undefined;
    /** party Attacks run on the effect-script engine (off: the recorded footprint). Off until the engine's words are verified against recorded party hits. */
    this.useEngine = true;
    /** A party Attack happened in this battle: the recorded Special images (the Luc recipe's rolls) are not this battle's @type {boolean} */
    this.partyAttacked = false;
    /** A party Attack's own hit effect (not modelled) has allocated over the arena: the words a later effect leaves unwritten are not the dump's any more @type {boolean} */
    this.partyAttackHistory = false;
    /** The draw buffer index at the first spawn of Luc's kill cast, once he killed Crystal Core (see `applyKillPad`) @type {number | undefined} */
    this.killPadIdx = undefined;
    /** The enemy count changed the menu's block sizes at the last rebuild @type {boolean} */
    this.menuSizeChanged = false;
    /** The Fight menu's payload address ranges [start, end), for words an in-round image must not claim (the rebuilt menu overwrites them later) */
    this.menuRanges = this.menuBlocks.map((p) => [p, p + (heap.u32(p - 4) - 1) * 8]);
    /**
     * The next-prompt image of this round's enemy move, applied when the menu is rebuilt: the final state of the move's blocks (words
     * the rebuild does not touch, e.g. block headers it leaves alone) and the rebuilt menu's blocks. `ptrs` are the move's allocations.
     * @type {{ image: import('./EnemyMoveImages.js').BlockSet, ptrs: (number | null)[], derived?: boolean, kill?: import('./EnemyMoveImages.js').BlockSet, byPhase?: { fast?: import('./EnemyMoveImages.js').BlockSet, slow?: import('./EnemyMoveImages.js').BlockSet } } | null}
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
    copy.partyAttackHistory = this.partyAttackHistory;
    copy.partyAttacked = this.partyAttacked;
    copy.specialRollWords = this.specialRollWords;
    copy.rollsInterleaved = this.rollsInterleaved;
    copy.engineAttacks = new Set(this.engineAttacks);
    copy.specialShifted = this.specialShifted;
    copy.pendingAttacks = this.pendingAttacks.map((a) => ({ ...a }));
    copy.roster = this.roster;
    copy.useEngine = this.useEngine;
    copy.specialUnknown = this.specialUnknown;
    copy.killPadIdx = this.killPadIdx;
    copy.menuSizeChanged = this.menuSizeChanged;
    copy.pairTainted = new Set(this.pairTainted);
    copy.streamEnd = this.streamEnd;
    copy.trailWords = new Set(this.trailWords);
    copy.packetBlocks = this.packetBlocks;
    copy.index = this.index;
    copy.roundMoves = { ...this.roundMoves };
    copy.actionDirty = new Set(this.actionDirty);
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

  /**
   * The round starts and the game frees the Fight menu (the 44 blocks, in the order they were freed in the dump).
   * @param {RNG} [rng] - the battle's RNG as the round starts (the Special's rolls count from it)
   */
  roundStart(rng) {
    this.roundRngCount = rng?.count;
    for (const p of this.menuBlocks) this.state.heap.free(p);
    this.scanPasses = 0;
    this.rollsInterleaved = false;
    this.flushAttacks();
    this.engineAttacks.clear();
    this.actionDirty.clear();
    this._preEnemyState = undefined;
    this._enemyScheduleInfo = undefined;
    this._enemyPtrs = undefined;
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
      // (an Attack that ran on the effect-script engine has put its own words in the heap: nothing to flag for it)
      for (const action of actions.filter(
        (a) => !(a.type === 'Attack' && this.engineAttacks.has(a.member)),
      )) {
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
    this.flushAttacks();
    // (the Attacks that ran on the effect-script engine have put their own words there)
    const attackers = actions.filter((a) => a.type === 'Attack').map((a) => a.member);
    const engineOnly =
      partyAttacked && attackers.length > 0 && attackers.every((m) => this.engineAttacks.has(m));
    if (partyAttacked && !engineOnly) this.forgetMoveBlocks();
    if (partyAttacked) this.partyAttacked = true;
    // (a party Attack's hit effect and a boss kill's heap use are not modelled either: the arena under later effects is not the dump's)
    if (partyAttacked || bossDied) this.partyAttackHistory = true;
    this.taintRound({ partyAttacked, bossDied, actions, order, died });
    const fast = this.party === 'L-fire';
    // (the round lengths are a function of McDohl's and Luc's speeds and of the fillers faster than Luc; the images are the party's)
    const cls = speeds === undefined ? (fast ? 'fast' : 'slow') : speedClass(speeds);
    const fillers = speeds === undefined ? (fast ? 1 : 4) : fastFillers(speeds);
    // the images are the recorded parties': another party's speeds change when the moves' particles end (the second Special's words
    // differ from them in the turn-order parties: Black Shadow word 56 in M-after-p0), so the words they read are unknown
    if (speeds !== undefined && !RECORDED_SPEEDS.includes(speeds.join()))
      for (const spell of TURN_ORDER_TAINT[speeds.join()] ?? SPELL_NAMES) this.tainted.add(spell);
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
      // Luc's Flaming Arrow killed Crystal Core this round: its first spawn's draw buffer index is the next prompt's
      if (
        casts === 1 &&
        bossDied &&
        !partyAttacked &&
        this.roundMoves.castList[0] === 'FlamingArrow'
      )
        this.killPadIdx = this.index;
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
    // (the words the rebuild's allocation is about to make unknown: the object's stale words are the earlier owner's)
    const knownBefore = new Map(this.state.known);
    const unknownBefore = new Set(this.state.unknown);
    const ptrs = applyEvents(this.state, this.menuRebuild);
    if (this.menuSizeChanged || this.menuMoved(ptrs)) {
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
      const { ptrs: moveBlocks, kill, byPhase, derived } = this.pendingMenuImage;
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
      // (a Special derived from its code keeps its words outside the rebuilt menu: the rebuild leaves them as they were)
      if (this.party !== 'L-fire')
        this.applyImage(
          image.blocks,
          moveBlocks,
          (_i, n) => n - 1,
          (a) =>
            this.actionDirty.has(a) ||
            (derived && !this.menuRanges.some(([lo, hi]) => a >= lo - 8 && a < hi)),
        );
      // (a Special derived from its code: the menu object's words are the build's own writes over the move's words, below)
      const object = /** @type {number} */ (ptrs[0]);
      // (its stale bytes are the Special's only while nothing unmodelled has used the heap since the dump)
      // (the recorded image is the arena's only for the layout it was recorded in: where an Attack before the Special moved its blocks the model's
      // words are the only ones there are)
      const sameLayout = image.blocks.every(([n, ptr]) => moveBlocks[n - 1] === ptr);
      const objectDerived = derived && (!this.partyAttackHistory || !sameLayout);
      this.keptHistory = knownBefore;
      this.applyImage(
        image.menu,
        ptrs,
        (i) => i,
        objectDerived ? (a) => a >= object - 8 && a < object + 12776 : () => false,
      );
      this.keptHistory = undefined;
      if (objectDerived) this.applyMenuObject(ptrs, knownBefore, unknownBefore);
      // the kill image was recorded with the draw index 0 at the rebuild: at 1 the two packet buffers hold the other frames
      if (killed && this.idx0 === 1) this.swapPacketBuffers(/** @type {number[]} */ (ptrs));
      // the kill cast's own particle words: the low bits are the cast's (the next cast reads them), the top byte is the history the
      // cast did not write: the word is not known, but the heap holds the cast's value for the prediction
      for (const [addr, trailWord] of trail) {
        // a word that now lies in the rebuilt menu object: the gradient initialiser (FUN_800efad0) wrote its low 24 bits (the RGB) and,
        // in the words at p + 4 of its primitives, the code byte 0x30; the other words keep the cast particle's top byte
        // (ASK 4, kw_9e3779b1_kr*.txt)
        const word = gradientWord(addr - object, trailWord) ?? trailWord;
        this.state.heap.over.set(addr, word);
        this.state.known.delete(addr);
        this.state.partial.add(addr);
        this.state.unknown.add(addr);
      }
      this.pendingMenuImage = null;
      // (the Special's roll words that lie under the rebuilt menu are not the recorded run's either)
      if (this.roundMoves.special && this.specialUnknown) this.forgetSpecialRolls();
    }
    if (this.pendingHit) {
      this.applyImage(
        this.pendingHit.blocks,
        this.pendingHit.ptrs,
        (_p, n) => n - 1,
        (a) => this.actionDirty.has(a),
      );
      this.pendingHit = null;
    }
    // the two 6000-byte packet blocks are allocated again with the menu, over what the last round left in them: the draw writes the
    // prompt's stream from the start (the dump's words, while the text is the same) and what lies past its end is still what a cast left.
    // The words the Explosion left (its pool C trail words) are the ones followed.
    for (const addr of this.trailWords) {
      const word = this.inMenuStream(addr) ? this.state.heap.u32(addr) : knownBefore.get(addr);
      if (word === undefined) continue;
      this.state.known.set(addr, word >>> 0);
      this.state.partial.delete(addr);
      this.state.unknown.delete(addr);
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
            // (a word known before the rebuild's allocation, a cast's trail word: it is that word still)
            this.state.known.set(
              addr,
              this.keptHistory?.get(addr) ?? view.getUint32(addr - base, true),
            );
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
   * @param {{ repeat?: boolean, phase?: 'fast' | 'slow', hit?: Hit, target?: number, round?: number, tick?: number, order?: string[], before?: number, dead?: boolean, rng?: RNG }} [options] - `rng`: the battle's RNG as the move starts (the Special's rolls follow it); `repeat`: the move has
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
    { repeat = false, phase, hit, target, round = 1, tick, order, before, dead, rng } = {},
  ) {
    // (a monster without recorded events: its basic Attack's hit effect is the generic one, its other moves are not modelled)
    const events =
      ENEMY_MOVE_EVENTS[enemyKey]?.[moveName] ??
      (moveName === 'Attack' && !ENEMY_MOVE_EVENTS[enemyKey] ? ENEMY_ATTACK_HIT : undefined);
    if (!events) return false;
    // the Special's rolls from the RNG as it starts, when nothing else draws between its rolls (a party action that follows in the round
    // does: partyAction / the casts then say so)
    const rolls = moveName === 'Special' && rng ? specialRolls(rng) : undefined;
    this.specialRollWords = undefined;
    const history = new Map(this.state.known);
    // (the words the heap has no information on yet: the dump's arena words are the real ones everywhere else)
    const unknownBefore =
      moveName === 'Attack' || moveName === 'Special' ? new Set(this.state.unknown) : undefined;
    const tickGroups = ENEMY_MOVE_EVENT_TICKS[enemyKey]?.[moveName];
    const anchor = ENEMY_MOVE_ANCHORS[enemyKey]?.[moveName];
    if (tickGroups && anchor && this.useEngine && this.roster && tick !== undefined) {
      this._preEnemyState = cloneState(this.state);
      this._enemyScheduleInfo = { events, tickGroups, tick, anchor };
    }
    // the party Attacks that were waiting for this move: they run amid its events, in frame order
    const waiting = this.pendingAttacks.splice(0);
    const merged =
      // (in a Special round only the Attacks whose whole run ends before the Special starts: the lag frames of its window are not computable)
      waiting.length > 0 && tickGroups && anchor && tick !== undefined
        ? this._mergeAttacks(
            waiting,
            events,
            tickGroups,
            tick + anchor.offset,
            moveName === 'Special',
          )
        : undefined;
    if (!merged) for (const action of waiting) this._footprint(action);
    const ptrs =
      merged ??
      (tickGroups
        ? new EventSchedule(this.state, events, tickGroups).applyAll()
        : applyEvents(this.state, events));
    if (this._preEnemyState) this._enemyPtrs = ptrs;
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
    // the Special's own blocks were derived from its code (the image then only supplies the words the Fight menu covers)
    let specialDerived = false;
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
    // the Special's bulk index: the round's index plus the ticks to the bulk allocation (48 + 3 per member polled before Crystal Core)
    const specialBulk =
      this.idx0 !== undefined && before !== undefined
        ? (this.idx0 + before + 1) % 2
        : (phase ?? (this.party === 'L-fire' ? 'fast' : 'slow')) === 'slow'
          ? 1
          : 0;
    if (phased) {
      // a repeated Special lands over the first one's freed blocks and the rebuilt menu: its own words from the model of its code, with the
      // heap's words from before as the stale ones; the image only supplies what the menu's blocks cover
      // (a repeated Special's recorded image holds the words the recorded first Special left: when an earlier Special's blocks were not where the image was recorded,
      // the model's words (the history's top bytes kept) are the only ones there are)
      specialDerived =
        moveName === 'Special' &&
        (!this.partyAttackHistory || this.specialShifted) &&
        this.applySpecialModel(ptrs, history, unknownBefore ?? new Set(), specialBulk, rolls);
      const inMenuHeader = (/** @type {number} */ a) =>
        this.menuRanges.some(([lo, hi]) => a >= lo - 8 && a < hi);
      this.applyImage(
        phased.blocks,
        ptrs,
        (_position, n) => n - 1,
        specialDerived ? (a) => !inMenuHeader(a) : () => false,
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
      if (
        moveName === 'Special' &&
        !repeated &&
        !mine.inRound.blocks.every(([n, ptr]) => ptrs[n - 1] === ptr)
      )
        this.specialShifted = true;
      specialDerived =
        moveName === 'Special' &&
        !repeated &&
        this.applySpecialModel(
          ptrs,
          history,
          unknownBefore ?? new Set(),
          // (the index at the round's confirm, plus the ticks to the bulk allocation: 48 + 3 per member polled before Crystal Core;
          // without the index, the recorded party's own: 1 for the slow party, 0 for the fast one)
          this.idx0 !== undefined && before !== undefined
            ? (this.idx0 + before + 1) % 2
            : (phase ?? (this.party === 'L-fire' ? 'fast' : 'slow')) === 'slow'
              ? 1
              : 0,
          rolls,
        );
      // (the words the Fight menu's blocks cover stay the image's for now: the freed menu keeps being drawn into them every frame, and
      // its window draw is not modelled; elsewhere the model's words are the move's own)
      // (a block's 8-byte header, which the rebuild's allocation rewrites, counts with it)
      const inMenu = (/** @type {number} */ a) =>
        this.menuRanges.some(([lo, hi]) => a >= lo - 8 && a < hi);
      this.applyImage(
        mine.inRound.blocks,
        ptrs,
        (_position, n) => n - 1,
        specialDerived ? (a) => !inMenu(a) : () => false,
      );
      this.applyStaleMenu(mine.inRound.menu);
      // (a word the model leaves to a roll is not the recorded run's: the image's value is another run's roll)
      if (specialDerived) this.forgetSpecialRolls();
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
    // the fast party's first Special is its bulk-0 image: at bulk index 1 the two draw buffers' G4 records swap contents
    if (
      moveName === 'Special' &&
      !phased &&
      !specialDerived &&
      this.party === 'L-fire' &&
      specialBulk === 1
    )
      this.applyBulkSwap(ptrs);
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
          derived: specialDerived,
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
   * The Fight menu's two 6000-byte packet buffers with the draw index at the rebuild flipped (ASK 5 (1): luc2 = luc4 against luc1 = luc5):
   * each frame is drawn into the buffer of its draw index, so the buffers exchange their words at the same offset; a packet tag's low 24
   * bits (the next packet, inside the own buffer) and the OT links (the own bucket) stay with the buffer.
   * @param {number[]} ptrs - the rebuilt menu's blocks (the buffers are the last two)
   */
  swapPacketBuffers(ptrs) {
    const { heap, known, unknown, partial } = this.state;
    const [a, b] = [ptrs[42], ptrs[43]];
    const size = (heap.u32(a - 4) - 1) * 8;
    const words = Math.min(size / 4, (this.streamEnd - 4) / 4);
    /**
     * The word of the buffer `from` as it lies in the other buffer `to`: a link into `from` follows to `to`; a link anywhere else in the
     * arena (an OT bucket, a primitive of the menu object) is the buffer's own and stays (undefined), except in the first word, where
     * only the length byte moves.
     * @param {number} from
     * @param {number} to
     * @param {number} word
     * @param {number} kept - the word of `to` at that offset
     * @param {boolean} first
     * @returns {number | undefined}
     */
    const moved = (from, to, word, kept, first) => {
      const low = word & 0xffffff;
      if (word >>> 24 < 1 || word >>> 24 > 0x0f || low < 0x180000 || low >= 0x1c0000)
        return word >>> 0;
      const target = (0x80000000 | low) >>> 0;
      if (target >= from && target < from + size)
        return ((word & 0xff000000) | ((target - from + to) & 0xffffff)) >>> 0;
      return first ? ((word & 0xff000000) | (kept & 0xffffff)) >>> 0 : undefined;
    };
    /** @type {[number, number | undefined, boolean, boolean, number | undefined][]} */
    const out = [];
    for (let i = 0; i < words; i++) {
      for (const [from, to] of [
        [a, b],
        [b, a],
      ]) {
        const [src, dst] = [from + 4 * i, to + 4 * i];
        const k = known.get(src);
        const v = heap.u32(src);
        const kept = known.get(dst) ?? heap.u32(dst);
        const mk = k === undefined ? undefined : moved(from, to, k, kept, i === 0);
        const mv = moved(from, to, v, kept, i === 0);
        // (a link that stays: the word stays as it is)
        if ((k !== undefined && mk === undefined) || mv === undefined) continue;
        out.push([dst, mk, unknown.has(src), partial.has(src), mv]);
      }
    }
    for (const [at, k, u, p, v] of out) {
      if (k === undefined) known.delete(at);
      else known.set(at, k);
      if (u) unknown.add(at);
      else unknown.delete(at);
      if (p) partial.add(at);
      else partial.delete(at);
      if (k === undefined) heap.over.set(at, /** @type {number} */ (v));
    }
  }

  /**
   * The fast party's first Special at bulk index 1 from its bulk-0 image: the G4 record blocks of the two draw buffers exchange words
   * (FastBulkSwap.js) and the records' link words follow the new draw order.
   * @param {(number | null)[]} ptrs - the move's allocations
   */
  applyBulkSwap(ptrs) {
    const state = this.state;
    const word = (/** @type {number} */ a) => (state.known.has(a) ? state.known.get(a) : undefined);
    const isKnown = (/** @type {number} */ a) => state.known.has(a);
    const set = (/** @type {number} */ a, /** @type {number | undefined} */ w) => {
      if (w === undefined) {
        state.known.delete(a);
        state.partial.delete(a);
        state.unknown.add(a);
      } else {
        state.known.set(a, w);
        state.partial.delete(a);
        state.unknown.delete(a);
      }
    };
    const pairs = BULK_SWAP_LOW.map((a) => [a, a + BULK_SWAP_DISTANCE]);
    // (the words are read all before any is written: a swap of two known words, an unknown one leaves its partner unknown)
    const before = pairs.map(([a, b]) => [
      isKnown(a) ? word(a) : undefined,
      isKnown(b) ? word(b) : undefined,
    ]);
    pairs.forEach(([a, b], i) => {
      set(a, before[i][1]);
      set(b, before[i][0]);
    });
    const at = [3, 8, 13].map((first) => ({
      g4: /** @type {[number, number]} */ ([ptrs[first + 1] ?? 0, ptrs[first + 3] ?? 0]),
      dr: /** @type {[number, number]} */ ([ptrs[first + 2] ?? 0, ptrs[first + 4] ?? 0]),
    }));
    if (at.some((s) => !s.g4[0] || !s.g4[1])) return;
    const links = g4Links(at, 1, (slot) => this.partyPackets(slot));
    const wanted = new Set(BULK_SWAP_LINKS);
    links.forEach((system, n) =>
      system.forEach((buffer, b) =>
        buffer.forEach((record, i) => {
          const addr = at[n].g4[b] + 36 * i;
          if (wanted.has(addr)) set(addr, record >>> 0);
        }),
      ),
    );
  }

  /**
   * The Crystal Core Special's blocks from the model of the game's code (SpecialEffect.js): every word it derives becomes known, the words
   * that depend on a roll, on the glow's projection or on an unknown stale word stay unknown.
   * @param {(number | null)[]} ptrs - the move's allocations
   * @param {Map<number, number>} history - the known words from before the move
   * @param {Set<number>} unknownBefore - the words that were unknown then
   * @param {number | undefined} bulkIndex - the draw buffer index at the bulk allocation; undefined: not known
   * @param {{ xi: number, yr: number }[]} [rolls] - the groups' last rolls, when the RNG at the Special's start is known
   * @returns {boolean} whether the model covered the move
   */
  applySpecialModel(ptrs, history, unknownBefore, bulkIndex, rolls) {
    const loaderBase = ptrs[2];
    if (loaderBase === null || loaderBase === undefined) return false;
    const loader = new Map(SPECIAL_LOADER_WORDS.map(([off, w]) => [loaderBase + off, w]));
    const heap = this.state.heap;
    const pre = (/** @type {number} */ a) => loader.get(a) ?? history.get(a) ?? heap.u32(a);
    const run = (/** @type {number} */ bulk) =>
      specialEffectFrom({
        ptrs,
        bulkIndex: bulk,
        pre,
        // (after a party Attack the words nothing here wrote are whatever its unmodelled hit effect left)
        // (a word of the loader buffer that the table of the Special's own loader words does not hold is the loader file's data, which the model does not
        // know: not the arena's word from before the decode)
        isUnknown: (a) =>
          !loader.has(a) &&
          ((a >= loaderBase && a < loaderBase + 16384) ||
            (this.partyAttackHistory && !history.has(a)) ||
            (!history.has(a) && unknownBefore.has(a - (a % 4)))),
        packets: (slot) => this.partyPackets(slot),
        rolls,
      });
    // the draw buffer index at the bulk allocation fixes which buffer holds the last call: unknown, the words of the two buffers that differ
    // between the two parities are unknown
    const model = bulkIndex === undefined ? run(0) : run(bulkIndex);
    if (!model) return false;
    if (bulkIndex === undefined) {
      const other = run(1);
      if (!other) return false;
      for (const [addr, w] of [...model.known])
        if (other.known.get(addr) !== w) {
          model.known.delete(addr);
          model.unknown.add(addr);
        }
    }
    // (kept for the menu rebuild at the round's end: the words it leaves unwritten are the Special's, not what a cast's loader fill later left)
    this.specialWords = { known: new Map(model.known), loader: loaderBase };
    this.specialUnknown = new Set(model.unknown);
    this.specialRollWords = model.rolled;
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
   * The party roster (the game's roster ids by member): with it a party Attack runs on the effect-script engine, from the files of the
   * characters, instead of replaying the recorded hit child.
   * @param {number[]} rosterIds
   */
  setRoster(rosterIds) {
    this.roster = rosterIds;
  }

  /**
   * A party Attack on the effect-script engine: the attacker's slot-1 script from the frame of the hit roll, the hit script on the target.
   * The heap model takes the engine's allocations and words; an input the engine cannot get (an unknown byte, a character without a file,
   * the round's draw index) leaves the heap as it was and the recorded footprint is used.
   * @param {PartyAction & { tick?: number, targetSlot?: number }} action
   * @returns {boolean} whether the engine ran
   */
  engineAttack({ member, tick, targetSlot, crit = false, endsFight = false }) {
    if (
      !this.useEngine ||
      !this.roster ||
      tick === undefined ||
      targetSlot === undefined ||
      this.idx0 === undefined
    )
      return false;
    if (!endsFight) return this._interleavedEngineAttack({ member, tick, targetSlot, crit });
    return this._standaloneAttack({ member, type: 'Attack', tick, targetSlot, crit }, true);
  }

  /**
   * A party Attack on the engine with no enemy move in the way (the heap as it stands).
   * @param {PartyAction} action
   * @param {boolean} [anyMember] - the Attack that ends the fight runs for every member (verified for Viktor and Flik); a flushed one only for the eligible
   * @returns {boolean}
   */
  _standaloneAttack({ member, tick, targetSlot, crit = false }, anyMember = false) {
    if (!this.useEngine || !this.roster || tick === undefined || targetSlot === undefined)
      return false;
    if (
      this.idx0 === undefined ||
      (!anyMember && !this._attackEligible({ member, tick, targetSlot }))
    )
      return false;
    const files = this.roster
      .slice(0, 6)
      .map(
        (rosterId) => Object.entries(CHARACTER_FILES).find(([, f]) => f.rosterId === rosterId)?.[0],
      );
    if (files.some((code) => code === undefined)) return false;
    const trial = cloneState(this.state);
    try {
      const mem = new EngineMemory(trial);
      const party = files.map((code, i) => ({
        code: /** @type {string} */ (code),
        base: (mem.u32(Engine.BATTLE + 0x50 + 0x8c * (i + 1) + 8) - 0x34) >>> 0,
      }));
      const { sp, info } = makeSpace(party);
      const frame = tick + 2;
      runAttack(mem, sp, info, {
        attacker: member + 1,
        target: targetSlot,
        tick: frame,
        buf: (this.idx0 + frame) % 2,
        crit,
      });
      mem.commit();
      this.state = trial;
      for (const [, kind, n, ptr] of mem.events)
        if (kind === 'a')
          for (let a = ptr; a < ptr + ((n + 7) >> 3) * 8; a += 4) this.actionDirty.add(a);
      this.engineAttacks.add(member);
      return true;
    } catch (error) {
      if (
        error instanceof UnknownInput ||
        /not in the effect data|not ported/.test(String(error?.message))
      )
        return false;
      throw error;
    }
  }

  /**
   * Party engine Attacks run step by step against an enemy move's events: each frame the move's events up to it are applied, then every
   * running attack takes a tick (its words are committed after each tick, so a block the move reuses is the move's afterwards). The heap
   * is replaced by the merged one when all of them ran; otherwise nothing changes and the caller uses the recorded footprints.
   * @param {PartyAction[]} attacks
   * @param {number[]} events - the move's heap events
   * @param {[number, number][]} tickGroups
   * @param {number} A - the frame of the move's first allocation
   * @param {boolean} [beforeOnly] - give up (undefined) unless every engine event comes before A (10 frames of margin)
   * @returns {(number | null)[] | undefined} the move's allocation pointers
   */
  _mergeAttacks(attacks, events, tickGroups, A, beforeOnly = false) {
    const files = this.roster?.slice(0, 6).map((_, i) => this._rosterCode(i));
    if (!files || files.some((code) => code === undefined)) return undefined;
    const trial = cloneState(this.state);
    try {
      const schedule = new EventSchedule(trial, events, tickGroups);
      const mem = new EngineMemory(trial);
      const party = files.map((code, i) => ({
        code: /** @type {string} */ (code),
        base: (mem.u32(Engine.BATTLE + 0x50 + 0x8c * (i + 1) + 8) - 0x34) >>> 0,
      }));
      const { sp, info } = makeSpace(party);
      const runs = attacks
        .map((a) => ({
          a,
          frame: /** @type {number} */ (a.tick) + 2,
          /** @type {Engine | null} */ eng: null,
          /** @type {AttackController | null} */ ctl: null,
          done: false,
          ticks: 0,
        }))
        .sort((x, y) => x.frame - y.frame);
      let f = runs[0].frame;
      for (let guard = 0; guard < 600 && runs.some((r) => !r.done); guard++, f++) {
        // the move's events up to this frame first, then the attacks that start on it
        schedule.applyTo(f - A);
        for (const r of runs) {
          if (r.eng || r.frame !== f) continue;
          const member = /** @type {number} */ (r.a.member);
          const eng = new Engine(sp, mem, { nparty: 6, nenemy: 1 });
          eng.drawEnabled = true;
          eng.loadActorsFromArena();
          mem.tick = f;
          eng.tickNo = f;
          eng.buf = /** @type {number} */ ((this.idx0 ?? 0) + f) % 2;
          const crit = r.a.crit ?? false;
          const script = sp.u32(info[member].scriptTable + 4 * (crit ? 8 : 2));
          const ctl = new AttackController(
            member + 1,
            /** @type {number} */ (r.a.targetSlot),
            script,
          );
          eng.controllers.push(ctl);
          eng.start(
            member + 1,
            /** @type {number} */ (r.a.targetSlot),
            sp.u32(info[member].scriptTable + 4),
          );
          r.eng = eng;
          r.ctl = ctl;
        }
        schedule.applyTo(f + 1 - A);
        for (const r of runs) {
          const { eng, ctl } = r;
          if (!eng || !ctl || r.done || eng.tickNo !== f) continue;
          mem.tick = f + 1;
          eng.tick();
          r.ticks++;
          if (ctl.started !== null && eng.tickNo > ctl.started + 5) {
            let finished = true;
            for (let s = 8; s < 0x14; s++) if (eng.A[s].active !== 0) finished = false;
            if (finished) r.done = true;
          }
          if (r.ticks >= 200) throw new Error('an engine Attack did not end');
        }
        mem.commit();
      }
      for (const r of runs) r.eng?.forgetScene();
      if (beforeOnly && mem.events.some((e) => e[0] >= A - 10)) return undefined;
      const ptrs = schedule.applyAll();
      mem.commit();
      this.state = trial;
      for (const [, kind, n, ptr] of mem.events)
        if (kind === 'a')
          for (let a = ptr; a < ptr + ((n + 7) >> 3) * 8; a += 4) this.actionDirty.add(a);
      for (const a of attacks) this.engineAttacks.add(/** @type {number} */ (a.member));
      return ptrs;
    } catch (error) {
      if (
        error instanceof UnknownInput ||
        /not in the effect data|not ported|did not end/.test(String(error?.message))
      )
        return undefined;
      throw error;
    }
  }

  /**
   * An engine Attack interleaved with the current round's enemy move: the engine's allocations land at their game frame amid the enemy
   * move's, via the EventSchedule. McDohl and Luc fall near the Special's lag boundary and Hellion's K is 1: they stay on the footprint.
   * @param {{ member: number, tick: number, targetSlot: number, crit: boolean }} action
   * @returns {boolean}
   */
  _interleavedEngineAttack({ member, tick, targetSlot, crit }) {
    const files = /** @type {(string | undefined)[]} */ (
      this.roster
        ?.slice(0, 6)
        .map(
          (rosterId) =>
            Object.entries(CHARACTER_FILES).find(([, f]) => f.rosterId === rosterId)?.[0],
        )
    );
    if (!files || files.some((code) => code === undefined)) return false;
    const schedInfo = this._enemyScheduleInfo;
    const preState = this._preEnemyState;
    if (!schedInfo || !preState) return false;
    const trial = cloneState(preState);
    try {
      const schedule = new EventSchedule(trial, schedInfo.events, schedInfo.tickGroups);
      const mem = new EngineMemory(trial);
      const party = files.map((c, i) => ({
        code: /** @type {string} */ (c),
        base: (mem.u32(Engine.BATTLE + 0x50 + 0x8c * (i + 1) + 8) - 0x34) >>> 0,
      }));
      const { sp, info } = makeSpace(party);
      const frame = tick + 2;
      const buf = /** @type {number} */ (this.idx0 + frame) % 2;
      const nparty = 6;
      const eng = new Engine(sp, mem, { nparty, nenemy: 1 });
      eng.drawEnabled = true;
      eng.loadActorsFromArena();
      mem.tick = frame;
      eng.tickNo = frame;
      eng.buf = buf;
      const script = sp.u32(info[member].scriptTable + 4 * (crit ? 8 : 2));
      const ctl = new AttackController(member + 1, targetSlot, script);
      eng.controllers.push(ctl);
      eng.start(member + 1, targetSlot, sp.u32(info[member].scriptTable + 4));
      // A: the enemy move's first allocation frame (absolute)
      const A =
        schedInfo.anchor.anchor === 'hitRoll'
          ? schedInfo.tick + schedInfo.anchor.offset
          : schedInfo.tick + schedInfo.anchor.offset;
      // apply enemy events that happen before the engine starts
      if (!schedule.done && A + schedule.nextTick <= frame) schedule.applyTo(frame - A);
      for (let n = 0; n < 200;) {
        // apply enemy events up to the engine's next frame (enemy first at the same tick)
        const nextFrame = eng.tickNo + 1;
        if (!schedule.done) schedule.applyTo(nextFrame - A);
        eng.tick();
        n++;
        if (ctl.started !== null && eng.tickNo > ctl.started + 5) {
          let done = true;
          for (let s = nparty + 2; s < 0x14; s++) if (eng.A[s].active !== 0) done = false;
          if (done) break;
        }
      }
      schedule.applyAll();
      eng.forgetScene();
      mem.commit();
      // transfer the image-derived words from the non-interleaved state to the interleaved one
      this._transferEnemyWords(trial, schedule.ptrs);
      this.state = trial;
      for (const [, kind, n, ptr] of mem.events)
        if (kind === 'a')
          for (let a = ptr; a < ptr + ((n + 7) >> 3) * 8; a += 4) this.actionDirty.add(a);
      this.engineAttacks.add(member);
      this._preEnemyState = undefined;
      return true;
    } catch (error) {
      if (
        error instanceof UnknownInput ||
        /not in the effect data|not ported/.test(String(error?.message))
      )
        return false;
      throw error;
    }
  }

  /**
   * Transfers the image/model-derived word knowledge from the non-interleaved enemy move (this.state) to the interleaved state.
   * For each enemy alloc whose address changed, the known/partial/unknown status is remapped from the old address to the new one.
   * @param {import('./HeapPrediction.js').HeapState} interleavedState
   * @param {(number | null)[]} newPtrs - the interleaved enemy alloc pointers
   */
  _transferEnemyWords(interleavedState, newPtrs) {
    const oldPtrs = this._enemyPtrs;
    const events = this._enemyScheduleInfo?.events;
    if (!oldPtrs || !events) return;
    let allocIdx = 0;
    for (const ev of events) {
      if (ev <= 0) continue;
      const oldPtr = oldPtrs[allocIdx];
      const newPtr = newPtrs[allocIdx];
      allocIdx++;
      if (oldPtr === null || newPtr === null || oldPtr === newPtr) continue;
      const words = ((ev + 7) >> 3) * 2;
      for (let w = 0; w < words; w++) {
        const oldAddr = oldPtr + w * 4;
        const newAddr = newPtr + w * 4;
        const k = this.state.known.get(oldAddr);
        if (k !== undefined) {
          interleavedState.known.set(newAddr, k);
          interleavedState.unknown.delete(newAddr);
          interleavedState.partial?.delete(newAddr);
        } else if (this.state.partial?.has(oldAddr)) {
          interleavedState.known.delete(newAddr);
          interleavedState.unknown.add(newAddr);
          interleavedState.partial?.add(newAddr);
        }
      }
    }
  }

  /** The Special's roll-dependent words (the model's unknown ones) are not known, whatever the recorded images say about them. */
  forgetSpecialRolls(rollsOnly = false) {
    // (the words its rolls gave are the rolls', when no other action drew between them: they overwrite what an image says)
    const rolled = this.rollsInterleaved ? undefined : this.specialRollWords;
    for (const addr of rollsOnly ? [] : (this.specialUnknown ?? [])) {
      if (rolled?.has(addr)) continue;
      this.state.known.delete(addr);
      this.state.partial.delete(addr);
      this.state.unknown.add(addr);
    }
    for (const [addr, word] of rolled ?? []) {
      // (a word the rebuilt menu wrote in full, or its packet stream, is the menu's)
      if (this.state.partial.has(addr)) {
        // (the image's value of a word the Special wrote and nothing rewrote has the low 12 bits of a roll word clear: it is another
        // run's roll; a word with other low bits is one the menu rewrote)
        // (the menu rewrote the low half and left the roll's high half)
        const image = this.state.heap.u32(addr);
        // (a word of the menu's gradient: the initialiser wrote its RGB, the roll's top byte stays)
        const object = this.menuBlocks[41];
        const gradient = object === undefined ? undefined : gradientWord(addr - object, word);
        if (gradient !== undefined) {
          this.state.heap.over.set(addr, gradient);
          continue;
        }
        this.state.heap.over.set(
          addr,
          (image & 0xfff) === 0 ? word : ((word & 0xffff0000) | (image & 0xffff)) >>> 0,
        );
        continue;
      }
      // (a word under one of the rebuilt menu's blocks that the heap has no value for was rewritten by the menu: not the roll's)
      if (
        this.state.known.has(addr) ||
        this.inMenuStream(addr) ||
        this.menuRanges.some(([lo, hi]) => addr >= lo - 8 && addr < hi)
      )
        continue;
      this.state.known.set(addr, word);
      this.state.partial.delete(addr);
      this.state.unknown.delete(addr);
    }
  }

  /**
   * The rebuilt Fight menu object's words from the build code: a word whose bytes the build writes in full is known; a word it writes
   * part of keeps the earlier owner's other bytes, known when the heap knew them before the rebuild's allocation.
   * @param {(number | null)[]} ptrs - the 44 rebuilt blocks, in allocation order
   * @param {Map<number, number>} knownBefore - the known words before the rebuild
   * @param {Set<number>} unknownBefore - the unknown words before the rebuild
   */
  applyMenuObject(ptrs, knownBefore, unknownBefore) {
    const at = /** @type {number[]} */ (ptrs);
    const menu = at[0];
    const heap = this.state.heap;
    const windows = Array.from({ length: 8 }, (_, k) => at[1 + 5 * k]);
    // (several writes can set different bytes of one word: join them)
    /** @type {Map<number, [number, number]>} */
    const writes = new Map();
    for (const [offset, value, mask] of menuObjectWrites({ windows, cursor: at[41] })) {
      const [v, m] = writes.get(offset) ?? [0, 0];
      writes.set(offset, [((v & ~mask) | (value & mask)) >>> 0, (m | mask) >>> 0]);
    }
    for (const [offset, [value, mask]] of writes) {
      const addr = menu + offset;
      let word;
      if (mask === 0xffffffff) word = value;
      else {
        const special = this.specialWords;
        const inLoader = special && addr >= special.loader && addr < special.loader + 16384;
        // the earlier owner's word: the Special's own final word where it wrote one; the loader buffer's other words are file data
        const stale = special?.known.has(addr)
          ? special.known.get(addr)
          : inLoader
            ? undefined
            : (knownBefore.get(addr) ?? (unknownBefore.has(addr) ? undefined : heap.u32(addr)));
        word = stale === undefined ? undefined : ((stale & ~mask) | (value & mask)) >>> 0;
      }
      if (word === undefined) continue;
      this.state.known.set(addr, word);
      this.state.partial.delete(addr);
      this.state.unknown.delete(addr);
    }
  }

  /**
   * A word of the arena as it stands before a cast's allocations, if the heap knows it: a known word, or a dump word nothing has
   * made unknown.
   * @param {number} address
   * @returns {number | undefined}
   */
  wordBeforeCast(address) {
    const known = this.state.known.get(address);
    if (known !== undefined) return known;
    return this.state.unknown.has(address) ? undefined : this.state.heap.u32(address);
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
   * Whether the rebuilt menu's blocks are not where the heap had them: an earlier action's blocks changed the allocator, so the rebuild
   * (and the next round's free of it) is somewhere else.
   * @param {(number | null)[]} ptrs - the 44 rebuilt blocks, in allocation order
   */
  menuMoved(ptrs) {
    const at = /** @type {number[]} */ (ptrs);
    const last = new Set(this.menuBlocks);
    return at.some((p) => !last.has(p));
  }

  /**
   * A party member's Attack or item happens: its hit effect's (or the Mega medicine's) allocations and frees, in the recorded order, so
   * the allocator is where the game has it for whatever comes next (Crystal Core's move, a cast). The blocks' words are unknown. Only the
   * recorded actions have events (the party L-fire-slow's Attack, and item slot 4 on each target); another action leaves the heap as it
   * was and is covered by the round's taint.
   * @param {PartyAction} action
   * @returns {boolean} whether the action had recorded events
   */
  partyAction(action) {
    if (this.roundMoves.special) this.rollsInterleaved = true;
    if (action.type === 'Attack') {
      // an Attack that comes before the round's enemy move in call order waits for it: the engine's allocations land amid the move's
      if (!action.endsFight && !this._enemyScheduleInfo && this._attackEligible(action)) {
        this.pendingAttacks.push(action);
        return true;
      }
      this.flushAttacks();
      if (this.engineAttack(action)) return true;
    } else this.flushAttacks();
    return this._footprint(action);
  }

  /**
   * The recorded footprint of a party action: its heap events, applied now.
   * @param {PartyAction} action
   * @returns {boolean}
   */
  _footprint(action) {
    const tag = actionTag(action, ACTION_FOOTPRINTS.attack);
    const events = tag === undefined ? undefined : PARTY_ACTION_EVENTS[tag];
    if (!events || events.length === 0) return false;
    this.recordDirty(events, applyEvents(this.state, events));
    return true;
  }

  /**
   * Whether a party Attack can run on the engine at all: the roster's files are known and the round's draw index is known (the frame constants D and K are
   * the agent's, confirmed for McDohl, Viktor, Luc, Hellion and Tengaar in Attack and Special rounds).
   * @param {{ member: number, tick?: number, targetSlot?: number }} action
   */
  _attackEligible({ member, tick, targetSlot }) {
    if (!this.useEngine || !this.roster || tick === undefined || targetSlot === undefined)
      return false;
    if (this.idx0 === undefined) return false;
    const code = this._rosterCode(member);
    return code !== undefined;
  }

  /** @param {number} member @returns {string | undefined} the character file of a party member */
  _rosterCode(member) {
    const id = this.roster?.[member];
    return Object.entries(CHARACTER_FILES).find(([, f]) => f.rosterId === id)?.[0];
  }

  /** The queued Attacks that no enemy move came for run now, alone, or use their footprint. */
  flushAttacks() {
    const pending = this.pendingAttacks.splice(0);
    for (const action of pending) if (!this._standaloneAttack(action)) this._footprint(action);
  }

  /**
   * @param {number[]} events - an action's events
   * @param {(number | null)[]} ptrs - the payload pointer of each allocation
   */
  recordDirty(events, ptrs) {
    let i = 0;
    for (const ev of events) {
      if (ev <= 0) continue;
      const ptr = ptrs[i++];
      if (ptr === null || ptr === undefined) continue;
      for (let a = ptr; a < ptr + ((ev + 7) >> 3) * 8; a += 4) this.actionDirty.add(a);
    }
  }

  /**
   * A rune spell other than the five particle spells is cast: its recorded allocations and frees (the loader buffer first, the post-cast
   * blocks included), so the allocator is where the game has it for what follows. The blocks' words are unknown, except the loader's.
   * @param {string} name - the spell's name
   * @returns {boolean} whether the spell has recorded events
   */
  castOtherSpell(name) {
    this.flushAttacks();
    if (this.roundMoves.special) this.rollsInterleaved = true;
    const events = OTHER_SPELL_EVENTS[name];
    if (!events) return false;
    this.recordDirty(events, applyEvents(this.state, events, { loader: true }));
    return true;
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
    this.applyKillPad();
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
    this.applyKillPad();
    return this.withTaint(spell, predictSoulEaterFrom(this.state, spell));
  }

  /**
   * Runs one Flaming Arrow cast on the heap: predicts its 20 stale words, burns the RNG with them, replays the cast's heap events and
   * leaves the particles' final words behind.
   * @param {RNG} rng
   * @returns {number} the RNG calls it made
   */
  castFlamingArrow(rng) {
    this.flushAttacks();
    if (this.roundMoves.special) this.rollsInterleaved = true;
    this.roundMoves.casts++;
    this.roundMoves.castList.push('FlamingArrow');
    const { residual, unknown, particlePtrs } = this.predictParticles('FlamingArrow');
    const anyUnknown = unknown.some(Boolean);
    // each particle struct's words as the arena held them before the cast (the low 12 bits of words 0-5 stay)
    const stale = particlePtrs.map((ptr) =>
      Array.from({ length: 9 }, (_, k) =>
        k === 3 ? residual[particlePtrs.indexOf(ptr)] : this.wordBeforeCast(ptr + 4 * k),
      ),
    );
    const { calls, particles } = flamingArrowParticles(
      rng,
      residual,
      stale.map((words) => words.map((w) => w ?? 0)),
    );
    const ptrs = this.castEvents('Fire slot 1');
    // the pool recipe numbers its allocations from the 200-byte context, which is the cast's second allocation (after the loader)
    particlePtrs.forEach((ptr, i) => {
      if (!ptrs.includes(ptr)) throw new Error('particle struct not in the cast events');
      const words = /** @type {NonNullable<typeof particles>} */ (particles)[i].words;
      if (anyUnknown) {
        // the cast's rolls and carries depend on the stale low bits of all six cells (the despawn tests, the roll count): one unknown
        // cell leaves every output unknown (the guess is what the heap holds)
        this.state.heap.over.set(ptr + 0xc, words[3]);
        this.state.known.delete(ptr + 0xc);
        this.state.partial.delete(ptr + 0xc);
        this.state.unknown.add(ptr + 0xc);
      } else {
        this.state.known.set(ptr + 0xc, words[3]);
        this.state.partial.delete(ptr + 0xc);
        this.state.unknown.delete(ptr + 0xc);
        this.roundMoves.trail.push([ptr + 0xc, words[3]]);
      }
      // the other words the cast writes (head, trail y and z, velocity): exact when the stale low 12 bits are known
      for (let k = 0; k < 9; k++) {
        if (k === 3 || (k < 6 && stale[i][k] === undefined)) continue;
        this.state.known.set(ptr + 4 * k, words[k]);
        this.state.partial.delete(ptr + 4 * k);
        this.state.unknown.delete(ptr + 4 * k);
      }
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
    this.flushAttacks();
    if (this.roundMoves.special) this.rollsInterleaved = true;
    this.roundMoves.casts++;
    this.roundMoves.castList.push(spell);
    const start = rng.count;
    switch (spell) {
      case 'Explosion': {
        const { residual, particlePtrs } = this.predictParticles('Explosion');
        const { trailX } = explosionRand(rng, residual, true);
        this.castEvents('Fire slot 3');
        // pool C's particle structs keep their trail word: the next cast that allocates the same struct reads it as its stale word
        particlePtrs.forEach((ptr, i) => {
          this.trailWords.add(ptr + 0xc);
          // (a word under the menu's stream is redrawn with it before the next cast: it holds the menu's word again)
          if (this.inMenuStream(ptr + 0xc)) return;
          this.state.known.set(ptr + 0xc, trailX[i] >>> 0);
          this.state.partial.delete(ptr + 0xc);
          this.state.unknown.delete(ptr + 0xc);
        });
        break;
      }
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

  /**
   * Whether the Fight menu's stream, drawn again between casts, covers a word of the two packet blocks.
   * @param {number} addr
   * @returns {boolean}
   */
  inMenuStream(addr) {
    return this.packetBlocks.some((block) => addr >= block && addr < block + this.streamEnd);
  }

  /**
   * Luc's kill cast's sprite-object pad bytes (`KILL_PAD_BYTES`) hold the draw buffer index at its first spawn in whatever words still
   * hold them: the recorded images are one party's, a later Special does not touch them.
   */
  applyKillPad() {
    if (this.killPadIdx === undefined) return;
    for (const [addr, byIdx] of Object.entries(KILL_PAD_BYTES)) {
      const word = (Number(addr) & ~3) >>> 0;
      if (!this.state.known.has(word) && !this.state.partial?.has(word)) continue;
      // (a Special whose blocks lie over the kill cast's objects has written the whole word since: the pad byte is gone)
      if (this.specialShifted && this.specialWords?.known.has(word)) continue;
      const shift = 8 * (Number(addr) & 3);
      const old = this.state.known.get(word) ?? this.state.heap.u32(word);
      const bossFirst = this.party !== 'L-fire';
      let byte = byIdx[(bossFirst ? 2 : 0) + this.killPadIdx];
      // the boss-first, idx 0 byte is the Attack's sprite packet's camera class term: 11 + 5 x (the round's first rand() % 3)
      // (kill_round_edf_rule_v10.json, 6 of 6 seeds); the round of the latest Attack is the kill round
      if (Number(addr) === 0x80190edf && bossFirst && this.killPadIdx === 0) {
        const last = this.attacks.reduce((a, b) => (b.round > a.round ? b : a), this.attacks[0]);
        byte = last === undefined ? undefined : 11 + 5 * last.camera;
      }
      if (byte === undefined) continue;
      const value = ((old & ~(0xff << shift)) | (byte << shift)) >>> 0;
      this.state.heap.over.set(word, value);
      this.state.known.set(word, value);
      this.state.unknown.delete(word);
      this.state.partial?.delete(word);
    }
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
    for (const a of this.attacks) pushKeyInt(out, a.round * 64 + a.passes + 4096 * a.camera);
    pushKeyInt(out, this.specialPhase === undefined ? -1 : this.specialPhase === 'fast' ? 0 : 1);
    pushKeyInt(out, this.index ?? -1);
    pushKeyInt(out, this.idx0 ?? -1);
    pushKeyInt(out, this.killPadIdx ?? -1);
    pushKeyInt(out, this.menuDelay);
    for (const a of this.pendingAttacks)
      pushKeyInt(out, a.member * 4096 + (a.tick ?? 0) * 2 + (a.crit ? 1 : 0));
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
