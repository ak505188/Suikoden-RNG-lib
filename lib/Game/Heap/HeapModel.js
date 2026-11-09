/**
 * Model of the game's heap (main.exe heap_alloc / heap_free over the arena at 0x80182000, 0x18000 bytes), so the simulator can
 * predict where a spell's structs land and which stale bytes they read. A port of Suikoden-Bizhawk-HUD scripts/heap/HeapModel.lua
 * (method and findings: its notes/VFX_Pool_Investigation.md, docs/game_mechanics/Heap_Residue_Routing.md); the same code in v1.0
 * and v1.1, so build-independent.
 *
 * The allocator is a K&R next-fit malloc over a circular free list: 8-byte units, 8-byte header { next, size in units incl.
 * header }, request units = ((n + 7) >> 3) + 1, the block is carved from the TAIL of the first fitting free block, memory is
 * never cleared, and the rover is left on the block BEFORE the one allocated from. free walks from the rover, links the block in
 * address order and merges with the next / previous free block. Both reproduce the header words they leave in memory.
 */

export const ARENA = 0x80182000;
export const ARENA_SIZE = 0x18000;

export default class HeapModel {
  /**
   * @param {Uint8Array} bytes - the arena image, ARENA_SIZE bytes from ARENA (shared and never written: writes go to an overlay)
   * @param {number} rover - pointer to the free-list rover block
   * @param {number} [base]
   */
  constructor(bytes, rover, base = ARENA) {
    if (bytes.length !== ARENA_SIZE) throw new Error('arena image must be 0x18000 bytes');
    this.bytes = bytes;
    this.base = base;
    this.rover = rover;
    /** @type {Map<number, number>} written words, by address */
    this.over = new Map();
    /** @type {((addr: number) => void) | null} called for every word the allocator writes (headers: their content is the allocator's) */
    this.onWrite = null;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /**
   * A heap that is one free block from `start` up to `end` (the persistent allocations above it, if any, are never touched): the
   * usual state once the Fight menu is freed. A struct that sits under the loader buffer reads the constant loader image, so where
   * `end` is decides which image words it reads (the arena's end gives the baked Flaming Arrow table); what the arena held below
   * the block never matters then.
   * @param {number} start - address of the free block's header (8-aligned, inside the arena)
   * @param {number} [end] - address just past the block (default: the arena's end)
   */
  static singleBlock(start, end = ARENA + ARENA_SIZE) {
    const bytes = new Uint8Array(ARENA_SIZE);
    const view = new DataView(bytes.buffer);
    view.setUint32(start - ARENA, start, true); // next: itself
    view.setUint32(start - ARENA + 4, (end - start) / 8, true);
    return new HeapModel(bytes, start);
  }

  clone() {
    const c = new HeapModel(this.bytes, this.rover, this.base);
    c.over = new Map(this.over);
    return c;
  }

  /** @param {number} addr @returns {number} */
  u32(addr) {
    const v = this.over.get(addr);
    if (v !== undefined) return v;
    const o = addr - this.base;
    if (o < 0 || o + 4 > this.bytes.length)
      throw new Error(`address ${addr.toString(16)} outside the arena`);
    return this.view.getUint32(o, true);
  }

  /** @param {number} addr @param {number} v */
  write32(addr, v) {
    this.over.set(addr, v >>> 0);
    this.onWrite?.(addr);
  }

  /**
   * heap_alloc (0x800c2d30)
   * @param {number} n - request bytes
   * @returns {number | null} the payload pointer, or null (heap_alloc would return 0)
   */
  alloc(n) {
    const units = ((n + 7) >> 3) + 1;
    let prev = this.rover;
    let cand = this.u32(prev);
    for (;;) {
      const size = this.u32(cand + 4);
      if (units <= size) {
        if (size === units) {
          this.write32(prev, this.u32(cand));
        } else {
          this.write32(cand + 4, size - units);
          cand += (size - units) * 8;
          this.write32(cand + 4, units);
        }
        this.rover = prev;
        return cand + 8;
      }
      if (cand === this.rover) return null;
      prev = cand;
      cand = this.u32(cand);
    }
  }

  /**
   * heap_free (0x800c2dc0); free(NULL) does nothing.
   * @param {number | null} ptr
   */
  free(ptr) {
    if (!ptr) return;
    const blk = ptr - 8;
    let p = this.rover;
    do {
      this.rover = p;
      if (this.rover < blk && blk < this.u32(this.rover)) break;
      p = this.u32(this.rover);
    } while (this.rover < p || (blk <= this.rover && p <= blk));
    p = this.u32(this.rover);
    let size = this.u32(blk + 4);
    if (blk + size * 8 === p) {
      size += this.u32(p + 4);
      this.write32(blk + 4, size);
      this.write32(blk, this.u32(this.u32(this.rover)));
    } else {
      this.write32(blk, p);
    }
    const rs = this.u32(this.rover + 4);
    if (this.rover + rs * 8 === blk) {
      this.write32(this.rover + 4, rs + this.u32(blk + 4));
      this.write32(this.rover, this.u32(blk));
    } else {
      this.write32(this.rover, blk);
    }
  }

  /** @returns {[number, number][]} free blocks in list order from the rover: [address, units] */
  freeList() {
    /** @type {[number, number][]} */
    const list = [];
    let p = this.rover;
    for (let i = 0; i < 4096; i++) {
      list.push([p, this.u32(p + 4)]);
      p = this.u32(p);
      if (p === this.rover) break;
    }
    return list;
  }
}
