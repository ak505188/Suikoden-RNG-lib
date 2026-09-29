/**
 * Battle item timing, in frames (= battle ticks) from R, the tick the item resolves (it's used
 * up and the user's item-use script starts). Live-confirmed on Medicine only
 * (Suikoden-Bizhawk-HUD scripts/TraceItemDoneTick.lua); every item shares it (user). No rand()
 * anywhere on the item path.
 * UNVERIFIED: the whole-party item (Dragon seal incense) is assumed to match a single target.
 */
export const ITEM_TIMING = /** @type {const} */ ({
  /** R -> the handler finishes: the target's script starts (target busy) and the turn ends, so
   * the next roll is at done + 1 (gate unchanged). */
  done: 19,
  /** R -> the target's busy clears */
  targetFree: 83,
  /** R -> the user's busy clears when it targeted itself (or the whole party, UNVERIFIED) */
  userFreeSelf: 83,
  /** R -> the user's busy clears when it targeted another ally */
  userFreeAlly: 88,
});
