import { flamingArrowRand, dancingFlamesRand, explosionRand } from './SpellRNG/Fire.js';
import { earthquakeRand } from './SpellRNG/Earth.js';
import { shiningWindRand, stormFangRand } from './SpellRNG/Wind.js';
import { dropsOfKindnessRand, waterOfKindnessRand, rainOfKindnessRand } from './SpellRNG/Water.js';
import { charmArrowRand } from './SpellRNG/Resurrection.js';
import { hellRand } from './SpellRNG/SoulEater.js';
import { SPELLS } from './Spells.js';
import { TARGET } from '../Constants.js';
import { memoizeBurn } from './SpellRNG/shared.js';

/** The spells' RNG burns, memoized by start state (see memoizeBurn) */
export const SPELL_BURNS = {
  flamingArrows: memoizeBurn(flamingArrowRand),
  explosion: memoizeBurn(explosionRand),
  earthquake: memoizeBurn(earthquakeRand),
  shiningWind: memoizeBurn(shiningWindRand),
  charmArrow: memoizeBurn(charmArrowRand),
  hell: memoizeBurn(hellRand),
};

/** Rain of Kindness's burn depends on the party size too, so each size gets its own memoized burn */
/** @type {Map<number, ReturnType<typeof memoizeBurn>>} */
const rainOfKindnessBurns = new Map();

/** @param {number} partySize */
function rainOfKindnessBurn(partySize) {
  let burn = rainOfKindnessBurns.get(partySize);
  if (!burn) {
    burn = memoizeBurn(rng => rainOfKindnessRand(rng, partySize));
    rainOfKindnessBurns.set(partySize, burn);
  }
  return burn;
}

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
 * @typedef {Object} SpellRandParams
 * @property {Spell} spell
 * @property {RNG} rng
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
 * @param {SpellRandParams} spellRandParams
 * @returns number
 */
export function spellRand({ spell, rng, party }) {
  switch(spell) {
    case SPELLS.FLAMING_ARROWS: return SPELL_BURNS.flamingArrows(rng).calls;
    case SPELLS.DANCING_FLAMES: return dancingFlamesRand(rng).calls;
    case SPELLS.EXPLOSION: return SPELL_BURNS.explosion(rng).calls;
    case SPELLS.EARTHQUAKE: return SPELL_BURNS.earthquake(rng).calls;
    case SPELLS.SHINING_WIND: return SPELL_BURNS.shiningWind(rng).calls;
    case SPELLS.DROPS_OF_KINDNESS: return dropsOfKindnessRand(rng).calls;
    case SPELLS.WATER_OF_KINDNESS: return waterOfKindnessRand(rng, party.combatants.length).calls;
    case SPELLS.RAIN_OF_KINDNESS: return rainOfKindnessBurn(party.combatants.length)(rng).calls;
    case SPELLS.CHARM_ARROW: return SPELL_BURNS.charmArrow(rng).calls;
    case SPELLS.HELL: return SPELL_BURNS.hell(rng).calls;
    case SPELLS.STORM_FANG: return stormFangRand(rng).calls;
    case SPELLS.FIRESTORM:
    case SPELLS.FOG_OF_DECEPTION:
    case SPELLS.VOICE_OF_EARTH:
    case SPELLS.THE_SHREDDING:
      return 0;
    default:
      console.error(`${spell.name} RNG behavior not found, returning 0`);
      return 0;
  }
}

/** @param {SpellEffectParams} params @returns {SpellEffectResult[]} */
export function spellEffect({ actor, spell, target, enemies }) {
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
