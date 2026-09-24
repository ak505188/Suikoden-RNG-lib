import { ACTION_TYPES } from './Actions.js';

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

export default class Battle {
  /**
   * @param {BattleOptions} options
   */
  constructor({ party, enemies, rng, turns, turn_count = 0 }) {
    this.party = party;
    this.enemies = enemies;
    this.combatants = [...party.combatants, ...enemies.combatants];
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
  }

  run() {
    for (const turn of this.turns) {
      this.turn_count++;
      this.playTurn(turn);
    }
  }

  genCombatantSpeed() {
    this.combatants
      .filter(actor => actor.canAct)
      .forEach(actor => {
        actor.genSpdRoll(this.rng)
      });
  }

  clearBusy() {
    this.party.clearBusy();
    this.enemies.clearBusy();
  }

  clearWait() {
    this.party.clearBusy();
    this.party.clearWait();
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
  dispatch(queue) {
    const attackQueue = [];
    for (const i in queue) {
      const { action, actor, target } = queue[i];
      if (action === ACTION_TYPES.ATTACK) {
        const attackResult = actor.calcAttackResult(target, this.rng);
        attackQueue.push({ actor, target, result: attackResult });
      }
    }
  }

  /** @param {Action[]} turn */
  playTurn(turn) {
    this.party.setActionPlan(turn);
    this.rng.next();
    /** @type {ActionParams[]} */
    let queue = [];
    /** @type {ActionParams|null} */
    let pending = null;
    console.log('In play turn');
    let tick = 0;

    // Go through party, set defending
    this.party.combatants.forEach(combatant => combatant.defending = combatant.action.type === ACTION_TYPES.DEFEND);

    while (this.hasUnresolvedActors()) {
      tick++;
      let nextActor;
      if (pending) {
        nextActor = pending.actor;
        pending = null;
      } else {
        this.genCombatantSpeed();
        nextActor = this.getNextActor();
      }
      /** @type {ActionParams} */
      const nextAction = nextActor.resolveAction({ party: this.party, enemies: this.enemies, rng: this.rng, turn_count: this.turn_count });

      // If defending, don't add to queue
      if (nextAction.action === ACTION_TYPES.DEFEND) continue;

      if (nextAction.action === ACTION_TYPES.ATTACK && nextAction.wait !== false) {}

      if (nextAction.wait && queue.length > 0) {
        pending = ({ actor: nextActor, ...nextAction })
      } else {
        queue.push({ actor: nextActor, ...nextAction });
      }


      console.log(tick);

      if (!nextAction.wait) {
        continue;
      }

      console.log('queue', queue.map(({ actor }) => actor.name));
      if (pending) console.log('pending', pending.actor.name);

      this.dispatch(queue);
      queue = [];
    }
  }
}
