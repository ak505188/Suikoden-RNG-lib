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
import { ENEMY_MOVE_EVENTS } from './EnemyMoveEvents.js';
import { ENEMY_MOVE_IMAGES } from './EnemyMoveImages.js';
import { HIT_KEY_TABLES } from './HitKeyTables.js';
import { drawIndex } from './ScanPrediction.js';
import { explosionRand, flamingArrowParticles } from '../Magic/SpellRNG/Fire.js';
import { thorRand } from '../Magic/SpellRNG/Unites.js';
import { blackShadowRand, hellRand } from '../Magic/SpellRNG/SoulEater.js';
import { pushKeyInt } from '../../util/stateKey.js';

/** The recorded party order of the hit key tables: the front three (and Luc); heap_attack_spawn/keys_variants 'ord' differs in 8 to 16 words */
const RECORDED_ORDER = ['MCDOHL', 'VIKTOR', 'FLIK', 'LUC'];
/** The first draw's round frame for no failed pass: the slow party 50, the fast party 56 */
const FIRST_DRAW = { slow: 50, 'L-fire': 56 };
/** A Crystal Core Attack's first draw is this many frames after the battle tick it is dispatched on */
const TICK_TO_FRAME = 10;

/** @typedef {import('./HeapPrediction.js').HeapDump} HeapDump */
/** @typedef {import('./HeapPrediction.js').HeapState} HeapState */
/**
 * Crystal Core's Attack as the battle ran it: the round's camera class (first rand() % 3), the party slot hit (1..3, party order,
 * 1-based, the party ARRAY slot, not the formation position), the failed scan passes, the round, and, if the heap did not see the earlier
 * Attacks, their failed passes (rounds 1 to round - 1). `frame`: the round frame of the first draw (the draw buffer index follows its parity;
 * 50 + passes in the recorded rounds, 56 + passes for the fast party; a dead member's shorter polls move it). `recorded: false`: the party
 * is not the recorded composition and order, whose tables the key would index.
 * @typedef {{ camera: number, target: number, passes: number, round: number, previousPasses?: number[], frame?: number, recorded?: boolean }} Hit
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
   * @param {{ party?: string, index?: number }} [options] - `index`: the draw buffer index (u32 0x8018023c) at the first confirm, if the
   *   dump is a first prompt (0 in every recorded battle): the index then follows from the rounds' ticks. Unset: unknown, the older rules
   *   - which recording of the party the enemy moves' block images come from (their words depend on
   *   the party's timing): 'L-fire' (default; the party acts before the enemy) or 'L-fire-slow' (the enemy moves first in the round)
   */
  constructor(dump, options = {}) {
    this.party = options.party ?? 'L-fire';
    /** The draw buffer index at the current prompt (before the menu time), undefined while unknown @type {number | undefined} */
    this.index = options.index;
    /** The draw buffer index at the current round's confirm @type {number | undefined} */
    this.idx0 = options.index;
    /** @type {{ attack?: number, special: boolean, casts: number, round?: number, trail: [number, number][] }} */
    this.roundMoves = { special: false, casts: 0, trail: [] };
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
     * from the recording; unset, it follows from `specialBase` and the parity of the Attacks' failed passes.
     * @type {'fast' | 'slow' | undefined}
     */
    this.specialPhase = undefined;
    /**
     * The second Special's phase when no scan pass failed in any Attack, a recorded constant of the scenario: 'fast' for the Luc kill in
     * round 1 (the default when Attacks were seen), 'slow' for luc2, luc4 and vf1, 'fast' for vf2 and vf4 (heap_special_phase_scenarios.txt).
     * @type {'fast' | 'slow' | undefined}
     */
    this.specialBase = undefined;
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
    copy.specialBase = this.specialBase;
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
    /** What the round has done so far: Crystal Core's Attack (its failed passes), its Special, the party's casts, the Attack's round @type {{ attack?: number, special: boolean, casts: number, round?: number, trail: [number, number][] }} */
    this.roundMoves = { special: false, casts: 0, trail: [] };
    // the draw buffer index at this round's confirm: the index at the prompt, moved by the menu time
    this.idx0 = this.index === undefined ? undefined : (this.index + this.menuDelay) % 2;
    this.menuDelay = 0;
  }

  /** The words of the last enemy move's blocks stop being known (something else allocated over them). */
  forgetMoveBlocks() {
    for (const [ptr, words] of this.lastMoveBlocks)
      for (let i = 0; i < words; i++) {
        this.state.known.delete(ptr + 4 * i);
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
   * @param {{ partyAttacked?: boolean, bossDied?: boolean }} [round] - what else happened in the round. The draw buffer index toggles once
   *   per game tick, so the next round's index is this one's plus the round's ticks and the 2 frames of the wait (plus the menu time,
   *   `menuDelay`); the ticks are a recorded function of the round's shape (heap_rounds, 240 runs, 960 of 960 transitions): an Attack
   *   round 211 + failed passes, an Attack round in which Luc's Flaming Arrow kills 546 + failed passes, a Special round 392, a round in
   *   which the party's Attack kills before Crystal Core acts 221-223 (odd with the wait): the parity is odd + passes, passes, even, odd.
   *   Another shape leaves the index unknown.
   * @returns {(number | null)[]} the rebuilt blocks' payload pointers
   */
  roundEnd({ partyAttacked = false, bossDied = false } = {}) {
    // a party Attack's own effect allocates over the freed blocks of an earlier move: its words are not known any more
    if (partyAttacked) this.forgetMoveBlocks();
    if (this.index !== undefined) {
      const { attack, special, casts } = this.roundMoves;
      /** @type {number | undefined} */
      let toggles;
      if (special && !attack) toggles = 0;
      else if (attack !== undefined && !special && !partyAttacked && casts === 0 && !bossDied)
        toggles = 1 + attack;
      else if (attack !== undefined && !special && !partyAttacked && casts === 1 && bossDied)
        toggles = attack;
      else if (attack === undefined && !special && partyAttacked && bossDied && casts === 0)
        toggles = 1;
      const shifted = this.attacks.some((a) => a.round === this.roundMoves.round && a.shift);
      this.index =
        toggles === undefined || shifted ? undefined : ((this.idx0 ?? this.index) + toggles) % 2;
    }
    const ptrs = applyEvents(this.state, this.menuRebuild);
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
    blocks.forEach(([n, ptr, hex, varying, keep, topOnly], position) => {
      if (ptrs[indexOf(position, n)] !== ptr) return;
      const skipWord = new Set(varying);
      const kept = new Set(keep);
      const top = new Set(topOnly);
      for (let i = 0; i < hex.length / 8; i++) {
        const addr = ptr + 4 * i;
        // a kept word is the battle's history, left as the heap has it
        if (skip(addr)) continue;
        if (kept.has(i) && !applyKept) {
          // the move did not write it: it holds what the dump had there (the heap's own words were made unknown by the allocation)
          if (!this.state.known.has(addr)) {
            const { view, base } = this.state.heap;
            this.state.known.set(addr, view.getUint32(addr - base, true));
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
            this.state.unknown.add(addr);
            continue;
          }
        }
        if (skipWord.has(i)) {
          // a word that varies between seeds: its value is not known, whatever an earlier image said
          this.state.known.delete(addr);
          this.state.unknown.add(addr);
          continue;
        }
        this.state.known.set(addr, parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
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
          this.state.unknown.add(addr);
        } else {
          this.state.known.set(addr, parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
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
   * @param {{ repeat?: boolean, phase?: 'fast' | 'slow', hit?: Hit, target?: number, round?: number, tick?: number, order?: string[] }} [options] - `repeat`: the move has
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
    { repeat = false, phase, hit, target, round = 1, tick, order } = {},
  ) {
    const events = ENEMY_MOVE_EVENTS[enemyKey]?.[moveName];
    if (!events) return false;
    const history = new Map(this.state.known);
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
      // the scenario's base phase flipped by the parity of the failed scan passes of every Attack the battle had (62 of 62 recorded
      // seeds in six scenarios, the Black Shadow / Hell posX pattern too, vf2 included: a Viktor + Flik kill round has no Attack)
      if (this.idx0 !== undefined) {
        // the draw buffer index at the round's confirm is the phase (62 of 62 recorded seeds with a phase): 0 fast, 1 slow
        phase ??= this.idx0 === 1 ? 'slow' : 'fast';
      } else if (this.attacks.length || this.specialBase !== undefined) {
        const odd = this.attacks.reduce((sum, a) => sum + a.passes, 0) % 2 === 1;
        phase ??= odd === ((this.specialBase ?? 'fast') === 'fast') ? 'slow' : 'fast';
      }
    }
    const phased =
      phase === 'fast'
        ? mine?.inRoundFast
        : phase === 'slow' && repeated
          ? mine?.inRoundSlow
          : undefined;
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
      // except the words the round did not change (the image lists them): those are the battle's history (e.g. the kill spell's residue)
      this.applyImage(
        mine.inRound.blocks,
        ptrs,
        (_position, n) => n - 1,
        () => false,
      );
      this.applyStaleMenu(mine.inRound.menu);
      if (repeated)
        for (const addr of mine.repeatUnknown ?? []) {
          this.state.known.delete(addr);
          this.state.unknown.add(addr);
        }
    } else if (mine?.next) {
      // the image is the arena at the next prompt; a cast later in this round runs before the menu is rebuilt, so the words the rebuilt
      // menu covers are not the image's yet (the menu's own image is applied when it is rebuilt)
      const inMenu = (/** @type {number} */ a) =>
        this.menuRanges.some(([lo, hi]) => a >= lo && a < hi);
      this.applyImage(mine.next.blocks, ptrs, (_position, n) => n - 1, inMenu);
    }
    if (moveName === 'Special') this.roundMoves.special = true;
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
              // the tables hold for the recorded party order only (slots 1-3: McDohl, Viktor, Flik); another order has other words
              recorded: order === undefined || RECORDED_ORDER.every((key, i) => order[i] === key),
            };
      if (hit) this.hitEffect(hit, mine, ptrs);
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
   */
  hitEffect({ camera, target, passes, round, previousPasses, frame, recorded = true }, mine, ptrs) {
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
    if (!recorded) {
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
    // only round 1 was recorded with a shifted round (dead member): after it the round lengths are not known
    const shifts = this.attacks.slice(0, -1).map((a) => a.shift ?? 0);
    if (round > 1 && (shift !== 0 || shifts.some((x) => x !== 0))) return;
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
    // from round 2 on the packets are the round-2 table's at (the round's own index, round 1's): round 2's index plays no part
    const packets = (round === 1 ? HIT_KEY_TABLES.round1 : HIT_KEY_TABLES.round2)[
      `${camera}/${target}/${index}${round === 1 ? '' : `/${first}`}`
    ];
    // the 52- and 80-byte blocks follow round 1's draw index (the second Attack's too: 104 of 104 runs)
    // (slots 4-6 are recorded in round 1 only)
    const rest =
      round > 1 && target > 3 ? undefined : HIT_KEY_TABLES.blocks[`${camera}/${target}/${first}`];
    // (the fast party has the next-prompt image only: the same blocks at the same allocation numbers)
    const blocks = (mine?.inRound ?? mine?.next)?.blocks;
    if (!blocks) return;
    /** @type {import('./EnemyMoveImages.js').BlockImage[]} */
    const keyed = [];
    if (rest) {
      let at = 0;
      for (const [n, ptr, hex] of blocks)
        if (hex.length !== 80) keyed.push([n, ptr, rest.slice(at, (at += hex.length)), []]);
    }
    if (packets) {
      let at = 0;
      for (const [n, ptr, hex] of blocks)
        if (hex.length === 80) keyed.push([n, ptr, packets.slice(at, (at += 80)), []]);
    }
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
    return predictParticlesFrom(this.state, spell);
  }

  /** @param {'BlackShadow' | 'Hell'} spell */
  predictSoulEater(spell) {
    return predictSoulEaterFrom(this.state, spell);
  }

  /**
   * Runs one Flaming Arrow cast on the heap: predicts its 20 stale words, burns the RNG with them, replays the cast's heap events and
   * leaves the particles' final words behind.
   * @param {RNG} rng
   * @returns {number} the RNG calls it made
   */
  castFlamingArrow(rng) {
    this.roundMoves.casts++;
    const { residual, particlePtrs } = predictParticlesFrom(this.state, 'FlamingArrow');
    const { calls, trailX } = flamingArrowParticles(rng, residual);
    const ptrs = this.castEvents('Fire slot 1');
    // the pool recipe numbers its allocations from the 200-byte context, which is the cast's second allocation (after the loader)
    particlePtrs.forEach((ptr, i) => {
      if (!ptrs.includes(ptr)) throw new Error('particle struct not in the cast events');
      this.state.known.set(ptr + 0xc, trailX[i] >>> 0);
      this.state.unknown.delete(ptr + 0xc);
      this.roundMoves.trail.push([ptr + 0xc, trailX[i] >>> 0]);
    });
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
    pushKeyInt(out, this.specialBase === undefined ? -1 : this.specialBase === 'fast' ? 0 : 1);
    pushKeyInt(out, this.index ?? -1);
    pushKeyInt(out, this.idx0 ?? -1);
    pushKeyInt(out, this.menuDelay);
    pushKeyInt(out, known.size);
    for (const [addr, word] of [...known].sort((a, b) => a[0] - b[0])) {
      pushKeyInt(out, addr);
      pushKeyInt(out, word);
    }
    pushKeyInt(out, unknown.size);
  }
}
