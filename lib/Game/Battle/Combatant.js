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
    this.acted = false;
    this.busy = false;
    this.actionTag = 0;
    this.busyUntil = 0;
    this.outOfFight = false; // Balloon, Holly Boys
    this.wait = false; // Delayed turn due to attack / item


    this.status = {
      [STATUS.POISON]: false,
      [STATUS.BALLOON]: 0,
      [STATUS.BUCKET]: false,
      [STATUS.UNBALANCED]: 0,
      [STATUS.SLEEP]: false,
    };
  }

  get isAlive() {
    return this.HP > 0;
  }

  get isValidCombatant() {
    return !this.outOfFight && this.isAlive;
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
    return this.isAlive && !this.acted && !this.busy && !this.wait;
  }

  get isAsleep() {
    return this.status[STATUS.SLEEP];
  }

  /** @param {number} tick @returns boolean */
  isBusy(tick) {
    return this.busyUntil < tick;
  }

  /** @param {RNG} rng */
  genSpdRoll(rng) {
    const spdRoll = rng.next().getRNG2() % 10 - 5;
    this.spdRoll = this.SPD + spdRoll;
    return this.spdRoll;
  }

  /** @param {number} amount */
  takeDamage(amount) {
    this.HP = clamp(amount, 0, this.stats.HP);
  }

  clearTurnState() {
    this.defending = false;
    this.acted = false;
    this.busy = false;
    this.wait = false;
  }

  /** @param {ResolveActionParams} params */
  resolveAction({ party, enemies, rng, turn_count }) {
    console.log('resolveAction for', this.name, 'not implemented');
    console.log(party, enemies, rng, turn_count);
    return { action: null };
  }
}
