import Combatant from './Combatant.js';
import { cDiv, clamp } from '../../lib.js';
import { COMBATANT_SIDE, RANGE, STATUS } from '../Constants.js';
import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
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
   * The target-selection template most monster AIs share. One pass per tick: each front-row
   * party member (formation slot < 4) that's in the fight and not busy costs one rand() and is
   * picked on rand() % 100 > 50. Dead, back-row and busy members are skipped at no RNG cost.
   * @param {PlayerParty} party
   * @param {RNG} rng
   * @param {number} tick
   * @returns {Character | null} null: nobody picked this pass (retry next tick, fresh rolls)
   */
  selectFrontRowTarget(party, rng, tick) {
    for (const character of party.combatants) {
      if (character.position >= 4 || character.outOfFight || character.isBusy(tick)) continue;
      if (rng.next().rand % 100 > 50) return character;
    }
    return null;
  }

  /**
   * Resolves a monster-specific move the AI picked (an ABILITY action): its rolls and takeDamage
   * calls, all at once (see Battle.castMagic).
   * @param {string} name
   * @param {{ party: PlayerParty, rng: RNG }} _params
   */
  useAbility(name, _params) {
    throw new Error(`${this.name}: ${name} not implemented`);
  }

  /**
   * The monster's AI, called every tick of its turn until it commits (attack_data_table[Id]+0x30).
   * The base version is a plain attacker (e.g. Varkas, the Pirates): the front-row target pass,
   * then always the basic attack. Monsters with other moves override this, usually calling it
   * for the target and then rolling their move.
   * UNVERIFIED: that plain attackers make no move roll.
   * @param {CombatantTurnParams} params
   * @returns {EnemyAction}
   */
  selectAction({ party, rng, tick }) {
    if (!party.getFrontRow().length) return { action: ACTION_TYPES.NOTHING }; // turn skipped
    const target = this.selectFrontRowTarget(party, rng, tick);
    if (!target) return { action: ACTION_TYPES.UNDETERMINED };
    return { action: ACTION_TYPES.ATTACK, target };
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
   * @param {Pick<Spell, 'element'>} spell - only its element is read (monster specials like Fire Breath aren't Spells)
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
      return Math.max(cDiv(withRand, 2), 1);

    return Math.max(withRand, 1);
  }
}
