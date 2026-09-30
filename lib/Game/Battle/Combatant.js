import { clamp, pushKeyInt, shallowCloneInstance } from '../../lib.js';
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
 * @typedef {Object} CombatantTurnParams
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {number} turn_count - The round number (battle_state+0x04), 1 on the first round
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
    this.position = 0; // Not set. Initialized by Party. Changes mid battle on death / removal
    this.actionTag = 0;
    this.busyUntil = -1; // The tick whose animation pass clears busy; -1 = not busy
    this.attackUntil = -1; // The last tick of its basic attack's +0x50 continuation chain (its recover script starts); -1 = none
    this.pendingDamage = 0; // combatant_rec+0x4e: queued damage (negative = heal), committed each tick
    this.removedFromFight = false; // Fled, or removed while still alive (Balloon, Holly Boys)
    this.knockedOut = false; // Set by the death routine (die), not the moment HP reaches 0
    // EnemyData+0x40 effect flags. Only 0x2 is modelled: a combatant that dodged keeps it until
    // its own next attack, which makes its next counter "primed" (faster). Carried between
    // actions and rounds; cleared by its own attack and by the counter steps.
    this.fx = 0;

    this.status = Combatant.createStatus();
  }

  static createStatus() {
    return {
      [STATUS.POISON]: false,
      [STATUS.BALLOON]: 0,
      [STATUS.BUCKET]: false,
      [STATUS.UNBALANCED]: 0, // round ends left; see unbalance()
      [STATUS.SLEEP]: false,
    };
  }

  /** A readable name, for the action log and debugging */
  get label() {
    return this.name;
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
    return this.removedFromFight || this.knockedOut;
  }

  // check_combatant_valid_target (0x800f8680). >= 0, not > 0: a combatant at 0 HP is still valid
  // until its death routine runs, so a party attack waits on it (isReadyTarget) instead of
  // retargeting early. Pending damage is committed the same tick it's queued, so the HP test
  // only matters for damage applied outside the round driver's steps.
  get isValidCombatant() {
    return !this.outOfFight && this.HP - this.pendingDamage >= 0;
  }

  /**
   * check_combatant_alive (0x800f8604): stricter than isValidCombatant (HP after pending damage
   * must be > 0, not >= 0). A basic attack waits, with no RNG, until its target passes this.
   * @param {number} tick
   */
  isReadyTarget(tick) {
    return !this.isBusy(tick) && !this.outOfFight && this.HP - this.pendingDamage > 0;
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

  get isAsleep() {
    return this.status[STATUS.SLEEP];
  }

  get isUnbalanced() {
    return this.status[STATUS.UNBALANCED] > 0;
  }

  /**
   * Unbalanced lasts through the round after the one it lands in: the party round-end decay
   * (PlayerParty.decayStatuses) takes it 2 -> 1 at that round's end, then 1 -> 0 at the next.
   */
  unbalance() {
    this.status[STATUS.UNBALANCED] = 2;
  }

  /** @param {number} hp */
  setHP(hp) {
    this.HP = clamp(hp, 0, this.stats.HP);
    return this;
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
    return this.SPD * 10 - 5 + rng.next().rand % 10;
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

  /**
   * The death routine, run from the animation pass on the tick the lethal hit's reaction stops
   * being busy (see Battle.checkDeaths): +0x45 = 1 and ActionTag = 1.
   * @param {number} _tick - the tick it dies on (subclasses use it for busy time)
   */
  die(_tick) {
    this.knockedOut = true;
    this.setActed(true);
  }

  /**
   * Resets state that only lasts one battle. Characters are reused across battles, so this runs
   * at the start of each one. HP, MP, Poison and Balloon carry over; other statuses don't.
   */
  resetBattleState() {
    this.status = {
      ...Combatant.createStatus(),
      [STATUS.POISON]: this.status[STATUS.POISON],
      [STATUS.BALLOON]: this.status[STATUS.BALLOON],
    };
    this.knockedOut = this.HP < 1;
    // Balloon at 3 or more: floated away, out of the fight for this whole battle.
    // TODO: also happens mid-battle when Balloon is inflicted up to 3; exact timing unknown.
    this.removedFromFight = this.status[STATUS.BALLOON] >= 3;
    this.fx = 0; // lives in EnemyData, which is rebuilt when a battle loads
  }

  /**
   * A copy that shares nothing mutable with this one. Static data (runes, weapon/enemy table
   * entries) stays shared. Subclasses copy their own mutable fields on top.
   * @returns {this}
   */
  clone() {
    const copy = shallowCloneInstance(this);
    copy.stats = { ...this.stats };
    copy.status = { ...this.status };
    return copy;
  }

  /**
   * Appends everything about this combatant that carries from one round into the next
   * (clearTurnState resets the rest) to a state key (Battle.stateKey): two combatants with the
   * same values play every later round the same way. Stats, LVL and equipment never change
   * mid-battle, so they're left out. Add any new state that survives between rounds here, or the
   * brute-force search will merge branches that aren't really the same.
   * @param {number[]} out
   */
  stateKeyInto(out) {
    pushKeyInt(out, this.HP);
    pushKeyInt(out, this.knockedOut);
    pushKeyInt(out, this.removedFromFight);
    pushKeyInt(out, this.fx);
    pushKeyInt(out, this.position);
    for (const key of STATUS_KEYS) pushKeyInt(out, this.status[key]);
  }

  clearTurnState() {
    this.defending = false;
    this.actionTag = 0;
    this.busyUntil = -1; // The tick whose animation pass clears busy; -1 = not busy
    this.attackUntil = -1; // The last tick of its basic attack's +0x50 continuation chain (its recover script starts); -1 = none
    this.pendingDamage = 0;
  }
}

/** The status ids, in createStatus order, for stateKeyInto */
const STATUS_KEYS = Object.keys(Combatant.createStatus());
