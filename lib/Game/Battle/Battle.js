import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { COMBATANT_SIDE } from '../Constants.js';
import { spellEffect, spellRand } from '../Magic/Behavior.js';

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

/**
 * @typedef {Object} DispatchResult
 * @property {DispatchStatus} status
 * @property {number} [gate]
 */

export default class Battle {
  /**
   * @param {BattleOptions} options
   */
  constructor({ party, enemies, rng, turns, turn_count = 0, freeWillGate = 0 }) {
    this.party = party;
    this.enemies = enemies;
    this.combatants = [null, ...party.combatants, ...enemies.combatants];
    this.combatants.slice(1).forEach(c => c.knockedOut = c.HP < 1);
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
    this.freeWillGate = freeWillGate;
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
      /** @type {{ caster: Character | Enemy, resolve: () => void, resolved: boolean } | null}
       *  the spell or special the current actor is casting */
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
   * @param {Character | Enemy} owner
   * @param {() => void} fn
   */
  queueEvent(tick, owner, fn) {
    if (tick < this.turn.tick) throw new Error(`queueEvent(${tick}): already at tick ${this.turn.tick}`);
    const ownerIdx = this.combatants.indexOf(owner);
    if (ownerIdx < 1) throw new Error(`queueEvent: ${owner?.name} isn't in this battle`);
    const due = this.events.get(tick);
    if (due) due.push({ ownerIdx, fn });
    else this.events.set(tick, [{ ownerIdx, fn }]);
  }

  runDueEvents() {
    const due = this.events.get(this.turn.tick);
    if (!due) return;
    this.events.delete(this.turn.tick);
    due.sort((a, b) => a.ownerIdx - b.ownerIdx).forEach(({ fn }) => fn()); // stable: queue order within an owner
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
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
    }
  }

  /**
   * Starts a spell or monster special. Real cast timing isn't modelled. The cast doesn't start
   * until previous actions are fully resolved (nobody busy, no damage rolls still queued), so
   * their rolls come first. Then every roll and all the damage happen on one tick (in step 2,
   * in the order `resolve` applies them), and the turn ends on the next. The turn is held the
   * whole time: no one else acts.
   * TODO: the one exception at the start of a spell, where someone else can act.
   * @param {Character | Enemy} caster
   * @param {() => void} resolve - makes the rolls and calls takeDamage on each target
   * @returns {DispatchResult}
   */
  castMagic(caster, resolve) {
    this.turn.magic = { caster, resolve, resolved: false };
    return this.continueMagic();
  }

  /** @returns {DispatchResult} the gate is left unchanged, like the game's cast state machines */
  continueMagic() {
    const magic = this.turn.magic;
    if (!magic.resolved) {
      if (this.areAnyCombatantsBusy() || this.events.size) return { status: DISPATCH_STATUS.PENDING };
      magic.resolved = true;
      this.queueEvent(this.turn.tick, magic.caster, magic.resolve);
      return { status: DISPATCH_STATUS.PENDING };
    }
    this.turn.magic = null;
    return { status: DISPATCH_STATUS.DONE };
  }

  /**
   * A party member's Rune spell. Party spell damage uses no RNG; spellRand makes the spell's own
   * rand() calls.
   * TODO: MP cost, retargeting a dead single target, party-side (healing / support) spells.
   * @param {Character} character
   * @returns {DispatchResult}
   */
  resolvePartyRune(character) {
    const spell = character.rune.spells[character.action.slot ?? 0];
    if (!spell) throw new Error(`${character.name}: no spell in ${character.rune.name} slot ${character.action.slot}`);
    const target = this.enemies.combatants[character.action.target ?? 0];
    return this.castMagic(character, () => {
      spellRand(spell, this.rng);
      const hits = spellEffect({ actor: character, spell, target, party: this.party, enemies: this.enemies });
      if (!hits) throw new Error(`${spell.name}: targeting ${spell.target} not implemented`);
      hits.forEach(({ enemy, damage }) => enemy.takeDamage(damage));
    });
  }

