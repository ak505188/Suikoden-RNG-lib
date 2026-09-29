import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { COMBATANT_SIDE, TARGET } from '../Constants.js';
import { spellEffect, spellRand } from '../Magic/Behavior.js';
import ActionLog from './ActionLog.js';
import { clamp } from '../../lib.js';
import { UNITES } from '../Unites.js';
import { ITEMS } from '../Items.js';
import { ITEM_EFFECTS } from '../ItemEffects.js';
import { ITEM_KEYS } from '../Keys.js';
import { ITEM_TIMING } from './ItemTimings.js';
import { ATTACK_TIMING_CONSTANTS } from './AttackTimingConstants.js';
import Combatant from './Combatant.js';
import { UNITE_RETURN_FRAMES, UNITE_TIMINGS } from './UniteTimings.js';
import { COMMAND_RUNE_TIMINGS } from './CommandRuneTimings.js';
import { RUNES, RUNE_TYPES } from '../Magic/Runes.js';

/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../../rng.js').RNGSnapshot} RNGSnapshot */
/** @typedef {import('../Items.js').Item} Item */

/**
 * @typedef {Object} BattleOptions
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {Action[][]} [turns] - One entry per round; each round is one Action per party-member slot.
 * @property {number} [turn_count]
 * @property {number} [freeWillGate] - g_FreeWillGate: the roll gate a basic attack sets. 10 once
 *   Free Will has been chosen; nothing resets it, so probably 0 until then.
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
  ROUND_OVER: 'Round Over',
});

/** @typedef {typeof BATTLE_STATUS[keyof typeof BATTLE_STATUS]} BattleStatus */
export const BATTLE_STATUS = /** @type {const} */ ({
  IN_PROGRESS: 'In Progress',
  WON: 'Won',
  LOST: 'Lost',
});

