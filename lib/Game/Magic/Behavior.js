import {
  flamingArrowRand,
  dancingFlamesRand,
  explosionRand,
  finalFlameRand,
} from './SpellRNG/Fire.js';
import { earthquakeRand, clayGuardianRand, guardianEarthRand } from './SpellRNG/Earth.js';
import { shiningWindRand, windOfSleepRand } from './SpellRNG/Wind.js';
import { angryBlowRand, rainstormRand, thunderGodRand } from './SpellRNG/Lightning.js';
import {
  dropsOfKindnessRand,
  waterOfKindnessOrMotherOceanRand,
  rainOfKindnessRand,
} from './SpellRNG/Water.js';
import { yellRand, screamRand, charmArrowRand } from './SpellRNG/Resurrection.js';
import { hellRand, judgementRand, deadlyFingertipsRand } from './SpellRNG/SoulEater.js';
import {
  blazingCampRand,
  scorchedEarthRand,
  stormFangRand,
  thorRand,
  waterDragonRand,
} from './SpellRNG/Unites.js';
import { SPELLS } from './Spells.js';
import { SIDE, STATUS, TARGET } from '../Constants.js';
import { memoizeBurn } from './SpellRNG/shared.js';
import { cDiv } from '../../util/math.js';

/** Opcode 40's chance_arg for Wind of Sleep's Sleep */
const WIND_OF_SLEEP_CHANCE = 30;

/** The spells' RNG burns, memoized by start state (see memoizeBurn) */
export const SPELL_BURNS = {
  flamingArrows: memoizeBurn(flamingArrowRand),
  explosion: memoizeBurn(explosionRand),
  finalFlame: memoizeBurn(finalFlameRand),
  earthquake: memoizeBurn(earthquakeRand),
  clayGuardian: memoizeBurn(clayGuardianRand),
  guardianEarth: memoizeBurn(guardianEarthRand),
  shiningWind: memoizeBurn(shiningWindRand),
  windOfSleep: memoizeBurn(windOfSleepRand),
  charmArrow: memoizeBurn(charmArrowRand),
  hell: memoizeBurn(hellRand),
  judgement: memoizeBurn(judgementRand),
  deadlyFingertips: memoizeBurn(deadlyFingertipsRand),
  thor: memoizeBurn(thorRand),
  waterDragon: memoizeBurn(waterDragonRand),
};

/** Rain of Kindness's burn depends on the party size too, so each size gets its own memoized burn */
/** @type {Map<number, ReturnType<typeof memoizeBurn>>} */
const rainOfKindnessBurns = new Map();

