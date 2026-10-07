import { flamingArrowRand, dancingFlamesRand, explosionRand, finalFlameRand } from './SpellRNG/Fire.js';
import { earthquakeRand, clayGuardianRand } from './SpellRNG/Earth.js';
import { shiningWindRand, stormFangRand, windOfSleepRand } from './SpellRNG/Wind.js';
import { angryBlowRand, rainstormRand, thunderGodRand } from './SpellRNG/Lightning.js';
import { dropsOfKindnessRand, waterOfKindnessOrMotherOceanRand, rainOfKindnessRand } from './SpellRNG/Water.js';
import { charmArrowRand } from './SpellRNG/Resurrection.js';
import { hellRand, judgementRand } from './SpellRNG/SoulEater.js';
import { SPELLS } from './Spells.js';
import { SIDE, STATUS, TARGET } from '../Constants.js';
import { memoizeBurn } from './SpellRNG/shared.js';
import { cDiv } from '../../lib.js';

/** Opcode 40's chance_arg for Wind of Sleep's Sleep */
const WIND_OF_SLEEP_CHANCE = 30;

/** The spells' RNG burns, memoized by start state (see memoizeBurn) */
export const SPELL_BURNS = {
  flamingArrows: memoizeBurn(flamingArrowRand),
  explosion: memoizeBurn(explosionRand),
  finalFlame: memoizeBurn(finalFlameRand),
  earthquake: memoizeBurn(earthquakeRand),
  clayGuardian: memoizeBurn(clayGuardianRand),
  shiningWind: memoizeBurn(shiningWindRand),
  windOfSleep: memoizeBurn(windOfSleepRand),
  charmArrow: memoizeBurn(charmArrowRand),
  hell: memoizeBurn(hellRand),
  judgement: memoizeBurn(judgementRand),
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
 * @property {RNG} [rng] - Only needed by a spell that rolls a status on its targets, called after spellRand
 */

/**
 * @typedef {Object} ApplySpellParams
 * @property {Character} actor
 * @property {Spell} spell
 * @property {Character | Enemy} [target] - the chosen target, for a single-target spell: an ally for a
 *   SIDE.ALLY spell, an enemy otherwise
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} [rng] - Only needed by a spell that rolls a status on its targets, called after spellRand
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
 * @property {import('../Constants.js').Status | null} [inflicted] - For a status spell: the status that
 *   landed on this enemy, null when its roll failed
 */

/**
 * @param {SpellRandParams} spellRandParams
 * @returns number
 */
export function spellRand({ spell, rng, party, enemies }) {
  switch(spell) {
    case SPELLS.FLAMING_ARROWS: return SPELL_BURNS.flamingArrows(rng).calls;
    case SPELLS.DANCING_FLAMES: return dancingFlamesRand(rng).calls;
    case SPELLS.EXPLOSION: return SPELL_BURNS.explosion(rng).calls;
    case SPELLS.FINAL_FLAME: return SPELL_BURNS.finalFlame(rng).calls;
    case SPELLS.CLAY_GUARDIAN: return SPELL_BURNS.clayGuardian(rng).calls;
    case SPELLS.EARTHQUAKE: return SPELL_BURNS.earthquake(rng).calls;
    case SPELLS.SHINING_WIND: return SPELL_BURNS.shiningWind(rng).calls;
    case SPELLS.WIND_OF_SLEEP: return SPELL_BURNS.windOfSleep(rng).calls;
    case SPELLS.DROPS_OF_KINDNESS: return dropsOfKindnessRand(rng).calls;
    case SPELLS.WATER_OF_KINDNESS: // Same as Mother Ocean
    case SPELLS.MOTHER_OCEAN: return waterOfKindnessOrMotherOceanRand(rng, party.combatants.length).calls;
    case SPELLS.RAIN_OF_KINDNESS: return rainOfKindnessBurn(party.combatants.length)(rng).calls;
    case SPELLS.ANGRY_BLOW: return angryBlowRand(rng).calls;
    case SPELLS.RAINSTORM: {
      const livingEnemies = enemies.combatants.filter(e => e.isAlive).length;
      return rainstormRand(rng, livingEnemies).calls;
    }
    case SPELLS.THUNDER_GOD: return thunderGodRand(rng).calls;
    case SPELLS.CHARM_ARROW: return SPELL_BURNS.charmArrow(rng).calls;
    case SPELLS.HELL: return SPELL_BURNS.hell(rng).calls;
    case SPELLS.JUDGEMENT: return SPELL_BURNS.judgement(rng).calls;
    case SPELLS.STORM_FANG: return stormFangRand(rng).calls;
    case SPELLS.FIRESTORM:
    case SPELLS.FOG_OF_DECEPTION:
    case SPELLS.HEALING_WIND:
    case SPELLS.THE_SHREDDING:
    case SPELLS.STORM:
    case SPELLS.RAGING_BLOW:
    case SPELLS.BALL_OF_LIGHTNING:
    case SPELLS.VOICE_OF_EARTH:
    case SPELLS.COPPER_FLESH:
    case SPELLS.SCOLDING:
      return 0;
    default:
      console.error(`${spell.name} RNG behavior not found, returning 0`);
      return 0;
  }
}

/** @param {SpellEffectParams} params @returns {SpellEffectResult[]} */
export function spellEffect(params) {
  const { actor, spell, target, enemies } = params;
  if (spell === SPELLS.WIND_OF_SLEEP) return windOfSleepEffect(params);
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

/**
 * Wind of Sleep's hit script (animation opcode 40, status 5 = Sleep, chance_arg 30) runs on each living
 * enemy that isn't immune to status (speciesFlags 0x4000), in enemy index order, rolling once each, after
 * the spell's particle calls. roll = (rand * 100 / 0x7fff) % 100; the check is inverted for an enemy
 * owner, so Sleep lands at roll >= 30 (70%).
 * @param {SpellEffectParams} params
 * @returns {SpellEffectResult[]}
 */
function windOfSleepEffect({ actor, spell, enemies, rng }) {
  if (!rng) throw new Error(`${spell.name}: rolls a status, so spellEffect needs the rng`);
  return enemies.getLivingCombatants()
    .filter(enemy => !enemy.speciesFlags.statusImmune)
    .map(enemy => {
      const roll = cDiv(rng.next().rand * 100, 0x7fff) % 100;
      return { actor, spell, enemy, damage: 0, inflicted: roll >= WIND_OF_SLEEP_CHANCE ? STATUS.SLEEP : null };
    });
}

/**
 * Applies a spell's effect to whoever it touches, either side. Spells with their own effect get a case;
 * the rest are damage spells, applied from spellEffect's hits. Call after spellRand.
 *   - Copper Flesh: apply_status_effect(target, 8) with no roll, immunity check or damage. The game lands
 *     it 224 ticks into the cast; here it lands when the cast resolves, which nothing can act between.
 * The party-side half of the rest (heals, Clay Guardian's buff, ...) isn't implemented.
 * @param {ApplySpellParams} params
 * @returns {boolean} false when the spell's effect isn't implemented
 */
export function applySpell({ actor, spell, target, party, enemies, rng }) {
  switch (spell) {
    case SPELLS.COPPER_FLESH:
      if (!target) throw new Error(`${spell.name}: needs a target`);
      /** @type {Character} */ (target).lockHP();
      return true;
    default: {
      if (spell.side === SIDE.ALLY) return false;
      const hits = spellEffect({ actor, spell, target: /** @type {Enemy} */ (target), party, enemies, rng });
      if (!hits) return false;
      hits.forEach(({ enemy, damage, inflicted }) => {
        enemy.takeDamage(damage);
        // On/off statuses only (Sleep); a counted one (Balloon) would need its own amount
        if (inflicted) /** @type {Record<string, unknown>} */ (enemy.status)[inflicted] = true;
      });
      return true;
    }
  }
}
