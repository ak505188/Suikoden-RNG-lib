import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { COMBATANT_SIDE } from '../Constants.js';
import { spellEffect, spellRand } from '../Magic/Behavior.js';

/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').ActionResult} ActionResult */
/** @typedef {import('./Actions.js').ActionParams} ActionParams */
/** @typedef {import('../../rng.js').default} RNG */

/**
 * @typedef {Object} BattleOptions
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {Action[][]} turns - One entry per round; each round is one Action per party-member slot.
 * @property {number} [turn_count]
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
  constructor({ party, enemies, rng, turns, turn_count = 0 }) {
    this.party = party;
    this.enemies = enemies;
    this.combatants = [null, ...party.combatants, ...enemies.combatants];
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
    /** @type {PhaseState} */
    this.phase = PHASE_STATE.ADVANCE_TURN;
    this.events = [];
    this.resetTurn();
  }

  run() {
    for (const turn of this.turns) {
      this.turn_count++;
      this.playTurn(turn);
    }
  }

  get currentCombatant() {
    return this.combatants[this.turn.current];
  }

  genCombatantSpeed() {
    this.combatants
      .filter(actor => actor.canAct)
      .forEach(actor => {
        actor.genSpdRoll(this.rng)
      });
  }

  resetTurn() {
    this.turn = {
      current: 0,
      pending: 0,
      rollGate: 0,
      tick: 0,
    };

    this.events = [];
  }

  areAnyCombatantsBusy() {
    return this.combatants.slice(1).some(c => c.isBusy(this.turn.tick));
  }

  /**
   * @returns {number}
   * 0 if round is over,
   * -1 if nobody free yet, retry next tick
   * otherwise fastest combatant index
   */
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

  clearBusy() {
    this.party.clearBusy();
    this.enemies.clearBusy();
  }

  clearWait() {
    this.party.clearWait();
    this.enemies.clearWait();
  }

  hasUnresolvedActors() {
    return this.combatants.filter(actor => !actor.acted && actor.isAlive).length > 0;
  }

  getNextActor() {
    const possibleActors = this.combatants.filter(actor => actor.canAct);
    if (possibleActors.length < 0) return null;
    let maxIndex = 0;
    for (let i = 1; i < possibleActors.length; i++) {
 if (possibleActors[i].spdRoll > possibleActors[maxIndex].spdRoll) maxIndex = i;
    };
    return possibleActors[maxIndex];
  }

  /** @param {ActionParams[]} queue */
  dispatchOld(queue) {
    const results = queue.map(({ action, actor, result, target, spell }) => {
      switch (action) {
        case ACTION_TYPES.ATTACK: {
          target.wait = true;
          if (result === ATTACK_RESULT.MISSED) return `${actor.name} missed ${target.name}`;
          if (result === ATTACK_RESULT.COUNTERED) {
            const damage = target.calcAttackDamage(actor, this.rng, false);
            actor.takeDamage(damage);
            return `${actor.name} countered by ${target.name} for ${damage}`;
          } else {
            const isCrit = result === ATTACK_RESULT.CRIT;
            const damage = actor.calcAttackDamage(target, this.rng, isCrit);
            target.takeDamage(damage);
            return `${actor.name} ${isCrit ? 'crit' : 'hit'} ${target.name} for ${damage}`;
          }
        }
        case ACTION_TYPES.RUNE: {
          const randResult = spellRand(spell, this.rng);
          const params = {
            actor,
            spell,
            target,
            party: this.party,
            enemies: this.enemies
          };
          const effectResults = spellEffect(params).map(({ enemy, damage }) => {
            enemy.takeDamage(damage);
            return `${enemy.name} took ${damage} damage.`
          });
          return [`${actor.name} used ${spell.name}, RNG + ${randResult}`, ...effectResults].join('\n');
        }
      }
    });
    console.log(results.join('\n'));
  }

  /** @returns DispatchResult */
  dispatchPlayer(character) {
    return { status: DISPATCH_STATUS.PENDING };
  }

  /** @param {Enemy} enemy @returns DispatchResult */
  dispatchEnemy(enemy) {
    if (enemy.isAsleep) {
      enemy.actionTag = 1;

    }
    return { status: DISPATCH_STATUS.DONE };
  }

  /** @param {Action} turn */
  playTurn(turn) {
    this.party.setActionPlan(turn);
    this.rng.next();
    /** @type {ActionParams[]} */
    let queue = [];
    /** @type {ActionParams|null} */
    let pending = null;

    // Go through party, set defending
    this.party.combatants.forEach(combatant => combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND);

    while (this.hasUnresolvedActors()) {
      console.log('queue:', queue.map(queue => queue.actor.name));
      console.log('pending:', pending?.actor?.name);

      let nextCombatant;
      if (pending) {
        nextCombatant = pending.actor;
        pending = null;
      } else {
        this.genCombatantSpeed();
        console.log('Speed roll call', this.rng.count);
        nextCombatant = this.getNextActor();
      }

      console.log('nextCombatant:', nextCombatant?.name);
      /** @type {ActionParams} */
      const nextAction = nextCombatant.resolveAction({ party: this.party, enemies: this.enemies, rng: this.rng, turn_count: this.turn_count });

      // If defending, don't add to queue
      if (nextAction.action === ACTION_TYPES.DEFEND) continue;

      if (nextAction.action === ACTION_TYPES.ATTACK && !nextAction.wait) {
        const attackResult = nextCombatant.calcAttackResult(nextAction.target, this.rng);
        queue.push({ actor: nextCombatant, ...nextAction, result: attackResult });
        continue;
      }

      if (nextAction.wait && queue.length > 0) {
        pending = ({ actor: nextCombatant, ...nextAction })
      } else {
        queue.push({ actor: nextCombatant, ...nextAction });
      }

      if (!nextAction.wait) {
        continue;
      }

      this.clearWait();
      this.dispatchOld(queue);
      this.clearBusy();
      queue = [];
    }
  }

  /** @param {Action} turn */
  playTurnTickBased(turn) {
    this.resetTurn();
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

  tick() {
    this.turnStep();
    // hooks run events
    // commitPendingDamage
    this.turn.tick++;
  }

  /** @returns DispatchResult */
  dispatch() {
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
        this.currentCombatant.actionTag = 1;
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
