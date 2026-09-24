import { ACTION_VALIDITY, DEFAULT_ACTION } from './Actions.js';
import { TARGET } from '../Constants.js';

/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').ActionValidity} ActionValidity */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../Constants.js').Target} Target */

/** @template {Combatant} T */
export class Party {
  /** @param {T[]} combatants */
  constructor(combatants) {
    this.combatants = combatants;
    this.partySize = combatants.length;

    if (this.partySize > 6) {
      throw new Error(`Party size > 6: ${combatants}`);
    }
  }

  get isAlive() {
    return this.getLivingCombatants().length > 0;
  }

  clearBusy() {
    this.combatants.forEach(combatant => combatant.busy = false);
  }

  clearWait() {
    this.combatants.forEach(combatant => combatant.wait = false);
  }

  /**
   * @param {string} name
   * @returns {Combatant}
   */
  getCombatant(name) {
    return this.combatants.find(combatant => combatant.name === name);
  }

  getLivingCombatants() {
    return this.combatants.filter(combatant => combatant.isAlive);
  }

  getFirstLivingCombatant() {
    return this.getLivingCombatants()[0];
  }

  getFirstLivingCombatantIndex() {
    return this.combatants.findIndex(combatant => combatant.isAlive);
  }

  /**
   * @param {number} targetIndex
   * @param {Target} targetType
   * @returns {ActionValidity}
   */
  isValidTarget(targetIndex, targetType) {
    if (!this.isAlive) return ACTION_VALIDITY.NO_VALID;
    // TODO: Factor in enemy size
    // This should probably be handled in Combatant?
    if (targetType === TARGET.AOE) return ACTION_VALIDITY.VALID;

    const target = this.combatants[targetIndex].isAlive ?
      this.combatants[targetIndex] :
      this.getFirstLivingCombatant();

    // Need to figure out how to handle target selection with dead characters
    if (targetType === TARGET.ANY) {
      if (!target.isAlive) return ACTION_VALIDITY.INVALID;
      if (target.busy) return ACTION_VALIDITY.BUSY;
      return ACTION_VALIDITY.VALID;
    }

    const pos = this.combatants[targetIndex].isAlive ?
      targetIndex :
      this.getFirstLivingCombatantIndex();

    return pos <= 2 ? ACTION_VALIDITY.VALID : ACTION_VALIDITY.ILLEGAL;
  }

  /** @param {RNG} rng */
  calcSpeed(rng) {
    this.combatants
      .filter(actor => actor.canAct)
      .forEach(actor => actor.genSpdRoll(rng));
  }
}

/** @extends {Party<Character>} */
export class PlayerParty extends Party {
  /** @param {Character[]} characters */
  constructor(characters) {
    super(characters);
  }

  /** @param {Action[]} actions */
  setActionPlan(actions = new Array(6).fill(DEFAULT_ACTION)) {
    if (actions.length > 6) {
      actions = actions.slice(0, 6);
    } else if (actions.length < this.partySize) {
      const remainderLength = this.partySize - actions.length;
      actions = [...actions, ...Array(remainderLength).fill(DEFAULT_ACTION)];
    }

    this.combatants.forEach((actor, index) => {
      actor.setAction(actions[index]);
    });
  }
}

/** @extends {Party<Enemy>} */
export class EnemyParty extends Party {
  /** @param {Enemy[]} enemies */
  constructor(enemies) {
    super(enemies);
  }
}