  /**
   * A missed basic attack: t0 -> the frame the target's own dodge script (table slot 3) stops
   * being busy.
   * @param {import('./CharacterAttackTimings.js').CharacterAttackTiming
   *   | import('./EnemyAttackTimings.js').EnemyAttackTiming} attackerTiming
   * @param {Character | Enemy} target
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
      return { status: DISPATCH_STATUS.PENDING };
    }

    // Busy, or about to die from pending damage: wait (no RNG). The attacker keeps waiting on a
    // dying target until it's out of the fight, then retargets.
    if (!target.isReadyTarget(tick)) return { status: DISPATCH_STATUS.PENDING };

    // t0: hit and crit rolls now, the damage roll at the animation's damage frame
    const result = character.calcAttackResult(target, this.rng);
    const timing = character.attackTiming;
    character.busyUntil = tick + timing.free;

    if (result === ATTACK_RESULT.HIT || result === ATTACK_RESULT.CRIT) {
      const damageTick = tick + timing.damage;
      target.busyUntil = Math.max(target.busyUntil, damageTick + character.reactionFrames);
      this.queueEvent(damageTick, character, () => {
        target.takeDamage(character.calcAttackDamage(target, this.rng, result === ATTACK_RESULT.CRIT));
      });
    } else if (result === ATTACK_RESULT.MISSED) {
      // The attacker's timeline is unchanged (characters have no missFree); the target plays its
      // own dodge instead of the attacker's reaction.
      target.busyUntil = Math.max(target.busyUntil, tick + this.dodgeFrames(timing, target));
    }
    // TODO: counter path (the monster's calc_damage lands mid-turn, on the attacker)

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
        return { status: DISPATCH_STATUS.DONE };
      case ACTION_TYPES.ATTACK:
        // The AI only picks targets that aren't busy, and the attack runs the same tick, so the
        // attack's own busy-target wait can't trigger here.
        return this.resolveEnemyAttack(enemy, choice.target);
      case ACTION_TYPES.ABILITY:
        return this.castMagic(enemy, () => enemy.useAbility(choice.name, { party: this.party, rng: this.rng }));
      default:
        throw new Error(`${enemy.name}: unhandled AI result ${JSON.stringify(choice)}`);
    }
  }

  /**
   * battle_execute_player_attack (named backwards in Ghidra): a monster's basic Attack.
   * Enemies never roll a crit.
   * @param {Enemy} enemy
   * @param {Character} target
   * @returns {DispatchResult}
   */
  resolveEnemyAttack(enemy, target) {
    const tick = this.turn.tick;
    if (target.isBusy(tick)) return { status: DISPATCH_STATUS.PENDING }; // wait, no RNG

    const timing = enemy.attackTiming;
    if (timing.damage == null || timing.free == null) throw new Error(`${enemy.name}: ${timing.blocked}`);

    const result = enemy.calcAttackResult(target, this.rng);
    if (result === ATTACK_RESULT.COUNTERED) throw new Error(`${target.name} countered ${enemy.name}: counter path not implemented`);

    if (result === ATTACK_RESULT.HIT) {
      // TODO: cover check (target HP < floor(HPMax / 4) and a story pair, or Phero Rune)
      enemy.busyUntil = tick + timing.free;
      const damageTick = tick + timing.damage;
      if (timing.targetBusy) target.busyUntil = Math.max(target.busyUntil, damageTick + enemy.reactionFrames(target));
      this.queueEvent(damageTick, enemy, () => {
        target.takeDamage(enemy.calcAttackDamage(target, this.rng));
      });
    } else {
      enemy.busyUntil = tick + (timing.missFree ?? timing.free);
      target.busyUntil = Math.max(target.busyUntil, tick + this.dodgeFrames(timing, target));
    }

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
  }

  roundStart() {
    for (let i = 1; i < this.combatants.length; i++) {
      const c = this.combatants[i];
      c.actionTag = (!c.isValidCombatant || c.isAsleep) ? 1 : 0;
    }
    this.enemies.wakePartyUp(this.rng);

    this.rng.next(); // Turn start camera roll, one of 3 variations
    this.turn_count++;

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
          this.phase = PHASE_STATE.ROUND_OVER;
        }
      }
    }
  }
}
