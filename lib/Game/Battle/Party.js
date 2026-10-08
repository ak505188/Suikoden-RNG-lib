import { ACTION_TYPES, DEFAULT_ACTION, UNBALANCED_ACTION_TYPES } from './Actions.js';
import { UNITES, availableUnites, isUniteAvailable, rosterUnites } from '../Unites.js';
import { STATUS } from '../Constants.js';
import { RUNES } from '../Magic/Runes.js';
import Enemy from './Enemy.js';
import { exportCharacters, importCharacters } from './Character.js';
import { getFormationSlots } from '../Bestiary/Areas.js';
import { calculateBattleEXP } from '../Experience.js';
import { shallowCloneInstance } from '../../util/clone.js';

/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Bestiary/Areas.js').Formation} Formation */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */
/** @typedef {import('../../rng.js').RNGSnapshot} RNGSnapshot */
/** @typedef {import('./Character.js').StatGrowths} StatGrowths */
/** @typedef {import('./Character.js').CharacterJSON} CharacterJSON */

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
    return this.combatants.every((combatant) => combatant.outOfFight);
  }

  getFrontRow() {
    return this.combatants.filter((c) => c.position < 4 && !c.outOfFight);
  }

  resetBattleState() {
    this.combatants.forEach((combatant) => combatant.resetBattleState());
  }

  clearTurnState() {
    this.combatants.forEach((combatant) => combatant.clearTurnState());
  }

  /**
   * @param {string} name
   * @returns {Combatant}
   */
  getCombatantByName(name) {
    return this.combatants.find((combatant) => combatant.name === name);
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
    return this.combatants.filter((combatant) => combatant.isAlive);
  }

  /** @returns {number} mean LVL of every combatant, dead or alive, not floored */
  get averageLVL() {
    return this.combatants.reduce((sum, combatant) => sum + combatant.LVL, 0) / this.partySize;
  }

  /** @returns {this} the same party with every combatant cloned */
  clone() {
    const copy = shallowCloneInstance(this);
    copy.combatants = this.combatants.map((c) => c.clone());
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
    /**
     * The Unites this roster could ever do (rosterUnites), worked out once: members never change.
     * Clones share it. If membership ever becomes changeable, recompute it there.
     * @type {readonly import('../Keys.js').UniteKey[]}
     */
    this.rosterUnites = Object.freeze(rosterUnites(this.combatants));
  }

  /** @returns {import('../Keys.js').UniteKey[]} the Unites the menu offers right now (availableUnites) */
  availableUnites() {
    return availableUnites(this.combatants, this.rosterUnites);
  }

  rest() {
    this.combatants.forEach((c) => c.rest());
    return this;
  }

  /**
   * The party in the HUD's exchange format, members in slot order (exportCharacters).
   * @returns {CharacterJSON[]}
   */
  toCharacterJSON() {
    return exportCharacters(this.combatants);
  }

  /**
   * A party from the HUD's exchange format, members in the file's order (importCharacters).
   * @param {CharacterJSON[]} characters
   * @returns {PlayerParty}
   */
  static fromCharacterJSON(characters) {
    return new PlayerParty(importCharacters(characters));
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
      // A deferred action is checked when it's chosen (Battle.chooseAction)
      if (
        actor.isUnbalanced &&
        action.type !== ACTION_TYPES.DEFERRED &&
        !UNBALANCED_ACTION_TYPES.includes(action.type)
      ) {
        throw new Error(
          `${actor.name} is Unbalanced: can only Defend or use an Item, not ${action.type}`,
        );
      }
      actor.setAction(action);
    });
  }

  /**
   * Free Will (FUN_800ee5b8): every member Defends by default, or Attacks the first enemy they can
   * reach, scanning the enemies in slot order from a cursor shared by the whole pass (wrapping).
   * Members are taken in formation order (front slot 1 first), not party order: once the back row
   * has moved up for a fallen member the two differ, e.g. [Cleo, Ted, Pahn, McDohl, Gremio] after
   * McDohl and Gremio fall. The cursor starts at 1 each pass and moves on by exactly one per
   * Attack, wherever the scan found its target, so a member who had to wrap past an enemy they
   * can't reach doesn't pull it back. Fallen members are still taken (they never act): live, Queen
   * Ant round 3 (the Queen in the back row), the targets by party slot were 0, 1, 0, 1, 2 for
   * McDohl and Gremio (fallen, last in the formation), Pahn (Short: skips the Queen, wraps to 0),
   * Cleo, Ted.
   * Members who can't act (Unbalanced) and members with nothing in reach Defend and leave the
   * cursor alone.
   * The cursor restarts at 1 every pass: live, all three rounds of the Queen Ant fight fit that, and
   * a cursor carried over between rounds would not (Battle_Damage_Formula.md calls it "persistent",
   * but its own wording means carried between members within a pass).
   * The scan wraps around the enemy candidate list (decompile, FUN_800ee5b8).
   * UNVERIFIED: whether it carries over between fights (only one fight seen), and a fallen member in
   * front of a living one (they would consume the cursor): only trailing ones are seen.
   * @param {EnemyParty} enemyParty
   * @returns {Action[]} one per party member, in party order
   */
  freeWillActions(enemyParty) {
    const enemies = enemyParty.combatants;
    const roster = this.combatants
      .map((_, i) => i)
      .sort((a, b) => this.combatants[a].position - this.combatants[b].position);
    /** @type {Action[]} */
    const actions = this.combatants.map(() => DEFAULT_ACTION);
    let cursor = 1;
    for (const i of roster) {
      const actor = this.combatants[i];
      if (actor.isUnbalanced) continue;
      for (let n = 0; n < enemies.length; n++) {
        const target = (cursor + n) % enemies.length;
        if (!actor.canReach(enemies[target])) continue;
        cursor += 1;
        actions[i] = { type: ACTION_TYPES.ATTACK, target };
        break;
      }
    }
    return actions;
  }

  /**
   * Picking a Unite in the menu skips every partner's selection and gives them the same command
   * (ActionType 4, same AbilitySlot and target), so whichever participant's turn comes first runs
   * it. A plan gives every participant that same Unite action. The menu only offers available
   * Unites, so anything else is an invalid plan.
   * @param {Action[]} actions - one per party member
   */
  checkUnites(actions) {
    if (!actions.some((action) => action.type === ACTION_TYPES.UNITE)) return;
    actions.forEach((action, index) => {
      if (action.type !== ACTION_TYPES.UNITE) return;
      const actor = this.combatants[index];
      const def = UNITES[action.uniteKey];
      if (!def) throw new Error(`${actor.name}: unknown Unite ${action.uniteKey}`);
      if (!isUniteAvailable(action.uniteKey, this.combatants))
        throw new Error(`${actor.name}: ${def.name} isn't available`);
      for (const key of def.participants) {
        const i = this.combatants.findIndex((c) => c.key === key);
        const partner = actions[i];
        if (
          partner.type !== ACTION_TYPES.UNITE ||
          partner.uniteKey !== action.uniteKey ||
          partner.target !== action.target
        )
          throw new Error(
            `${this.combatants[i].name} is in ${actor.name}'s ${def.name}: plan the same Unite action for them`,
          );
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
    const enemyLVLs = enemyParty.combatants.map((enemy) => enemy.LVL);
    return living
      .filter((character) => !character.removedFromFight)
      .map((character) => {
        const hasFortuneRune = character.rune?.id === RUNES.FORTUNE.id;
        const fromLVL = character.LVL;
        const exp = calculateBattleEXP(fromLVL, enemyLVLs, living.length, hasFortuneRune);
        const { levels, growths } = character.gainEXP(exp, rng);
        return { character, exp, fromLVL, levels, growths, rng: rng.snapshot() };
      });
  }

  /**
   * battle_process_round_end_status_and_formation's party status decay, which ticks status ids
   * 3, 7 and 8 only. Of those, Unbalanced (7) and HP Locked (8) are modelled. Enemies don't decay here.
   */
  decayStatuses() {
    this.combatants.forEach((c) => {
      if (c.status[STATUS.UNBALANCED] > 0) c.status[STATUS.UNBALANCED] -= 1;
      if (c.status[STATUS.HP_LOCKED] > 0) c.status[STATUS.HP_LOCKED] -= 1;
    });
  }

  /**
   * Party front-row backfill (battle_process_round_end_status_and_formation's first loop, at
   * round end): for each member out of the fight in the front row (formation slot 1-3), in party
   * order, the first member in the back row who's in the fight and not busy swaps slots with them.
   * No RNG. Live-confirmed (Seifu6Ant.State: Pahn in slot 3 died and swapped with Cleo in slot 4).
   * @param {number} tick
   * @returns {{ combatant: Character, from: number }[]} who moved forward, from which slot
   */
  backfill(tick) {
    const moved = [];
    for (const out of this.combatants) {
      if (!out.outOfFight || out.position > 3) continue;
      const sub = this.combatants.find((c) => !c.outOfFight && !c.isBusy(tick) && c.position > 3);
      if (!sub) continue;
      moved.push({ combatant: sub, from: sub.position });
      [out.position, sub.position] = [sub.position, out.position];
    }
    return moved;
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

  /**
   * Enemy front-row backfill (battle_process_round_end_status_and_formation, after the party's):
   * each empty front slot 1-3, in order, is offered to the FIRST back-row enemy in the fight, in
   * combatant order, and taken if its footprint fits (size: extra slots it claims to the right).
   * Room is 2 at slot 1 if slots 2 and 3 are free too, 1 at slot 3 or with the slot to the right
   * free, else 0. If that first enemy doesn't fit, nobody fills the slot this round; it's offered
   * again at the next slot. Occupancy (mark_enemy_formation_slot_occupancy) counts footprints,
   * except in a row's rightmost slot (3 or 6), and a footprint of 4+ marks nothing. No RNG.
   * Live-confirmed on size-0 Soldier Ants (the order); the size 1-2 rules are decompile-only.
   * @returns {{ combatant: Enemy, from: number }[]} who moved forward, from which slot
   */
  backfill() {
    /** @type {(Enemy | null)[]} slot 1-6 -> the enemy marking it */
    const map = new Array(7).fill(null);
    for (const e of this.combatants) {
      if (e.outOfFight) continue;
      const p = e.position,
        size = e.size ?? 0;
      if (p === 3 || p === 6) {
        map[p] = e;
        continue;
      }
      if (size >= 4) continue;
      if (size >= 2 && p + 2 <= 6) map[p + 2] = e;
      if (size >= 1 && p + 1 <= 6) map[p + 1] = e;
      map[p] = e;
    }
    const moved = [];
    for (let s = 1; s <= 3; s++) {
      if (map[s]) continue;
      const room = s === 1 && !map[2] && !map[3] ? 2 : s === 3 || !map[s + 1] ? 1 : 0;
      const c = this.combatants.find((e) => e.position >= 4 && !e.outOfFight);
      const size = c?.size ?? 0;
      if (!c || size > room) continue;
      moved.push({ combatant: c, from: c.position });
      c.position = s;
      if (s === 3) {
        map[3] = c;
        continue;
      }
      if (size >= 2) map[s + 2] = c;
      if (size >= 1) map[s + 1] = c;
      map[s] = c;
    }
    return moved;
  }

  /** @param {RNG} rng */
  wakePartyUp(rng) {
    this.combatants
      .filter((combatant) => combatant.isValidCombatant)
      .filter((combatant) => combatant.status[STATUS.SLEEP])
      .forEach((combatant) => combatant.tryToWakeUp(rng));
  }
}
