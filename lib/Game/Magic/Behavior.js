import { flamingArrowRand, firestormRand, dancingFlamesRand, explosionRand } from './SpellRNG/Fire.js';
import { SPELLS } from './Spells.js';
import { SIDE, TARGET } from '../Constants.js';

/** @typedef {import('./Spells.js').Spell} Spell */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../Battle/Character.js').default} Character */
/** @typedef {import('../Battle/Enemy.js').default} Enemy */
/** @typedef {import('../Battle/Party.js').PlayerParty} PlayerParty */
/** @typedef {import('../Battle/Party.js').EnemyParty} EnemyParty */

/**
 * @typedef {Object} SpellEffectParams
 * @property {Character} actor
 * @property {Spell} spell
 * @property {Enemy} [target]
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 */

/**
 * @typedef {Object} SpellEffectResult
 * @property {Character} actor
 * @property {Spell} spell
 * @property {Enemy} enemy
 * @property {number} damage
 */



/**
 * @param {Spell} spell
 * @param {RNG} rng
 * @returns {number}
 */
export function spellRand(spell, rng) {
  switch(spell) {
    case SPELLS.FLAMING_ARROWS: return flamingArrowRand(rng).calls;
    case SPELLS.FIRESTORM: return firestormRand(rng).calls;
    case SPELLS.DANCING_FLAMES: return dancingFlamesRand(rng).calls;
    case SPELLS.EXPLOSION: return explosionRand(rng).calls;
    default:
      console.error(`${spell.name} RNG behavior not found, returning 0`);
      return 0;
  }
}

/** @param {SpellEffectParams} params @returns {SpellEffectResult[]} */
export function spellEffect({ actor, spell, target, party, enemies }) {
  // TODO: Implement party side
  switch (spell.target) {
    case TARGET.FRONT_ANY:
    case TARGET.ANY: {
      const damage = actor.calcMagicDamage(spell, target);
      return [{ actor, spell, enemy: target, damage }];
    }
    case TARGET.AOE: {
      return enemies.getLivingCombatants().map(enemy => ({
        actor, spell, enemy, damage: actor.calcMagicDamage(spell, enemy)
      }));
    }
  }
}
