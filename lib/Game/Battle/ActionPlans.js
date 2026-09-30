import { ACTION_TYPES, DEFAULT_ACTION, ROUND_COMMANDS, UNBALANCED_ACTION_TYPES } from './Actions.js';
import { UNITES, disjointUniteSets } from '../Unites.js';
import { ITEM_EFFECTS } from '../ItemEffects.js';
import { RUNE_TYPES } from '../Magic/Runes.js';
import { TARGET } from '../Constants.js';

/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').Round} Round */
/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('../Keys.js').UniteKey} UniteKey */

/**
 * Narrows one party member's candidate actions for a round. Return a subset of `candidates`
 * (or any actions you like); an empty result drops every plan that round.
 * @callback ActionFilter
 * @param {{ character: Character, slot: number, round: number, battle: Battle, candidates: Action[] }} args
 *   slot is the 0-based party index, round the 0-based round being planned
 * @returns {Action[]}
 */

/**
 * @typedef {Object} PlanOptions
 * @property {number} [round] - the 0-based round being planned, passed to `filter`
 * @property {ActionFilter} [filter]
 * @property {boolean | ((key: UniteKey, battle: Battle) => boolean)} [unites] - also plan every set of
 *   available Unites that can go together (default true); a function picks which Unites to plan
 * @property {import('./Actions.js').RoundCommandType[]} [commands] - which round commands to plan;
 *   Fight expands to every action combination, Free Will and Run are one plan each (default Fight only)
 */

/**
 * Every enemy index a party member can pick from a menu that lists every valid enemy.
 * @param {Battle} battle
 * @param {(enemy: import('./Enemy.js').default) => boolean} [allowed]
 * @returns {number[]}
 */
function enemyTargets(battle, allowed = () => true) {
  const targets = [];
  battle.enemies.combatants.forEach((enemy, index) => {
    if (enemy.isValidCombatant && allowed(enemy)) targets.push(index);
  });
  return targets;
}

/**
 * The Rune actions a member can pick: one per spell level with MP left and each target it can
 * take, or a Command rune's move per target. Everything is planned, including what the sim can't
 * run yet: playing that throws, so filter it out first.
 * @param {Character} character
 * @param {Battle} battle
 * @returns {Action[]}
 */
function runeActions(character, battle) {
  const { rune } = character;
  if (!rune) return [];

  if (rune.type === RUNE_TYPES.COMMAND) {
    if (rune.command?.target === TARGET.AOE) return [{ type: ACTION_TYPES.RUNE }];
    return enemyTargets(battle).map(target => ({ type: ACTION_TYPES.RUNE, target }));
  }

  if (rune.type !== RUNE_TYPES.MAGIC || !rune.spells) return [];
  /** @type {Action[]} */
  const actions = [];
  rune.spells.forEach((spell, slot) => {
    if (!spell || !(character.MP[slot] > 0)) return;
    switch (spell.target) {
      case TARGET.AOE:
        actions.push({ type: ACTION_TYPES.RUNE, slot });
        break;
      case TARGET.ANY:
        enemyTargets(battle).forEach(target => actions.push({ type: ACTION_TYPES.RUNE, slot, target }));
        break;
      case TARGET.FRONT_ANY:
        enemyTargets(battle, enemy => enemy.position < 4)
          .forEach(target => actions.push({ type: ACTION_TYPES.RUNE, slot, target }));
        break;
      default:
        throw new Error(`${spell.name}: can't plan targeting ${spell.target}`);
    }
  });
  return actions;
}

/**
 * The Item actions a member can pick: each distinct battle item they hold that the sim models,
 * on each valid party member (or once, for an all-party item).
 * @param {Character} character
 * @param {Battle} battle
 * @returns {Action[]}
 */
function itemActions(character, battle) {
  /** @type {Action[]} */
  const actions = [];
  const seen = new Set();
  for (const { key } of character.inventory.entries) {
    if (seen.has(key)) continue;
    seen.add(key);
    const effect = ITEM_EFFECTS[key];
    if (!effect || !character.inventory.canUseInBattle(key)) continue;
    if (effect.target === TARGET.AOE) {
      actions.push({ type: ACTION_TYPES.ITEM, itemKey: key });
      continue;
    }
    battle.party.combatants.forEach((ally, target) => {
      if (ally.isValidCombatant) actions.push({ type: ACTION_TYPES.ITEM, itemKey: key, target });
    });
  }
  return actions;
}

