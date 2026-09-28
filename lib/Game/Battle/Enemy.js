import Combatant from './Combatant.js';
import { cDiv, clamp } from '../../lib.js';
import { COMBATANT_SIDE, ELEMENT_CATEGORIES, RANGE, STATUS } from '../Constants.js';
import { ATTACK_RESULT } from './Actions.js';
import { RUNES } from '../Magic/Runes.js';
import { ENEMIES } from '../Bestiary/Enemies.js';
import { ENEMY_ATTACK_TIMINGS } from './EnemyAttackTimings.js';
import { ENEMY_AI, defaultAI } from './EnemyAI.js';

/** @typedef {import('../Bestiary/Enemies.js').EnemyEntry} EnemyEntry */
/** @typedef {import('./EnemyAttackTimings.js').EnemyAttackTiming} EnemyAttackTiming */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('../Constants.js').Element} Element */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/** @typedef {import('./Combatant.js').CombatantTurnParams} CombatantTurnParams */

/** @typedef {import('./Actions.js').EnemyAction} EnemyAction */

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
    this.size = entry.size; // Formation footprint: extra slots to the right (round-end backfill)

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

  /**
   * Adds its combatant number (1-based, the order the target menu lists enemies in), since
   * several enemies can share a name.
   */
  get label() {
    return `${this.name} #${this.slot}`;
  }

  /** @returns {EnemyAttackTiming} */
  get attackTiming() {
    return ENEMY_ATTACK_TIMINGS[this.key];
  }

  /**
   * FUN_800e2dac: also plays its death script (table slot 7), which keeps it busy for
   * attackTiming.death more frames.
   * @param {number} tick
   */
  die(tick) {
    super.die(tick);
    const { death } = this.attackTiming;
    if (death === null) throw new Error(`${this.name}: death timing unknown`);
    this.busyUntil = tick + death;
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

  /**
   * The monster's AI, called every tick of its turn until it commits:
   * Its ENEMY_AI entry, else the plain attacker.
   * @param {CombatantTurnParams} params
   * @returns {EnemyAction}
   */
  selectAction(params) {
    return (ENEMY_AI[this.key] ?? defaultAI)(this, params);
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
    const base = this.ATK - target.ARM; // +0x32: DEF with armor (live: Varkas -> Pahn, 6 hits)
    const rand = rng.next().rand;
    const withRand = base < 10 ?
      (base + 1) - (rand % 4) :
      base + cDiv(cDiv(base, 2) - rand % base, 5);

    const withDefend = cDiv(withRand, target.defending ? 2 : 1);
    const withCrit = withDefend * (isCrit ? 3 : 1);
    return Math.max(withCrit, 1);
  }

  /**
   * A multi-target move's loop counter sits in $s1, which a rune with no category reads (a
   * register-reuse bug): pass the member's slot as loopSlot and it matches a move whose category
   * equals that slot (Zombie Dragon's Fire Breath, Resurrection = 6, on slot 6; Dragon's, Fire =
   * 1, on slot 1).
   * @param {Element} element - the move's element
   * @param {Character} target
   * @param {RNG} rng
   * @param {number} [loopSlot]
   * @returns {number}
   */
  calcMagicDamage(element, target, rng, loopSlot) {
    const base = this.MGC - target.MGC;
    const rand = rng.next().rand;
    const damage = Math.max(base < 10 ?
      (base + 1) - (rand % 4) :
      base + cDiv(cDiv(base, 2) - rand % base, 5), 1);

    if (target.rune.id === RUNES.SOUL_EATER.id) return cDiv(damage, 2);
    const moveCategory = ELEMENT_CATEGORIES[element];
    if (moveCategory === undefined) return damage;
    const targetCategory = ELEMENT_CATEGORIES[target.rune.element] ?? loopSlot;
    return targetCategory === moveCategory ? cDiv(damage, 2) : damage;
  }
}
