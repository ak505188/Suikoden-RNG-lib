import { ACTION_TYPES, ATTACK_RESULT, DEFAULT_ACTION, ROUND_COMMANDS } from './Actions.js';
import { COMBATANT_SIDE, TARGET } from '../Constants.js';
import { spellEffect, spellRand } from '../Magic/Behavior.js';
import ActionLog, { LOG_TYPES } from './ActionLog.js';
import { clamp, shallowCloneInstance } from '../../lib.js';
import { UNITES } from '../Unites.js';
import { ITEMS } from '../Items.js';
import { ITEM_EFFECTS } from '../ItemEffects.js';
import { ITEM_KEYS } from '../Keys.js';
import { ITEM_TIMING } from './ItemTimings.js';
import { ATTACK_TIMING_CONSTANTS } from './AttackTimingConstants.js';
import Combatant from './Combatant.js';
import { UNITE_RETURN_FRAMES, UNITE_TIMINGS } from './UniteTimings.js';
import { COMMAND_RUNE_TIMINGS } from './CommandRuneTimings.js';
import { RUNE_TYPES } from '../Magic/Runes.js';
import RNG from '../../rng.js';

/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Party.js').EXPReward} EXPReward */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').Round} Round */
/** @typedef {import('../../rng.js').RNGSnapshot} RNGSnapshot */
/** @typedef {import('../Items.js').Item} Item */

/**
 * @typedef {Object} BattleOptions
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {Round[]} [turns] - One entry per round: a round command, or one Action per
 *   party-member slot (Fight).
 * @property {number} [turn_count]
 * @property {number} [freeWillGate] - g_FreeWillGate: the roll gate a basic attack sets. 10 once
 *   Free Will has been chosen; nothing resets it, so probably 0 until then.
 * @property {boolean} [escapable] - Run can escape (false for bosses and scripted fights)
 * @property {boolean} [logging] - record events to `log` (default true). Off for searches, which
 *   never read it: see setLogging.
 */

/** @typedef {typeof DISPATCH_STATUS[keyof typeof DISPATCH_STATUS]} DispatchStatus */
const DISPATCH_STATUS = /** @type {const} */ ({
  PENDING: 'Pending',
  DONE: 'Done'
});

/** @typedef {typeof PHASE_STATE[keyof typeof PHASE_STATE]} PhaseState */
export const PHASE_STATE = /** @type {const} */ ({
  ADVANCE_TURN: 'Advance Turn',
  COPY_ACTOR: 'Copy Actor',
  DISPATCH: 'Dispatch',
  ROUND_END_WAIT: 'Round End Wait',
  ROUND_CHECK: 'Round Check',
  ROUND_END_STATUS: 'Round End Status',
  VICTORY_WAIT: 'Victory Wait',
  ROUND_OVER: 'Round Over',
});

/** @typedef {typeof BATTLE_STATUS[keyof typeof BATTLE_STATUS]} BattleStatus */
export const BATTLE_STATUS = /** @type {const} */ ({
  IN_PROGRESS: 'In Progress',
  WON: 'Won',
  LOST: 'Lost',
  ESCAPED: 'Escaped',
});

/**
 * What happened once the battle ended, from Battle.finish().
 * @typedef {Object} BattleResult
 * @property {Item | null} drop - null when nothing dropped, or the battle was lost
 * @property {EXPReward[]} rewards - EXP and level-ups per party member, in slot order; empty when lost
 * @property {{ battleEnd: RNGSnapshot, afterDrop?: RNGSnapshot, afterLevelUps?: RNGSnapshot }} rng -
 *   afterDrop and afterLevelUps only when won
 */

/** @typedef {Pick<import('./EnemyAttackTimings.js').EnemyAttackTiming, 'name' | 'damage' | 'free' | 'dodgePoint' | 'recover' | 'dodge' | 'counter' | 'missFree'>} AttackTiming */

/**
 * What basic-attack resolution needs beyond Combatant; Character and Enemy both provide it.
 * @typedef {Object} AttackMethods
 * @property {AttackTiming} attackTiming
 * @property {(target: any) => number | null} reactionFrames
 * @property {(target: any, rng: RNG, isCrit: boolean) => number} calcAttackDamage
 */
/** @typedef {Combatant & AttackMethods} AttackParticipant */

/**
 * @typedef {Object} MagicCast
 * @property {Character | Enemy} caster
 * @property {() => void} resolve
 * @property {number} frames - wind-up from ready to damage
 * @property {number | null} readyTick - when previous actions were fully resolved
 * @property {boolean} resolved
 */

/**
 * A physical Unite between its resolver succeeding and its handler ending.
 * @typedef {Object} UniteRun
 * @property {import('../Unites.js').Unite} def
 * @property {import('./UniteTimings.js').UniteTiming} timing
 * @property {number} start - S, the tick unite_gather_participants runs
 * @property {Character} initiator
 * @property {Character[]} participants - def order
 * @property {Enemy | null} target - null for an all-enemies Unite
 * @property {boolean} hit - the damage event has fired
 */

/**
 * A move that holds its user's turn until a fixed tick (a Command rune, the Dragon's moves).
 * @typedef {Object} TurnHold
 * @property {number} end - the tick the turn ends (DONE)
 * @property {number} [gate] - the roll gate it sets then; unset leaves it unchanged
 * @property {() => void} [onEnd] - runs as the turn ends
 */

/**
 * @typedef {Object} DispatchResult
 * @property {DispatchStatus} status
 * @property {number} [gate]
 */

export default class Battle {
  /** Wind-up of a spell or monster special with no measured `frames` (artificial) */
  static DEFAULT_CAST_FRAMES = 300;

  /** @param {BattleOptions} options */
  constructor({ party, enemies, rng, turns = [], turn_count = 0, freeWillGate = 0, escapable = true, logging = true }) {
    this.party = party;
    this.enemies = enemies;
    this.combatants = [null, ...party.combatants, ...enemies.combatants];
    this.party.resetBattleState();
    this.enemies.resetBattleState();
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
    this.freeWillGate = freeWillGate;
    this.escapable = escapable;
    this.log = new ActionLog();
    this.logging = logging;
    this.frames = 0; // Total ticks (= frames) across every round played, for scoring
    /** @type {BattleStatus} */
    this.status = BATTLE_STATUS.IN_PROGRESS;
    /** @type {BattleResult | null} null until finish() runs */
    this.result = null;
    /** @type {PhaseState} */
    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.resetTurn();
  }