/**
 * Every action one party member can be given on their own this round (Unites are planned for
 * the whole party in actionPlans). A member out of the fight gets a single Defend: they never
 * act, so anything else would only repeat plans.
 * @param {Character} character
 * @param {Battle} battle
 * @returns {Action[]}
 */
export function characterActions(character, battle) {
  if (character.outOfFight) return [DEFAULT_ACTION];

  /** @type {Action[]} */
  const actions = [
    DEFAULT_ACTION,
    ...enemyTargets(battle, enemy => character.canReach(enemy)).map(target => ({ type: ACTION_TYPES.ATTACK, target })),
    ...runeActions(character, battle),
    ...itemActions(character, battle),
  ];
  if (character.isUnbalanced) return actions.filter(action => UNBALANCED_ACTION_TYPES.includes(action.type));
  return actions;
}

/**
 * The Unite action every participant of `key` gets, one per target it can take.
 * @param {UniteKey} key
 * @param {Battle} battle
 * @returns {Action[]}
 */
function uniteActions(key, battle) {
  if (UNITES[key].target === TARGET.AOE) return [{ type: ACTION_TYPES.UNITE, uniteKey: key, target: 0 }];
  return enemyTargets(battle).map(target => ({ type: ACTION_TYPES.UNITE, uniteKey: key, target }));
}

/**
 * Cartesian product of per-slot choices.
 * @template T
 * @param {T[][]} choices
 * @returns {Generator<T[]>}
 */
function* product(choices) {
  if (choices.some(c => c.length === 0)) return;
  const indices = new Array(choices.length).fill(0);
  while (true) {
    yield indices.map((i, slot) => choices[slot][i]);
    let slot = choices.length - 1;
    while (slot >= 0 && ++indices[slot] === choices[slot].length) {
      indices[slot] = 0;
      slot--;
    }
    if (slot < 0) return;
  }
}

/**
 * Every Fight plan for the coming round, from the battle's state between rounds: each member's
 * candidate actions (after `filter`) combined with each other's, plus each set of Unites that can
 * go together, with the Unite's participants all given the same Unite action and everyone else
 * any of their own actions.
 * @param {Battle} battle
 * @param {PlanOptions} [options]
 * @returns {Generator<Action[]>}
 */
export function* fightPlans(battle, { round = battle.turn_count, filter, unites = true } = {}) {
  const members = battle.party.combatants;
  const candidates = members.map((character, slot) => {
    const actions = characterActions(character, battle);
    return filter ? filter({ character, slot, round, battle, candidates: actions }) : actions;
  });

  const available = battle.party.availableUnites();
  const uniteSets = disjointUniteSets(typeof unites === 'function'
    ? available.filter(key => unites(key, battle))
    : unites ? available : []);

  for (const set of uniteSets) {
    // Per slot: its own candidates, or the one Unite it's in (target chosen per Unite below)
    /** @type {(Action[] | UniteKey)[]} */
    const slots = candidates.map(c => c);
    for (const key of set) {
      for (const participant of UNITES[key].participants) {
        slots[members.findIndex(c => c.key === participant)] = key;
      }
    }

    // One choice per Unite (its target) and per non-participant (their action)
    const uniteChoices = set.map(key => uniteActions(key, battle));
    const freeSlots = slots.map((s, i) => typeof s === 'string' ? -1 : i).filter(i => i >= 0);
    const choices = [...uniteChoices, ...freeSlots.map(i => /** @type {Action[]} */ (slots[i]))];

    for (const picks of product(choices)) {
      /** @type {Action[]} */
      const plan = new Array(members.length);
      set.forEach((key, u) => {
        for (const participant of UNITES[key].participants) {
          plan[members.findIndex(c => c.key === participant)] = picks[u];
        }
      });
      freeSlots.forEach((slot, f) => { plan[slot] = picks[set.length + f]; });
      yield plan;
    }
  }
}

/**
 * Every round input to try for the coming round: all Fight plans, then Free Will and Run if
 * `commands` asks for them.
 * @param {Battle} battle
 * @param {PlanOptions} [options]
 * @returns {Generator<Round>}
 */
export function* roundPlans(battle, options = {}) {
  const { commands = [ROUND_COMMANDS.FIGHT] } = options;
  for (const command of commands) {
    switch (command) {
      case ROUND_COMMANDS.FIGHT:
        yield* fightPlans(battle, options);
        break;
      case ROUND_COMMANDS.FREE_WILL:
        yield { command };
        break;
      case ROUND_COMMANDS.RUN:
        if (battle.escapable) yield { command };
        break;
      default:
        throw new Error(`roundPlans: can't plan ${command}`);
    }
  }
}
