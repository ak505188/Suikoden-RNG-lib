import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { DISPATCH_STATUS } from './BattleConstants.js';
import { LOG_TYPES } from './ActionLog.js';
import { findCoverTarget } from './Cover.js';
import { applyAttackResult } from './AttackResolution.js';

/** @typedef {import('./Battle.js').Character} Character */
/** @typedef {import('./Battle.js').DispatchResult} DispatchResult */
/** @typedef {import('./Battle.js').Enemy} Enemy */
/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Battle.js').EventFn} EventFn */

/**
 *
 * @param {Battle} battle
 * @param {Enemy} enemy @returns DispatchResult
 */
export function dispatchEnemy(battle, enemy) {
  // Slept mid-round: turn over (DISPATCH sets ActionTag), gate unchanged
  if (enemy.isAsleep) return { status: DISPATCH_STATUS.DONE };

  const tick = battle.turn.tick;
  const choice = enemy.selectAction({
    party: battle.party,
    enemies: battle.enemies,
    rng: battle.rng,
    tick,
    turn_count: battle.turn_count,
  });
  switch (choice.action) {
    case ACTION_TYPES.UNDETERMINED:
      return { status: DISPATCH_STATUS.PENDING };
    case ACTION_TYPES.NOTHING:
      battle.record(LOG_TYPES.SKIP, enemy);
      return { status: DISPATCH_STATUS.DONE };
    case ACTION_TYPES.ATTACK:
      // The AI only picks targets that aren't busy, and the attack runs the same tick, so the
      // attack's own busy-target wait can't trigger here.
      return resolveEnemyAttack(battle, enemy, choice.target);
    case ACTION_TYPES.ABILITY: {
      const { move, target } = choice;
      battle.record(LOG_TYPES.CAST, enemy, target, { detail: move.name });
      if (move.strike) return resolveEnemyStrike(battle, enemy, move, target);
      if (move.held) return resolveEnemyHeld(battle, enemy, move, target);
      return battle.castMagic(enemy, moveEvent(battle, enemy, move, target), move.cast.frames);
    }
    default:
      throw new Error(`${enemy.name}: unhandled AI result ${JSON.stringify(choice)}`);
  }
}

/**
 * Enemy basic attack. Enemies never roll a crit.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {Character} target
 * @returns {DispatchResult}
 */
export function resolveEnemyAttack(battle, enemy, target) {
  const tick = battle.turn.tick;
  if (target.isBusy(tick)) return { status: DISPATCH_STATUS.PENDING }; // wait, no RNG

  const timing = enemy.attackTiming;
  if (timing.damage == null || timing.free == null)
    throw new Error(`${enemy.name}: ${timing.blocked}`);

  const rolls = battle.logging ? [] : null;
  const result = enemy.calcAttackResult(target, battle.rng, rolls);
  // battle_check_counter_attack: a hit may be taken by a cover ally, decided now at t0 (no RNG).
  // This is the only caller: party attacks and enemy special moves are never covered.
  const cover =
    result === ATTACK_RESULT.HIT ? findCoverTarget(battle.party.combatants, target, tick) : null;
  applyAttackResult(battle, enemy, target, result, cover, rolls);
  return { status: DISPATCH_STATUS.DONE, gate: battle.freeWillGate };
}

/**
 * A monster move timed like a basic attack (e.g. Sydonia's special): it starts now, marks its
 * target busy at once, and its damage (move.apply) lands at t0 + strike.damage. No hit roll.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character} target
 * @returns {DispatchResult}
 */
export function resolveEnemyStrike(battle, enemy, move, target) {
  const { strike } = move;
  const t0 = battle.turn.tick;
  enemy.fx = 0;
  enemy.busyUntil = t0 + strike.free;
  enemy.attackUntil = t0 + strike.recover;
  // Released like a basic attack's recover. Live-confirmed for Red Solider Ant's Double Strike
  // (copied at recover + 1 = +83); assumed for the others.
  battle.turn.releaseAt = enemy.attackUntil;
  target.busyUntil = Math.max(target.busyUntil, t0 + strike.targetFree);
  battle.queueEvent(t0 + strike.damage, enemy, moveEvent(battle, enemy, move, target));
  return { status: DISPATCH_STATUS.DONE, gate: strike.gate ?? battle.freeWillGate }; // live: next roll the tick after
}

/**
 * An event running a monster move's apply, on whichever battle it runs in.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character} [target]
 * @returns {EventFn}
 */
export function moveEvent(battle, enemy, move, target) {
  const enemyIdx = battle.indexOf(enemy),
    targetIdx = target ? battle.indexOf(target) : -1;
  return (b) =>
    move.apply(/** @type {Enemy} */ (b.combatants[enemyIdx]), {
      party: b.party,
      rng: b.rng,
      target: targetIdx < 0 ? undefined : /** @type {Character} */ (b.combatants[targetIdx]),
    });
}

/**
 * A monster move that holds its turn on fixed offsets from its start tick: its AI tick (t0), or,
 * with held.startAfter, the first tick from t0 + startAfter that no living party member is busy.
 * Damage (move.apply) at start + held.damage, the turn ending at start + held.end with the gate
 * at held.gate. Without startAfter there's no wait for anyone to be idle (the AI only runs once
 * its targets are free).
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character} [target]
 * @returns {DispatchResult}
 */
export function resolveEnemyHeld(battle, enemy, move, target) {
  const { startAfter } = move.held;
  if (startAfter === undefined) {
    startHeld(battle, enemy, move, target);
  } else {
    battle.turn.hold = {
      end: Infinity,
      pending: {
        from: battle.turn.tick + startAfter,
        enemyIdx: battle.indexOf(enemy),
        move,
        targetIdx: target ? battle.indexOf(target) : -1,
      },
    };
  }
  return { status: DISPATCH_STATUS.PENDING };
}

/**
 * Starts a held move's script battle tick.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character} [target]
 */
export function startHeld(battle, enemy, move, target) {
  const { held } = move;
  const t0 = battle.turn.tick;
  enemy.busyUntil = t0 + held.free;
  if (target && held.targetFree)
    target.busyUntil = Math.max(target.busyUntil, t0 + held.targetFree);
  if (held.partyBusy) {
    const { from, free } = held.partyBusy;
    battle.queueEvent(t0 + from, enemy, (b) => {
      for (const c of b.party.combatants)
        if (!c.outOfFight) c.busyUntil = Math.max(c.busyUntil, t0 + free);
    });
  }
  if (held.damage !== undefined)
    battle.queueEvent(t0 + held.damage, enemy, moveEvent(battle, enemy, move, target));
  battle.turn.hold = { end: t0 + held.end, gate: held.gate };
}