  /**
   * An independent copy: party, enemies, RNG (same seed and call count), log and planned turns
   * are all copies, so playing either one never touches the other.
   * Only works while nothing is in flight: scheduled events and a spell / Unite / hold in progress
   * are closures over this battle's own combatants, and can't be copied. That's always true
   * between rounds (before the first, or once a round is over).
   * @returns {Battle}
   */
  clone() {
    const { magic, unite, hold } = this.turn;
    if (this.events.size || this.animationEvents.size || magic || unite || hold) {
      throw new Error('Battle.clone: an action is still in flight; clone between rounds');
    }
    const copy = shallowCloneInstance(this);
    copy.party = this.party.clone();
    copy.enemies = this.enemies.clone();
    copy.combatants = [null, ...copy.party.combatants, ...copy.enemies.combatants];
    copy.rng = this.rng.cloneKeepIndex();
    copy.turns = this.turns.map(cloneRound);
    copy.turn = { ...this.turn };
    copy.events = new Map();
    copy.animationEvents = new Map();
    copy.log = this.logging ? this.log.clone() : this.log; // not logging: nothing writes it, so share it
    copy.result = this.result && {
      ...this.result,
      // Point at the copy's own party members
      rewards: this.result.rewards.map(reward => ({
        ...reward,
        character: copy.party.combatants[this.party.combatants.indexOf(reward.character)],
        growths: reward.growths && { ...reward.growths },
        rng: { ...reward.rng },
      })),
      rng: structuredClone(this.result.rng), // plain numbers only; the rest of result holds shared references
    };
    return copy;
  }

  /**
   * Turns event logging on or off. Nothing in the battle reads the log, so it never changes how a
   * battle plays: a search turns it off for speed (no entries, and clone() doesn't copy the log),
   * then replays the paths it keeps with logging on. While off, the log keeps what it had and is
   * shared with clones; turning it back on gives this battle its own copy.
   * @param {boolean} on
   * @returns {this}
   */
  setLogging(on) {
    if (on && !this.logging) this.log = this.log.clone();
    this.logging = on;
    return this;
  }

  /**
   * Plays the planned rounds until the battle ends. Rounds planned past that are never played.
   * @param {{ finish?: boolean }} [options] - finish: then run finish() if the battle ended
   * @returns {{ status: BattleStatus, result: BattleResult | null }}
   */
  run({ finish = false } = {}) {
    for (const turn of this.turns) {
      if (this.status !== BATTLE_STATUS.IN_PROGRESS) break;
      this.playTurn(turn);
    }
    return finish ? this.finish() : { status: this.status, result: this.result };
  }

  /**
   * Runs once a round is over: every remaining turn roll and action (e.g. a Medicine planned after
   * the last enemy died) and the round-end wait have all played out. Won when every enemy is dead
   * or removed, lost when every party member is. Only sets the status: finish() does the rest.
   * @returns {BattleStatus}
   */
  checkOutcome() {
    if (this.enemies.isDefeated) this.status = BATTLE_STATUS.WON;
    else if (!this.partyCanFight) this.status = BATTLE_STATUS.LOST;
    else return this.status;

    this.record(LOG_TYPES.BATTLE_END, null, null, { detail: this.status });
    return this.status;
  }

  /**
   * The victory / defeat check's party test (0x800f74a8): some member is a valid combatant and
   * awake. Defeat itself isn't traced past this.
   * @returns {boolean}
   */
  get partyCanFight() {
    return this.party.combatants.some(c => c.isValidCombatant && !c.isAsleep);
  }

  /**
   * The post-battle results, for a battle that's already over (it never ends one): records the
   * RNG at battle end, then after a win rolls the drop, then EXP and level-ups, on the live RNG.
   * Call it before the RNG is used for anything else: playTurn won't touch it once the battle is
   * over, so it's still where the last round left it. Does nothing while in progress, and a repeat
   * call returns the same result without rolling again.
   * @returns {{ status: BattleStatus, result: BattleResult | null }} result is null while in progress
   */
  finish() {
    if (this.status !== BATTLE_STATUS.IN_PROGRESS && !this.result) {
      this.result = { drop: null, rewards: [], rng: { battleEnd: this.rng.snapshot() } };
      if (this.status === BATTLE_STATUS.WON) {
        this.rollDrop();
        this.awardEXP();
      }
    }
    return { status: this.status, result: this.result };
  }

  /** The post-battle drop roll, on the live RNG: the first thing after a won battle ends. */
  rollDrop() {
    this.result.drop = this.enemies.calculateDrop(this.rng);
    this.result.rng.afterDrop = this.rng.snapshot();
    this.record(LOG_TYPES.DROP, null, null, this.result.drop ? { detail: this.result.drop.name } : {});
  }

  /**
   * EXP and level-ups, on the live RNG right after the drop roll. Each member's 'exp' entry is
   * stamped with the RNG before their level-up rolls, and 'levelUp' with the RNG after.
   */
  awardEXP() {
    this.result.rewards = this.party.awardEXP(this.enemies, this.rng);
    this.result.rng.afterLevelUps = this.rng.snapshot();
    let before = this.result.rng.afterDrop.count;
    for (const { character, exp, fromLVL, levels, rng } of this.result.rewards) {
      this.record(LOG_TYPES.EXP, character, null, { amount: exp, rng: before });
      if (levels > 0) this.record(LOG_TYPES.LEVEL_UP, character, null, { detail: `LVL ${fromLVL} -> ${fromLVL + levels}`, rng: rng.count });
      before = rng.count;
    }
  }

  /**
   * Everything that decides how later rounds play out, as a string, for merging brute-force
   * branches: the status, RNG, round count (enemy AI reads it), Free Will's roll gate and every
   * combatant's stateKey. Frames and the log are left out: they're history, not state. Only
   * meaningful between rounds, when nothing is in flight.
   * @returns {string}
   */
  stateKey() {
    const combatants = this.combatants.slice(1).map(c => c.stateKey()).join(';');
    return `${this.status}|${this.rng.getRNG()}:${this.rng.getCount()}|${this.turn_count}|${this.freeWillGate}|${combatants}`;
  }

  get currentCombatant() {
    return this.combatants[this.turn.current];
  }

