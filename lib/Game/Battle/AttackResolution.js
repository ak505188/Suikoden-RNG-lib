import { ATTACK_RESULT } from './Actions.js';
import { LOG_TYPES } from './ActionLog.js';
import { cDiv } from '../../util/math.js';
import { ATTACK_TIMING_CONSTANTS } from './AttackTimingConstants.js';
import { RUNES } from '../Magic/Runes.js';
import { CRIT_MULT, NO_MULT } from './DamageMultiplier.js';

/** @typedef {import('./Battle.js').AttackParticipant} AttackParticipant */
/** @typedef {import('./Battle.js').AttackRoll} AttackRoll */
/** @typedef {import('./Battle.js').AttackTiming} AttackTiming */
/** @typedef {import('./Battle.js').Character} Character */
/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Combatant.js').default} Combatant */
/** @typedef {import('./Battle.js').EventFn} EventFn */

/**
 * Everything a basic attack does after its hit / crit rolls at t0 (battle tick):
 * busy windows, the damage roll(s) and effect flags, for either side.
 * @param {Battle} battle
 * @param {AttackParticipant} attacker
 * @param {AttackParticipant} target
 * @param {ATTACK_RESULT} result
 * @param {Character | null} [cover] - an ally taking battle hit for the target (findCoverTarget)
 * @param {AttackRoll[] | null} [rolls] - the rolls behind `result`, for the log
 */
export function applyAttackResult(battle, attacker, target, result, cover = null, rolls = null) {
  battle.record(
    LOG_TYPES.ATTACK,
    attacker,
    target,
    rolls ? { detail: result, rolls } : { detail: result },
  );
  const t0 = battle.turn.tick;
  const a = attacker.attackTiming;
  const primed = (target.fx & 0x2) !== 0; // it dodged earlier and hasn't attacked since
  attacker.fx = 0; // the executor clears the attacker's effect flags
  attacker.busyUntil = t0 + a.free;
  if (a.recover == null) throw new Error(`${a.name}: recover timing unknown`);
  attacker.attackUntil = t0 + a.recover;
  if (result === ATTACK_RESULT.CRIT) battle.turn.holdFlag = true; // battle_check_crit_and_branch

  switch (result) {
    case ATTACK_RESULT.HIT:
    case ATTACK_RESULT.CRIT: {
      const damageTick = t0 + a.damage;
      if (cover) {
        applyCoveredHit(battle, attacker, target, cover, damageTick);
        break;
      }
      const reaction = attacker.reactionFrames(target); // null: battle attack doesn't mark its target busy
      if (reaction !== null) target.busyUntil = Math.max(target.busyUntil, damageTick + reaction);
      const attackerIdx = battle.indexOf(attacker),
        targetIdx = battle.indexOf(target);
      const mult = result === ATTACK_RESULT.CRIT ? CRIT_MULT : NO_MULT;
      battle.queueEvent(damageTick, attacker, (b) => {
        const tgt = b.combatants[targetIdx];
        tgt.takeDamage(
          /** @type {AttackParticipant} */ (b.combatants[attackerIdx]).calcAttackDamage(
            tgt,
            b.rng,
            mult,
          ),
        );
      });
      queueReactionStatus(battle, a, damageTick, target);
      break;
    }
    case ATTACK_RESULT.MISSED:
      // The target plays its own dodge instead of the attacker's reaction
      attacker.busyUntil = t0 + (a.missFree ?? a.free);
      target.busyUntil = Math.max(target.busyUntil, t0 + dodgeFrames(battle, a, target));
      target.fx |= 0x2; // its dodge sets 0x2 on itself
      break;
    case ATTACK_RESULT.COUNTERED: {
      // The target dodges, then strikes back: calc_damage(target, attacker) mid-turn, run on
      // the target's own continuation (so it's the event's owner)
      const c = target.attackTiming.counter;
      if (!c) throw new Error(`${target.name}: counter timing unknown`);
      if (a.dodgePoint == null || a.recover == null)
        throw new Error(`${a.name}: counter timing unknown`);
      const roll = primed
        ? a.dodgePoint + c.primed
        : Math.max(a.dodgePoint + c.afterPoint, a.damage + c.afterDamage);
      const recovery = a.free - a.recover; // < 0: its attack script clears its own busy (Assassin)
      attacker.busyUntil = recovery < 0 ? t0 + a.free : t0 + roll + c.attackerDelay + recovery;
      attacker.attackUntil = t0 + roll + c.attackerDelay; // its recover waits for the counter
      target.busyUntil = Math.max(target.busyUntil, t0 + roll + c.free);
      target.fx = 0; // its dodge sets 0x2, then the counter steps clear it
      const attackerIdx = battle.indexOf(attacker),
        targetIdx = battle.indexOf(target);
      battle.queueEvent(t0 + roll, target, (b) => {
        const atk = b.combatants[attackerIdx];
        atk.takeDamage(
          /** @type {AttackParticipant} */ (b.combatants[targetIdx]).calcAttackDamage(atk, b.rng),
        );
      });
      break;
    }
  }
  // Every recover script releases COPY_ACTOR's hold on its frame 0 (anim opcode 9), on any path
  battle.turn.releaseAt = attacker.attackUntil;
}

