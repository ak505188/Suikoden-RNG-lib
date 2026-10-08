import { ELEMENTAL_RESISTANCES } from '../Constants.js';

/**
 * If the enemy is Invulnerable to one of the elements, it takes 0 DMG.
 * If the enemy is Strong against one of the elements, it takes 0.5x DMG.
 * If the enemy is Weak against one of the elements, it takes 2x DMG.
 * Otherwise, enemy takes normal damage.
 * @typedef {import('../Constants.js').Element} Element
 * @typedef {import('../Constants.js').ElementalResistance} ElementalResistance
 * @param {Element[]} elements
 * @param {Partial<Record<Element, ElementalResistance>>} resistances
 * @returns {number}
 */
export function calcMagicElementModifier(elements, resistances) {
  // calc_dual_element_spell_damage: the worst compatibility wins (immune, then resist, then weak, then
  // neutral), so a combo is halved against a resisted element even if its other one is weak
  const rank = (/** @type {Element} */ el) => {
    switch (resistances[el]) {
      case ELEMENTAL_RESISTANCES.INVULNERABLE:
        return 3;
      case ELEMENTAL_RESISTANCES.RESISTANT:
        return 2;
      case ELEMENTAL_RESISTANCES.WEAK:
        return 1;
      default:
        return 0;
    }
  };
  return [1, 2, 0.5, 0][Math.max(...elements.map(rank))];
}
