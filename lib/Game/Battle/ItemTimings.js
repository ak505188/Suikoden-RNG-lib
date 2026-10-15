/**
 * Battle item timing, in frames (= battle ticks) from R, the tick the item resolves (it's used
 * up and the user's item-use script starts). Live-confirmed on Medicine only
 * (Suikoden-Bizhawk-HUD scripts/TraceItemDoneTick.lua); every item shares it (user). No rand()
 * anywhere on the item path.
 * The whole-party item (Dragon Seal Incense, decompile) only waits while a party member is busy,
 * which the idle check already covers, so it times like a single target.
 */

/**
 * ITEM_TIMING below is the DEFAULT / fallback: McDohl's values. Per-user numbers live in
 * CharacterAttackTimings.js (itemDone, itemUserFreeAlly) for all 78 characters; the constants
 * that don't vary by user follow it.
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

/** Item-use constants that don't vary by user (frames, relative to itemDone). The next roll is
 * at itemDone + 1. */
export const ITEM_DONE_OFFSETS = /** @type {const} */ ({
  /** The HP change lands this many frames after itemDone. */
  healAfterDone: 32,
  /** The target's busy clears at itemDone + 64; a user who targeted itself or the whole party
   * clears the same way. */
  targetFreeAfterDone: 64,
});

/*
 * Notes, not modelled (from the Ghidra walk):
 * - Medicine and Mega Medicine share timing and don't depend on the target.
 * - Antitoxin and Needle play their scripts only if the target is poisoned / afflicted
 *   (Antitoxin: the target frees at itemDone + 33, and there is no HP-change line).
 * - Dragon Seal Incense waits for everyone idle, then runs a 64-frame script on all living
 *   members.
 */
