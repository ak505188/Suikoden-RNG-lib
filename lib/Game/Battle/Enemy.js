import Combatant from './Combatant.js';
import { cDiv, clamp } from '../../lib.js';
import { TARGET } from '../Constants.js';
import { ACTION_TYPES, ACTION_VALIDITY, ATTACK_RESULT } from './Actions.js';
import { RUNES } from '../Magic/Runes.js';

/** @typedef {import('../Bestiary/Enemies.js').EnemyEntry} EnemyEntry */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */

// Mirrors the Character class's stat/combat surface (ATK, ARM, SPD, MGC,
// currentHP, isAlive, takeDamage) so Battle/TurnOrder can drive party members
// and enemies interchangeably, built directly from a Bestiary (Enemies.js /
// Bosses.js) entry instead of the Character/Weapon/Armor data model (enemies
// have no weapon or armor slots).
export default class Enemy extends Combatant {
  /**
   * @param {EnemyEntry} entry
   */
  constructor(entry) {
    super(entry.name, entry.LVL, entry.stats);
    this.nickname = entry.nickname;
    this.bits = entry.bits;
    this.drops = entry.drops;
    this.elements = entry.elements ?? {};

    const speciesFlags = entry.speciesFlags;
    this.speciesFlags = {
      canBeCountered: (speciesFlags & 0x1) !== 0,
      canCounter: (speciesFlags & 0x2) !== 0,
      canDodge: (speciesFlags & 0x4) !== 0,
      alwaysHitIfNotCounter: (speciesFlags & 0x8) !== 0, // Combines with canBeCountered, only applies to Enemy Attack
      flying: (speciesFlags & 0x20) !== 0,
      instantDeathImmune: (speciesFlags & 0x4000) !== 0,
      forceMissOnHit: (speciesFlags & 0x8000) !== 0,
    };
  }

  /**
   * @param {RNG} rng
   * @param {number} numCandidates
   */
  selectTarget(party, rng, numCandidates = 3) {
    let target = null;
    do {
      for (let slot = 0; slot < numCandidates; slot++) {
        const rng2 = rng.next().getRNG2();
        if (rng2 % 100 > 50) {
          target = slot;
          break;
        }
      }
    } while (target === null);
    return target;
  }

  /** @param {Character} target @param {RNG} rng @returns {boolean} */
  willHitTarget(target, rng) {
    let hitChance = clamp(this.SKL - (target.SKL - 80), 60, 99);
    if (target.rune.id === RUNES.HAZY.id) {
      hitChance = Math.floor(hitChance / 2);
    }
    return rng.next().getRNG2() % 100 < hitChance;
  }

  /**
   * I don't think enemies ever use this
   * @param {RNG} rng
   * @returns {boolean}
   */
  willCrit(rng) {
    let critChance = clamp(((this.SKL + this.LUK) / 8), 3, 25);
    return rng.next().getRNG2() % 100 < critChance;
  }

  /** @param {Character} target @returns boolean */
  willGetCountered(target) {
    if (! this.speciesFlags.canBeCountered) return false;
    return target.counterEligible;
  }

  /** @param {Character} target @param {RNG} rng @returns ATTACK_RESULTS */
  calcAttackResult(target, rng) {
    target.busy = true;

    const willHit = this.willHitTarget(target, rng);
    if (willHit) return ATTACK_RESULT.HIT;

    const willGetCountered = this.willGetCountered(target);
    if (willGetCountered) return ATTACK_RESULT.COUNTERED;

    if (this.speciesFlags.alwaysHitIfNotCounter) return ATTACK_RESULT.HIT;

    return ATTACK_RESULT.MISSED;
  }

  /**
   * @param {Character} target
   * @param {RNG} rng
   * @param {boolean} isCrit
   */
  calcAttackDamage(target, rng, isCrit = false) {
    const base = this.ATK - target.DEF;
    const withRand = base < 10 ?
      (base + 1) - (rng.next().getRNG2() % 4) :
      base + Math.trunc((base/2 - rng.next().getRNG2() % base) / 5);

    const withDefend = cDiv(withRand, target.defending ? 2 : 1);
    const withCrit = withDefend * (isCrit ? 3 : 1);
    return Math.max(withCrit, 1);
  }

  /**
   * buggedSlot is for the bug seen vs Zombie Dragon, where slot 6
   * always resists his fire breath. Might exist in other fights.
   * @param {Spell} spell
   * @param {Character} target
   * @param {RNG} rng
   * @param {boolean} buggedSlot
   * @returns {number}
   */
  calcMagicDamage(spell, target, rng, buggedSlot = false) {
    const base = this.MGC - target.MGC;
    const withRand = base < 10 ?
      (base + 1) - (rng.next().getRNG2() % 4) :
      base + Math.trunc((base/2 - rng.next().getRNG2() % base) / 5);

    if (
      buggedSlot && target.rune.element === undefined ||
      target.rune.id === RUNES.SOUL_EATER.id ||
      target.rune.element === spell.element)
      return Math.max(Math.floor(withRand / 2), 1);

    return Math.max(withRand, 1);
  }

  resolveAction({ party, rng }) {
    // This unfinished, need to check character state to see if target is valid
    // And to determine if wait is needed.
    const targetIndex = this.selectTarget(party, rng, 3);
    return { action: ACTION_TYPES.ATTACK, target: party[targetIndex] };
  }
}
