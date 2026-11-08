import Combatant from './Combatant.js';
import { cDiv, clamp } from '../../util/math.js';
import { COMBATANT_SIDE, ELEMENT_CATEGORIES, RANGE, STATUS } from '../Constants.js';
import { ATTACK_RESULT, ROLL_KINDS } from './Actions.js';
import { ENEMY_KEYS } from '../Keys.js';
import { RUNES } from '../Magic/Runes.js';
import { ENEMIES } from '../Bestiary/Enemies.js';
import { ENEMY_ATTACK_TIMINGS } from './EnemyAttackTimings.js';
import { ENEMY_AI, defaultAI } from './EnemyAI.js';
import { NO_MULT, applyMultiplier } from './DamageMultiplier.js';
import { pushKeyInt } from '../../util/stateKey.js';

/** @typedef {import('./DamageMultiplier.js').DamageMultiplier} DamageMultiplier */
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
/** @typedef {import('./Actions.js').AttackRoll} AttackRoll */

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
    /** Which of attackTiming.variants its basic attack runs (set by the AI when it commits); null: the base */
    /** @type {string | null} */
    this.attackVariant = null;
    /** The branch a roll inside its current move's script picked (HeldTiming.script: the Wyvern's element); read by that move's apply */
    this.scriptPick = 0;
    /** Crystal Core: its first death has happened and it came back at full HP as the second form (the AI's phase flag, overlay 0x80070804) */
    this.secondForm = false;
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
      statusImmune: (speciesFlags & 0x4000) !== 0,
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
    /** @type {EnemyAttackTiming} */
    const base = ENEMY_ATTACK_TIMINGS[this.key];
    const variant = this.attackVariant && base.variants?.[this.attackVariant];
    return variant ? { ...base, ...variant } : base;
  }

  /**
   * Crystal Core's death handler (vf2.bin 0x80017ff8), run as its first death starts: it sets the phase flag, and Battle.checkDeaths
   * refills its HP a couple of ticks later. The death itself still plays (ActionTag set: it takes no turn in the round it died in,
   * and a party member waiting to attack it loses the target). The second form dies for good.
   * @param {number} _tick
   * @returns {number} the HP it comes back with, 0: it dies
   */
  reviveHP(_tick) {
    if (this.key !== ENEMY_KEYS.CRYSTAL_CORE || this.secondForm) return 0;
    this.secondForm = true;
    return this.stats.HP;
  }

  /**
   * calc_damage(target, this) with its arguments swapped (Crystal Core's Attack): the base is the party member's own ATK minus this
   * enemy's DEF, the usual variance, no Defend halving and nothing else.
   * @param {Character} target
   * @param {RNG} rng
   */
  calcSwappedAttackDamage(target, rng) {
    const base = target.ATK - this.ARM;
    const rand = rng.next().rand;
    const withRand =
      base < 10 ? base + 1 - (rand % 4) : base + cDiv(cDiv(base, 2) - (rand % base), 5);
    return Math.max(withRand, 1);
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

  /** @param {import('../../util/stateKey.js').KeyOut} out */
  stateKeyInto(out) {
    super.stateKeyInto(out);
    pushKeyInt(out, this.secondForm);
  }

  /** @param {RNG} rng Roll RNG to see if awake */
  tryToWakeUp(rng) {
    if (!this.status[STATUS.SLEEP]) return;

    this.status[STATUS.SLEEP] = (rng.next().rand * 100) / 0x7fff >= 50;
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

  /** @param {Character} target @param {RNG} rng @param {AttackRoll[] | null} [rolls] - gets the roll, if given @returns {boolean} */
  willHitTarget(target, rng, rolls = null) {
    let hitChance = clamp(this.SKL - (target.SKL - 80), 60, 99);
    if (target.rune.id === RUNES.HAZY.id) {
      hitChance = Math.floor(hitChance / 2);
    }
    const roll = rng.next().rand % 100;
    const halved = target.rune.id === RUNES.HAZY.id;
    rolls?.push({
      kind: ROLL_KINDS.HIT,
      roll,
      chance: hitChance,
      min: halved ? 30 : 60,
      max: halved ? 49 : 99,
      pass: roll < hitChance,
    });
    return roll < hitChance;
  }

  /** @param {Character} target @param {RNG} rng @param {AttackRoll[] | null} [rolls] - gets the roll, if given @returns boolean */
  willGetCountered(target, rng, rolls = null) {
    if (!this.speciesFlags.canBeCountered) return false;
    if (target.range === RANGE.LONG) return false;
    if (this.slot === 1) return false;
    if (target.defending || target.rune.id === RUNES.COUNTER.id) return true;

    const roll = rng.next().rand & 1; // a coin flip: no stat changes it
    rolls?.push({
      kind: ROLL_KINDS.COUNTER,
      roll,
      chance: null,
      min: null,
      max: null,
      pass: roll === 1,
    });
    return roll === 1;
  }

  /**
   * @param {Character} target
   * @param {RNG} rng
   * @param {AttackRoll[] | null} [rolls] - gets each roll made, in order, if given (for the log)
   * @returns ATTACK_RESULTS */
  calcAttackResult(target, rng, rolls = null) {
    if (!this.willHitTarget(target, rng, rolls)) {
      if (this.willGetCountered(target, rng, rolls)) return ATTACK_RESULT.COUNTERED;
      if (!this.speciesFlags.alwaysHitIfNotCounter) return ATTACK_RESULT.MISSED;
    }

    return ATTACK_RESULT.HIT;
  }

  /**
   * @param {Character} target
   * @param {RNG} rng
   * @param {DamageMultiplier} [mult]
   */
  calcAttackDamage(target, rng, mult = NO_MULT) {
    const base = this.ATK - target.ARM; // +0x32: DEF with armor (live: Varkas -> Pahn, 6 hits)
    const rand = rng.next().rand;
    const withRand =
      base < 10 ? base + 1 - (rand % 4) : base + cDiv(cDiv(base, 2) - (rand % base), 5);

    const withDefend = cDiv(withRand, target.defending ? 2 : 1);
    return applyMultiplier(Math.max(withDefend, 1), mult);
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
   * @param {DamageMultiplier} [mult] - the move's multiplier, after the resistance halving
   * @returns {number}
   */
  calcMagicDamage(element, target, rng, loopSlot, mult = NO_MULT) {
    const base = this.MGC - target.MGC;
    const rand = rng.next().rand;
    const damage = Math.max(
      base < 10 ? base + 1 - (rand % 4) : base + cDiv(cDiv(base, 2) - (rand % base), 5),
      1,
    );

    if (target.rune.id === RUNES.SOUL_EATER.id) return applyMultiplier(cDiv(damage, 2), mult);
    const moveCategory = ELEMENT_CATEGORIES[element];
    if (moveCategory === undefined) return applyMultiplier(damage, mult);
    const targetCategory = ELEMENT_CATEGORIES[target.rune.element] ?? loopSlot;
    return applyMultiplier(targetCategory === moveCategory ? cDiv(damage, 2) : damage, mult);
  }
}