  resetTurn() {
    this.turn = {
      current: 0,
      pending: 0,
      rollGate: 0,
      tick: 0,
      /** @type {MagicCast | null} the spell or special the current actor is casting */
      magic: null,
      /** @type {UniteRun | null} the Unite the current actor started */
      unite: null,
      /** @type {TurnHold | null} a move holding the current actor's turn until a fixed tick */
      hold: null,
      // COPY_ACTOR's hold (see copyActor): holdFlag (+0x44) is set by a side switch at the roll or
      // a party crit; the held copy waits for the current actor's release (+0x30). Round start
      // sets release, so the round's first copy is never held.
      holdFlag: false,
      release: true,
      /** The tick the current actor's basic attack releases (its recover script starts), -1 = none */
      releaseAt: -1,
    };

    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.party.clearTurnState();
    this.enemies.clearTurnState();

    /** @type {Map<number, { ownerIdx: number, fn: () => void, actor: Combatant }[]>} tick -> callbacks */
    this.events = new Map();
    /** @type {Map<number, { ownerIdx: number, fn: () => void }[]>} tick -> animation-pass callbacks */
    this.animationEvents = new Map();
    /** Someone may be under 1 HP and still in the fight, so checkDeaths has work to do */
    this.deathCheckDue = true;
  }

