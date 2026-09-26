import { clamp } from '../../lib.js';
import { STATUS } from '../Constants.js';

/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */

/**
 * @typedef {Object} CombatantStatBlock
 * @property {number} HP
 * @property {number} PWR
 * @property {number} SKL
 * @property {number} DEF
 * @property {number} SPD
 * @property {number} MGC
 * @property {number} LUK
 */

/**
 * @typedef {Object} ResolveActionParams
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {number} [turn_count]
 * @property {number} tick
 */

// Shared battle-runtime surface for anything Battle/TurnOrder can act on —
// party members (Character) and monsters (Enemy) alike. Holds the stat
// block, HP tracking, and per-round turn-state bookkeeping common to both;
// each subclass still builds itself from its own data source (CharacterData
// vs a Bestiary EnemyEntry) and layers its own combat-facing getters on top
// (e.g. Character's ATK/ARM fold in weapon/armor bonuses).
export default class Combatant {
  /**
   * @param {string} name
   * @param {number} LVL
   * @param {CombatantStatBlock} stats
   */
  constructor(name, LVL, stats) {
    this.name = name;
    this.LVL = LVL;
    this.stats = stats;
    this.HP = stats.HP;

    // Battle-runtime state, managed by Battle/TurnOrder.
    this.defending = false;
    this.slot = 0; // Not set
    this.position = 0; // Not set, changes mid battle on character death / out of battle
    this.actionTag = 0;
    this.busyUntil = 0;
    this.pendingDamage = 0; // combatant_rec+0x4e: queued damage (negative = heal), committed each tick
    this.removedFromFight = false; // Fled, or removed while still alive (Balloon, Holly Boys)
    this.wait = false; // Delayed turn due to attack / item


    this.status = {
      [STATUS.POISON]: false,
      [STATUS.BALLOON]: 0,
      [STATUS.BUCKET]: false,
      [STATUS.UNBALANCED]: 0,
      [STATUS.SLEEP]: false,
    };
  }

  get acted() {
    return this.actionTag != 0;
  }

  get isAlive() {
    return this.HP > 0;
  }

  // combatant_rec+0x45 (bValidFlag): out of the fight for any reason. Everything the battle
  // loop checks (turn roll, targeting, backfill) reads only this, never why.
  get outOfFight() {
    return this.removedFromFight || !this.isAlive;
  }

  // check_combatant_valid_target (0x800f8680). Pending damage is committed the same tick it's
  // queued, so the HP test only matters for damage applied outside the round driver's steps.
  get isValidCombatant() {
    return !this.outOfFight && this.HP - this.pendingDamage >= 0;
  }

  get ATK() {
    return this.stats.PWR;
  }

  get ARM() {
    return this.stats.DEF;
  }

  get PWR() {
    return this.stats.PWR;
  }

  get DEF() {
    return this.stats.DEF;
  }

  get SPD() {
    return this.stats.SPD;
  }

  get MGC() {
    return this.stats.MGC;
  }

  get SKL() {
    return this.stats.SKL;
  }

  get LUK() {
    return this.stats.LUK;
  }

  get canAct() {
    return this.isAlive && !this.acted;
  }

  get isAsleep() {
    return this.status[STATUS.SLEEP];
  }

  /** @param {boolean} bool */
  setActed(bool) {
    this.actionTag = bool ? 1 : 0;
  }

  /** @param {number} tick @returns boolean */
  isBusy(tick) {
    return this.busyUntil >= tick;
  }

  /** @param {RNG} rng */
  genSpdRoll(rng) {
    const spdRoll = rng.next().rand % 10 - 5;
    this.spdRoll = 10 * this.SPD + spdRoll;
    return this.spdRoll;
  }

  /** @param {number} amount Negative heals. Applied to HP by commitPendingDamage. */
  takeDamage(amount) {
    this.pendingDamage += amount;
  }

  // Round driver step 3 (loop at 0x800f73e0): only for combatants still in the fight
  commitPendingDamage() {
    if (this.outOfFight || this.pendingDamage === 0) return;
    this.HP = clamp(this.HP - this.pendingDamage, 0, this.stats.HP);
    this.pendingDamage = 0;
  }

  clearTurnState() {
    this.defending = false;
    this.actionTag = 0;
    this.busyUntil = 0;
    this.pendingDamage = 0;
  }

  /** @param {ResolveActionParams} params */
  resolveAction({ party, enemies, rng, turn_count }) {
    console.log('resolveAction for', this.name, 'not implemented');
    console.log(party, enemies, rng, turn_count);
    return { action: null };
  }
}
