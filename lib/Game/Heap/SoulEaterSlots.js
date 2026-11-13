/**
 * What a Black Shadow or Hell cast leaves in its 2804-byte struct for the next cast to read as stale words: the 40 particle slots'
 * positions, scales, velocities and lives (the agent's "rng" class: the spawn rolls and the epilogue's moves, exact in all 320 words of
 * the recorded casts), the accumulator, and the slot constants. The words that depend on the draw (the packets' links and projected
 * points) stay unknown.
 */

/** Where the slots and the accumulator lie in the struct. */
const LAYOUT = {
  BlackShadow: { slotBase: 0x2c, accum: 0xad0, step: undefined },
  Hell: { slotBase: 0x44, accum: 0x3c, step: 0x40 },
};
const STRIDE = 0x44;

/**
 * @param {{ heap: import('./HeapModel.js').default, known: Map<number, number>, unknown: Set<number>, partial?: Set<number> }} state
 * @param {number} ctx - the struct's pointer
 * @param {'BlackShadow' | 'Hell'} spell
 * @param {{ slots?: import('../Magic/SpellRNG/SoulEater.js').SoulEaterParticle[], accum?: number }} final - the cast's end state
 * @param {readonly boolean[]} slotUnknown - slots whose end state depends on a word the heap did not know
 * @param {number} [step] - Hell's per-call accumulator increment
 * @returns {number[]} the words it wrote
 */
export function applySlotWords(state, ctx, spell, final, slotUnknown, step) {
  const { slotBase, accum, step: stepOffset } = LAYOUT[spell];
  /** @type {number[]} */
  const written = [];
  /** @param {number} addr @param {number} value */
  const put = (addr, value) => {
    written.push(addr);
    const word = value >>> 0;
    state.heap.over.set(addr, word);
    state.known.set(addr, word);
    state.unknown.delete(addr);
    state.partial?.delete(addr);
  };
  (final.slots ?? []).forEach((slot, i) => {
    if (slotUnknown[i]) return;
    const b = ctx + slotBase + i * STRIDE;
    put(b, 0);
    put(b + 8, 0x68ffffff);
    put(b + 0x14, 0x68ffffff);
    put(b + 0x1c, slot.posX);
    put(b + 0x20, slot.posY ?? 0);
    put(b + 0x24, slot.posZ ?? 0);
    put(b + 0x30, slot.scale);
    put(b + 0x34, slot.velX);
    put(b + 0x38, slot.velY ?? 0);
    put(b + 0x3c, slot.velZ ?? 0);
    put(b + 0x40, slot.life);
  });
  if (final.accum !== undefined) put(ctx + accum, final.accum);
  if (step !== undefined && stepOffset !== undefined) put(ctx + stepOffset, step);
  return written;
}
