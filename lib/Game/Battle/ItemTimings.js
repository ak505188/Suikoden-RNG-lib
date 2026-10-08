/**
 * Battle item timing, in frames (= battle ticks) from R, the tick the item resolves (it's used
 * up and the user's item-use script starts). Live-confirmed on Medicine only
 * (Suikoden-Bizhawk-HUD scripts/TraceItemDoneTick.lua); every item shares it (user). No rand()
 * anywhere on the item path.
 * The whole-party item (Dragon Seal Incense, decompile) only waits while a party member is busy,
 * which the idle check already covers, so it times like a single target.
 */
export const ITEM_TIMING = /** @type {const} */ ({
  /** R -> the handler finishes: the target's script starts (target busy) and the turn ends, so
   * the next roll is at done + 1 (gate unchanged). */
  done: 19,
  /** R -> the target's busy clears */
  targetFree: 83,
  /** R -> the user's busy clears when it targeted itself (or the whole party) */
  userFreeSelf: 83,
  /** R -> the user's busy clears when it targeted another ally */
  userFreeAlly: 88,
});
