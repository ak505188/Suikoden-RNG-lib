import { DEFAULT_ACTION } from './Actions.js';
import { STATUS } from '../Constants.js';

/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */

/** @template {Combatant} T */
export class Party {
  /** @param {T[]} combatants */
  constructor(combatants) {
    this.combatants = combatants;
    this.partySize = combatants.length;

    this.combatants.forEach((combatant, index) => {
      combatant.slot = index + 1
      combatant.position = index + 1;
    });

    if (this.partySize > 6) {
      throw new Error(`Party size > 6: ${combatants}`);
    }
  }

  get isAlive() {
    return this.getLivingCombatants().length > 0;
  }

  getFrontRow() {
    return this.combatants.filter(c => c.position < 4 && !c.outOfFight);
  }

  clearTurnState() {
    this.combatants.forEach(combatant => combatant.clearTurnState());
  }

  /**
   * @param {string} name
   * @returns {Combatant}
   */
  getCombatantByName(name) {
    return this.combatants.find(combatant => combatant.name === name);
  }

  /**
   * @param {number} slot
   * @returns {Combatant}
   *
   * Returns Combatant by slot, indexed starting from 1.
   */
  getCombatantBySlot(slot) {
    return this.combatants[slot - 1];
  }

  getLivingCombatants() {
    return this.combatants.filter(combatant => combatant.isAlive);
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

  /** @param {RNG} rng */
  wakePartyUp(rng) {
    this.combatants
      .filter(combatant => combatant.isValidCombatant)
      .filter(combatant => combatant.status[STATUS.SLEEP])
      .forEach(combatant => combatant.tryToWakeUp(rng))
  }
}
