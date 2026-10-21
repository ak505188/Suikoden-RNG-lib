/**
 * Battle item timing, in frames (= battle ticks) from R, the tick the item resolves (it's used
 * up and the user's item-use script starts). Per-user numbers live in CharacterAttackTimings.js;
 * Antitoxin, Needle and Dragon Seal Incense play their own scripts (ITEM_EFFECT_CONSTANTS), see
 * resolvePartyItem. No rand() anywhere on the item path.
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

/**
 * Cure and incense constants (frames, relative to the named anchor), from Suikoden-Bizhawk-HUD
 * outputs/ItemEffectConstants.json. Rules the engine applies are in docs/game_mechanics/Items.md.
 * Medicine and Mega Medicine use ITEM_DONE_OFFSETS (32 and 64) unchanged.
 */
export const ITEM_EFFECT_CONSTANTS = /** @type {const} */ ({
  /** Antitoxin: a poisoned target's script runs from itemDone and it frees at itemDone + 33
   * (simulated; live-checked on Cleo -> Gremio). No HP-change line. */
  cureAntitoxinTargetFreeAfterDone: 33,
  /** Antitoxin: the poison status clears at itemDone + 31. */
  cureAntitoxinStatusClearAfterDone: 31,
  /** Needle: the target frees at itemDone + 14 (simulated; the sprite length is inferred). */
  cureNeedleTargetFreeAfterDone: 14,
  /** Needle: the Balloon stage clears at itemDone + 12. */
  cureNeedleStatusClearAfterDone: 12,
  /** Incense: fires this many frames after the user's ally-free time (itemUserFreeAlly). */
  incenseFireAfterUserFree: 1,
  /** Incense: each member's busy clears at fire + 65. */
  incenseMemberFreeAfterFire: 65,
  /** Incense: each member's HP change lands at fire + 32. */
  incenseHpChangeAfterFire: 32,
  /** Incense: HP healed per member. */
  incenseHealAmount: 50,
});
