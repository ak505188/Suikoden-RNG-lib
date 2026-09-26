/**
 * Shared pieces of the basic-attack timing model used by CHARACTER_ATTACK_TIMINGS and
 * ENEMY_ATTACK_TIMINGS. Generated / verified by Suikoden-Bizhawk-HUD's
 * scripts/DerivePathTimings.py: every formula below reproduces AttackTimingWalker.walk_path
 * exactly over every party x enemy pair (~90k simulations), and walk_path itself matched a live
 * capture of 200 basic attacks frame for frame (hits, crits, misses, counters, cover, kills) plus
 * 6 Sacrificial Buddha revives.
 *
 * All frames are from the attack's t0 (the tick the executor starts the attack script, the same
 * tick as the hit / crit rolls) unless stated otherwise. `atk` = the attacker's timing entry,
 * `P` = atk.dodgePoint, `R` = atk.free - atk.recover (its recovery length).
 *
 *   hit / crit  damage roll atk.damage; attacker free atk.free;
 *               target free atk.damage + reaction (the attacker's reaction on that target)
 *   miss        no roll; attacker free atk.missFree ?? atk.free;
 *               target free max(P + dodge.afterPoint, atk.recover + dodge.afterRecover)
 *               (the target's own dodge; afterRecover null = that term is absent)
 *   counter     roll max(P + c.afterPoint, atk.damage + c.afterDamage), or P + c.primed when
 *               the retaliator still holds effect flag 0x2 from an earlier dodge (flags persist
 *               between actions; only a combatant's own attack clears them);
 *               retaliator free roll + c.free;
 *               attacker free roll + c.attackerDelay + R, or atk.free when R < 0 (its attack
 *               script clears its own busy, e.g. Assassin)
 *   cover       roll atk.damage; attacker free atk.free; ally free atk.damage + reaction
 *               (the attacker's reaction on the ally); target free = ally free +
 *               coverTargetAfterAlly
 *   kill        an enemy target: its free + death; an enemy attacker killed by a counter: its
 *               counter-path free + death; a party member: + 0 (the party death script sets and
 *               clears busy in the same frame); a party member with a Sacrificial Buddha: see
 *               the sacrificialBuddha* constants
 *
 * Known misfits (walk_path is the ground truth there): a primed counter against Clive (can't
 * happen in-game: he's Long range, so never countered) and a primed party counter by Eikei,
 * Morgan or Pahn against Assassin (attacker free only). Attackers whose `damage` / `free` are null
 * (an unmodelled native handler) can't use the formulas at all.
 */

/**
 * As the TARGET of a missed basic attack: when this combatant's own dodge script (table slot 3)
 * stops being busy. busy until max(atk.dodgePoint + afterPoint, atk.recover + afterRecover).
 * @typedef {Object} DodgeTiming
 * @property {number} afterPoint
 * @property {number | null} afterRecover - null = the dodge doesn't wait for the attacker to
 *   finish (FurFur, BonBon).
 */

/**
 * As a RETALIATOR countering a missed basic attack (characters with range !== LONG; enemies
 * with species flag 0x2). Its slot 3 (dodge), then slot 5 (counter strike), then the damage.
 * @typedef {Object} CounterTiming
 * @property {number} afterPoint - roll = max(atk.dodgePoint + afterPoint, atk.damage + afterDamage)
 * @property {number} afterDamage
 * @property {number} primed - roll = atk.dodgePoint + primed when this combatant still holds
 *   effect flag 0x2 (it dodged earlier and hasn't attacked since).
 * @property {number} free - roll -> this combatant's busy clears.
 * @property {number} attackerDelay - roll -> the countered attacker's recover script starts
 *   (attacker free = roll + attackerDelay + attacker recovery length).
 */

export const ATTACK_TIMING_CONSTANTS = /** @type {const} */ ({
  /** Cover: the covered target stops being busy this many frames after the covering ally. */
  coverTargetAfterAlly: 11,
  /** Sacrificial Buddha revive, frames from the end of the lethal hit's reaction (the revive
   * starts that frame): HP set to floor(HPMax / 2) at +113, busy clears at +123. The member keeps
   * its ActionTag, so it still acts this round if it hadn't yet. */
  sacrificialBuddhaHeal: 113,
  sacrificialBuddhaFree: 123,
});