/**
 * What happened once the battle ended.
 * @typedef {Object} BattleResult
 * @property {Item | null} drop - null when nothing dropped, or the battle was lost
 * @property {{ battleEnd: RNGSnapshot, afterDrop?: RNGSnapshot }} rng - afterDrop only when won
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

  /**
   * @param {BattleOptions} options
   */
  constructor({ party, enemies, rng, turns = [], turn_count = 0, freeWillGate = 0 }) {
    this.party = party;
    this.enemies = enemies;
    this.combatants = [null, ...party.combatants, ...enemies.combatants];
    this.party.resetBattleState();
    this.enemies.resetBattleState();
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
    this.freeWillGate = freeWillGate;
    this.log = new ActionLog();
    this.frames = 0; // Total ticks (= frames) across every round played, for scoring
    /** @type {BattleStatus} */
    this.status = BATTLE_STATUS.IN_PROGRESS;
    /** @type {BattleResult | null} null while IN_PROGRESS */
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
    if (this.events.size || magic || unite || hold) {
      throw new Error('Battle.clone: an action is still in flight; clone between rounds');
    }
    const copy = Object.assign(Object.create(Battle.prototype), this);
    copy.party = this.party.clone();
    copy.enemies = this.enemies.clone();
    copy.combatants = [null, ...copy.party.combatants, ...copy.enemies.combatants];
    copy.rng = this.rng.cloneKeepIndex();
    copy.turns = this.turns.map(turn => turn.map(action => ({ ...action })));
    copy.turn = { ...this.turn };
    copy.events = new Map();
    copy.log = this.log.clone();
    copy.result = this.result && {
      ...this.result,
      rng: structuredClone(this.result.rng), // plain numbers only; the rest of result holds shared references
    };
    return copy;
  }

  /** Plays the planned rounds until the battle ends. Rounds planned past that are never played. */
  run() {
    for (const turn of this.turns) {
      if (this.status !== BATTLE_STATUS.IN_PROGRESS) break;
      this.playTurn(turn);
    }
  }

  /**
   * Runs once a round is over: every remaining turn roll and action (e.g. a Medicine planned after
   * the last enemy died) and the round-end wait have all played out. Won when every enemy is dead
   * or removed, lost when every party member is.
   * @returns {BattleStatus}
   */
  checkOutcome() {
    if (this.enemies.isDefeated) this.status = BATTLE_STATUS.WON;
    else if (this.party.isDefeated) this.status = BATTLE_STATUS.LOST;
    else return this.status;

    this.result = { drop: null, rng: { battleEnd: this.rng.snapshot() } };
    this.record('battleEnd', null, null, { detail: this.status });
    if (this.status === BATTLE_STATUS.WON) this.rollDrop();
    return this.status;
  }

  /** The post-battle drop roll, on the live RNG: the first thing after a won battle ends. */
  rollDrop() {
    this.result.drop = this.enemies.calculateDrop(this.rng);
    this.result.rng.afterDrop = this.rng.snapshot();
    this.record('drop', null, null, this.result.drop ? { detail: this.result.drop.name } : {});
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
    };

    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.party.clearTurnState();
    this.enemies.clearTurnState();

    /** @type {Map<number, { ownerIdx: number, fn: () => void, actor: Combatant }[]>} tick -> callbacks */
    this.events = new Map();
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

  runDueEvents() {
    const due = this.events.get(this.turn.tick);
    if (!due) return;
    this.events.delete(this.turn.tick);
    due.sort((a, b) => a.ownerIdx - b.ownerIdx); // stable: queue order within an owner
    for (const { fn, actor } of due) {
      // Log whatever damage the callback queued, credited to its actor (usually the owner)
      const pendingBefore = this.combatants.map(c => c?.pendingDamage);
      fn();
      this.combatants.forEach((c, i) => {
        if (!c || c.pendingDamage === pendingBefore[i]) return;
        this.record('damage', actor, c, {
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
      this.combatants[i].commitPendingDamage();
    }
  }

  /**
   * The death check in the animation pass (FUN_800e09bc): each combatant in index order, right
   * after its own update. Still in the fight, HP < 1 and not busy once this tick's animation
   * pass clears busy. So death starts on the tick the lethal hit's reaction ends.
   */
  checkDeaths() {
    const tick = this.turn.tick;
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      if (c.outOfFight || c.HP >= 1 || c.busyUntil > tick) continue;
      if (c.type === COMBATANT_SIDE.ALLY && /** @type {Character} */ (c).inventory.has(ITEM_KEYS.SACRIFICIAL_BUDDHA)) {
        this.reviveWithBuddha(/** @type {Character} */ (c));
        continue;
      }
      c.die(tick);
      this.record('death', null, c);
    }
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
    this.record('revive', null, character, { detail: ITEMS[ITEM_KEYS.SACRIFICIAL_BUDDHA].name });
    character.busyUntil = tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaFree;
    this.queueEvent(tick + ATTACK_TIMING_CONSTANTS.sacrificialBuddhaHeal, character, () => {
      character.takeDamage(-Math.floor(character.stats.HP / 2));
    });
  }

  areAnyCombatantsBusy() {
    return this.combatants.slice(1).some(c => c.isBusy(this.turn.tick));
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
        this.record('defend', character);
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
    this.record('cast', character, spell.target === TARGET.AOE ? null : target, { detail: spell.name });
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
      this.record('defend', character, null, { detail: `${def.name} failed` });
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
        this.record('retarget', character, target);
      }
    }

    const timing = UNITE_TIMINGS[uniteKey];
    if (!timing) throw new Error(`${def.name}: timing unknown`);
    if (def.trigger.on !== 'initiatorImpact' && def.trigger.on !== 'impact')
      throw new Error(`${def.name}: trigger ${def.trigger.on} not implemented`);
    if (def.unbalances?.roll) throw new Error(`${def.name}: Unbalanced roll timing unknown`);

    this.record('unite', character, target, { detail: def.name });
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
    const key = /** @type {keyof typeof RUNES} */ (Object.keys(RUNES).find(k => RUNES[k] === rune));
    const def = rune.command;
    const timing = COMMAND_RUNE_TIMINGS[key];
    if (!def || !timing) throw new Error(`${character.name}: ${rune.name} Rune not implemented`);
    if (def.target !== TARGET.ANY) throw new Error(`${rune.name}: targeting ${def.target} not implemented`);
    if (def.unbalances) throw new Error(`${rune.name}: Unbalanced roll timing unknown`);

    let target = this.enemies.combatants[character.action.target ?? 0];
    if (!target?.isValidCombatant) {
      target = this.enemies.combatants.find(e => !e.outOfFight && e.HP - e.pendingDamage > 0); // battle_find_first_ready_enemy
      if (!target) {
        this.record('defend', character, null, { detail: `${rune.name} Rune: no target` });
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
      }
      this.record('retarget', character, target);
    }

    const t0 = this.turn.tick;
    this.record('cast', character, target, { detail: `${rune.name} Rune` });
    character.busyUntil = t0 + timing.free;
    target.busyUntil = Math.max(target.busyUntil, t0 + timing.targetFree);
    const mult10 = Math.round(def.mult * 10);
    this.queueEvent(t0 + timing.damage, target, () => {
      target.takeDamage(Math.trunc(character.calcAttackDamage(target, this.rng, false) * mult10 / 10));
    }, character);
    // UNVERIFIED tick: an always-applied Unbalanced lands when the turn ends
    this.turn.hold = { end: t0 + timing.end, onEnd: def.unbalances ? () => character.unbalance() : undefined };
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
   * The next actor isn't copied in while an attack from the other side is still in its
   * continuation chain (until that attacker's recover script starts). Same-side attacks don't
   * block: party members start their attacks while earlier party attacks are still playing.
   * Live-confirmed on the 5 Bandits fight: enemies waited on party attacks and a party member on
   * an enemy attack. UNVERIFIED: whether an enemy also waits on another enemy's attack.
   * @param {Combatant} actor
   */
  isWaitingForOtherSide(actor) {
    const otherSide = this.party.combatants.some(c => c === actor) ? this.enemies.combatants : this.party.combatants;
    return otherSide.some(c => c.attackUntil >= this.turn.tick);
  }

  /**
   * Everything a basic attack does after its hit / crit rolls at t0 (this tick):
   * busy windows, the damage roll(s) and effect flags, for either side.
   * @param {AttackParticipant} attacker
   * @param {AttackParticipant} target
   * @param {ATTACK_RESULT} result
   */
  applyAttackResult(attacker, target, result) {
    this.record('attack', attacker, target, { detail: result });
    const t0 = this.turn.tick;
    const a = attacker.attackTiming;
    const primed = (target.fx & 0x2) !== 0; // it dodged earlier and hasn't attacked since
    attacker.fx = 0; // the executor clears the attacker's effect flags
    attacker.busyUntil = t0 + a.free;
    if (a.recover == null) throw new Error(`${a.name}: recover timing unknown`);
    attacker.attackUntil = t0 + a.recover;

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
      this.record('retarget', character, this.enemies.combatants[retarget]);
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
        this.record('defend', character, target ?? null, { detail: `${name}: no target` });
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
      }
      // check_combatant_alive fails (at 0 HP, death routine not run yet): wait
      if (!target.isReadyTarget(tick)) return { status: DISPATCH_STATUS.PENDING };
      targets = [target];
    }

    // R: used up, the user's item-use script starts
    character.inventory.use(itemKey);
    this.record('item', character, target, { detail: name });
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
        this.record('skip', enemy);
        return { status: DISPATCH_STATUS.DONE };
      case ACTION_TYPES.ATTACK:
        // The AI only picks targets that aren't busy, and the attack runs the same tick, so the
        // attack's own busy-target wait can't trigger here.
        return this.resolveEnemyAttack(enemy, choice.target);
      case ACTION_TYPES.ABILITY: {
        const { move, target } = choice;
        this.record('cast', enemy, target, { detail: move.name });
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

  /** @param {Action[]} turn */
  playTurn(turn) {
    if (this.status !== BATTLE_STATUS.IN_PROGRESS) throw new Error(`Battle is over (${this.status}): no more rounds to play`);
    this.resetTurn();
    this.party.setActionPlan(turn);
    this.party.combatants.forEach(combatant => combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND);
    this.roundStart();

    // Events get handled here

    while (this.phase !== PHASE_STATE.ROUND_OVER) {
      this.tick();
    }
    this.frames += this.turn.tick;
    this.checkOutcome();
  }

  roundStart() {
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      c.actionTag = (!c.isValidCombatant || c.isAsleep) ? 1 : 0;
    }
    this.enemies.wakePartyUp(this.rng);

    this.rng.next(); // Turn start camera roll, one of 3 variations
    this.turn_count++;
    this.record('roundStart');

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

    this.record('turn', this.combatants[this.turn.pending]);
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
        if (this.isWaitingForOtherSide(this.combatants[this.turn.pending])) break;
        this.turn.current = this.turn.pending;
        this.phase = PHASE_STATE.DISPATCH;
        break;
      case PHASE_STATE.DISPATCH: {
        const result = this.dispatch();
        if (result.status === DISPATCH_STATUS.PENDING) break;
        this.currentCombatant.setActed(true);
        if (result.status === DISPATCH_STATUS.DONE && result.gate) this.turn.rollGate = result.gate;
        this.phase = PHASE_STATE.ADVANCE_TURN;
        break;
      }
      case PHASE_STATE.ROUND_END_WAIT: {
        this.turn.rollGate -= 1;
        if (this.turn.rollGate > 0) break;
        if (!this.areAnyCombatantsBusy()) {
          // hooks.roundEnd
          this.party.decayStatuses();
          // TODO: front-row backfill
          this.record('roundEnd');
          this.phase = PHASE_STATE.ROUND_OVER;
        }
      }
    }
  }
}
