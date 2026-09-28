import { ACTION_TYPES, DEFAULT_ACTION, UNBALANCED_ACTION_TYPES } from './Actions.js';
import { UNITES, availableUnites } from '../Unites.js';
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

  rest() {
    this.combatants.forEach(c => c.rest());
    return this;
  }

  /** @param {Action[]} actions */
  setActionPlan(actions = new Array(6).fill(DEFAULT_ACTION)) {
    if (actions.length > 6) {
      actions = actions.slice(0, 6);
    } else if (actions.length < this.partySize) {
      const remainderLength = this.partySize - actions.length;
      actions = [...actions, ...Array(remainderLength).fill(DEFAULT_ACTION)];
    }

    this.checkUnites(actions);
    this.combatants.forEach((actor, index) => {
      const action = actions[index];
      if (actor.isUnbalanced && !UNBALANCED_ACTION_TYPES.includes(action.type)) {
        throw new Error(`${actor.name} is Unbalanced: can only Defend or use an Item, not ${action.type}`);
      }
      actor.setAction(action);
    });
  }

  /**
   * Picking a Unite in the menu skips every partner's selection and gives them the same command
   * (ActionType 4, same AbilitySlot and target), so whichever participant's turn comes first runs
   * it. A plan gives every participant that same Unite action. The menu only offers available
   * Unites, so anything else is an invalid plan.
   * @param {Action[]} actions - one per party member
   */
  checkUnites(actions) {
    const available = availableUnites(this.combatants);
    actions.forEach((action, index) => {
      if (action.type !== ACTION_TYPES.UNITE) return;
      const actor = this.combatants[index];
      const def = UNITES[action.uniteKey];
      if (!def) throw new Error(`${actor.name}: unknown Unite ${action.uniteKey}`);
      if (!available.includes(action.uniteKey)) throw new Error(`${actor.name}: ${def.name} isn't available`);
      for (const key of def.participants) {
        const i = this.combatants.findIndex(c => c.key === key);
        const partner = actions[i];
        if (partner.type !== ACTION_TYPES.UNITE || partner.uniteKey !== action.uniteKey || partner.target !== action.target)
          throw new Error(`${this.combatants[i].name} is in ${actor.name}'s ${def.name}: plan the same Unite action for them`);
      }
    });
  }

  /**
   * battle_process_round_end_status_and_formation's party status decay, which ticks status ids
   * 3, 7 and 8 only. Of those, only Unbalanced (7) is modelled. Enemies don't decay here.
   */
  decayStatuses() {
    this.combatants.forEach(c => {
      if (c.status[STATUS.UNBALANCED] > 0) c.status[STATUS.UNBALANCED] -= 1;
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
   * @returns {EnemyParty}
   */
  static fromFormation(formation) {
    const enemies = getFormationSlots(formation).map(({ key, position }) => {
      const enemy = new Enemy(key);
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
