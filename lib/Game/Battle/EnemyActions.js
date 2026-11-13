import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { DISPATCH_STATUS } from './BattleConstants.js';
import { LOG_TYPES } from './ActionLog.js';
import { findCoverTarget } from './Cover.js';
import { applyAttackResult } from './AttackResolution.js';
import { cDiv } from '../../util/math.js';

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
      battle.heap?.scanPass(enemy.key); // a target scan nobody passed: tried again next tick
      return { status: DISPATCH_STATUS.PENDING };
    case ACTION_TYPES.NOTHING:
      battle.record(LOG_TYPES.SKIP, enemy);
      return { status: DISPATCH_STATUS.DONE };
    case ACTION_TYPES.ATTACK:
      // The AI only picks targets that aren't busy, and the attack runs the same tick, so the
      // attack's own busy-target wait can't trigger here.
      return resolveEnemyAttack(battle, enemy, choice.target, false, (landed) =>
        battle.heap?.enemyMove(enemy.key, 'Attack', {
          tick,
          dispatchTick: tick,
          slot: battle.enemies.combatants.indexOf(enemy),
          landed,
        }),
      );
    case ACTION_TYPES.ABILITY: {
      const { move, target } = choice;
      // (a move that tells the heap itself when it lands: its start is known only then)
      if (!move.heapAtApply)
        battle.heap?.enemyMove(enemy.key, move.name, {
          target: target && battle.party.combatants.indexOf(target) + 1,
          round: battle.turn_count,
          rng: battle.rng,
          tick,
          order: battle.party.combatants.map((c) => c.key),
          before: battle.party.combatants.filter((c) => c.acted).length,
          dead: battle.party.combatants.some((c) => c.outOfFight),
        });
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
 * @param {boolean} [commanded] - run on a Holly Spirit's order: a script of its own, not the turn's
 * @param {(landed: boolean) => void} [onStart] - called once the attack's result is known, before it is applied: the heap's events of the move
 * @returns {DispatchResult}
 */
export function resolveEnemyAttack(battle, enemy, target, commanded = false, onStart = undefined) {
  const tick = battle.turn.tick;
  if (target.isBusy(tick)) return { status: DISPATCH_STATUS.PENDING }; // wait, no RNG

  const timing = enemy.attackTiming;
  if (timing.damage == null || timing.free == null)
    throw new Error(`${enemy.name}: ${timing.blocked}`);

  const rolls = battle.logging ? [] : null;
  const result = enemy.calcAttackResult(target, battle.rng, rolls);
  // battle_check_counter_attack: a hit may be taken by a cover ally, decided now at t0 (no RNG).
  // This is the only caller: party attacks and enemy special moves are never covered.
  onStart?.(result === ATTACK_RESULT.HIT);
  const cover =
    result === ATTACK_RESULT.HIT ? findCoverTarget(battle.party.combatants, target, tick) : null;
  applyAttackResult(battle, enemy, target, result, cover, rolls, commanded);
  return { status: DISPATCH_STATUS.DONE, gate: battle.freeWillGate };
}

/**
 * A monster move timed like a basic attack (e.g. Sydonia's special): it starts now, marks its
 * target busy at once, and its damage (move.apply) lands at t0 + strike.damage. No hit roll.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character} [target] - none for a move on nobody (the Beast Commander's Command)
 * @param {boolean} [commanded] - run on a Holly Spirit's order: it neither holds nor sets the turn's gate
 * @returns {DispatchResult}
 */
export function resolveEnemyStrike(battle, enemy, move, target, commanded = false) {
  const { strike } = move;
  const t0 = battle.turn.tick;
  enemy.fx = 0;
  enemy.busyUntil = t0 + strike.free;
  enemy.attackUntil = t0 + strike.recover;
  // Released like a basic attack's recover. Live-confirmed for Red Solider Ant's Double Strike
  // (copied at recover + 1 = +83); assumed for the others.
  if (!commanded) battle.turn.releaseAt = enemy.attackUntil;
  if (target) target.busyUntil = Math.max(target.busyUntil, t0 + strike.targetFree);
  strike.onStart?.(enemy, battle);
  if (move.onClone) {
    // the clone's slot, for a fixed time from now
    battle.takeSubActor();
    battle.releaseSubActor(
      t0 + /** @type {number} */ (enemy.attackTiming.subActorReaction.cloneHold),
    );
  }
  battle.queueEvent(
    t0 + strike.damage,
    enemy,
    moveEvent(battle, enemy, move, target),
    enemy,
    move.onClone,
  );
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
      battle: b,
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
  const { startAfter, timed } = move.held;
  // a timed move with its recorded event ticks (Battle.timingEvents) runs on exactly those
  const events = timed ? battle.timingEvents(enemy) : undefined;
  if (timed && events) {
    startTimed(battle, enemy, move, target, events, timed);
    return { status: DISPATCH_STATUS.PENDING };
  }
  // startAfter 0 starts this tick when the party is already idle
  if (startAfter === undefined || (startAfter === 0 && battle.partyIdleAt() <= battle.turn.tick)) {
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
 * A timed held move on recorded ticks: the particle rolls (held.rolls.count) at events.burst, the move
 * (apply) at events.hit, the turn ending and the enemy free `timed.end` / `timed.free` ticks after the hit.
 * Nothing is derived: no wait, no wait for the party to be idle.
 * @param {Battle} battle
 * @param {Enemy} enemy
 * @param {import('./EnemyAI.js').EnemyMove} move
 * @param {Character | undefined} target
 * @param {{ burst?: number, hit: number }} events
 * @param {{ end: number, free: number, targetFree?: number }} timed
 */
function startTimed(battle, enemy, move, target, events, timed) {
  const { held } = move;
  enemy.busyUntil = events.hit + timed.free;
  if (held.rolls && events.burst !== undefined) {
    const { count = 0, run } = held.rolls;
    battle.queueEvent(events.burst, enemy, (b) => {
      if (run) run(b.rng);
      for (let i = 0; i < count; i++) b.rng.next();
    });
  }
  if (held.hitRolls) {
    const { before, every, times, count } = held.hitRolls;
    for (let i = 0; i < times; i++)
      battle.queueEvent(events.hit - before + i * every, enemy, (b) => {
        for (let j = 0; j < count; j++) b.rng.next();
      });
  }
  battle.queueEvent(events.hit, enemy, moveEvent(battle, enemy, move, target));
  // the stored target's hit reaction keeps it busy this long after the hit (when the move declares it)
  if (target && timed.targetFree !== undefined)
    target.busyUntil = Math.max(target.busyUntil, events.hit + timed.targetFree);
  battle.turn.hold = { end: events.hit + timed.end, gate: held.gate };
  if (held.script) {
    const { at, pick, branches } = held.script;
    const enemyIdx = battle.indexOf(enemy);
    battle.queueEvent(battle.turn.tick + at, enemy, (b) => {
      const self = /** @type {Enemy} */ (b.combatants[enemyIdx]);
      self.scriptPick = pick(cDiv(b.rng.next().rand * 100, 0x7fff));
      const { end, gate, free } = branches[self.scriptPick];
      self.busyUntil = events.hit + free;
      b.turn.hold = { end: events.hit + end, gate };
    });
  }
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
  const idle = held.idleTimer ? battle.idleTimer(enemy, t0) : 0;
  enemy.busyUntil = t0 + held.free + idle;
  if (target && held.targetFree)
    target.busyUntil = Math.max(target.busyUntil, t0 + held.targetFree);
  if (held.partyBusy) {
    const { from, free } = held.partyBusy;
    battle.queueEvent(t0 + from, enemy, (b) => {
      for (const c of b.party.combatants)
        if (!c.outOfFight) c.busyUntil = Math.max(c.busyUntil, t0 + free);
    });
  }
  if (held.rolls) {
    const { count = 0, run } = held.rolls;
    battle.queueEvent(t0 + held.rolls.at + idle, enemy, (b) => {
      if (run) run(b.rng);
      for (let i = 0; i < count; i++) b.rng.next();
    });
  }
  if (held.damage !== undefined)
    battle.queueEvent(t0 + held.damage + idle, enemy, moveEvent(battle, enemy, move, target));
  battle.turn.hold = { end: t0 + held.end + idle, gate: held.gate };
}

/**
 * One tick of a Holly Spirit's Command walk (holly_spirit_continuation, phase 1): the enemies in index
 * order, each one that hasn't acted, isn't busy and is in the fight runs its own AI. An AI that has
 * nothing to do yet (a scan with no acceptor) leaves the walk going to the next enemy in the same tick, a
 * skip too (it is marked acted); one that attacks, flees or starts its own command takes the tick and
 * is marked acted. Its action runs on this tick like one from its own turn, without that turn's
 * hold or gate.
 * @param {Battle} battle
 * @returns {boolean} whether some enemy took the tick
 */
export function commandWalkTick(battle) {
  const tick = battle.turn.tick;
  for (const enemy of battle.enemies.combatants) {
    if (enemy.acted || enemy.outOfFight || enemy.isBusy(tick)) continue;
    const choice = enemy.selectAction({
      party: battle.party,
      enemies: battle.enemies,
      rng: battle.rng,
      tick,
      turn_count: battle.turn_count,
    });
    switch (choice.action) {
      case ACTION_TYPES.UNDETERMINED:
        continue;
      case ACTION_TYPES.NOTHING:
        battle.record(LOG_TYPES.SKIP, enemy);
        enemy.setActed(true);
        continue;
      case ACTION_TYPES.ATTACK:
        enemy.setActed(true);
        resolveEnemyAttack(battle, enemy, choice.target, true);
        return true;
      case ACTION_TYPES.ABILITY: {
        const { move, target } = choice;
        enemy.setActed(true);
        battle.record(LOG_TYPES.CAST, enemy, target, { detail: move.name });
        if (move.strike) resolveEnemyStrike(battle, enemy, move, target, true);
        // a command script of its own (a back-row Spirit's): nothing else happens in the sim
        return true;
      }
      default:
        throw new Error(`${enemy.name}: unhandled AI result ${JSON.stringify(choice)}`);
    }
  }
  return false;
}
