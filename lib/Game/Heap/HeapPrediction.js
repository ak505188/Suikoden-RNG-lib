import HeapModel, { ARENA, ARENA_SIZE } from './HeapModel.js';
import { LOADER_BYTES, loaderImage } from './LoaderImage.js';
import { POOL_RECIPES } from './PoolRecipes.js';

/**
 * Predicts the stale words the five spells that read uninitialised heap memory (Flaming Arrow, Explosion's pool C, Thor's arcs,
 * Black Shadow, Hell) will read, from the allocator state at the moment of the cast. A port of Suikoden-Bizhawk-HUD
 * scripts/heap/HeapPrediction.lua (method and validation: its notes/VFX_Pool_Investigation.md, docs/game_mechanics/
 * Heap_Residue_Routing.md). What happens between the Fight prompt and the spell's first struct when nothing else touches the heap:
 *   1. the round starts and the game frees the Fight menu: the 44 payload pointers of `fightMenuFrees`, in order;
 *   2. the spell's pre-cast routine allocates the 16384-byte loader buffer, which receives a CONSTANT image, and frees it;
 *   3. its setup allocates a fixed sequence of blocks (POOL_RECIPES), the particle structs among them, or one 2804-byte struct
 *      (Black Shadow, Hell), each from the tail of the first fitting free block.
 * The words a struct never initialises keep whatever the heap held: the loader image where the buffer covers them, a word an earlier
 * cast wrote (`known`), or the dump's bytes; and nothing is known about a block another action allocated and filled (`unknown`).
 */

/**
 * A heap dump (Suikoden-Bizhawk-HUD scripts/heap/HeapDump.capture).
 * @typedef {Object} HeapDump
 * @property {Uint8Array} arena - the 0x18000 bytes from 0x80182000
 * @property {number} rover - the allocator's rover block
 * @property {number} menuState - the Fight menu object
 * @property {[number, number]} battleBlocks - the two 6000-byte round blocks
 * @property {number[]} [menuFrees] - the pointers the round start frees, in order, when the dump gives them (the in-round dumps, which
 *   have no menu state); otherwise they are read from the menu object
 */

/**
 * The heap at some moment: the allocator, the words whose content is known from what was written since the dump, and the words
 * inside blocks other code allocated and filled, whose content is not known.
 * @typedef {Object} HeapState
 * @property {HeapModel} heap
 * @property {Map<number, number>} known
 * @property {Set<number>} unknown
 * @property {Set<number>} [partial] - unknown words whose low 24 bits are known (the top byte is the battle's history)
 */

/**
 * @typedef {Object} ParticlePrediction
 * @property {number[]} residual - low 12 bits of each particle's +0xc word, in the order the spell RNG models index them
 * @property {boolean[]} unknown - per word: its content depends on an allocation the model cannot see
 * @property {number[]} particlePtrs
 * @property {number} unknownWords
 * @property {boolean} complete - unknownWords is 0
 * @property {[number, number][]} freeList - the heap's free list after the setup allocations
 */

/**
 * @typedef {Object} SoulEaterPrediction
 * @property {number} structPtr
 * @property {number[]} staleScale - the 40 slots' scale words as the struct is allocated
 * @property {number[]} staleResidual - the 40 slots' posX low 12 bits as the struct is allocated
 * @property {boolean[]} staleScaleUnknown
 * @property {boolean[]} staleResidualUnknown
 * @property {number[]} scale - after the wind-up: the inputs of the case-2 RNG simulation
 * @property {number[]} residual
 * @property {number} scaleAccumInit
 * @property {number} [scaleIncrement] - Hell only
 * @property {number} unknownWords - distinct unknown words read
 * @property {boolean} complete
 */

const WINDOW_COUNT = 8;
const MENU_TABLE = 0x31c4;
const MENU_EXTRA = 0x31e4;
const WINDOW_CHILDREN = [0x4c, 0x50, 0x24, 0x28];
const STRUCT_BYTES = 2804; // Black Shadow and Hell

/** Black Shadow's and Hell's struct layout (lib/SoulEaterCapture.lua RECIPES), the wind-up length and the despawn reference x */
const SOUL_EATER = {
  BlackShadow: {
    slotBase: 0x2c,
    stride: 0x44,
    scaleOffset: 0x30,
    posXOffset: 0x1c,
    accumOffset: 0xad0,
    windup: 96,
    refX: -128,
  },
  Hell: {
    slotBase: 0x44,
    stride: 0x44,
    scaleOffset: 0x30,
    posXOffset: 0x1c,
    accumOffset: 0x3c,
    windup: 95,
    refX: -178,
  },
};
const SLOTS = 40;

/** @param {number} p */
const inArena = (p) => p >= ARENA && p < ARENA + ARENA_SIZE;