  /**
   * Schedules fn for step 2 of that tick (after the turn step, before the damage commit),
   * e.g. a basic attack's calc_damage rand() at t0 + timing.damage. Step 2 runs each
   * combatant's +0x50 callback in combatant index order, so fn runs in its owner's place:
   * the attacker for hit / miss / cover, the retaliator for a counter's damage.
   * @param {number} tick
   * @param {Combatant} owner
   * @param {() => void} fn
   * @param {Combatant} [actor] - who the log credits the damage to, when not the owner
   */
  queueEvent(tick, owner, fn, actor = owner) {
    if (tick < this.turn.tick) throw new Error(`queueEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.combatants.findIndex(c => c === owner);
    if (ownerIdx < 1) throw new Error(`queueEvent: ${owner?.name} isn't in this battle`);
    const due = this.events.get(tick);
    if (due) due.push({ ownerIdx, fn, actor });
    else this.events.set(tick, [{ ownerIdx, fn, actor }]);
  }

  /**
   * Schedules fn for that tick's animation pass (after the damage commit), in its owner's own
   * update: before the owner's death check, after every lower-index combatant's. E.g. an
   * animation opcode 40 status roll.
   * @param {number} tick
   * @param {Combatant} owner
   * @param {() => void} fn
   */
  queueAnimationEvent(tick, owner, fn) {
    if (tick < this.turn.tick) throw new Error(`queueAnimationEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.combatants.findIndex(c => c === owner);
    if (ownerIdx < 1) throw new Error(`queueAnimationEvent: ${owner?.name} isn't in this battle`);
    const due = this.animationEvents.get(tick);
    if (due) due.push({ ownerIdx, fn });
    else this.animationEvents.set(tick, [{ ownerIdx, fn }]);
  }

  runDueEvents() {
    const due = this.events.get(this.turn.tick);
    if (!due) return;
    this.events.delete(this.turn.tick);
    due.sort((a, b) => a.ownerIdx - b.ownerIdx); // stable: queue order within an owner
    for (const { fn, actor } of due) {
      if (!this.logging) {
        fn();
        continue;
      }
      // Log whatever damage the callback queued, credited to its actor (usually the owner)
      const pendingBefore = this.combatants.map(c => c?.pendingDamage);
      fn();
      this.combatants.forEach((c, i) => {
        if (!c || c.pendingDamage === pendingBefore[i]) return;
        this.record(LOG_TYPES.DAMAGE, actor, c, {
          amount: c.pendingDamage - pendingBefore[i],
          hp: clamp(c.HP - c.pendingDamage, 0, c.stats.HP),
        });
      });
    }
  }

  /**
   * Adds a log entry stamped with the current round, tick and RNG call count.
   * @param {import('./ActionLog.js').LogType} type
   * @param {Combatant | null} [actor]
   * @param {Combatant | null} [target]
   * @param {Partial<import('./ActionLog.js').LogEntry>} [fields]
   */
  record(type, actor = null, target = null, fields = {}) {
    if (!this.logging) return;
    this.log.record({
      type,
      round: this.turn_count,
      tick: this.turn.tick,
      rng: this.rng.getCount(),
      ...(actor && { actor: actor.label }),
      ...(target && { target: target.label }),
      ...fields,
    });
  }


  commitPendingDamage() {
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      if (c.pendingDamage === 0) continue;
      c.commitPendingDamage();
      if (c.HP < 1) this.deathCheckDue = true;
    }
  }

  /**
   * The death check in the animation pass (FUN_800e09bc): each combatant in index order, right
   * after its own update. Still in the fight, HP < 1 and not busy once this tick's animation
   * pass clears busy. So death starts on the tick the lethal hit's reaction ends.
   */
  checkDeaths() {
    const tick = this.turn.tick;
    const animations = this.animationEvents.get(tick);
    // Nobody is under 1 HP and still in the fight, and there's nothing to animate: skip the pass
    if (!animations && !this.deathCheckDue) return;
    this.animationEvents.delete(tick);
    let stillDue = false;
    for (let i = 1; i < this.combatants.length; i++) {
      if (animations) for (const { ownerIdx, fn } of animations) if (ownerIdx === i) fn();
      const c = this.combatants[i];
      if (c.outOfFight || c.HP >= 1) continue;
      stillDue = true; // until it dies, or its HP comes back up
      if (c.busyUntil > tick) continue;
      if (c.type === COMBATANT_SIDE.ALLY && /** @type {Character} */ (c).inventory.has(ITEM_KEYS.SACRIFICIAL_BUDDHA)) {
        this.reviveWithBuddha(/** @type {Character} */ (c));
        continue;
      }
      c.die(tick);
      this.record(LOG_TYPES.DEATH, null, c);
    }
    this.deathCheckDue = stillDue;
  }

  /**
   * FUN_800e2c90's Sacrificial Buddha branch, instead of dying: the item's whole slot is removed
   * and the revive script runs. +0x45, ActionTag and statuses are left alone, so a member revived
   * before their turn still acts this round. Only happens in battle phase 4 (the round driver),
   * which is where every death the sim runs happens.
   * @param {Character} character
   */
  reviveWithBuddha(character) {
    const tick = this.turn.tick;
    character.inventory.remove(ITEM_KEYS.SACRIFICIAL_BUDDHA);
    this.record(LOG_TYPES.REVIVE, null, character, { detail: ITEMS[ITEM_KEYS.SACRIFICIAL_BUDDHA].name });
    character.busyUntil = tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaFree;
    this.queueEvent(tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaHeal, character, () => {
      character.takeDamage(-Math.floor(character.stats.HP / 2));
    });
  }

  areAnyCombatantsBusy() {
    for (let i = 1; i < this.combatants.length; i++) {
      if (this.combatants[i].isBusy(this.turn.tick)) return true;
    }
    return false;
  }

  /** @returns {number} 0 if round is over, -1 if nobody free yet, retry next tick, otherwise fastest combatant index */
  turnRoll() {
    let best = 0, bestWeight = 0                      // best: 0 = none yet, -1 = none yet, someone busy
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i]
      if (c.acted) continue;
      if (c.isBusy(this.turn.tick)) {               // free skip
        if (best === 0) best = -1
        continue
      }
      const weight = c.genSpdRoll(this.rng);         // one rand() per candidate, even invalid ones

      // first candidate: no validity check (dead ones never get here: ActionTag = 1)
      if (best < 1) {
        best = i;
        bestWeight = weight
      }

      // strict: ties keep lower idx
      else if (bestWeight < weight && this.combatants[i].isValidCombatant) {
        best = i;
        bestWeight = weight
      }
    }
    return best;
  }

  /** @param {Character} character @returns {DispatchResult} */
  dispatchPlayer(character) {
    switch (character.action.type) {
      case ACTION_TYPES.ATTACK:
        return this.resolvePartyAttack(character);
      case ACTION_TYPES.RUNE:
        return this.resolvePartyRune(character);
      case ACTION_TYPES.UNITE:
        return this.resolvePartyUnite(character);
      case ACTION_TYPES.ITEM:
        return this.resolvePartyItem(character);
      default: // Defend, or an invalid action
        this.record(LOG_TYPES.DEFEND, character);
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
    }
  }

  /**
   * Starts a spell or monster special. Real cast timing isn't modelled; the phases are:
   *   1. wait until previous actions are fully resolved (nobody busy, no damage rolls queued)
   *   2. wind-up: `frames` ticks (artificial until measured). Nothing rolls RNG meanwhile.
   *      TODO: the exception here, where an item can be used during the wind-up.
   *   3. resolve: every roll and all the damage on one tick (step 2, in `resolve`'s order)
   *   4. the turn ends on the next tick
   * The turn is held throughout, so no one else acts.
   * @param {Character | Enemy} caster
   * @param {() => void} resolve - makes the rolls and calls takeDamage on each target
   * @param {number} [frames]
   * @returns {DispatchResult}
   */
  castMagic(caster, resolve, frames = Battle.DEFAULT_CAST_FRAMES) {
    this.turn.magic = { caster, resolve, frames, readyTick: null, resolved: false };
    return this.continueMagic();
  }

  /** @returns {DispatchResult} the gate is left unchanged, like the game's cast state machines */
  continueMagic() {
    const magic = this.turn.magic;
    const tick = this.turn.tick;
    if (magic.readyTick === null) {
      if (this.areAnyCombatantsBusy() || this.events.size) return { status: DISPATCH_STATUS.PENDING };
      magic.readyTick = tick;
    }
    if (tick < magic.readyTick + magic.frames) return { status: DISPATCH_STATUS.PENDING };
    if (!magic.resolved) {
      magic.resolved = true;
      this.queueEvent(tick, magic.caster, magic.resolve);
      return { status: DISPATCH_STATUS.PENDING };
    }
    this.turn.magic = null;
    return { status: DISPATCH_STATUS.DONE };
  }

  /**
   * A party member's Rune spell. Party spell damage uses no RNG; spellRand makes the spell's own
   * rand() calls.
   * TODO: retargeting a dead single target, party-side (healing / support) spells.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyRune(character) {
    if (character.rune.type === RUNE_TYPES.COMMAND) return this.resolvePartyCommandRune(character);
    const level = character.action.slot ?? 0;
    const spell = character.rune.spells[level];
    if (!spell) throw new Error(`${character.name}: no spell in ${character.rune.name} slot ${level}`);
    character.spendMP(level);
    const target = this.enemies.combatants[character.action.target ?? 0];
    this.record(LOG_TYPES.CAST, character, spell.target === TARGET.AOE ? null : target, { detail: spell.name });
    return this.castMagic(character, () => {
      spellRand(spell, this.rng);
      const hits = spellEffect({ actor: character, spell, target, party: this.party, enemies: this.enemies });
      if (!hits) throw new Error(`${spell.name}: targeting ${spell.target} not implemented`);
      hits.forEach(({ enemy, damage }) => enemy.takeDamage(damage));
    }, spell.frames);
  }

  /**
   * battle_select_unite_attack (0x800f5790), on whichever participant's turn comes first. Polled
   * every tick until it succeeds or fails; neither path rolls RNG.
   *   - anyone busy, either side: wait
   *   - any participant invalid (dead, fled, HP - pending < 0): the Defend fallback. ActionType
   *     stays Unite, so no Defend halving this round; each partner fails the same way on its own
   *     turn.
   *   - all enemies: none left -> fail. One enemy: an invalid target is retargeted to the first
   *     enemy still in the fight with HP - pending > 0, none -> fail.
   *   - otherwise the handler starts next tick (S), and holds the turn loop until it ends.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyUnite(character) {
    if (this.areAnyCombatantsBusy()) return { status: DISPATCH_STATUS.PENDING };

    const { uniteKey } = character.action;
    /** @type {import('../Unites.js').Unite} */
    const def = UNITES[uniteKey];
    const participants = def.participants.map(key => this.party.combatants.find(c => c.key === key));
    const fail = () => {
      this.record(LOG_TYPES.DEFEND, character, null, { detail: `${def.name} failed` });
      return { status: DISPATCH_STATUS.DONE, gate: 0 };
    };
    if (participants.some(p => !p?.isValidCombatant)) return fail();

    /** @type {Enemy | null} */
    let target = null;
    if (def.target === TARGET.AOE) {
      if (!this.enemies.combatants.some(e => e.isValidCombatant)) return fail();
    } else {
      target = this.enemies.combatants[character.action.target ?? 0];
      if (!target?.isValidCombatant) {
        target = this.enemies.combatants.find(e => !e.outOfFight && e.HP - e.pendingDamage > 0);
        if (!target) return fail();
        this.record(LOG_TYPES.RETARGET, character, target);
      }
    }

    const timing = UNITE_TIMINGS[uniteKey];
    if (!timing) throw new Error(`${def.name}: timing unknown`);
    if (def.trigger.on !== 'initiatorImpact' && def.trigger.on !== 'impact')
      throw new Error(`${def.name}: trigger ${def.trigger.on} not implemented`);
    if (def.unbalances?.roll) throw new Error(`${def.name}: Unbalanced roll timing unknown`);

    this.record(LOG_TYPES.UNITE, character, target, { detail: def.name });
    this.turn.unite = { def, timing, start: this.turn.tick + 1, initiator: character, participants, target, hit: false };
    return { status: DISPATCH_STATUS.PENDING };
  }

  /**
   * The Unite handler, from S until the tick after the last participant's done bit (0x4).
   *   S: unite_gather_participants uses up every participant's turn, copies the target and
   *     clears their effect flags; each starts its own Unite script, then its return script
   *     the tick after its done bit (busy until that ends).
   *   the gating participant's impact + 1: one calc_damage per participant, in def order, per
   *     target; target.pending += trunc(sum * mult). No hit, crit, counter or cover roll.
   *   the end: the gate is left unchanged. Participants may still be walking back.
   * @returns {DispatchResult}
   */
  continueUnite() {
    const u = this.turn.unite;
    const t = this.turn.tick - u.start;
    const { participants: timings, reaction } = u.timing;

    if (t === 0) {
      u.participants.forEach((p, k) => {
        p.setActed(true);
        p.fx = 0;
        p.busyUntil = u.start + timings[k].done + 1 + UNITE_RETURN_FRAMES[p.key];
      });
    }

    const gate = u.def.trigger.on === 'impact' ? u.def.trigger.who : u.participants.indexOf(u.initiator);
    if (!u.hit && t === timings[gate].impact + 1) {
      u.hit = true;
      const targets = u.target ? [u.target] : this.enemies.combatants.filter(e => e.isValidCombatant);
      const mult10 = Math.round(u.def.mult * 10);
      for (const target of targets) {
        target.busyUntil = Math.max(target.busyUntil, this.turn.tick + reaction.frames);
        // Owned by the initiator: it runs in step 2 with any other damage due this tick
        this.queueEvent(this.turn.tick, u.initiator, () => {
          const sum = u.participants.reduce((s, p) => s + p.calcAttackDamage(target, this.rng, false), 0);
          target.takeDamage(Math.trunc(sum * mult10 / 10));
        });
      }
    }

    if (t === Math.max(...timings.map(x => x.done)) + 1) {
      // UNVERIFIED tick: an always-applied Unbalanced (Fisherman, Wild Arrow, Flash) lands at the end
      for (const key of u.def.unbalances?.who ?? []) u.participants[u.def.participants.indexOf(key)].unbalance();
      this.turn.unite = null;
      return { status: DISPATCH_STATUS.DONE };
    }
    return { status: DISPATCH_STATUS.PENDING };
  }

  /**
   * A Command rune (the Rune command, AbilitySlot 0; no MP or charge cost). Starts on the tick it
   * resolves (t0, the ActionTag flip) and holds the turn until timing.end, leaving the gate
   * unchanged. Damage: calc_damage * mult on the target's own +0x50 step, so the target owns the
   * event. No hit or crit roll.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyCommandRune(character) {
    const { rune } = character;
    const def = rune.command;
    const timing = COMMAND_RUNE_TIMINGS[rune.id];
    if (!def || !timing) throw new Error(`${character.name}: ${rune.name} Rune not implemented`);
    if (def.target !== TARGET.ANY) throw new Error(`${rune.name}: targeting ${def.target} not implemented`);
    if (def.unbalances && timing.unbalanceRoll == null) throw new Error(`${rune.name}: Unbalanced roll timing unknown`);

    if (timing.idle && this.areAnyCombatantsBusy()) return { status: DISPATCH_STATUS.PENDING };

    let target = this.enemies.combatants[character.action.target ?? 0];
    if (!target?.isValidCombatant) {
      target = this.enemies.combatants.find(e => !e.outOfFight && e.HP - e.pendingDamage > 0); // battle_find_first_ready_enemy
      if (!target) {
        this.record(LOG_TYPES.DEFEND, character, null, { detail: `${rune.name} Rune: no target` });
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
      }
      this.record(LOG_TYPES.RETARGET, character, target);
    }

    this.record(LOG_TYPES.CAST, character, target, { detail: `${rune.name} Rune` });
    const S = this.turn.tick + (timing.start ?? 0);
    const goBusy = () => {
      character.busyUntil = S + timing.free;
      target.busyUntil = Math.max(target.busyUntil, S + timing.targetFree);
    };
    // Going busy after t0 happens in the cast entry on S; nothing else runs on this side before then
    if (S === this.turn.tick) goBusy();
    else this.queueEvent(S, character, goBusy);

    const mult10 = Math.round(def.mult * 10);
    this.queueEvent(S + timing.damage, target, () => {
      target.takeDamage(Math.trunc(character.calcAttackDamage(target, this.rng, false) * mult10 / 10));
    }, character);
    if (def.unbalances) {
      this.queueAnimationEvent(S + timing.unbalanceRoll, character, () => {
        this.rng.next(); // chance 100: always lands
        character.unbalance();
      });
    }
    this.turn.hold = { end: S + timing.end };
    return { status: DISPATCH_STATUS.PENDING };
  }

  /** @returns {DispatchResult} */
  continueHold() {
    const h = this.turn.hold;
    if (this.turn.tick < h.end) return { status: DISPATCH_STATUS.PENDING };
    h.onEnd?.();
    this.turn.hold = null;
    return { status: DISPATCH_STATUS.DONE, gate: h.gate };
  }

  /**
   * Whether the current actor has released COPY_ACTOR's hold (+0x30): at once for Defend, and
   * when a Rune / Item / Unite / enemy move is done (set in DISPATCH); a basic attack releases in
   * step 2 of the tick its recover script starts (releaseAt), so the held copy runs the next tick.
   * @returns {boolean}
   */
  isReleased() {
    return this.turn.release || (this.turn.releaseAt >= 0 && this.turn.tick > this.turn.releaseAt);
  }

  /**
   * COPY_ACTOR (LAB_800f3fec), every tick until it copies. The pending actor must still pass
   * check_combatant_alive, or it's back to the turn roll next tick (a reroll, which costs RNG).
   * Then, if holdFlag is set (a side switch at the roll, or a party crit), it waits, with no RNG,
   * for the current actor's release. Same side with no crit is never held.
   */
  copyActor() {
    const pending = this.combatants[this.turn.pending];
    if (!pending.isReadyTarget(this.turn.tick)) {
      this.phase = PHASE_STATE.ADVANCE_TURN; // UNVERIFIED (decompile only)
      return;
    }
    if (this.turn.holdFlag && !this.isReleased()) return;
    this.turn.release = false;
    this.turn.holdFlag = false;
    this.turn.releaseAt = -1;
    this.turn.current = this.turn.pending;
    this.phase = PHASE_STATE.DISPATCH;
  }

  /**
   * Everything a basic attack does after its hit / crit rolls at t0 (this tick):
   * busy windows, the damage roll(s) and effect flags, for either side.
   * @param {AttackParticipant} attacker
   * @param {AttackParticipant} target
   * @param {ATTACK_RESULT} result
   */
  applyAttackResult(attacker, target, result) {
    this.record(LOG_TYPES.ATTACK, attacker, target, { detail: result });
    const t0 = this.turn.tick;
    const a = attacker.attackTiming;
    const primed = (target.fx & 0x2) !== 0; // it dodged earlier and hasn't attacked since
    attacker.fx = 0; // the executor clears the attacker's effect flags
    attacker.busyUntil = t0 + a.free;
    if (a.recover == null) throw new Error(`${a.name}: recover timing unknown`);
    attacker.attackUntil = t0 + a.recover;
    if (result === ATTACK_RESULT.CRIT) this.turn.holdFlag = true; // battle_check_crit_and_branch

    switch (result) {
      case ATTACK_RESULT.HIT:
      case ATTACK_RESULT.CRIT: {
        const damageTick = t0 + a.damage;
        const reaction = attacker.reactionFrames(target); // null: this attack doesn't mark its target busy
        if (reaction !== null) target.busyUntil = Math.max(target.busyUntil, damageTick + reaction);
        this.queueEvent(damageTick, attacker, () => {
          target.takeDamage(attacker.calcAttackDamage(target, this.rng, result === ATTACK_RESULT.CRIT));
        });
        break;
      }
      case ATTACK_RESULT.MISSED:
        // The target plays its own dodge instead of the attacker's reaction
        attacker.busyUntil = t0 + (a.missFree ?? a.free);
        target.busyUntil = Math.max(target.busyUntil, t0 + this.dodgeFrames(a, target));
        target.fx |= 0x2; // its dodge sets 0x2 on itself
        break;
      case ATTACK_RESULT.COUNTERED: {
        // The target dodges, then strikes back: calc_damage(target, attacker) mid-turn, run on
        // the target's own continuation (so it's the event's owner)
        const c = target.attackTiming.counter;
        if (!c) throw new Error(`${target.name}: counter timing unknown`);
        if (a.dodgePoint == null || a.recover == null) throw new Error(`${a.name}: counter timing unknown`);
        const roll = primed
          ? a.dodgePoint + c.primed
          : Math.max(a.dodgePoint + c.afterPoint, a.damage + c.afterDamage);
        const recovery = a.free - a.recover; // < 0: its attack script clears its own busy (Assassin)
        attacker.busyUntil = recovery < 0 ? t0 + a.free : t0 + roll + c.attackerDelay + recovery;
        attacker.attackUntil = t0 + roll + c.attackerDelay; // its recover waits for the counter
        target.busyUntil = Math.max(target.busyUntil, t0 + roll + c.free);
        target.fx = 0; // its dodge sets 0x2, then the counter steps clear it
        this.queueEvent(t0 + roll, target, () => {
          attacker.takeDamage(target.calcAttackDamage(attacker, this.rng, false));
        });
        break;
      }
    }
    // Every recover script releases COPY_ACTOR's hold on its frame 0 (anim opcode 9), on any path
    this.turn.releaseAt = attacker.attackUntil;
  }

  /**
   * A missed basic attack: t0 -> the frame the target's own dodge script (table slot 3) stops
   * being busy.
   * @param {AttackTiming} attackerTiming
   * @param {AttackParticipant} target
   * @returns {number}
   */
  dodgeFrames(attackerTiming, target) {
    const { dodge } = target.attackTiming;
    if (!dodge) throw new Error(`${target.name}: dodge timing unknown`);
    if (attackerTiming.dodgePoint == null || attackerTiming.recover == null)
      throw new Error(`${attackerTiming.name}: miss timing unknown`);
    const afterPoint = attackerTiming.dodgePoint + dodge.afterPoint;
    // afterRecover null: this dodge doesn't wait for the attacker to finish (FurFur, BonBon)
    if (dodge.afterRecover === null) return afterPoint;
    return Math.max(afterPoint, attackerTiming.recover + dodge.afterRecover);
  }

  /**
   * battle_execute_enemy_attack (named backwards in Ghidra): a party member's basic Attack.
   * Runs every tick until it returns DONE.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyAttack(character) {
    const tick = this.turn.tick;
    const target = this.enemies.combatants[character.action.target ?? 0];

    // Queued target gone: retarget to the first valid enemy in combatant order (no range or
    // row check, no RNG). The attack runs against it on the next tick.
    if (!target?.isValidCombatant) {
      const retarget = this.enemies.combatants.findIndex(enemy => enemy.isValidCombatant);
      if (retarget === -1) return { status: DISPATCH_STATUS.DONE, gate: this.freeWillGate }; // UNVERIFIED: no enemy left
      character.action = { ...character.action, target: retarget };
      this.record(LOG_TYPES.RETARGET, character, this.enemies.combatants[retarget]);
      return { status: DISPATCH_STATUS.PENDING };
    }

    // Busy, or about to die from pending damage: wait (no RNG). The attacker keeps waiting on a
    // dying target until it's out of the fight, then retargets.
    if (!target.isReadyTarget(tick)) return { status: DISPATCH_STATUS.PENDING };

    // t0: hit and crit rolls now, everything else later
    this.applyAttackResult(character, target, character.calcAttackResult(target, this.rng));
    return { status: DISPATCH_STATUS.DONE, gate: this.freeWillGate };
  }

  /**
   * battle_try_special_attack: a party member uses an item from their own inventory. The menu
   * only offers items they hold, so a plan naming one they don't have (e.g. already used up on
   * an earlier turn) is invalid. `action.target` is a party index; omitted means the user.
   * Polled each tick until it resolves (R), then the turn is held until R + ITEM_TIMING.done and
   * ends with the gate unchanged. No RNG.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyItem(character) {
    const { itemKey } = character.action;
    if (!itemKey || !character.inventory.canUseInBattle(itemKey)) {
      throw new Error(`${character.name} can't use ${itemKey ?? 'no item'} in battle`);
    }
    const effect = ITEM_EFFECTS[itemKey];
    if (!effect) throw new Error(`${itemKey}: item effect not implemented`);
    const name = ITEMS[itemKey].name;
    const tick = this.turn.tick;

    // battle_check_all_combatants_idle: wait, no RNG
    if (this.areAnyCombatantsBusy()) return { status: DISPATCH_STATUS.PENDING };

    /** @type {Character[]} */
    let targets;
    /** @type {Character | null} */
    let target = null;
    if (effect.target === TARGET.AOE) {
      targets = this.party.combatants.filter(c => c.isValidCombatant);
    } else {
      target = this.party.combatants[character.action.target ?? this.party.combatants.indexOf(character)];
      // Not a valid combatant (e.g. already dead): Defend, nothing used up
      if (!target?.isValidCombatant) {
        this.record(LOG_TYPES.DEFEND, character, target ?? null, { detail: `${name}: no target` });
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
      }
      // check_combatant_alive fails (at 0 HP, death routine not run yet): wait
      if (!target.isReadyTarget(tick)) return { status: DISPATCH_STATUS.PENDING };
      targets = [target];
    }

    // R: used up, the user's item-use script starts
    character.inventory.use(itemKey);
    this.record(LOG_TYPES.ITEM, character, target, { detail: name });
    character.busyUntil = tick + (target && target !== character ? ITEM_TIMING.userFreeAlly : ITEM_TIMING.userFreeSelf);

    // R + done: the handler starts each target's script. UNVERIFIED: the heal / cure lands on
    // this tick too.
    const done = tick + ITEM_TIMING.done;
    for (const t of targets) {
      this.queueEvent(done, t, () => {
        t.busyUntil = Math.max(t.busyUntil, tick + ITEM_TIMING.targetFree);
        if (effect.heal) t.takeDamage(-effect.heal);
        if (effect.cure) t.status[effect.cure] = Combatant.createStatus()[effect.cure];
      }, character);
    }
    this.turn.hold = { end: done };
    return { status: DISPATCH_STATUS.PENDING };
  }

  /** @param {Enemy} enemy @returns DispatchResult */
  dispatchEnemy(enemy) {
    // Slept mid-round: turn over (DISPATCH sets ActionTag), gate unchanged
    if (enemy.isAsleep) return { status: DISPATCH_STATUS.DONE };

    const tick = this.turn.tick;
    const choice = enemy.selectAction({ party: this.party, enemies: this.enemies, rng: this.rng, tick, turn_count: this.turn_count });
    switch (choice.action) {
      case ACTION_TYPES.UNDETERMINED:
        return { status: DISPATCH_STATUS.PENDING };
      case ACTION_TYPES.NOTHING:
        this.record(LOG_TYPES.SKIP, enemy);
        return { status: DISPATCH_STATUS.DONE };
      case ACTION_TYPES.ATTACK:
        // The AI only picks targets that aren't busy, and the attack runs the same tick, so the
        // attack's own busy-target wait can't trigger here.
        return this.resolveEnemyAttack(enemy, choice.target);
      case ACTION_TYPES.ABILITY: {
        const { move, target } = choice;
        this.record(LOG_TYPES.CAST, enemy, target, { detail: move.name });
        if (move.strike) return this.resolveEnemyStrike(enemy, move, target);
        if (move.held) return this.resolveEnemyHeld(enemy, move, target);
        return this.castMagic(enemy, () => move.apply(enemy, { party: this.party, rng: this.rng, target }), move.cast.frames);
      }
      default:
        throw new Error(`${enemy.name}: unhandled AI result ${JSON.stringify(choice)}`);
    }
  }

  /**
   * Enemy basic attack. Enemies never roll a crit.
   * @param {Enemy} enemy
   * @param {Character} target
   * @returns {DispatchResult}
   */
  resolveEnemyAttack(enemy, target) {
    const tick = this.turn.tick;
    if (target.isBusy(tick)) return { status: DISPATCH_STATUS.PENDING }; // wait, no RNG

    const timing = enemy.attackTiming;
    if (timing.damage == null || timing.free == null) throw new Error(`${enemy.name}: ${timing.blocked}`);

    // TODO: cover check on a hit (target HP < floor(HPMax / 4) and a story pair, or Phero Rune)
    this.applyAttackResult(enemy, target, enemy.calcAttackResult(target, this.rng));
    return { status: DISPATCH_STATUS.DONE, gate: this.freeWillGate };
  }

  /**
   * A monster move timed like a basic attack (e.g. Sydonia's special): it starts now, marks its
   * target busy at once, and its damage (move.apply) lands at t0 + strike.damage. No hit roll.
   * @param {Enemy} enemy
   * @param {import('./EnemyAI.js').EnemyMove} move
   * @param {Character} target
   * @returns {DispatchResult}
   */
  resolveEnemyStrike(enemy, move, target) {
    const { strike } = move;
    const t0 = this.turn.tick;
    enemy.fx = 0;
    enemy.busyUntil = t0 + strike.free;
    enemy.attackUntil = t0 + strike.recover;
    this.turn.releaseAt = enemy.attackUntil; // UNVERIFIED: assumed to release like a basic attack's recover
    target.busyUntil = Math.max(target.busyUntil, t0 + strike.targetFree);
    this.queueEvent(t0 + strike.damage, enemy, () => move.apply(enemy, { party: this.party, rng: this.rng, target }));
    return { status: DISPATCH_STATUS.DONE, gate: this.freeWillGate }; // live: next roll the tick after
  }

  /**
   * A monster move that holds its turn on fixed offsets from its AI tick (t0), with no wait for
   * anyone to be idle (the AI only runs once its targets are free): damage (move.apply) at
   * t0 + held.damage, the turn ending at t0 + held.end with the gate at held.gate.
   * @param {Enemy} enemy
   * @param {import('./EnemyAI.js').EnemyMove} move
   * @param {Character} [target]
   * @returns {DispatchResult}
   */
  resolveEnemyHeld(enemy, move, target) {
    const { held } = move;
    const t0 = this.turn.tick;
    enemy.busyUntil = t0 + held.free;
    if (target && held.targetFree) target.busyUntil = Math.max(target.busyUntil, t0 + held.targetFree);
    this.queueEvent(t0 + held.damage, enemy, () => move.apply(enemy, { party: this.party, rng: this.rng, target }));
    this.turn.hold = { end: t0 + held.end, gate: held.gate };
    return { status: DISPATCH_STATUS.PENDING };
  }

  /** @param {Round} round */
  playTurn(round) {
    if (this.status !== BATTLE_STATUS.IN_PROGRESS) throw new Error(`Battle is over (${this.status}): no more rounds to play`);
    this.resetTurn();
    const actions = this.roundInput(round);
    if (!actions) return; // escaped: the round never starts
    this.party.setActionPlan(actions);
    this.party.combatants.forEach(combatant => combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND);
    this.roundStart();

    // Events get handled here

    while (this.phase !== PHASE_STATE.ROUND_OVER) {
      this.tick();
    }
    this.frames += this.turn.tick;
    this.checkOutcome();
  }

  /**
   * ROUND_INPUT: the Fight / Run / Bribe / Free Will menu, before the round starts.
   * @param {Round} round
   * @returns {Action[] | null} the party's actions, or null when Run escaped the battle
   */
  roundInput(round) {
    if (Array.isArray(round)) return round;
    switch (round.command) {
      case ROUND_COMMANDS.FIGHT:
        return round.actions ?? [];
      case ROUND_COMMANDS.FREE_WILL:
        this.freeWillGate = 10;
        this.record(LOG_TYPES.ROUND_COMMAND, null, null, { detail: round.command });
        return this.party.freeWillActions(this.enemies);
      case ROUND_COMMANDS.RUN:
        return this.tryEscape() ? null : this.party.combatants.map(() => DEFAULT_ACTION);
      case ROUND_COMMANDS.BRIBE:
        throw new Error('Bribe is not implemented');
      default:
        throw new Error(`Unknown round command ${JSON.stringify(round)}`);
    }
  }

  /**
   * Run: in an escapable battle, a party whose average LVL beats the enemies' escapes outright;
   * otherwise one RNG call decides it (RNG.isRun). Escaping ends the battle then and there. Failing,
   * or a battle that can't be escaped, leaves everyone Defending this round.
   * @returns {boolean} escaped
   */
  tryEscape() {
    let result = 'no escape';
    if (this.escapable) {
      const escaped = this.party.averageLVL > this.enemies.averageLVL || RNG.isRun(this.rng.next().getRNG2());
      result = escaped ? 'escaped' : 'failed';
    }
    this.record(LOG_TYPES.ROUND_COMMAND, null, null, { detail: `${ROUND_COMMANDS.RUN}: ${result}` });
    if (result !== 'escaped') return false;

    this.status = BATTLE_STATUS.ESCAPED;
    this.record(LOG_TYPES.BATTLE_END, null, null, { detail: this.status });
    return true;
  }

  roundStart() {
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      c.actionTag = (!c.isValidCombatant || c.isAsleep) ? 1 : 0;
    }
    this.enemies.wakePartyUp(this.rng);

    this.rng.next(); // Turn start camera roll, one of 3 variations
    this.turn_count++;
    this.record(LOG_TYPES.ROUND_START);

    // TODO: Apply Heal & Poison
    this.turn.rollGate = 30;
  }

  advanceTurnTick() {
    this.turn.rollGate -= 1;
    if (this.turn.rollGate > 0) return;

    this.turn.pending = this.turnRoll();
    if (this.turn.pending === -1) return // roll again next tick

    // Scripted battle hooks would go here i.e. Queen Ant stuff

    // Spark functionality would go here

    if (this.turn.pending === 0) {
      this.turn.rollGate = 30;
      this.phase = PHASE_STATE.ROUND_END_WAIT;
      return;
    }

    // A side switch from the current actor holds the copy until the current actor releases
    const isParty = (/** @type {number} */ idx) => idx >= 1 && idx <= this.party.partySize;
    if (isParty(this.turn.pending) !== isParty(this.turn.current)) this.turn.holdFlag = true;

    this.record(LOG_TYPES.TURN, this.combatants[this.turn.pending]);
    this.phase = PHASE_STATE.COPY_ACTOR;
  }

  // Mirrors the round driver LAB_800f72f0, then the animation pass. busyUntil models the
  // animation pass's busy clears; the death check is the part of it the sim runs.
  tick() {
    this.turnStep();            // 1. turn rolls, dispatch, hit/crit rolls
    this.runDueEvents();        // 2. damage functions due this tick (calc_damage rand())
    this.commitPendingDamage(); // 3. HP -= pending, pending = 0
    this.checkDeaths();         // animation pass: death routines
    this.turn.tick++;
  }

  /** @returns DispatchResult */
  dispatch() {
    if (this.turn.magic) return this.continueMagic();
    if (this.turn.unite) return this.continueUnite();
    if (this.turn.hold) return this.continueHold();
    const combatant = this.currentCombatant;
    const result = combatant.type === COMBATANT_SIDE.ALLY ? this.dispatchPlayer(combatant) : this.dispatchEnemy(combatant);
    return result;
  }

  turnStep() {
    switch(this.phase) {
      case PHASE_STATE.ADVANCE_TURN:
        this.advanceTurnTick()
        break;
      case PHASE_STATE.COPY_ACTOR:
        this.copyActor();
        break;
      case PHASE_STATE.DISPATCH: {
        const result = this.dispatch();
        if (result.status === DISPATCH_STATUS.PENDING) break;
        this.currentCombatant.setActed(true);
        // Anything but a basic attack releases the hold as it's done: Defend at once, a Rune /
        // Item / Unite when its handler finishes, an enemy asleep or doing nothing. UNVERIFIED for
        // enemy spells and held moves (their scripts' own releases aren't traced).
        if (this.turn.releaseAt < 0) this.turn.release = true;
        if (result.status === DISPATCH_STATUS.DONE && result.gate) this.turn.rollGate = result.gate;
        this.phase = PHASE_STATE.ADVANCE_TURN;
        break;
      }
      // 0x800f43e0: passes at P = the last busyUntil + 1 (B + 1)
      case PHASE_STATE.ROUND_END_WAIT: {
        this.turn.rollGate -= 1;
        if (this.turn.rollGate > 0) break;
        if (!this.areAnyCombatantsBusy()) this.phase = PHASE_STATE.ROUND_CHECK;
        break;
      }
      // 0x800f74a8, P + 1: victory / defeat check
      case PHASE_STATE.ROUND_CHECK:
        if (this.enemies.isDefeated) {
          this.turn.rollGate = 30;
          this.phase = PHASE_STATE.VICTORY_WAIT;
        } else if (!this.partyCanFight) {
          this.phase = PHASE_STATE.ROUND_OVER; // defeat: not traced further
        } else {
          this.phase = PHASE_STATE.ROUND_END_STATUS;
        }
        break;
      // battle_process_round_end_status_and_formation, P + 2 (B + 3)
      case PHASE_STATE.ROUND_END_STATUS:
        this.party.decayStatuses();
        // TODO: front-row backfill
        this.turn.holdFlag = false; // clears +0x30..+0x4c (release, holdFlag, Spark)
        this.turn.release = false;
        this.record(LOG_TYPES.ROUND_END);
        this.phase = PHASE_STATE.ROUND_OVER;
        break;
      // 0x800f78b0, P + 2 .. P + 32: a fixed 31-tick countdown. The round ends after it, so the
      // results (finish(): drop rolls) come at P + 33 = B + 34.
      case PHASE_STATE.VICTORY_WAIT:
        this.turn.rollGate -= 1;
        if (this.turn.rollGate < 0) this.phase = PHASE_STATE.ROUND_OVER;
        break;
    }
  }
}

/** @param {Round} round @returns {Round} */
function cloneRound(round) {
  if (Array.isArray(round)) return round.map(action => ({ ...action }));
  return { ...round, ...(round.actions && { actions: round.actions.map(action => ({ ...action })) }) };
}