/** @param {number} partySize */
function rainOfKindnessBurn(partySize) {
  let burn = rainOfKindnessBurns.get(partySize);
  if (!burn) {
    burn = memoizeBurn((rng) => rainOfKindnessRand(rng, partySize));
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
  switch (spell) {
    case SPELLS.FLAMING_ARROWS:
      return SPELL_BURNS.flamingArrows(rng).calls;
    case SPELLS.DANCING_FLAMES:
      return dancingFlamesRand(rng).calls;
    case SPELLS.EXPLOSION:
      return SPELL_BURNS.explosion(rng).calls;
    case SPELLS.FINAL_FLAME:
      return SPELL_BURNS.finalFlame(rng).calls;
    case SPELLS.CLAY_GUARDIAN:
      return SPELL_BURNS.clayGuardian(rng).calls;
    case SPELLS.EARTHQUAKE:
      return SPELL_BURNS.earthquake(rng).calls;
    case SPELLS.GUARDIAN_EARTH:
      return SPELL_BURNS.guardianEarth(rng).calls;
    case SPELLS.SHINING_WIND:
      return SPELL_BURNS.shiningWind(rng).calls;
    case SPELLS.WIND_OF_SLEEP:
      return SPELL_BURNS.windOfSleep(rng).calls;
    case SPELLS.DROPS_OF_KINDNESS:
      return dropsOfKindnessRand(rng).calls;
    case SPELLS.WATER_OF_KINDNESS: // Same as Mother Ocean
    case SPELLS.MOTHER_OCEAN:
      return waterOfKindnessOrMotherOceanRand(rng, party.combatants.length).calls;
    case SPELLS.RAIN_OF_KINDNESS:
      return rainOfKindnessBurn(party.combatants.length)(rng).calls;
    case SPELLS.ANGRY_BLOW:
      return angryBlowRand(rng).calls;
    case SPELLS.RAINSTORM: {
      const livingEnemies = enemies.combatants.filter((e) => e.isAlive).length;
      return rainstormRand(rng, livingEnemies).calls;
    }
    case SPELLS.THUNDER_GOD:
      return thunderGodRand(rng).calls;
    case SPELLS.YELL:
      return yellRand(rng).calls;
    case SPELLS.SCREAM:
      return screamRand(rng).calls;
    case SPELLS.CHARM_ARROW:
      return SPELL_BURNS.charmArrow(rng).calls;
    case SPELLS.DEADLY_FINGERTIPS:
      return SPELL_BURNS.deadlyFingertips(rng).calls;
    case SPELLS.HELL:
      return SPELL_BURNS.hell(rng).calls;
    case SPELLS.JUDGEMENT:
      return SPELL_BURNS.judgement(rng).calls;
    case SPELLS.BLAZING_CAMP:
      return blazingCampRand(rng).calls;
    case SPELLS.SCORCHED_EARTH:
      return scorchedEarthRand(rng).calls;
    case SPELLS.STORM_FANG:
      return stormFangRand(rng).calls;
    case SPELLS.THOR:
      return SPELL_BURNS.thor(rng).calls;
    case SPELLS.WATER_DRAGON:
      return SPELL_BURNS.waterDragon(rng).calls;
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
      return enemies.getLivingCombatants().map((enemy) => ({
        actor,
        spell,
        enemy,
        damage: actor.calcMagicDamage(spell, enemy),
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
  return enemies
    .getLivingCombatants()
    .filter((enemy) => !enemy.speciesFlags.statusImmune)
    .map((enemy) => {
      const roll = cDiv(rng.next().rand * 100, 0x7fff) % 100;
      return {
        actor,
        spell,
        enemy,
        damage: 0,
        inflicted: roll >= WIND_OF_SLEEP_CHANCE ? STATUS.SLEEP : null,
      };
    });
}

/** Water of Kindness, Rain of Kindness and Scream: apply_hp_damage_display(member, -300) */
const PARTY_HEAL_AMOUNT = 300;

/** Shining Wind's party heal, on top of its 500 damage to the enemies */
const SHINING_WIND_HEAL_AMOUNT = 500;

/**
 * A healing spell on a party member: queues the heal, committed with the round's other damage, and
 * cures their ailments. A member out of the fight (knocked out, or floated away by Balloon) gets neither.
 * An HP Locked member's HP can't change, so takeDamage drops the heal, but they are still cured. A full
 * heal is -(HPMax - HP), as the game computes it.
 * @param {Character} ally
 * @param {number} [amount] - full heal when omitted
 * @param {boolean} [cure] - false for a heal that leaves their ailments alone
 */
function healAlly(ally, amount = ally.stats.HP - ally.HP, cure = true) {
  if (ally.outOfFight) return;
  ally.takeDamage(-amount);
  if (cure) ally.cureAilments();
}

/**
 * Deadly Fingertips and Hell's hit: the enemy loses all its HP, whatever it has, unless it's instant-death
 * immune (species flag 0x4000). Goes through the ordinary damage queue, so the death routine runs the way it
 * does for any lethal hit. UNVERIFIED: the game's own step (decrement the alive count, clear the valid
 * byte) may skip the HP and the death script's busy time.
 * @param {Enemy} enemy
 */
function instantDeath(enemy) {
  if (enemy.speciesFlags.statusImmune || !enemy.isAlive) return;
  enemy.takeDamage(enemy.HP);
}

/**
 * Whether a single-target party-side spell can be cast on this member: one still in the fight, or for Yell
 * a downed one too (on a standing member Yell goes through and does nothing). Never one who floated away.
 * @param {Spell} spell
 * @param {Character} ally
 */
export function isValidAllyTarget(spell, ally) {
  if (spell === SPELLS.YELL)
    return ally.knockedOut ? !ally.removedFromFight : ally.isValidCombatant;
  return ally.isValidCombatant;
}

/** @param {Spell} spell @param {Character | Enemy | undefined} target @returns {Character} */
function requireAlly(spell, target) {
  if (!target) throw new Error(`${spell.name}: needs a target`);
  return /** @type {Character} */ (target);
}

/**
 * Applies a spell's effect to whoever it touches, either side. Spells with their own effect get a case;
 * the rest are damage spells, applied from spellEffect's hits. Call after spellRand.
 *   - Copper Flesh: apply_status_effect(target, 8) with no roll, immunity check or damage. The game lands
 *     it 224 ticks into the cast; here it lands when the cast resolves, which nothing can act between.
 *   - Deadly Fingertips (one enemy) and Hell (all): instant death, except for instant-death immune enemies.
 *   - Clay Guardian, Guardian Earth, Fog of Deception: nothing. They're bugged in the game (the decompile
 *     shows x1.5 on rec+0x42 and x0.8 on rec+0x36, which has no effect).
 *   - Yell: a downed ally is revived with HPMax / 3 HP; a standing one gets nothing. The heal goes through healAlly after the revive, so the
 *     usual cure applies. UNVERIFIED: that Yell cures ailments too.
 *   - Shining Wind: +500 HP and the cure for every member still in the fight (no revive), and its 500 damage
 *     to every enemy.
 *   - Mother Ocean: every member to full HP, reviving the downed ones. Doesn't cure.
 *   - Drops of Kindness, Healing Wind: one ally to full HP, and cures their ailments.
 *   - Water of Kindness, Rain of Kindness, Scream: +300 HP, and the cure, for every member still in the fight. Rain's
 *     description says "fully heals" but the game's case 5 heals 300, like Water of Kindness.
 * The rest (the Unites' party half, ...) isn't
 * implemented.
 * @param {ApplySpellParams} params
 * @returns {boolean} false when the spell's effect isn't implemented
 */
export function applySpell({ actor, spell, target, party, enemies, rng }) {
  switch (spell) {
    case SPELLS.COPPER_FLESH:
      requireAlly(spell, target).lockHP();
      return true;
    case SPELLS.DEADLY_FINGERTIPS:
      if (!target) throw new Error(`${spell.name}: needs a target`);
      instantDeath(/** @type {Enemy} */ (target));
      return true;
    case SPELLS.HELL:
      enemies.combatants.forEach(instantDeath);
      return true;
    case SPELLS.MOTHER_OCEAN:
      // Whoever is down comes back first (the heal step zeroes the same invalid flag Yell clears), then
      // everyone is healed to full. Members who floated away are skipped by healAlly. No cure: UNVERIFIED.
      party.combatants
        .filter((member) => member.knockedOut && !member.removedFromFight)
        .forEach((member) => member.revive());
      party.combatants.forEach((member) => healAlly(member, undefined, false));
      return true;
    case SPELLS.YELL: {
      const ally = requireAlly(spell, target);
      if (!ally.knockedOut) return true; // cast on a standing member: nothing happens
      ally.revive();
      healAlly(ally, Math.floor(ally.stats.HP / 3));
      return true;
    }
    case SPELLS.CLAY_GUARDIAN:
    case SPELLS.GUARDIAN_EARTH:
    case SPELLS.FOG_OF_DECEPTION:
      return true; // bugged in the game: the cast plays out but does nothing
    case SPELLS.DROPS_OF_KINDNESS:
    case SPELLS.HEALING_WIND:
      healAlly(requireAlly(spell, target));
      return true;
    case SPELLS.WATER_OF_KINDNESS:
    case SPELLS.RAIN_OF_KINDNESS:
    case SPELLS.SCREAM:
      party.combatants.forEach((member) => healAlly(member, PARTY_HEAL_AMOUNT));
      return true;
    case SPELLS.SHINING_WIND:
      party.combatants.forEach((member) => healAlly(member, SHINING_WIND_HEAL_AMOUNT));
      return damageEnemies({ actor, spell, target, party, enemies, rng });
    default:
      if (spell.side === SIDE.ALLY) return false;
      return damageEnemies({ actor, spell, target, party, enemies, rng });
  }
}

/**
 * The enemy half of a spell: spellEffect's hits, applied.
 * @param {ApplySpellParams} params
 * @returns {boolean} false when the spell's targeting isn't implemented
 */
function damageEnemies({ actor, spell, target, party, enemies, rng }) {
  const hits = spellEffect({
    actor,
    spell,
    target: /** @type {Enemy} */ (target),
    party,
    enemies,
    rng,
  });
  if (!hits) return false;
  hits.forEach(({ enemy, damage, inflicted }) => {
    enemy.takeDamage(damage);
    // On/off statuses only (Sleep); a counted one (Balloon) would need its own amount
    if (inflicted) /** @type {Record<string, unknown>} */ (enemy.status)[inflicted] = true;
  });
  return true;
}
