import { ACTION_TYPES, DEFAULT_ACTION, ROUND_COMMANDS, UNBALANCED_ACTION_TYPES } from './Actions.js';
import { UNITES, disjointUniteSets } from '../Unites.js';
import { ITEM_EFFECTS } from '../ItemEffects.js';
import { RUNE_TYPES } from '../Magic/Runes.js';
import { SIDE, TARGET } from '../Constants.js';
import { isValidAllyTarget } from '../Magic/Behavior.js';

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
 *   Fight expands to every action combination, Free Will and Run are one plan each (default
 *   DEFAULT_COMMANDS: Fight and Free Will; Run only when asked, as it needs an escapable fight)
 */

/**
 * The round commands a search tries unless told otherwise: Fight and Free Will. Free Will skips
 * inputting actions, so it's always worth a try; Run is opt-in.
 * @type {readonly import('./Actions.js').RoundCommandType[]}
 */
export const DEFAULT_COMMANDS = Object.freeze([ROUND_COMMANDS.FIGHT, ROUND_COMMANDS.FREE_WILL]);

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
 * Every party index a party-side spell can be cast on: the members still valid, the caster included
 * (for Yell, the downed ones instead).
 * @param {Battle} battle
 * @param {import('../Magic/Spells.js').Spell} spell
 * @returns {number[]}
 */
function allyTargets(battle, spell) {
  const targets = [];
  battle.party.combatants.forEach((ally, index) => {
    if (isValidAllyTarget(spell, ally)) targets.push(index);
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
        (spell.side === SIDE.ALLY ? allyTargets(battle, spell) : enemyTargets(battle))
          .forEach(target => actions.push({ type: ACTION_TYPES.RUNE, slot, target }));
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
 * One way to fill a free (non-Unite) slot: an action, and for a deferred one (ACTION_TYPES.DEFERRED)
 * the actions to choose between when that member's turn comes.
 * @typedef {{ action: Action, choices?: Action[] }} SlotOption
 */

/**
 * The shared core of fightPlans and fightStarts: each member's candidate actions (after `filter`),
 * turned into slot options by `toOptions`, combined with each other's, plus each set of Unites
 * that can go together, with the Unite's participants all given the same Unite action.
 * @param {Battle} battle
 * @param {PlanOptions} options
 * @param {(candidates: Action[]) => SlotOption[]} toOptions
 * @returns {Generator<{ plan: Action[], choices: (Action[] | undefined)[] }>} choices: per slot,
 *   what a deferred action chooses between
 */
function* fightInputs(battle, { round = battle.turn_count, filter, unites = true }, toOptions) {
  const members = battle.party.combatants;
  const options = members.map((character, slot) => {
    const actions = characterActions(character, battle);
    return toOptions(filter ? filter({ character, slot, round, battle, candidates: actions }) : actions);
  });

  const available = battle.party.availableUnites();
  const uniteSets = disjointUniteSets(typeof unites === 'function'
    ? available.filter(key => unites(key, battle))
    : unites ? available : []);

  for (const set of uniteSets) {
    // Per slot: its own options, or the one Unite it's in (target chosen per Unite below)
    /** @type {(SlotOption[] | UniteKey)[]} */
    const slots = options.map(o => o);
    for (const key of set) {
      for (const participant of UNITES[key].participants) {
        slots[members.findIndex(c => c.key === participant)] = key;
      }
    }

    // One choice per Unite (its target) and per non-participant (their option)
    /** @type {SlotOption[][]} */
    const uniteChoices = set.map(key => uniteActions(key, battle).map(action => ({ action })));
    const freeSlots = slots.map((s, i) => typeof s === 'string' ? -1 : i).filter(i => i >= 0);
    const choices = [...uniteChoices, ...freeSlots.map(i => /** @type {SlotOption[]} */ (slots[i]))];

    for (const picks of product(choices)) {
      /** @type {Action[]} */
      const plan = new Array(members.length);
      /** @type {(Action[] | undefined)[]} */
      const deferred = new Array(members.length);
      set.forEach((key, u) => {
        for (const participant of UNITES[key].participants) {
          plan[members.findIndex(c => c.key === participant)] = picks[u].action;
        }
      });
      freeSlots.forEach((slot, f) => {
        plan[slot] = picks[set.length + f].action;
        deferred[slot] = picks[set.length + f].choices;
      });
      yield { plan, choices: deferred };
    }
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
export function* fightPlans(battle, options = {}) {
  for (const { plan } of fightInputs(battle, options, candidates => candidates.map(action => ({ action })))) yield plan;
}

/** The placeholder a deferred slot starts the round with */
const DEFERRED_ACTION = /** @type {Action} */ (Object.freeze({ type: ACTION_TYPES.DEFERRED }));

/**
 * The same choices as fightPlans, as round-start inputs for a search that picks each member's
 * action at their turn (Battle.chooseAction): per member, Defend (if a candidate) or everything
 * else deferred. Defend has to be fixed at round start (it sets `defending` from tick 0); a
 * member with only one other candidate just gets it. Each plan's deferred slots list their
 * candidates in `choices`, taken now, at round start, like the menu: an enemy that dies before
 * the member's turn is still a target, which then retargets.
 * @param {Battle} battle
 * @param {PlanOptions} [options]
 * @returns {Generator<{ plan: Action[], choices: (Action[] | undefined)[] }>}
 */
export function* fightStarts(battle, options = {}) {
  yield* fightInputs(battle, options, candidates => {
    const defend = candidates.filter(action => action.type === ACTION_TYPES.DEFEND);
    const rest = candidates.filter(action => action.type !== ACTION_TYPES.DEFEND);
    /** @type {SlotOption[]} */
    const slotOptions = defend.map(action => ({ action }));
    if (rest.length === 1) slotOptions.push({ action: rest[0] });
    else if (rest.length > 1) slotOptions.push({ action: DEFERRED_ACTION, choices: rest });
    return slotOptions;
  });
}

/**
 * Every round input to try for the coming round: all Fight plans, then Free Will and Run if
 * `commands` asks for them.
 * @param {Battle} battle
 * @param {PlanOptions} [options]
 * @returns {Generator<Round>}
 */
export function* roundPlans(battle, options = {}) {
  const { commands = DEFAULT_COMMANDS } = options;
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

/**
 * roundPlans' choices as round-start inputs for a search that picks actions at each member's turn:
 * Fight as fightStarts, Free Will and Run as themselves (nothing deferred).
 * @param {Battle} battle
 * @param {PlanOptions} [options]
 * @returns {Generator<{ round: Round, choices: (Action[] | undefined)[] }>}
 */
export function* roundStarts(battle, options = {}) {
  const { commands = DEFAULT_COMMANDS } = options;
  for (const command of commands) {
    switch (command) {
      case ROUND_COMMANDS.FIGHT:
        for (const { plan, choices } of fightStarts(battle, options)) yield { round: plan, choices };
        break;
      case ROUND_COMMANDS.FREE_WILL:
        yield { round: { command }, choices: [] };
        break;
      case ROUND_COMMANDS.RUN:
        if (battle.escapable) yield { round: { command }, choices: [] };
        break;
      default:
        throw new Error(`roundStarts: can't plan ${command}`);
    }
  }
}
