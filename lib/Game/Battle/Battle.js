import {
  ACTION_TYPES,
  DEFAULT_ACTION,
  ROUND_COMMANDS,
  UNBALANCED_ACTION_TYPES,
} from './Actions.js';
import { COMBATANT_SIDE, STATUS } from '../Constants.js';
import { DISPATCH_STATUS } from './BattleConstants.js';
import { applyAttackResult } from './AttackResolution.js';
import { dispatchPlayer, continueUnite, resolvePartyAttack } from './PartyActions.js';
import {
  dispatchEnemy,
  resolveEnemyAttack,
  resolveEnemyStrike,
  startHeld,
} from './EnemyActions.js';
import EventScheduler from './EventScheduler.js';
import TurnState from './TurnState.js';
import ActionLog, { LOG_TYPES } from './ActionLog.js';
import { KeyWriter, pushKeyInt } from '../../util/stateKey.js';
import { clamp } from '../../util/math.js';
import { shallowCloneInstance } from '../../util/clone.js';
import { ITEMS } from '../Items.js';
import { ITEM_KEYS } from '../Keys.js';
import { ATTACK_TIMING_CONSTANTS } from './AttackTimingConstants.js';
import { isRun } from '../Rolls.js';

/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./DamageMultiplier.js').DamageMultiplier} DamageMultiplier */
/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Party.js').EXPReward} EXPReward */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').Round} Round */
/** @typedef {import('./Actions.js').AttackRoll} AttackRoll */
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
 * @property {import('./Scripts/BattleScript.js').default | null} [script] - a scripted fight's callback
 *   (Scripts/BattleScript.js; see Scripts/QueenAnt.js): revives and ends the fight on its own terms
 */

/** @typedef {import('./BattleConstants.js').DispatchStatus} DispatchStatus */
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
  /** A scripted fight that ends by itself (Mt. Seifu's Queen Ant): no drop, no EXP, no results */
  SCRIPTED_END: 'Scripted End',
});

/** Reused by every stateKey call (never re-entered) */
const keyWriter = new KeyWriter();

/** Each status's index, for stateKey */
const BATTLE_STATUS_INDEX = new Map(Object.values(BATTLE_STATUS).map((status, i) => [status, i]));

/**
 * What happened once the battle ended, from Battle.finish().
 * @typedef {Object} BattleResult
 * @property {Item | null} drop - null when nothing dropped, or the battle was lost
 * @property {EXPReward[]} rewards - EXP and level-ups per party member, in slot order; empty when lost
 * @property {{ battleEnd: RNGSnapshot, afterDrop?: RNGSnapshot, afterLevelUps?: RNGSnapshot }} rng -
 *   afterDrop and afterLevelUps only when won
 */

/** @typedef {Pick<import('./EnemyAttackTimings.js').EnemyAttackTiming, 'name' | 'damage' | 'free' | 'dodgePoint' | 'recover' | 'dodge' | 'counter' | 'missFree' | 'reactionStatus'>} AttackTiming */

/**
 * What basic-attack resolution needs beyond Combatant; Character and Enemy both provide it.
 * @typedef {Object} AttackMethods
 * @property {AttackTiming} attackTiming
 * @property {(target: any) => number | null} reactionFrames
 * @property {(target: any, rng: RNG, mult?: DamageMultiplier) => number} calcAttackDamage
 */
/** @typedef {Combatant & AttackMethods} AttackParticipant */

/**
 * A scheduled callback (queueEvent, queueAnimationEvent, a spell's resolve). It gets the battle it
 * runs in, which may be a mid-round clone, and reaches every combatant and the RNG through it.
 * @callback EventFn
 * @param {Battle} battle
 * @returns {void}
 */

/** @typedef {import('./EventScheduler.js').ScheduledEvent} ScheduledEvent */

/** @typedef {import('./TurnState.js').MagicCast} MagicCast */
/** @typedef {import('./TurnState.js').UniteRun} UniteRun */
/** @typedef {import('./TurnState.js').TurnHold} TurnHold */

