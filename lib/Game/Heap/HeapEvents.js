/** @typedef {import('./HeapModel.js').default} HeapModel */

/**
 * Replays a move's heap events on the allocator model, in the HeapSpellEvents format of Suikoden-Bizhawk-HUD (also the Crystal
 * Core footprint files since 2026-11-07): a positive number is heap_alloc(size), -k is heap_free of the k-th ALLOCATION of the list
 * (frees are not counted), 1-based.
 * @param {HeapModel} heap
 * @param {number[]} events
 * @returns {(number | null)[]} the payload pointer of each allocation, in order (null: it did not fit)
 */
export function replayHeapEvents(heap, events) {
  /** @type {(number | null)[]} */
  const ptrs = [];
  for (const ev of events) {
    if (ev > 0) ptrs.push(heap.alloc(ev));
    else heap.free(ptrs[-ev - 1] ?? null);
  }
  return ptrs;
}
