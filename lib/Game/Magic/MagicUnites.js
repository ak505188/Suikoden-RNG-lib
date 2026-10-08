import { ELEMENTS } from '../Constants.js';
import { SPELLS } from './Spells.js';

/** @typedef {import('./Spells.js').Spell} Spell */

/**
 * The Lv4 and Lv5 spell of each Magic rune: the only spells battle_check_magic_unite pairs
 * (DAT_8016c724's 40 entries are these 10 ids, 8 ordered pairings per combo).
 */
const UNITE_SPELL_IDS = new Set([4, 29, 24, 33, 16, 31, 12, 30, 20, 32]);

/** @type {[import('../Constants.js').Element, import('../Constants.js').Element, Spell][]} */
const COMBOS = [
  [ELEMENTS.FIRE, ELEMENTS.EARTH, SPELLS.SCORCHED_EARTH],
  [ELEMENTS.EARTH, ELEMENTS.WIND, SPELLS.STORM_FANG],
  [ELEMENTS.LIGHTNING, ELEMENTS.FIRE, SPELLS.BLAZING_CAMP],
  [ELEMENTS.WATER, ELEMENTS.LIGHTNING, SPELLS.THOR],
  [ELEMENTS.WIND, ELEMENTS.WATER, SPELLS.WATER_DRAGON],
];

/**
 * The Magic Unite two Lv4 casters' spells make, in either order.
 * @param {Spell} a @param {Spell} b
 * @returns {Spell | null} null: no pairing (the same element, or not a Lv4 / Lv5 spell)
 */
export function magicUnite(a, b) {
  if (!UNITE_SPELL_IDS.has(a.id) || !UNITE_SPELL_IDS.has(b.id)) return null;
  const combo = COMBOS.find(([x, y]) => (a.element === x && b.element === y) || (a.element === y && b.element === x));
  return combo ? combo[2] : null;
}
