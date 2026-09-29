import { STATUS, TARGET } from './Constants.js';
import { ITEM_KEYS } from './Keys.js';

/** @typedef {import('./Keys.js').ItemKey} ItemKey */
/** @typedef {import('./Constants.js').Status} Status */

/**
 * What a battle item does to each of its targets. Items never target enemies: TARGET.ANY is one
 * living ally (item def flags & 3 = 2 or 3), TARGET.AOE the whole party (flags & 3 = 0).
 * @typedef {Object} ItemEffect
 * @property {typeof TARGET.ANY | typeof TARGET.AOE} target
 * @property {number} [heal] - HP restored, capped at HPMax
 * @property {Status} [cure] - status reset to its default
 */

/** @satisfies {Partial<Record<ItemKey, ItemEffect>>} */
export const ITEM_EFFECTS = {
  [ITEM_KEYS.MEDICINE]: { target: TARGET.ANY, heal: 100 },
  [ITEM_KEYS.MEGA_MEDICINE]: { target: TARGET.ANY, heal: 500 },
  [ITEM_KEYS.ANTITOXIN]: { target: TARGET.ANY, cure: STATUS.POISON },
  [ITEM_KEYS.NEEDLE]: { target: TARGET.ANY, cure: STATUS.BALLOON },
  [ITEM_KEYS.DRAGON_SEAL_INCENSE]: { target: TARGET.AOE, heal: 50 },
};
