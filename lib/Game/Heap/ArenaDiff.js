import HeapModel, { ARENA, ARENA_SIZE } from './HeapModel.js';

/**
 * Whole-arena comparison of the simulated VFX heap with a recorded arena: every word of the 0x18000 bytes, not only the ones the five
 * spells read. The simulator claims a word when it is neither flagged unknown nor partial (a word nothing touched is the dump's own, and
 * that is a claim too). Each word falls in one of four classes:
 *   verified      claimed, equal to the recording
 *   wrong         claimed, different: the simulator states a value the game does not hold (a bug, never acceptable)
 *   guessRight    not claimed, equal (the heap's best guess happens to be right)
 *   gap           not claimed, different (a word the simulator does not produce yet)
 * A partial word (low 24 bits known, top byte history) is counted by its low 24 bits: partialRight / partialWrong.
 * The goal of the simulator is gap = 0, wrong = 0 and no flags at all; this is how far we are.
 *
 * The counts are also given per kind of block, because they do not matter equally:
 *   free   free memory: whatever it holds is stale data for the next allocation, so every word of it can reach a spell's rolls
 *   menu   the Fight menu's 44 blocks (including the two packet buffers and the 12776-byte object): freed at every round start, so their
 *          words become stale data too
 *   live   every other used block: the battle struct, the backgrounds, the actors' sprite objects, packets and resource headers. They are
 *          alive at every recorded prompt and never freed in the recorded rounds (63 blocks, in none of the 510 allocation traces), so
 *          they are never stale data: they matter only as inputs an effect reads (positions, animation), and as state the game animates
 *          every frame, which the simulator does not run yet.
 * Free and menu words are the ones the simulator has to get exactly right to predict a spell's rolls; the live ones are tracked apart.
 */

/**
 * The blocks of a heap, walked by their headers from the start of the arena: [header address, size in bytes incl. the 8-byte header, free].
 * @param {HeapModel} heap
 * @returns {{ addr: number, bytes: number, free: boolean }[] | null} null when a header is invalid (the walk cannot continue)
 */
export function arenaBlocks(heap) {
  const free = new Set(heap.freeList().map(([addr]) => addr));
  /** @type {{ addr: number, bytes: number, free: boolean }[]} */
  const blocks = [];
  let addr = ARENA;
  while (addr < ARENA + ARENA_SIZE) {
    const units = heap.u32(addr + 4);
    if (units < 1 || addr + units * 8 > ARENA + ARENA_SIZE) return null;
    blocks.push({ addr, bytes: units * 8, free: free.has(addr) });
    addr += units * 8;
  }
  return blocks;
}

/**
 * @typedef {{ verified: number, wrong: number, guessRight: number, gap: number, partialRight: number, partialWrong: number }} Counts
 * @typedef {'free' | 'menu' | 'live'} Kind
 * @typedef {{ addr: number, bytes: number, free: boolean, kind: Kind, counts: Counts }} BlockReport
 * @typedef {{
 *   words: number, counts: Counts, byKind: Record<Kind, Counts>, blocks: BlockReport[] | null, layoutDiffers: number | null,
 *   wrongWords: number[]
 * }} ArenaReport
 */

/** @returns {Counts} */
const emptyCounts = () => ({
  verified: 0,
  wrong: 0,
  guessRight: 0,
  gap: 0,
  partialRight: 0,
  partialWrong: 0,
});

/**
 * @param {{ state: { heap: HeapModel, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }, menuBlocks: number[] }} sim - the simulator's heap
 * @param {{ arena: Uint8Array, sidecar: { rover: string | number } }} real - the recorded arena and its sidecar
 * @returns {ArenaReport}
 */
export function diffArena(sim, real) {
  const { heap, known, unknown, partial } = sim.state;
  const view = new DataView(real.arena.buffer, real.arena.byteOffset, real.arena.byteLength);
  const realHeap = new HeapModel(real.arena, Number(real.sidecar.rover));
  const simBlocks = arenaBlocks(heap);
  const realBlocks = arenaBlocks(realHeap);
  /** @type {Counts} */
  const total = emptyCounts();
  /** @type {Record<Kind, Counts>} */
  const byKind = { free: emptyCounts(), menu: emptyCounts(), live: emptyCounts() };
  const menu = new Set(sim.menuBlocks.map((p) => p - 8));
  /** @type {BlockReport[] | null} */
  const blocks =
    simBlocks === null
      ? null
      : simBlocks.map((b) => ({
          addr: b.addr,
          bytes: b.bytes,
          free: b.free,
          kind: /** @type {Kind} */ (b.free ? 'free' : menu.has(b.addr) ? 'menu' : 'live'),
          counts: emptyCounts(),
        }));
  let at = 0;
  /** @type {number[]} */
  const wrongWords = [];
  for (let addr = ARENA; addr < ARENA + ARENA_SIZE; addr += 4) {
    while (blocks && at + 1 < blocks.length && addr >= blocks[at].addr + blocks[at].bytes) at++;
    const mine = known.get(addr) ?? heap.u32(addr);
    const theirs = view.getUint32(addr - ARENA, true);
    /** @type {keyof Counts} */
    let cls;
    if (partial?.has(addr))
      cls = (mine & 0xffffff) === (theirs & 0xffffff) ? 'partialRight' : 'partialWrong';
    else if (unknown.has(addr)) cls = mine === theirs ? 'guessRight' : 'gap';
    else cls = mine === theirs ? 'verified' : 'wrong';
    total[cls]++;
    if (blocks) {
      blocks[at].counts[cls]++;
      byKind[blocks[at].kind][cls]++;
    }
    if (cls === 'wrong' || cls === 'partialWrong') wrongWords.push(addr);
  }
  let layoutDiffers = null;
  if (simBlocks && realBlocks) {
    const key = (/** @type {{ addr: number, bytes: number, free: boolean }[]} */ list) =>
      new Set(list.map((b) => `${b.addr}:${b.bytes}:${b.free}`));
    const a = key(simBlocks);
    const b = key(realBlocks);
    layoutDiffers = [...a].filter((x) => !b.has(x)).length + [...b].filter((x) => !a.has(x)).length;
  }
  return { words: ARENA_SIZE / 4, counts: total, byKind, blocks, layoutDiffers, wrongWords };
}

/**
 * The report as lines: the layout, then the transient words (free memory and the menu: the ones that become stale data) and the live
 * scene blocks apart.
 * @param {ArenaReport} r
 */
export function summary(r) {
  const line = (/** @type {string} */ name, /** @type {Counts} */ c) =>
    `  ${name.padEnd(5)} verified ${c.verified}  WRONG ${c.wrong}  guess right ${c.guessRight}  gap ${c.gap}  partial ${c.partialRight} ok / ${c.partialWrong} wrong`;
  return [
    `layout differs in ${r.layoutDiffers} blocks`,
    line('free', r.byKind.free),
    line('menu', r.byKind.menu),
    line('live', r.byKind.live),
  ].join('\n');
}

/**
 * The blocks with the most unproduced or wrong words, for a report.
 * @param {ArenaReport} r
 * @param {number} [n]
 */
export function worstBlocks(r, n = 10) {
  return (r.blocks ?? [])
    .map((b) => ({ ...b, bad: b.counts.gap + b.counts.wrong + b.counts.partialWrong }))
    .filter((b) => b.bad > 0)
    .sort((a, b) => b.bad - a.bad)
    .slice(0, n);
}