/** @param {Uint8Array} bytes @param {number} offset */
const readWord = (bytes, offset) =>
  (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>>
  0;

/**
 * The payload pointers the game frees when a round starts, in order.
 * @param {HeapModel} heap - anything with u32 over the dump
 * @param {HeapDump} dump
 * @returns {number[]}
 */
export function fightMenuFrees(heap, dump) {
  if (dump.menuFrees) return dump.menuFrees;
  /** @type {number[]} */
  const list = [];
  const menu = dump.menuState;
  if (!inArena(menu)) return list;
  for (let k = 0; k < WINDOW_COUNT; k++) {
    const win = heap.u32(menu + MENU_TABLE + 4 * k);
    if (!inArena(win)) continue;
    for (const off of WINDOW_CHILDREN) list.push(heap.u32(win + off));
    list.push(win);
  }
  list.push(heap.u32(menu + MENU_EXTRA));
  list.push(menu);
  list.push(dump.battleBlocks[0], dump.battleBlocks[1]);
  return list;
}

/**
 * The allocator writes block headers into memory: a word it writes is its own (known, from the allocator's overlay), whatever was
 * known or unknown about it before.
 * @param {HeapState} state
 * @returns {HeapState}
 */
export function bindState(state) {
  state.partial ??= new Set();
  state.heap.onWrite = (addr) => {
    state.known.delete(addr);
    state.unknown.delete(addr);
    state.partial?.delete(addr);
  };
  return state;
}

/** @param {HeapState} state @returns {HeapState} */
export function cloneState(state) {
  return bindState({
    heap: state.heap.clone(),
    known: new Map(state.known),
    unknown: new Set(state.unknown),
    partial: new Set(state.partial),
  });
}

/**
 * A block another action allocated and filled: its payload words are unknown from now on.
 * @param {HeapState} state @param {number} ptr @param {number} size - the request bytes
 */
export function markUnknown(state, ptr, size) {
  const last = ptr + ((size + 7) >> 3) * 8 - 4;
  for (let a = ptr; a <= last; a += 4) {
    state.unknown.add(a);
    state.known.delete(a);
    state.partial?.delete(a);
  }
}

/**
 * The loader buffer's 16 KB receive the constant image: known, whatever they held.
 * @param {HeapState} state @param {number} ptr
 */
export function markLoader(state, ptr) {
  const img = loaderImage();
  for (let a = ptr; a <= ptr + LOADER_BYTES - 4; a += 4) {
    state.known.set(a, readWord(img, a - ptr));
    state.unknown.delete(a);
    state.partial?.delete(a);
  }
}

/**
 * Replays an action's heap events (the HeapSpellEvents format: a positive number is an allocation, -k the free of the k-th
 * allocation of the list) on the state. Every block it allocates is unknown afterwards, except a spell's loader buffer.
 * @param {HeapState} state
 * @param {number[]} events
 * @param {{ loader?: boolean }} [opts] - the first allocation is the 16384-byte loader buffer of a party spell
 * @returns {(number | null)[]} the payload pointer of each allocation
 */
export function applyEvents(state, events, opts = {}) {
  /** @type {(number | null)[]} */
  const ptrs = [];
  for (const ev of events) {
    if (ev > 0) {
      const p = state.heap.alloc(ev);
      ptrs.push(p);
      if (p === null) continue;
      if (opts.loader && ptrs.length === 1 && ev === LOADER_BYTES) markLoader(state, p);
      else markUnknown(state, p, ev);
    } else {
      state.heap.free(ptrs[-ev - 1] ?? null);
    }
  }
  return ptrs;
}

/**
 * The state at the moment a cast's loader buffer is allocated, from a dump alone: the Fight menu freed.
 * @param {HeapDump} dump
 * @returns {HeapState}
 */
export function stateAtPrompt(dump) {
  const heap = new HeapModel(dump.arena, dump.rover);
  for (const p of fightMenuFrees(heap, dump)) heap.free(p);
  return bindState({ heap, known: new Map(), unknown: new Set() });
}

/** The loader buffer is allocated, filled and freed: what every spell's pre-cast routine does. @param {HeapState} state */
function loaderPass(state) {
  const loader = state.heap.alloc(LOADER_BYTES);
  if (loader === null) throw new Error('loader buffer does not fit');
  markLoader(state, loader);
  state.heap.free(loader);
}

/**
 * Predicts the residual (low 12 bits of trail_x) of the 20 / 30 / 20 particles of Flaming Arrow, Explosion (pool C) and Thor
 * (arcs), in the order the spell RNG models index them. Valid for the single-target casts the recipes were taken from (Fire slot 1,
 * Explosion, Lightning+Water Unite). Does not change `state`.
 * @param {HeapState} state
 * @param {'FlamingArrow' | 'Explosion' | 'Thor'} spell
 * @returns {ParticlePrediction}
 */
export function predictParticlesFrom(state, spell) {
  const recipe = POOL_RECIPES[spell];
  const s = cloneState(state);
  loaderPass(s);
  let index = 0;
  /** @type {number[]} */
  const ptrs = [];
  for (const [size, count] of recipe.runs) {
    for (let i = 0; i < count; i++) {
      index++;
      const p = s.heap.alloc(size);
      if (p === null) throw new Error('setup allocation does not fit');
      if (index >= recipe.first && index <= recipe.last) ptrs.push(p);
    }
  }
  // a word whose top byte is the battle's history is unknown, but its low 24 bits are the writer's: the residual reads 12 of them
  const unknown = ptrs.map((p) => s.unknown.has(p + 0xc) && !s.partial?.has(p + 0xc));
  const unknownWords = unknown.filter(Boolean).length;
  return {
    residual: ptrs.map((p) => (s.known.get(p + 0xc) ?? s.heap.u32(p + 0xc)) & 0xfff),
    unknown,
    particlePtrs: ptrs,
    unknownWords,
    complete: unknownWords === 0,
    freeList: s.heap.freeList(),
  };
}

/**
 * Predicts what Black Shadow and Hell read out of their 2804-byte struct before they initialise it, and what the 95-96 wind-up
 * ticks turn it into (the inputs of the case-2 RNG simulation). Does not change `state`.
 * @param {HeapState} state
 * @param {'BlackShadow' | 'Hell'} spell
 * @returns {SoulEaterPrediction}
 */
export function predictSoulEaterFrom(state, spell) {
  const r = SOUL_EATER[spell];
  const s = cloneState(state);
  loaderPass(s);
  const struct = s.heap.alloc(STRUCT_BYTES);
  if (struct === null) throw new Error('struct does not fit');
  /** @type {Set<number>} */
  const unknownRead = new Set();
  /** @param {number} a */
  const word = (a) => {
    const known = s.known.get(a);
    if (known !== undefined) return known;
    if (s.unknown.has(a)) unknownRead.add(a);
    return s.heap.u32(a);
  };
  /** @param {number} a */
  const isUnknown = (a) => !s.known.has(a) && s.unknown.has(a);
  const staleScale = [];
  const staleResidual = [];
  const staleScaleUnknown = [];
  const staleResidualUnknown = [];
  const slots = [];
  for (let i = 0; i < SLOTS; i++) {
    const slot = struct + r.slotBase + i * r.stride;
    const scale = word(slot + r.scaleOffset);
    staleScale.push(scale);
    staleScaleUnknown.push(isUnknown(slot + r.scaleOffset));
    staleResidual.push(word(slot + r.posXOffset) & 0xfff);
    staleResidualUnknown.push(isUnknown(slot + r.posXOffset));
    slots.push({
      pos: [word(slot + 0x1c), word(slot + 0x20), word(slot + 0x24)],
      vel: [word(slot + 0x34), word(slot + 0x38), word(slot + 0x3c)],
      life: word(slot + 0x40),
      scale,
    });
  }
  // the spell's setup writes 0x1000 into scaleAccum's upper bits and leaves the low 12 bits as they were
  const accum = (0x1000 | (word(struct + r.accumOffset) & 0xfff)) >>> 0;
  const scaleIncrement =
    spell === 'Hell' ? (0x20000 | (word(struct + 0x40) & 0xfff)) >>> 0 : undefined;
  // wind-up epilogue: a slot whose life word is below 1 or whose posX is within 5 of the despawn reference is inactive; every other
  // slot advances by its stale velocity, loses a life and gets its scale word overwritten with scaleAccum
  for (let t = 0; t < r.windup; t++) {
    for (const sl of slots) {
      if (sl.life >> 0 < 1) continue;
      if (Math.abs(r.refX - Math.floor((sl.pos[0] >> 0) / 4096)) < 5) continue;
      for (let k = 0; k < 3; k++) sl.pos[k] = (sl.pos[k] + sl.vel[k]) >>> 0;
      sl.scale = accum;
      sl.life = (sl.life - 1) >>> 0;
    }
  }
  return {
    structPtr: struct,
    staleScale,
    staleResidual,
    staleScaleUnknown,
    staleResidualUnknown,
    scale: slots.map((sl) => sl.scale),
    residual: slots.map((sl) => sl.pos[0] & 0xfff),
    scaleAccumInit: accum,
    scaleIncrement,
    unknownWords: unknownRead.size,
    complete: unknownRead.size === 0,
  };
}

/**
 * Predicts the particle spells' words from a dump alone (nothing has touched the heap since the prompt).
 * @param {HeapDump} dump
 * @param {'FlamingArrow' | 'Explosion' | 'Thor'} spell
 * @returns {ParticlePrediction}
 */
export function predictParticles(dump, spell) {
  return predictParticlesFrom(stateAtPrompt(dump), spell);
}
