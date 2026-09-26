import { DEFAULT_ACTION } from './Actions.js';
import { STATUS } from '../Constants.js';
import Enemy from './Enemy.js';
import { getFormationSlots } from '../Bestiary/Areas.js';

/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Bestiary/Areas.js').Formation} Formation */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */

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

  getFrontRow() {
    return this.combatants.filter(c => c.position < 4 && !c.outOfFight);
  }

  resetBattleState() {
    this.combatants.forEach(combatant => combatant.resetBattleState());
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
    this.combatants.forEach((combatant, index) => {
      combatant.slot = index + 1;
      combatant.position = index + 1;
    });
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
    this.combatants.forEach((combatant, index) => {
      combatant.slot = index + 1;
      combatant.position = combatant.position || index + 1;
    });
  }

  /**
   * Builds a fresh party from a starting formation: one enemy per occupied slot, in combatant
   * order (empty slots skipped), each at the formation slot it stands in.
   * @param {Formation} formation
   * @param {(key: EnemyKey) => Enemy} [createEnemy] - for monsters with their own AI subclass
   * @returns {EnemyParty}
   */
  static fromFormation(formation, createEnemy = key => new Enemy(key)) {
    const enemies = getFormationSlots(formation).map(({ key, position }) => {
      const enemy = createEnemy(key);
      enemy.position = position;
      return enemy;
    });
    return new EnemyParty(enemies);
  }

  /** @param {RNG} rng */
  wakePartyUp(rng) {
    this.combatants
      .filter(combatant => combatant.isValidCombatant)
      .filter(combatant => combatant.status[STATUS.SLEEP])
      .forEach(combatant => combatant.tryToWakeUp(rng))
  }
}