/**
 * An attacker's reaction status roll (EnemyAttackTiming.reactionStatus), if it has one: anim
 * opcode 40 in its hit reaction, which plays on `victim` (the target, or the ally covering it).
 * Party owner -> lands on roll < chance. In the damage tick's animation pass, in the victim's own
 * update, so before its death check: a lethal hit still rolls.
 * @param {Battle} battle
 * @param {AttackTiming} a
 * @param {number} damageTick
 * @param {Combatant} victim
 */
export function queueReactionStatus(battle, a, damageTick, victim) {
  const rs = a.reactionStatus;
  if (!rs) return;
  const victimIdx = battle.indexOf(victim);
  battle.queueAnimationEvent(damageTick, victim, (b) => {
    const v = /** @type {Character} */ (b.combatants[victimIdx]);
    if (v.rune?.id === RUNES.TURTLE.id) return; // Turtle Rune: no roll
    const roll = cDiv(b.rng.next().rand * 100, 0x7fff) % 100;
    // On/off statuses (Poison); a counted one (Balloon) would need its own amount here
    if (roll < rs.chance && !v.status[rs.status])
      /** @type {Record<string, unknown>} */ (v.status)[rs.status] = true;
  });
}

/**
 * A hit taken by a cover ally (battle_check_counter_attack, then apply_covered_attack_damage
 * 0x800f5e90). The attacker's animation still plays at the original target, and both it and the
 * ally are busy from t0. At the damage tick the ally takes calc_damage(attacker, ally) (its own
 * DEF and Defend; no hit roll, so it can't dodge or counter) and the attacker's reaction, so any
 * reaction status too; the target takes nothing. The ally is free after the attacker's reaction on
 * it. The target's 0x8016c2b4 polls the ally's busy byte in its own animation-pass update and is
 * free 10 frames after it sees the ally free: coverTargetAfterAlly (11) after the ally's FINAL
 * free, so if the ally is attacked again first, the target waits for that hit too. Live-confirmed
 * (3Mosquito1Ant.State, 42 covers); a target at a higher index than its ally is walker-only.
 * @param {Battle} battle
 * @param {AttackParticipant} attacker
 * @param {AttackParticipant} target
 * @param {Character} ally
 * @param {number} damageTick
 */
export function applyCoveredHit(battle, attacker, target, ally, damageTick) {
  battle.record(LOG_TYPES.COVER, ally, target);
  const reaction = attacker.reactionFrames(ally) ?? 0;
  ally.busyUntil = Math.max(ally.busyUntil, damageTick + reaction);
  target.busyUntil = Infinity; // until the poll below sees the ally free

  const attackerIdx = battle.indexOf(attacker),
    allyIdx = battle.indexOf(ally),
    targetIdx = battle.indexOf(target);
  battle.queueEvent(damageTick, attacker, (b) => {
    const al = b.combatants[allyIdx];
    al.takeDamage(
      /** @type {AttackParticipant} */ (b.combatants[attackerIdx]).calcAttackDamage(al, b.rng),
    );
  });
  queueReactionStatus(battle, attacker.attackTiming, damageTick, ally);

  const afterAlly = ATTACK_TIMING_CONSTANTS.coverTargetAfterAlly;
  /** @type {EventFn} */
  const poll = (b) => {
    const al = b.combatants[allyIdx],
      tgt = b.combatants[targetIdx],
      tick = b.turn.tick;
    // A lower-index ally has already had battle frame's update, so its busy may have cleared now
    const allyFree = al.busyUntil < tick || (al.busyUntil === tick && allyIdx < targetIdx);
    if (allyFree) {
      tgt.busyUntil = tick + afterAlly - 1;
      return;
    }
    b.queueAnimationEvent(
      Math.max(tick + 1, allyIdx < targetIdx ? al.busyUntil : al.busyUntil + 1),
      tgt,
      poll,
    );
  };
  battle.queueAnimationEvent(ally.busyUntil, target, poll);
}

/**
 * A missed basic attack: t0 -> the frame the target's own dodge script (table slot 3) stops
 * being busy.
 * @param {Battle} battle
 * @param {AttackTiming} attackerTiming
 * @param {AttackParticipant} target
 * @returns {number}
 */
export function dodgeFrames(battle, attackerTiming, target) {
  const { dodge } = target.attackTiming;
  if (!dodge) throw new Error(`${target.name}: dodge timing unknown`);
  if (attackerTiming.dodgePoint == null || attackerTiming.recover == null)
    throw new Error(`${attackerTiming.name}: miss timing unknown`);
  const afterPoint = attackerTiming.dodgePoint + dodge.afterPoint;
  // afterRecover null: battle dodge doesn't wait for the attacker to finish (FurFur, BonBon)
  if (dodge.afterRecover === null) return afterPoint;
  return Math.max(afterPoint, attackerTiming.recover + dodge.afterRecover);
}
