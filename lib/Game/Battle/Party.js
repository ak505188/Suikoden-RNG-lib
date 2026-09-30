import { ACTION_TYPES, DEFAULT_ACTION, UNBALANCED_ACTION_TYPES } from './Actions.js';
import { UNITES, availableUnites } from '../Unites.js';
import { STATUS } from '../Constants.js';
import { RUNES } from '../Magic/Runes.js';
import Enemy from './Enemy.js';
import { getFormationSlots } from '../Bestiary/Areas.js';
import { calculateBattleEXP } from '../Experience.js';

/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Bestiary/Areas.js').Formation} Formation */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../../rng.js').RNGSnapshot} RNGSnapshot */
/** @typedef {import('./Character.js').StatGrowths} StatGrowths */

/**
 * One party member's EXP from a battle.
 * @typedef {Object} EXPReward
 * @property {Character} character
 * @property {number} exp
 * @property {number} fromLVL - their level before the EXP
 * @property {number} levels - levels gained
 * @property {StatGrowths | null} growths - the stat gains those levels rolled, null when none
 * @property {RNGSnapshot} rng - after their level-ups
 */
/** @typedef {import('../Items.js').Item} Item */

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

  /** @returns {boolean} Every combatant is dead or removed from the fight. */
  get isDefeated() {
    return this.combatants.every(combatant => combatant.outOfFight);
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

  /** @returns {number} mean LVL of every combatant, dead or alive, not floored */
  get averageLVL() {
    return this.combatants.reduce((sum, combatant) => sum + combatant.LVL, 0) / this.partySize;
  }

  /** @returns {this} the same party with every combatant cloned */
  clone() {
    const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    copy.combatants = this.combatants.map(c => c.clone());
    return copy;
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
   * Free Will (FUN_800ee5b8): every member in slot order Defends by default, or Attacks the first
   * enemy they can reach, scanning the enemies in slot order from a cursor shared by the whole
   * pass (wrapping). The cursor moves past each enemy picked, which spreads the attacks out.
   * Unbalanced members, and members with nothing in reach, Defend.
   * TODO: status id 5 also forces Defend; not modelled.
   * @param {EnemyParty} enemyParty
   * @returns {Action[]} one per party member
   */
  freeWillActions(enemyParty) {
    const enemies = enemyParty.combatants;
    let cursor = 0;
    return this.combatants.map(actor => {
      if (actor.outOfFight || actor.isUnbalanced) return DEFAULT_ACTION;
      for (let i = 0; i < enemies.length; i++) {
        const target = (cursor + i) % enemies.length;
        if (!actor.canReach(enemies[target])) continue;
        cursor = target + 1;
        return { type: ACTION_TYPES.ATTACK, target };
      }
      return DEFAULT_ACTION;
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
   * End-of-battle EXP: each living party member still in the fight, in slot order, gets
   * calculateBattleEXP for every enemy in `enemyParty`, then rolls any level-ups from `rng`.
   * The split counts every living member, including removed ones (e.g. Balloon), who get
   * nothing themselves. Fallen members get nothing and aren't counted.
   * @param {EnemyParty} enemyParty
   * @param {RNG} rng
   * @returns {EXPReward[]} one entry per member who got EXP
   */
  awardEXP(enemyParty, rng) {
    const living = this.getLivingCombatants();
    const enemyLVLs = enemyParty.combatants.map(enemy => enemy.LVL);
    return living.filter(character => !character.removedFromFight).map(character => {
      const hasFortuneRune = character.rune?.id === RUNES.FORTUNE.id;
      const fromLVL = character.LVL;
      const exp = calculateBattleEXP(fromLVL, enemyLVLs, living.length, hasFortuneRune);
      const { levels, growths } = character.gainEXP(exp, rng);
      return { character, exp, fromLVL, levels, growths, rng: rng.snapshot() };
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

  /**
   * The drop each of `iterations` successive RNG states would give, starting from `rng`'s current
   * state. Advances `rng` once per iteration; each drop roll runs on a clone.
   * @typedef {{ rng: number, drop: Item | null, index: number }} Drop
   * @param {RNG} rng
   * @param {number} iterations
   * @returns {Drop[]}
   */
  calculateDrops(rng, iterations) {
    /** @type {Drop[]} */
    const drops = [];
    for (let i = 0; i < iterations; i++) {
      const drop = this.calculateDrop(rng.clone());
      drops.push({ rng: rng.getRNG(), drop, index: rng.count });
      rng.next();
    }
    return drops;
  }

  /**
   * Checks enemies in combatant (slot) order and returns the first drop that succeeds: one roll
   * picks a drop slot (rand % 3), and if the enemy has a drop there, a second roll checks it
   * against its rate (rand % 100 < rate). Advances `rng`.
   * @param {RNG} rng
   * @returns {Item | null}
   */
  calculateDrop(rng) {
    for (const enemy of this.combatants) {
      const dropIndex = rng.next().getRNG2() % 3;
      if (dropIndex < enemy.drops.length) {
        const { item, rate } = enemy.drops[dropIndex];
        if (rng.next().getRNG2() % 100 < rate) {
          return item;
        }
      }
    }
    return null;
  }

  /** @param {RNG} rng */
  wakePartyUp(rng) {
    this.combatants
      .filter(combatant => combatant.isValidCombatant)
      .filter(combatant => combatant.status[STATUS.SLEEP])
      .forEach(combatant => combatant.tryToWakeUp(rng))
  }
}
