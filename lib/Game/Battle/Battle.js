import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { COMBATANT_SIDE, TARGET } from '../Constants.js';
import { spellEffect, spellRand } from '../Magic/Behavior.js';
import ActionLog from './ActionLog.js';
import { clamp } from '../../lib.js';

/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */

/**
 * @typedef {Object} BattleOptions
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {Action[][]} turns - One entry per round; each round is one Action per party-member slot.
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
const PHASE_STATE = /** @type {const} */ ({
  ADVANCE_TURN: 'Advance Turn',
  COPY_ACTOR: 'Copy Actor',
  DISPATCH: 'Dispatch',
  ROUND_END_WAIT: 'Round End Wait',
  ROUND_OVER: 'Round Over',
});

/** @typedef {import('./Combatant.js').default} Combatant */
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
  constructor({ party, enemies, rng, turns, turn_count = 0, freeWillGate = 0 }) {
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
    /** @type {PhaseState} */
    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.resetTurn();
  }

  run() {
    for (const turn of this.turns) {
      this.playTurnTickBased(turn);
    }
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
    };

    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.party.clearTurnState();
    this.enemies.clearTurnState();

    /** @type {Map<number, { ownerIdx: number, fn: () => void }[]>} tick -> callbacks */
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
   */
  queueEvent(tick, owner, fn) {
    if (tick < this.turn.tick) throw new Error(`queueEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.combatants.findIndex(c => c === owner);
    if (ownerIdx < 1) throw new Error(`queueEvent: ${owner?.name} isn't in this battle`);
    const due = this.events.get(tick);
    if (due) due.push({ ownerIdx, fn });
    else this.events.set(tick, [{ ownerIdx, fn }]);
  }

  runDueEvents() {
    const due = this.events.get(this.turn.tick);
    if (!due) return;
    this.events.delete(this.turn.tick);
    due.sort((a, b) => a.ownerIdx - b.ownerIdx); // stable: queue order within an owner
    for (const { ownerIdx, fn } of due) {
      // Log whatever damage the callback queued, credited to its owner
      const pendingBefore = this.combatants.map(c => c?.pendingDamage);
      fn();
      this.combatants.forEach((c, i) => {
        if (!c || c.pendingDamage === pendingBefore[i]) return;
        this.record('damage', this.combatants[ownerIdx], c, {
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
      c.die(tick);
      this.record('death', null, c);
    }
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
      case ACTION_TYPES.ITEM:
      case ACTION_TYPES.UNITE:
        // TODO: item / unite resolvers. They leave the gate unchanged.
        return { status: DISPATCH_STATUS.DONE };
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
      case ACTION_TYPES.ABILITY:
        this.record('cast', enemy, choice.target, { detail: choice.name });
        return this.castMagic(enemy, () => enemy.useAbility(choice.name, { party: this.party, rng: this.rng }), choice.frames);
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

  /** @param {Action[]} turn */
  playTurnTickBased(turn) {
    this.resetTurn();
    this.party.setActionPlan(turn);
    this.party.combatants.forEach(combatant => combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND);
    this.roundStart();

    // Events get handled here

    while (this.phase !== PHASE_STATE.ROUND_OVER) {
      this.tick();
    }
    this.frames += this.turn.tick;
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
          this.record('roundEnd');
          this.phase = PHASE_STATE.ROUND_OVER;
        }
      }
    }
  }
}
