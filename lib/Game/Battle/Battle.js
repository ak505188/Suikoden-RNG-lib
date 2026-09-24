import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
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
  dispatch(queue) {
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
          const effectResult = spellEffect(params);
          return effectResult.map(({ enemy, damage }) => {
            enemy.takeDamage(damage);
            return `${enemy.name} took ${damage} damage.`
          });
        }
      }
    });
    console.log(results);
  }

  /** @param {Action[]} turn */
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
      this.dispatch(queue);
      this.clearBusy();
      queue = [];
    }
  }
}