/**
 * @typedef {Object} DispatchResult
 * @property {DispatchStatus} status
 * @property {number} [gate]
 * @property {number} [until] - pending only, for a pure wait (no RNG, no state change): the first
 *   tick it could do anything else, as long as no event, animation or death comes first. Lets
 *   playTurn skip the ticks in between (skipIdleTicks). Leave it out when unsure.
 */

export default class Battle {
  /** Wind-up of a spell or monster special with no measured `frames` (artificial) */
  static DEFAULT_CAST_FRAMES = 300;

  /** @param {BattleOptions} options */
  constructor({
    party,
    enemies,
    rng,
    turns = [],
    turn_count = 0,
    freeWillGate = 0,
    escapable = true,
    logging = true,
    script = null,
  }) {
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
    /** @type {import('./Scripts/BattleScript.js').default | null} a scripted fight's callback, see Scripts/BattleScript.js */
    this.script = script;
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
   * are all copies, so playing either one never touches the other. Works at any tick, mid-round
   * too: scheduled events are copied (their callbacks run on whichever battle calls them, see
   * queueEvent), and a spell / Unite / hold in progress points at the copy's own combatants.
   * @returns {Battle}
   */
  clone() {
    const copy = shallowCloneInstance(this);
    copy.party = this.party.clone();
    copy.enemies = this.enemies.clone();
    copy.combatants = [null, ...copy.party.combatants, ...copy.enemies.combatants];
    copy.rng = this.rng.clone();
    copy.turns = this.turns.map(cloneRound);
    /** @template {Combatant | null | undefined} T @param {T} c @returns {T} the copy's own */
    const remap = (c) =>
      c && /** @type {T} */ (/** @type {unknown} */ (copy.combatants[this.indexOf(c)]));
    copy.turn = this.turn.clone(remap);
    // The records never change once queued; each battle gets its own lists (runDueEvents sorts them)
    copy.scheduler = this.scheduler.clone();
    copy.script = this.script && this.script.clone();
    copy.log = this.logging ? this.log.clone() : this.log; // not logging: nothing writes it, so share it
    copy.result = this.result && {
      ...this.result,
      // Point at the copy's own party members
      rewards: this.result.rewards.map((reward) => ({
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
    if (this.script?.fightEnding) this.status = BATTLE_STATUS.SCRIPTED_END;
    else if (this.enemies.isDefeated) this.status = BATTLE_STATUS.WON;
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
    return this.party.combatants.some((c) => c.isValidCombatant && !c.isAsleep);
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
    this.record(
      LOG_TYPES.DROP,
      null,
      null,
      this.result.drop ? { detail: this.result.drop.name } : {},
    );
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
      if (levels > 0)
        this.record(LOG_TYPES.LEVEL_UP, character, null, {
          detail: `LVL ${fromLVL} -> ${fromLVL + levels}`,
          rng: rng.count,
        });
      before = rng.count;
    }
  }

  /**
   * Everything that decides how later rounds play out, for merging brute-force branches: the
   * status, RNG, round count (enemy AI reads it), Free Will's roll gate and every combatant's
   * stateKeyInto. Frames and the log are left out: they're history, not state. Only meaningful
   * between rounds, when nothing is in flight.
   *
   * A compact string for use as a Map key, not for reading: each value is one 16-bit code unit
   * (pushKeyInt), so equal keys mean equal values.
   * @returns {string}
   */
  stateKey() {
    const out = keyWriter.reset();
    pushKeyInt(out, BATTLE_STATUS_INDEX.get(this.status));
    pushKeyInt(out, this.rng.raw);
    pushKeyInt(out, this.rng.count);
    pushKeyInt(out, this.turn_count);
    pushKeyInt(out, this.freeWillGate);
    for (let i = 1; i < this.combatants.length; i++) this.combatants[i].stateKeyInto(out);
    return out.toString();
  }

  /**
   * @param {Combatant | null | undefined} combatant
   * @returns {number} its combatant index (party from 1, then enemies), -1 if it isn't in this battle
   */
  indexOf(combatant) {
    return this.combatants.indexOf(/** @type {Character | Enemy} */ (combatant));
  }

  /** Tick -> the events scheduled for it (see EventScheduler) */
  get events() {
    return this.scheduler.events;
  }

  /** Tick -> the animation-pass events scheduled for it */
  get animationEvents() {
    return this.scheduler.animationEvents;
  }

  get currentCombatant() {
    return this.combatants[this.turn.current];
  }

  resetTurn() {
    this.turn = new TurnState();

    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.party.clearTurnState();
    this.enemies.clearTurnState();

    this.scheduler = new EventScheduler();
    /** Someone may be under 1 HP and still in the fight, so checkDeaths has work to do */
    this.deathCheckDue = true;
  }

  /**
   * Schedules fn for step 2 of that tick (after the turn step, before the damage commit),
   * e.g. a basic attack's calc_damage rand() at t0 + timing.damage. Step 2 runs each
   * combatant's +0x50 callback in combatant index order, so fn runs in its owner's place:
   * the attacker for hit / miss / cover, the retaliator for a counter's damage.
   *
   * fn is called with the battle it runs in, which is a clone's own when the battle was cloned
   * mid-round: it must reach combatants, the RNG and the parties through that argument (by
   * combatant index) and capture only indices and static data, never this battle's objects.
   * @param {number} tick
   * @param {Combatant} owner
   * @param {EventFn} fn
   * @param {Combatant} [actor] - who the log credits the damage to, when not the owner
   */
  queueEvent(tick, owner, fn, actor = owner) {
    if (tick < this.turn.tick)
      throw new Error(`queueEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.indexOf(owner);
    if (ownerIdx < 1) throw new Error(`queueEvent: ${owner?.name} isn't in this battle`);
    const event = { ownerIdx, fn, actorIdx: this.indexOf(actor) };
    this.scheduler.addEvent(tick, event);
  }

  /**
   * Schedules fn for that tick's animation pass (after the damage commit), in its owner's own
   * update: before the owner's death check, after every lower-index combatant's. E.g. an
   * animation opcode 40 status roll. fn follows queueEvent's rules: it gets the battle it runs in.
   * @param {number} tick
   * @param {Combatant} owner
   * @param {EventFn} fn
   */
  queueAnimationEvent(tick, owner, fn) {
    if (tick < this.turn.tick)
      throw new Error(`queueAnimationEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.indexOf(owner);
    if (ownerIdx < 1) throw new Error(`queueAnimationEvent: ${owner?.name} isn't in this battle`);
    this.scheduler.addAnimationEvent(tick, { ownerIdx, fn });
  }

  /** @returns {boolean} whether any event ran */
  runDueEvents() {
    if (this.turn.tick < this.scheduler.nextEventAt) return false; // most ticks: nothing due, no call
    const due = this.scheduler.takeDue(this.turn.tick);
    if (!due) return false;
    for (const { fn, actorIdx } of due) {
      if (!this.logging) {
        fn(this);
        continue;
      }
      // Log whatever damage the callback queued, credited to its actor (usually the owner)
      const actor = this.combatants[actorIdx];
      const pendingBefore = this.combatants.map((c) => c?.pendingDamage);
      fn(this);
      this.combatants.forEach((c, i) => {
        if (!c || c.pendingDamage === pendingBefore[i]) return;
        this.record(LOG_TYPES.DAMAGE, actor, c, {
          amount: c.pendingDamage - pendingBefore[i],
          hp: clamp(c.HP - c.pendingDamage, 0, c.stats.HP),
        });
      });
    }
    return true;
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
      rng: this.rng.count,
      ...(actor && { actor: actor.label }),
      ...(target && { target: target.label }),
      ...fields,
    });
  }

  /** @returns {boolean} whether anyone had pending damage */
  commitPendingDamage() {
    let committed = false;
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      if (c.pendingDamage === 0) continue;
      committed = true;
      c.commitPendingDamage();
      if (c.HP < 1) this.deathCheckDue = true;
    }
    return committed;
  }

  /**
   * The death check in the animation pass (FUN_800e09bc): each combatant in index order, right
   * after its own update. Still in the fight, HP < 1 and not busy once this tick's animation
   * pass clears busy. So death starts on the tick the lethal hit's reaction ends.
   */
  /** @returns {boolean} whether anything happened: an animation event, a death or a revive */
  checkDeaths() {
    const tick = this.turn.tick;
    const animations = this.scheduler.animationEvents.size
      ? this.scheduler.takeAnimationEvents(tick)
      : undefined;
    // Nobody is under 1 HP and still in the fight, and there's nothing to animate: skip the pass
    if (!animations && !this.deathCheckDue) return false;
    let happened = !!animations;
    let stillDue = false;
    for (let i = 1; i < this.combatants.length; i++) {
      if (animations) for (const { ownerIdx, fn } of animations) if (ownerIdx === i) fn(this);
      const c = this.combatants[i];
      if (c.outOfFight || c.HP >= 1) continue;
      stillDue = true; // until it dies, or its HP comes back up
      if (c.busyUntil > tick) continue;
      happened = true;
      if (
        c.type === COMBATANT_SIDE.ALLY &&
        /** @type {Character} */ (c).inventory.has(ITEM_KEYS.SACRIFICIAL_BUDDHA)
      ) {
        this.reviveWithBuddha(/** @type {Character} */ (c));
        continue;
      }
      c.die(tick);
      this.record(LOG_TYPES.DEATH, null, c);
    }
    this.deathCheckDue = stillDue;
    return happened;
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
    this.record(LOG_TYPES.REVIVE, null, character, {
      detail: ITEMS[ITEM_KEYS.SACRIFICIAL_BUDDHA].name,
    });
    character.busyUntil = tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaFree;
    const i = this.indexOf(character);
    this.queueEvent(tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaHeal, character, (b) => {
      const c = b.combatants[i];
      c.takeDamage(-Math.floor(c.stats.HP / 2));
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
    let best = 0,
      bestWeight = 0; // best: 0 = none yet, -1 = none yet, someone busy
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      if (c.acted) continue;
      if (c.isBusy(this.turn.tick)) {
        // free skip
        if (best === 0) best = -1;
        continue;
      }
      const weight = c.genSpdRoll(this.rng); // one rand() per candidate, even invalid ones

      // first candidate: no validity check (dead ones never get here: ActionTag = 1)
      if (best < 1) {
        best = i;
        bestWeight = weight;
      }

      // strict: ties keep lower idx
      else if (bestWeight < weight && this.combatants[i].isValidCombatant) {
        best = i;
        bestWeight = weight;
      }
    }
    return best;
  }

  /**
   * A party member's basic attack. See PartyActions.js.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyAttack(character) {
    return resolvePartyAttack(this, character);
  }

  /** The hit, crit and damage handling of a basic attack. See AttackResolution.js. @param {AttackParticipant} attacker @param {AttackParticipant} target @param {import('./Actions.js').ATTACK_RESULT} result @param {Character | null} [cover] @param {AttackRoll[] | null} [rolls] */
  applyAttackResult(attacker, target, result, cover = null, rolls = null) {
    return applyAttackResult(this, attacker, target, result, cover, rolls);
  }

  /**
   * An enemy's turn. See EnemyActions.js.
   * @param {Enemy} enemy
   * @returns {DispatchResult}
   */
  dispatchEnemy(enemy) {
    return dispatchEnemy(this, enemy);
  }

  /**
   * An enemy's basic attack. See EnemyActions.js.
   * @param {Enemy} enemy @param {Character} target
   * @returns {DispatchResult}
   */
  resolveEnemyAttack(enemy, target) {
    return resolveEnemyAttack(this, enemy, target);
  }

  /**
   * One enemy move's strike. See EnemyActions.js.
   * @param {Enemy} enemy @param {import('./EnemyAI.js').EnemyMove} move @param {Character} target
   * @returns {DispatchResult}
   */
  resolveEnemyStrike(enemy, move, target) {
    return resolveEnemyStrike(this, enemy, move, target);
  }

  /**
   * Starts a spell or monster special. Real cast timing isn't modelled; the phases are:
   *   1. wait until previous actions are fully resolved (nobody busy, no damage rolls queued)
   *   2. wind-up: `frames` ticks (artificial until measured). Nothing rolls RNG meanwhile.
   *   3. resolve: every roll and all the damage on one tick (step 2, in `resolve`'s order)
   *   4. the turn ends on the next tick
   * The turn is held throughout, so no one else acts.
   * @param {Character | Enemy} caster
   * @param {EventFn} resolve - makes the rolls and calls takeDamage on each target (queueEvent's rules)
   * @param {number} [frames]
   * @param {number} [tail] - ticks the turn is held past the usual end, for a spell whose machine runs on
   *   after its damage (the Magic Unites)
   * @returns {DispatchResult}
   */
  castMagic(caster, resolve, frames = Battle.DEFAULT_CAST_FRAMES, tail = 0) {
    this.turn.magic = { caster, resolve, frames, tail, readyTick: null, resolved: false };
    return this.continueMagic();
  }

  /** @returns {DispatchResult} the gate is left unchanged, like the game's cast state machines */
  continueMagic() {
    const magic = this.turn.magic;
    const tick = this.turn.tick;
    if (magic.readyTick === null) {
      if (this.areAnyCombatantsBusy() || this.scheduler.size) {
        // Waiting on events ends no sooner than the next one (which stops any skip anyway)
        return {
          status: DISPATCH_STATUS.PENDING,
          until: this.scheduler.size ? Infinity : this.allIdleAt(),
        };
      }
      magic.readyTick = tick;
    }
    if (tick < magic.readyTick + magic.frames)
      return { status: DISPATCH_STATUS.PENDING, until: magic.readyTick + magic.frames };
    if (!magic.resolved) {
      magic.resolved = true;
      this.queueEvent(tick, magic.caster, magic.resolve);
      return { status: DISPATCH_STATUS.PENDING };
    }
    const endTick = magic.readyTick + magic.frames + 1 + magic.tail;
    if (tick < endTick) return { status: DISPATCH_STATUS.PENDING, until: endTick };
    this.turn.magic = null;
    return { status: DISPATCH_STATUS.DONE };
  }

  /** @returns {DispatchResult} */
  continueHold() {
    const h = this.turn.hold;
    if (h.pending) {
      const { from, enemyIdx, move, targetIdx } = h.pending;
      const tick = this.turn.tick;
      if (tick < from) return { status: DISPATCH_STATUS.PENDING, until: from };
      let idleAt = tick;
      for (const c of this.party.combatants)
        if (!c.outOfFight && c.isBusy(tick)) idleAt = Math.max(idleAt, c.busyUntil + 1);
      if (idleAt > tick) return { status: DISPATCH_STATUS.PENDING, until: idleAt };
      startHeld(
        this,
        /** @type {Enemy} */ (this.combatants[enemyIdx]),
        move,
        targetIdx < 0 ? undefined : /** @type {Character} */ (this.combatants[targetIdx]),
      );
      return { status: DISPATCH_STATUS.PENDING };
    }
    if (this.turn.tick < h.end) return { status: DISPATCH_STATUS.PENDING, until: h.end };
    h.onEnd?.(this);
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
      this.phase = PHASE_STATE.ADVANCE_TURN;
      return;
    }
    if (this.turn.holdFlag && !this.isReleased()) {
      if (this.turn.releaseAt >= 0) this.turn.wake = this.turn.releaseAt + 1;
      return;
    }
    this.turn.release = false;
    this.turn.holdFlag = false;
    this.turn.releaseAt = -1;
    this.turn.current = this.turn.pending;
    this.phase = PHASE_STATE.DISPATCH;
  }

  /** @param {Round} round */
  playTurn(round) {
    if (this.beginRound(round) && !this.playRound()) {
      throw new Error(
        `playTurn: ${this.currentCombatant.name}'s action is deferred; use playRound and chooseAction`,
      );
    }
  }

  /**
   * Takes the round's input and starts it (tick 0): the first half of playTurn.
   * @param {Round} round
   * @returns {boolean} false if the party escaped, so the round never starts
   */
  beginRound(round) {
    if (this.status !== BATTLE_STATUS.IN_PROGRESS)
      throw new Error(`Battle is over (${this.status}): no more rounds to play`);
    this.resetTurn();
    const actions = this.roundInput(round);
    if (!actions) return false; // escaped: the round never starts
    this.party.setActionPlan(actions);
    this.party.combatants.forEach(
      (combatant) => (combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND),
    );
    this.roundStart();
    return true;
  }

  /**
   * Plays a begun round from wherever it is to its end, then ends it (endRound). Stops early,
   * before anything reads it, at the first dispatch tick of a party member whose action is
   * deferred (ACTION_TYPES.DEFERRED): chooseAction, then call this again to carry on.
   * @returns {boolean} true once the round is over, false when stopped for a choice
   */
  playRound() {
    while (this.phase !== PHASE_STATE.ROUND_OVER) {
      if (this.awaitingChoice !== null) return false;
      this.tick();
      this.skipIdleTicks();
    }
    this.endRound();
    return true;
  }

  /**
   * @returns {number | null} the party index (0-based slot) of the member whose turn is being
   *   dispatched with a deferred action, before its first dispatch tick; null otherwise
   */
  get awaitingChoice() {
    if (this.phase !== PHASE_STATE.DISPATCH || this.turn.magic || this.turn.unite || this.turn.hold)
      return null;
    const actor = this.currentCombatant;
    if (
      actor.type !== COMBATANT_SIDE.ALLY ||
      /** @type {Character} */ (actor).action?.type !== ACTION_TYPES.DEFERRED
    )
      return null;
    return this.turn.current - 1;
  }

  /**
   * Gives the member awaitingChoice its action, which runs from this tick exactly as if it had
   * been planned at round start. Defend and Unites can't be deferred (see ACTION_TYPES.DEFERRED).
   * @param {Action} action
   */
  chooseAction(action) {
    const slot = this.awaitingChoice;
    if (slot === null) throw new Error('chooseAction: nobody is waiting for an action');
    const actor = this.party.combatants[slot];
    if (
      action.type === ACTION_TYPES.DEFEND ||
      action.type === ACTION_TYPES.UNITE ||
      action.type === ACTION_TYPES.DEFERRED
    ) {
      throw new Error(`chooseAction: ${action.type} can only be chosen at round start`);
    }
    if (actor.isUnbalanced && !UNBALANCED_ACTION_TYPES.includes(action.type)) {
      throw new Error(
        `${actor.name} is Unbalanced: can only Defend or use an Item, not ${action.type}`,
      );
    }
    actor.setAction(action);
  }

  /** Once the round is over: counts its frames and checks whether the battle ended. */
  endRound() {
    this.frames += this.turn.tick + (this.script?.fightEnding ? this.script.exitDelay : 0);
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
   * otherwise one RNG call decides it (isRun). Escaping ends the battle then and there. Failing,
   * or a battle that can't be escaped, leaves everyone Defending this round.
   * @returns {boolean} escaped
   */
  tryEscape() {
    let result = 'no escape';
    if (this.escapable) {
      const escaped =
        this.party.averageLVL > this.enemies.averageLVL || isRun(this.rng.next().rand);
      result = escaped ? 'escaped' : 'failed';
    }
    this.record(LOG_TYPES.ROUND_COMMAND, null, null, {
      detail: `${ROUND_COMMANDS.RUN}: ${result}`,
    });
    if (result !== 'escaped') return false;

    this.status = BATTLE_STATUS.ESCAPED;
    this.record(LOG_TYPES.BATTLE_END, null, null, { detail: this.status });
    return true;
  }

  roundStart() {
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      c.actionTag = !c.isValidCombatant || c.isAsleep ? 1 : 0;
    }
    this.enemies.wakePartyUp(this.rng);

    this.rng.next(); // Turn start camera roll, one of 3 variations
    this.turn_count++;
    this.record(LOG_TYPES.ROUND_START);

    // battle_refresh_combatant_derived_stats (0x800f6ea0), after the camera roll, no RNG. Poison:
    // floor(HPMax / 20) per round, queued as pending damage (committed on the first tick), netted
    // against regen (+5 per regen item, weapon-type-2 mastery x5, Sunbeam) and skipped if the net
    // is exactly 0. Regen isn't modelled yet. Poison has no duration: it lasts until cured or death.
    // UNVERIFIED: whether a tick can kill.
    for (const c of this.party.combatants) {
      if (c.outOfFight) continue;
      let heal = 0;
      if (c.status[STATUS.POISON]) heal -= Math.floor(c.stats.HP / 20);
      if (heal !== 0) c.takeDamage(-heal);
    }
    this.turn.rollGate = 30;
    this.script?.onRoundStart();
  }

  advanceTurnTick() {
    this.turn.rollGate -= 1;
    if (this.turn.rollGate > 0) {
      this.turn.wake = this.turn.tick + this.turn.rollGate; // the tick the gate reaches 0
      return;
    }

    // A scripted fight's callback runs on every tick the gate is at or below 0, before the roll
    this.script?.poll(this);

    this.turn.pending = this.turnRoll();
    // Nobody left to act, but a dead ant holds the round open until the callback revives it
    if (this.turn.pending === 0 && this.script?.blocksRoundEnd(this)) this.turn.pending = -1;
    if (this.turn.pending === -1) {
      // everyone yet to act is busy: roll again (no RNG) once one is free
      let free = this.script?.nextDue(this) ?? Infinity;
      for (let i = 1; i < this.combatants.length; i++) {
        const c = this.combatants[i];
        if (!c.acted) free = Math.min(free, c.busyUntil + 1);
      }
      this.turn.wake = free;
      return;
    }

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
    this.turn.wake = null;
    this.turnStep(); // 1. turn rolls, dispatch, hit/crit rolls
    const events = this.runDueEvents(); // 2. damage functions due this tick (calc_damage rand())
    const committed = this.commitPendingDamage(); // 3. HP -= pending, pending = 0
    const animated = this.checkDeaths(); // animation pass: death routines
    this.turn.quiet = !events && !committed && !animated;
    this.turn.tick++;
  }

  /**
   * Jumps over ticks that would change nothing but countdowns, after a tick whose turn step was a
   * pure wait (it set turn.wake) and whose steps 2-4 did nothing (turn.quiet). The state is then
   * the same next tick, so the wait holds until its wake tick, unless an event, animation or death
   * comes first. Only the roll-gate countdowns (turn roll, round end, victory) run meanwhile.
   */
  skipIdleTicks() {
    const { wake, quiet } = this.turn;
    if (wake === null || !quiet) return;
    const to = Math.min(wake, this.nextEventTick(), this.nextDeathTick());
    const skipped = to - this.turn.tick;
    if (!(skipped > 0) || !Number.isFinite(to)) return;
    if (
      this.phase === PHASE_STATE.ADVANCE_TURN ||
      this.phase === PHASE_STATE.ROUND_END_WAIT ||
      this.phase === PHASE_STATE.VICTORY_WAIT
    )
      this.turn.rollGate -= skipped;
    this.turn.tick = to;
  }

  /** @returns {number} the earliest tick with a scheduled event or animation event, Infinity if none */
  nextEventTick() {
    return this.scheduler.nextTick();
  }

  /**
   * @returns {number} the earliest tick checkDeaths could kill (or revive) someone: a combatant
   *   under 1 HP, still in the fight, once its busy ends. Infinity if nobody's under 1 HP.
   */
  nextDeathTick() {
    if (!this.deathCheckDue) return Infinity;
    let next = Infinity;
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      if (!c.outOfFight && c.HP < 1 && c.busyUntil < next) next = c.busyUntil;
    }
    return Math.max(next, this.turn.tick);
  }

  /** @returns {number} the first tick nobody is busy (areAnyCombatantsBusy turns false) */
  allIdleAt() {
    let last = -1;
    for (let i = 1; i < this.combatants.length; i++)
      last = Math.max(last, this.combatants[i].busyUntil);
    return last + 1;
  }

  /**
   * @param {Combatant} target
   * @returns {number} the first tick target.isReadyTarget can turn true, given no event: once its
   *   busy ends, or never (Infinity) while it's dying, which only a death check changes
   */
  readyAt(target) {
    return target.HP - target.pendingDamage > 0 ? target.busyUntil + 1 : Infinity;
  }

  /** @returns DispatchResult */
  dispatch() {
    if (this.turn.magic) return this.continueMagic();
    if (this.turn.unite) return continueUnite(this);
    if (this.turn.hold) return this.continueHold();
    const combatant = this.currentCombatant;
    const result =
      combatant.type === COMBATANT_SIDE.ALLY
        ? dispatchPlayer(this, combatant)
        : dispatchEnemy(this, combatant);
    return result;
  }

  turnStep() {
    switch (this.phase) {
      case PHASE_STATE.ADVANCE_TURN:
        this.advanceTurnTick();
        break;
      case PHASE_STATE.COPY_ACTOR:
        this.copyActor();
        break;
      case PHASE_STATE.DISPATCH: {
        this.script?.onSelected(this, this.turn.current); // its turn tag: set as its dispatch starts
        const result = this.dispatch();
        if (result.status === DISPATCH_STATUS.PENDING) {
          if (result.until !== undefined) this.turn.wake = result.until;
          break;
        }
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
        if (this.turn.rollGate > 0) {
          this.turn.wake = this.turn.tick + this.turn.rollGate;
          break;
        }
        if (this.areAnyCombatantsBusy()) this.turn.wake = this.allIdleAt();
        else if (this.script?.blocksRoundEnd(this)) {
          // An ant died after the round end began: the callback runs now. Once it has revived
          // everyone the round-end path starts over (a dying one: back to polling for it)
          this.script.poll(this);
          if (this.script.blocksRoundEnd(this)) {
            this.turn.rollGate = 1;
            this.phase = PHASE_STATE.ADVANCE_TURN;
          } else {
            this.turn.rollGate = 30;
            this.turn.wake = this.turn.tick + 30;
          }
        } else this.phase = PHASE_STATE.ROUND_CHECK;
        break;
      }
      // 0x800f74a8, P + 1: victory / defeat check
      case PHASE_STATE.ROUND_CHECK:
        if (this.enemies.isDefeated || this.script?.fightEnding) {
          // the scripted end plays like a victory
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
        // Front-row backfill, party first, then enemies. Nothing moves at any other time (positions
        // are part of stateKey). TODO: the step-forward animation's busy time, if any, isn't modelled.
        for (const { combatant, from } of [
          ...this.party.backfill(this.turn.tick),
          ...this.enemies.backfill(),
        ]) {
          this.record(LOG_TYPES.FORMATION, combatant, null, {
            detail: `slot ${from} -> ${combatant.position}`,
          });
        }
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
        else this.turn.wake = this.turn.tick + this.turn.rollGate + 1; // the tick it goes below 0
        break;
    }
  }

  /**
   * The headline numbers of a battle right now, for checking a capture round by round: the RNG
   * (value and call count), each party member's HP by name and by formation slot (0-based, the
   * order the party was built in), and each enemy's HP by slot.
   * @param {Battle} battle
   * @returns {{ rng: number, count: number, partyHPByName: Record<string, number>, partyHPBySlot: number[], enemyHPBySlot: number[] }}
   */
  static snapshot(battle) {
    return {
      rng: battle.rng.raw,
      count: battle.rng.count,
      partyHPByName: Object.fromEntries(battle.party.combatants.map((c) => [c.name, c.HP])),
      partyHPBySlot: battle.party.combatants.map((c) => c.HP),
      enemyHPBySlot: battle.enemies.combatants.map((c) => c.HP),
    };
  }
}

/** @param {Round} round @returns {Round} */
function cloneRound(round) {
  if (Array.isArray(round)) return round.map((action) => ({ ...action }));
  return {
    ...round,
    ...(round.actions && { actions: round.actions.map((action) => ({ ...action })) }),
  };
}
