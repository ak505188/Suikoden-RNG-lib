import Combatant from './Combatant.js';
import { cDiv, clamp } from '../../lib.js';
import { COMBATANT_SIDE, RANGE, STATUS, TARGET } from '../Constants.js';
import { ACTION_TYPES, ACTION_VALIDITY, ATTACK_RESULT } from './Actions.js';
import { RUNES } from '../Magic/Runes.js';
import { ENEMIES } from '../Bestiary/Enemies.js';
import { ENEMY_ATTACK_TIMINGS } from './EnemyAttackTimings.js';

/** @typedef {import('../Bestiary/Enemies.js').EnemyEntry} EnemyEntry */
/** @typedef {import('./EnemyAttackTimings.js').EnemyAttackTiming} EnemyAttackTiming */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/** @typedef {import('./Actions.js').ActionParams} ActionParams */
/** @typedef {import('./Combatant.js').ResolveActionParams} ResolveActionParams */

// Mirrors the Character class's stat/combat surface (ATK, ARM, SPD, MGC,
// currentHP, isAlive, takeDamage) so Battle/TurnOrder can drive party members
// and enemies interchangeably, built directly from a Bestiary (Enemies.js)
// entry instead of the Character/Weapon/Armor data model (enemies have no
// weapon or armor slots).
export default class Enemy extends Combatant {
  /** @param {EnemyKey} key */
  constructor(key) {
    /** @type {EnemyEntry} */
    const entry = ENEMIES[key];
    super(entry.name, entry.LVL, entry.stats);
    this.key = key;
    this.type = COMBATANT_SIDE.ENEMY;
    this.nickname = entry.nickname;
    this.bits = entry.bits;
    this.drops = entry.drops;
    this.elements = entry.elements ?? {};

    const speciesFlags = entry.speciesFlags;
    this.speciesFlags = {
      canBeCountered: (speciesFlags & 0x1) !== 0,
      canCounter: (speciesFlags & 0x2) !== 0,
      canBeMissed: (speciesFlags & 0x4) !== 0,
      alwaysHitIfNotCounter: (speciesFlags & 0x8) !== 0, // Combines with canBeCountered, only applies to Enemy Attack
      flying: (speciesFlags & 0x20) !== 0,
      instantDeathImmune: (speciesFlags & 0x4000) !== 0,
      forceMissOnHit: (speciesFlags & 0x8000) !== 0,
    };
  }

  /** @returns {EnemyAttackTiming} */
  get attackTiming() {
    return ENEMY_ATTACK_TIMINGS[this.key];
  }

  /** @param {RNG} rng Roll RNG to see if awake */
  tryToWakeUp(rng) {
    if (!this.status[STATUS.SLEEP]) return;

    this.status[STATUS.SLEEP] = rng.next().rand * 100 / 0x7fff >= 50;
    this.setActed(this.status[STATUS.SLEEP]);
  }

  /**
   * Damage roll -> the frame the target's busy bit 8 clears. null when this enemy's attack
   * doesn't mark its target busy (commanders, handler attackers), so no reaction applies.
   * @param {Character} target
   * @returns {number | null}
   */
  reactionFrames(target) {
    const timing = this.attackTiming;
    if (!timing.targetBusy) return null;
    return timing.reactionExceptions?.[target.key] ?? timing.reaction;
  }

  /** @param {RNG} rng @param {number} numCandidates */
  selectTarget(rng, numCandidates = 3) {
    let target = null;
    do {
      for (let slot = 0; slot < numCandidates; slot++) {
        if (rng.next().rand % 100 > 50) {
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
    return rng.next().rand % 100 < hitChance;
  }

  /** @param {Character} target @param {RNG} rng @returns boolean */
  willGetCountered(target, rng) {
    if (!this.speciesFlags.canBeCountered) return false;
    if (target.range === RANGE.LONG) return false;
    if (this.slot === 1) return false;
    if (target.defending || target.rune.id === RUNES.COUNTER.id) return true;

    return (rng.next().rand & 1) === 1;
  }

  /**
   * @param {Character} target
   * @param {RNG} rng
   * @returns ATTACK_RESULTS */
  calcAttackResult(target, rng) {
    // target.busy = true;

    if (!this.willHitTarget(target, rng)) {
      if (this.willGetCountered(target, rng)) return ATTACK_RESULT.COUNTERED;
      if (!this.speciesFlags.alwaysHitIfNotCounter) return ATTACK_RESULT.MISSED;
    }

    return ATTACK_RESULT.HIT;
  }

  /**
   * @param {Character} target
   * @param {RNG} rng
   * @param {boolean} isCrit
   */
  calcAttackDamage(target, rng, isCrit = false) {
    const base = this.ATK - target.DEF;
    const rand = rng.next().rand;
    const withRand = base < 10 ?
      (base + 1) - (rand % 4) :
      base + cDiv(cDiv(base, 2) - rand % base, 5);

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
    const rand = rng.next().rand;
    const withRand = base < 10 ?
      (base + 1) - (rand % 4) :
      base + cDiv(cDiv(base, 2) - rand % base, 5);

    if (
      buggedSlot && target.rune.element === undefined ||
      target.rune.id === RUNES.SOUL_EATER.id ||
      target.rune.element === spell.element)
      return Math.max(Math.floor(withRand / 2), 1);

    return Math.max(withRand, 1);
  }

  /** @param {ResolveActionParams} _actionParams @returns {ActionParams} */
  resolveAction(_actionParams) {
    return { action: ACTION_TYPES.UNDETERMINED, wait: true };
  }
}
