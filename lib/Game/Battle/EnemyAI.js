import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { ELEMENTS, STATUS } from '../Constants.js';
import { reactionStatusRoll } from './AttackResolution.js';
import { ENEMY_KEYS } from '../Keys.js';
import { commandWalkTick } from './EnemyActions.js';
import { cDiv } from '../../util/math.js';
import { memoizeBurn } from '../Magic/SpellRNG/shared.js';

/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Combatant.js').CombatantTurnParams} CombatantTurnParams */
/** @typedef {import('./Actions.js').EnemyAction} EnemyAction */
/** @typedef {import('../Keys.js').EnemyKey} EnemyKey */
/** @typedef {import('../../rng.js').default} RNG */

/**
 * A monster move timed like a basic attack, all from the tick it starts (t0).
 * @typedef {Object} StrikeTiming
 * @property {number} damage - t0 -> the damage roll (the move's apply)
 * @property {number} recover - t0 -> its recover script starts: the other side's next actor is
 *   copied in the tick after
 * @property {number} free - t0 -> the frame its busy clears
 * @property {number} targetFree - t0 -> the frame the target's busy clears (busy from t0)
 * @property {number} [gate] - the roll gate it sets (unset: g_FreeWillGate, like a basic attack)
 */

/**
 * A monster move that holds its turn, all from its AI tick (t0).
 * @typedef {Object} HeldTiming
 * @property {number} [damage] - t0 -> the damage roll(s) (the move's apply); unset: the move does nothing
 * @property {boolean} [idleTimer] - `damage` and `end` both start from the move's idle timer: Battle.idleTimer
 *   ticks later than listed
 * @property {number} [startAfter] - the move waits (no RNG) for every living party member to be idle,
 *   from t0 + startAfter (0: starts on t0 itself when they already are), and the offsets below then count from the tick it starts instead of t0
 * @property {number} end - t0 -> the tick the turn ends
 * @property {number} gate - the roll gate it sets as the turn ends
 * @property {number} free - t0 -> the frame its busy clears
 * @property {number} [targetFree] - t0 -> the frame its target's busy clears
 * @property {{ from: number, free: number }} [partyBusy] - a move on everyone: t0 -> the frame every
 *   party member in the fight goes busy, and -> the frame all of them clear
 */

/**
 * A monster-specific move. Exactly one of:
 *   cast   a wind-up (Battle.castMagic): waits for everyone to be idle, `frames` ticks, then apply
 *   strike runs like a basic attack from the tick the AI picks it (Battle.resolveEnemyStrike)
 *   held   holds the turn on fixed offsets from the AI tick (Battle.resolveEnemyHeld)
 * @typedef {Object} EnemyMove
 * @property {string} name
 * @property {{ frames?: number }} [cast] - frames unset: Battle.DEFAULT_CAST_FRAMES (unmeasured)
 * @property {StrikeTiming} [strike]
 * @property {HeldTiming} [held]
 * @property {boolean} [onClone] - its damage runs in a clone spawned for it (Slasher Rabbit's Leap), a
 *   slot after every combatant, so after the other events of its tick
 * @property {(enemy: Enemy, ctx: { battle?: Battle, party: PlayerParty, rng: RNG, target?: Character }) => void} apply -
 *   its rolls and takeDamage calls, all on one tick
 */

/** @typedef {(enemy: Enemy, params: CombatantTurnParams) => EnemyAction} EnemyAI */

/**
 * The target pass most monster AIs share. One pass per tick: each front-row party member
 * (formation slot < 4) that's in the fight and not busy costs one rand() and is picked on
 * rand() % 100 > 50. Dead, back-row and busy members are skipped at no RNG cost.
 * @param {PlayerParty} party @param {RNG} rng @param {number} tick
 * @returns {Character | null} null: nobody picked this pass (retry next tick, fresh rolls)
 */
export function frontRowTarget(party, rng, tick) {
  return (
    party.combatants.find(
      (c) => c.position < 4 && !c.outOfFight && !c.isBusy(tick) && rng.next().rand % 100 > 50,
    ) ?? null
  );
}

/**
 * The same pass over both rows (Sydonia).
 * @param {PlayerParty} party @param {RNG} rng @param {number} tick
 * @returns {Character | null}
 */
export function anyRowTarget(party, rng, tick) {
  return (
    party.combatants.find((c) => !c.outOfFight && !c.isBusy(tick) && rng.next().rand % 100 > 50) ??
    null
  );
}

/** @param {Character} target @returns {EnemyAction} */
const attack = (target) => ({ action: ACTION_TYPES.ATTACK, target });
/** @param {EnemyMove} move @param {Character} [target] @returns {EnemyAction} */
const useMove = (move, target) => ({ action: ACTION_TYPES.ABILITY, move, target });
const UNDETERMINED = /** @type {EnemyAction} */ ({ action: ACTION_TYPES.UNDETERMINED });

/**
 * Dragon's Lightning particle phase: 128 ticks, 30 particles, all its rand() calls. Each tick every
 * inactive particle respawns (X, Y, an unused Z, r4, r5: lifetime = r5 % 70, velZ = -((r4 % 5) + 5)
 * * 4096, posZ keeps only its low 12 bits), then each active one deactivates if lifetime < 1 or
 * floor(posZ / 4096) < -300, else lifetime -= 1 and posZ += velZ. Nothing else rolls during a
 * held cast, so it can all run at once before the damage roll.
 * @param {RNG} rng
 */
export function dragonLightningParticles(rng) {
  const particles = Array.from({ length: 30 }, () => ({
    active: false,
    lifetime: 0,
    posZ: 0,
    velZ: 0,
  }));
  for (let tick = 0; tick < 128; tick++) {
    for (const p of particles) {
      if (p.active) continue;
      rng.next();
      rng.next();
      rng.next(); // X, Y, unused Z
      const r4 = rng.next().rand,
        r5 = rng.next().rand;
      Object.assign(p, {
        active: true,
        lifetime: r5 % 70,
        velZ: -((r4 % 5) + 5) * 4096,
        posZ: p.posZ & 0xfff,
      });
    }
    for (const p of particles) {
      if (p.lifetime < 1 || Math.floor(p.posZ / 4096) < -300) {
        p.active = false;
      } else {
        p.lifetime -= 1;
        p.posZ += p.velZ;
      }
    }
  }
}

/** dragonLightningParticles, memoized by start state: what the move plays */
export const dragonLightningBurn = memoizeBurn(dragonLightningParticles);

/**
 * DRAGON_TIMING: Dragon.State, live 2026-09-28 (15 Fire Breaths, 15 Lightnings). Her AI runs the
 * tick after she becomes the current actor (t0 here: the target-scan rolls); her move callback is
 * installed at t0 + 35 and the move roll (M) comes at t0 + 36. The sim makes the move roll at t0
 * with the target scan: nothing else rolls in between, so the RNG order is the same. Each move's
 * later frames drift over a 5-frame range whose cause is unknown; the middle is used. Her moves
 * wait for the party to be idle (startAfter 0), e.g. Valeria's Falcon Rune busy (full Dragon fight
 * capture, 2026-10-08: damage 3 ticks late, start 25-28 after the previous actor's Defend).
 */
const DRAGON_M = 36;

/** Queen Ant's AoE Earth wind-up (A), AI roll -> party targets set: the mode of 50 samples */
const QUEEN_AOE_WINDUP = 164;

/**
 * AIN_GIDE_SPECIAL_TIMING: AinGide.State, live 2026-10-07 (43 Specials). T0 is his first tick as the
 * current actor and t0 here the AI tick, T0 + 1. His script starts (busy 0 -> 1) on the first tick
 * from T0 + 2 that no living party member is busy: P. The tick machine's first call (S) follows the
 * cue wait, an async 15, 16, 17 or 19 ticks (17 most common) after the handler's +0x42 = 2 at P + 11:
 * S = P + 28 is used (T0 + 30 normally; observed T0 + 28 to T0 + 32). Everything after S is fixed:
 * damage rolls S + 190, his busy clears at S + 204, the gate is set to 30 on S + 205.
 */
const AIN_GIDE_S = 28;

const OANNES_SPECIAL_DAMAGE = 79;
const GHOST_BASE = 42;
const GHOST_END = 90;
const GHOST_FREE = 91;
const OANNES_SPECIAL_RECOVER = 117;
const OANNES_SPECIAL_FREE = 169;
const OANNES_SPECIAL_TARGET_FREE = 114;

// The Slot Man's offsets from its AI tick (turn frame 2): the tick the effect lands and the turn's end
const SLOT_GATE = 1;
const SLOT_D_DAMAGE = 217;
const SLOT_D_END = 300;
const SLOT_C_DAMAGE = 126;
const SLOT_C_END = 289;
const SLOT_A_HEAL = 269;
const SLOT_A_END = 353;
const SLOT_E_DAMAGE = 259;
const SLOT_E_END = 343;
const SLOT_B_HEAL = 97;
const SLOT_B_END = 180;
const SLOT_F_DAMAGE = 314;
const SLOT_F_BALLOON = 20;
const SLOT_F_END = 427;

/** @satisfies {Record<string, EnemyMove>} */
export const ENEMY_MOVES = {
  // Slasher Rabbit's Leap (clone) (paths f0253795, ca0ec89f; script 0x8004a6f2): the spawn rolls
  // nothing, and there's no hit or crit roll, so it can't be dodged, countered or covered. Measured
  // from the recorded fixture (slasher_rabbit_lv6_hp60, 20 seeds x 4 rounds): the target is busy from
  // the AI tick, the one damage roll comes 63 ticks after it (a basic attack's is 78) and the target's
  // busy clears 45 after that (the rabbit's attack reaction), the next roll comes 1 tick after the AI
  // tick. The damage runs in the clone's slot: on a tick it shares with an attack's damage, the
  // attack's comes first whatever the actors' numbers (onClone). As the round's last actor (78 of 78
  // last turns) the next actor is copied at +116 and the round ends 185 frames after the AI tick
  // (free 136 gives that).
  // UNVERIFIED: the target's busy clears later than +45 for 25 of 207 leap victims (+46 to +71), only
  // with other leap hits in its 45 frames; not modelled, and it costs 6 of 80 rounds their RNG (the
  // party's first turn rolls skip busy members). Also the clone's slot limit (the AI's leap condition
  // needs a free enemy slot; no recorded spawn failed, so it isn't checked) and free/recover when the
  // leap isn't last.
  SLASHER_RABBIT_LEAP: {
    name: 'Leap',
    onClone: true,
    strike: { damage: 63, recover: 116, free: 136, targetFree: 108, gate: 1 },
    apply: (enemy, { battle: b, target, rng }) => {
      const battle = /** @type {Battle} */ (b);
      target.takeDamage(enemy.calcAttackDamage(target, rng));
      const sub = enemy.attackTiming.subActorReaction;
      battle.requestReaction(battle.turn.tick + sub.request, target, {
        busy: sub.busy,
        hold: sub.hold,
      });
    },
  },

  // Beast Commander's Command (path b7ccd12b; script 0x800a2268, continuation 0x800811b0): no roll in
  // the AI. Measured from beast_commander_lv13_hp90 (S-hit, 80 turns; the scenario runs): the script
  // raises its flag 11 ticks after the AI tick, and the continuation then gives every enemy k (the
  // enemy list's order, 1..n) that hasn't acted and is free the party member standing in formation slot
  // k (in the fight, not busy): each runs its own attack script on them at once (apply). The squirrels'
  // hits have no hit roll (nothing but the turn-order poll rolls at that tick) and can't miss. An enemy
  // with no such member isn't touched and takes its own turn later. The next actor's roll comes 71 ticks
  // after the AI tick (the gate), the next actor is copied at +142, the turn ends there.
  // The commander's own busy (free 141) is measured from turn_order_inputs: 160 of 160 Command turns. No round's
  // result reads it.
  BEAST_COMMANDER_COMMAND: {
    name: 'Command',
    strike: { damage: 11, recover: 141, free: 141, targetFree: 0, gate: 71 },
    apply: (_enemy, { battle: b }) => {
      const battle = /** @type {Battle} */ (b);
      const tick = battle.turn.tick;
      battle.enemies.combatants.forEach((squirrel, k) => {
        if (squirrel.acted || squirrel.outOfFight || squirrel.isBusy(tick)) return;
        if (squirrel.HP - squirrel.pendingDamage <= 0) return;
        const target = battle.party.combatants.find(
          (c) => c.position === k + 1 && !c.outOfFight && !c.isBusy(tick),
        );
        if (!target) return;
        squirrel.setActed(true);
        battle.applyAttackResult(squirrel, target, ATTACK_RESULT.HIT, null, null, true);
      });
    },
  },

  // Beast Commander's Sleep attack (path 97ce7c33; script 0x800a2374, slot-2 script 0x800a229c, ends in
  // opcode 40: status 5, chance 30): no hit or damage roll, so it never costs HP. The scanned member is
  // busy from the AI tick until +129 and the status roll comes at +119 (turn start + 120); the turn is
  // over 2 ticks after the AI tick (recover 1) with the next roll one tick after it. Measured from
  // beast_commander_lv13_hp90's scenario runs (160 attack turns). The member is busy from the AI tick (the
  // turn-order roll one tick later already skips it). The commander's own busy (free) is 100 from the AI
  // tick: turn_order_inputs, 160 of 160 Sleep turns. No round's result reads it.
  BEAST_COMMANDER_SLEEP: {
    name: 'Sleep',
    strike: { damage: 119, recover: 1, free: 100, targetFree: 129, gate: 1 },
    apply: (_enemy, { battle, target }) =>
      reactionStatusRoll({ status: STATUS.SLEEP, chance: 30 })(
        /** @type {Battle} */ (battle),
        /** @type {Character} */ (target),
      ),
  },

  // Holly Spirit's Command (paths 498c8451, 85b79f97; script 0x8006f4bc on v1.0, continuation 0x800104ec):
  // no roll in the AI. The script waits on the Spirit's idle timer T0 (Battle.idleTimer, a recorded input:
  // turn length 184 + T0), so the first scan is at turn frame 31 + T0 = the AI tick + 30 + T0. From there the
  // continuation walks the enemies once every tick for 122 ticks (commandWalkTick; ai.json's phase 99 comes
  // 122 frames after phase 1, no recorded round constrains the length), and the turn ends as the walk does,
  // the gate 30 (end 30 + 122 = 152: the next actor is current at turn frame 184 + T0, 3 recorded groups
  // exact). A back-row Spirit it commands starts a script of its own and nothing more. Its own busy
  // isn't read by any round (set to the end).
  HOLLY_SPIRIT_COMMAND: {
    name: 'Command',
    held: { idleTimer: true, damage: 30, end: 152, gate: 30, free: 152 },
    apply: (_enemy, { battle: b }) => {
      const battle = /** @type {Battle} */ (b);
      const first = battle.turn.tick;
      const walk = (/** @type {Battle} */ bt) => {
        commandWalkTick(bt);
        const alive = bt.enemies.combatants.some((e) => !e.acted && !e.outOfFight);
        if (alive && bt.turn.tick < first + 121) bt.queueEvent(bt.turn.tick + 1, _enemy, walk);
      };
      walk(battle);
    },
  },

  // Oannes' Special (paths 6806bd8d, e5f263b1; script 0x8005fda8 on v1.0): a half-damage hit and a 30%
  // Poison roll, no hit roll (it can't be dodged, countered or covered). Measured from oannes_lv16_hp200
  // (S-hit 80 rounds, S-def0 32 rounds): the target is busy from the AI tick until +OANNES_SPECIAL_TARGET_FREE,
  // the hit lands at +OANNES_SPECIAL_DAMAGE (calc_damage floored at 1 BEFORE the halving, so 0 against a
  // high DEF party) and the Poison roll comes right after it on the same tick, once, also on a target
  // that is already poisoned (3c6ef362 round 4: the second Special's target was). The next roll is 1 tick after the AI tick; the Oannes' own busy clears at
  // +OANNES_SPECIAL_FREE, which is how long it holds the round when it is the last actor.
  OANNES_SPECIAL: {
    name: 'Special',
    strike: {
      damage: OANNES_SPECIAL_DAMAGE,
      recover: OANNES_SPECIAL_RECOVER,
      free: OANNES_SPECIAL_FREE,
      targetFree: OANNES_SPECIAL_TARGET_FREE,
      gate: 1,
    },
    apply: (enemy, { target, rng, battle }) => {
      target.takeDamage(enemy.calcAttackDamage(target, rng, { mul: 1, div: 2 }));
      reactionStatusRoll({ status: STATUS.POISON, chance: 30 })(
        /** @type {Battle} */ (battle),
        target,
      );
    },
  },

  // The Slot Man's six outcomes (vb3.bin script 16c90c55, state machine 0x80011758 on v1.0; the AI picks the
  // outcome, see slotManAI). Every offset is from the AI tick (turn frame 2 when the first scan accepts) and
  // measured from slot_man_lv19_hp200 (280 turns): `idleTimer` is the recorded wait of C, E, F and A, which
  // shifts the effect and the end together (C hit 128-131, turn 292-295; E 261-264 / 346-349; F 315-316 /
  // 430-431; A heal 270-272 / 356-358; D and B never wait). The hits and heals are applied one tick before
  // the HP shows, like any damage roll.
  SLOT_MAN_D: {
    name: 'Slot D',
    held: {
      idleTimer: true,
      damage: SLOT_D_DAMAGE,
      end: SLOT_D_END,
      gate: SLOT_GATE,
      free: SLOT_D_END - 1,
    },
    apply: (enemy, { target, rng }) => target?.takeDamage(enemy.calcAttackDamage(target, rng)),
  },
  SLOT_MAN_C: {
    name: 'Slot C',
    held: {
      idleTimer: true,
      damage: SLOT_C_DAMAGE,
      end: SLOT_C_END,
      gate: SLOT_GATE,
      free: SLOT_C_END - 1,
    },
    apply: (enemy, { target, rng }) =>
      target?.takeDamage(enemy.calcMagicDamage(ELEMENTS.LIGHTNING, target, rng)),
  },
  // A heals the Slot Man by 150 (capped at its max HP) after a 128-tick particle effect of about 500 rand()
  // calls (30 particles x 3 rolls at the start, then 3 per respawn, 127 ticks long) that the sim does NOT
  // model: its roll count is not reproduced (see test/enemies/recorded/slotMan.test.js).
  SLOT_MAN_A: {
    name: 'Slot A',
    held: {
      idleTimer: true,
      damage: SLOT_A_HEAL,
      end: SLOT_A_END,
      gate: SLOT_GATE,
      free: SLOT_A_END - 1,
    },
    apply: (enemy) => enemy.takeDamage(-150),
  },
  SLOT_MAN_E: {
    name: 'Slot E',
    held: {
      idleTimer: true,
      damage: SLOT_E_DAMAGE,
      end: SLOT_E_END,
      gate: SLOT_GATE,
      free: SLOT_E_END - 1,
    },
    apply: (enemy, { target, rng }) =>
      target?.takeDamage(enemy.calcMagicDamage(ELEMENTS.FIRE, target, rng)),
  },
  // B heals every living party member by 7 (capped at max HP), no roll
  SLOT_MAN_B: {
    name: 'Slot B',
    held: {
      idleTimer: true,
      damage: SLOT_B_HEAL,
      end: SLOT_B_END,
      gate: SLOT_GATE,
      free: SLOT_B_END - 1,
    },
    apply: (_enemy, { party }) => {
      for (const character of party.combatants) if (!character.outOfFight) character.takeDamage(-7);
    },
  },
  // F: on every living party member in slot order, two rolls each: a Balloon roll, then Earth (category 3)
  // damage. The Balloon chance is only bounded by the recordings (hit on rolls up to 16, never on 20 and
  // above: 17 to 20; 20 used); a member already ballooned goes up a stage (6 of 6). The callee's loop counter
  // is the member's 0-based index (decoded: member - 1), so the slot bug halves member 4 when its rune isn't
  // in the category table; the 1 minimum applies after that halving (member 4 takes 1, not 0).
  SLOT_MAN_F: {
    name: 'Slot F',
    held: {
      idleTimer: true,
      damage: SLOT_F_DAMAGE,
      end: SLOT_F_END,
      gate: SLOT_GATE,
      free: SLOT_F_END - 1,
    },
    apply: (enemy, { battle, party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        reactionStatusRoll({ status: STATUS.BALLOON, chance: SLOT_F_BALLOON })(
          /** @type {Battle} */ (battle),
          character,
        );
        character.takeDamage(Math.max(enemy.calcMagicDamage(ELEMENTS.EARTH, character, rng, i), 1));
      });
    },
  },

  // Holly Boy's Flee (path be08f96d; slot-4 callback 0x800766e8): no hit or damage roll. It marks its
  // target busy (bit 8) from the AI tick and the Holly Boy leaves the fight. Timing, all measured from
  // the recorded fixtures (holly_boy_lv3_hp10, 30 seeds; holly_boy_lv5_hp80 and the Spirit's groups): the
  // next roll comes 30 ticks after the AI tick (the gate), the target's busy clears at +128, and the round
  // doesn't end until +285 (every round whose last busy flag is a Flee's; 280 and 290 both break all of
  // them). The Boy itself is out of the fight at +285, when its own busy clears: a party member's attack on
  // it waits until then (holly_spirit_lv21_hp350, S-mid group 7: leaving at +284 or earlier, or +286, each
  // breaks rounds; +285 replays all 120). UNVERIFIED: which flag the +285 is.
  HOLLY_BOY_FLEE: {
    name: 'Flee',
    strike: { damage: 285, recover: 0, free: 285, targetFree: 128, gate: 30 },
    apply: (enemy) => {
      enemy.removedFromFight = true;
    },
  },

  // red_soldier_ant_special_double_strike (a_data.bin 0x80080950). The AI plays script
  // 0x800a5460 and sets the gate to 20; damage = calc_damage << 1, no hit or crit roll (so it
  // can't be dodged, countered or covered). Live (3Mosquito1Ant.State, 12 runs): impact +28,
  // damage +29, target free +63, next actor copied at +83 (opcode 9 at +82), ant free +145 (its
  // own clear, no return script).
  RED_SOLDIER_ANT_DOUBLE_STRIKE: {
    name: 'Double Strike',
    strike: { damage: 29, recover: 82, free: 145, targetFree: 63, gate: 20 },
    apply: (enemy, { target, rng }) =>
      target.takeDamage(enemy.calcAttackDamage(target, rng, { mul: 2, div: 1 })),
  },

  // Mt. Seifu Queen Ant's AoE Earth (va7.bin queen_ant_aoe_earth_damage_loop 0x80011c60): Earth
  // (category 3) on every living party member in slot order, one roll each, all on one tick, dead
  // slots free. Halved for the Earth and Soul Eater runes only; no slot bug (the loop slot isn't
  // passed). Queen_Ant_Turn_Timing.md, 50 turns: from her AI roll the party goes busy at A + 127 and
  // clears together at A + 161 (no slot variation), the HP drops land at A + 175, her busy clears
  // at A + 180 and her turn ends at A + 181 with the gate at 30. A is her wind-up.
  // UNVERIFIED: A varies (58 x2, 99, 142 x2, 152 x2, 164 x24, 166, 171 x7, 174 x3, 178 x2, 184 x2,
  // 186 x4); 164 is the mode and 58 only came with no ant alive. Its cause isn't found.
  QUEEN_ANT_AOE_EARTH: {
    name: 'AoE Earth',
    held: {
      damage: QUEEN_AOE_WINDUP + 175,
      end: QUEEN_AOE_WINDUP + 181,
      gate: 30,
      free: QUEEN_AOE_WINDUP + 180,
      partyBusy: { from: QUEEN_AOE_WINDUP + 127, free: QUEEN_AOE_WINDUP + 161 },
    },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character) => {
        if (character.outOfFight) return;
        character.takeDamage(enemy.calcMagicDamage(ELEMENTS.EARTH, character, rng));
      });
    },
  },

  // The CommandAnts branch: no RNG and no effect, but not free (25 identical samples): the turn
  // ends at +106 with the gate at 30 (it arms 90 at +16, overwritten at +106). Her busy clears at
  // +179 (16 of the 25 samples; the rest weren't recorded).
  QUEEN_ANT_COMMAND_ANTS: {
    name: 'Command Ants',
    held: { end: 106, gate: 30, free: 179 },
    apply: () => {},
  },

  // Ain Gide's Special (vac.bin continuation 0x80013d08): Fire (category 1) on every living party
  // member in slot order. After the 24 particles' 2 rolls each (48, spread over S + 32 .. S + 124 and
  // nothing else rolls meanwhile), one roll per member, all on S + 190. No AOE halving. The loop
  // counter is in $s1, so the slot bug halves slot 1 when its rune isn't in the category table.
  // Live: 80 rounds exact on RNG count, 56 rune configs exact on damage. Timing: AIN_GIDE_S. The
  // party's three hit-reaction waves (S + 52, 90, 128; busy 8 for 34 frames each) are not modelled:
  // all end before the damage, while his turn is held and nobody else acts.
  AIN_GIDE_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 1,
      damage: AIN_GIDE_S + 190,
      end: AIN_GIDE_S + 204 + 1,
      gate: 30,
      free: AIN_GIDE_S + 204,
    },
    apply: (enemy, { party, rng }) => {
      for (let i = 0; i < 48; i++) rng.next();
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(enemy.calcMagicDamage(ELEMENTS.FIRE, character, rng, i + 1));
      });
    },
  },

  // The slot bug halves slot 6. Live-confirmed.
  ZOMBIE_DRAGON_FIRE_BREATH: {
    name: 'Fire Breath',
    cast: { frames: 392 },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(enemy.calcMagicDamage(ELEMENTS.RESURRECTION, character, rng, i + 1));
      });
    },
  },
  // Fire (category 1), every living party member in slot order, one roll each and no other RNG.
  // Each hit is halved once more, unconditionally; the slot bug halves slot 1 as well.
  // Timing: see DRAGON_TIMING. Damage D = M + 264..268 (M + 266 used); her busy clears and her
  // turn ends at B = D + 21, and the gate is set to 30 the tick after.
  DRAGON_FIRE_BREATH: {
    name: 'Fire Breath',
    held: {
      startAfter: 0,
      damage: DRAGON_M + 266,
      end: DRAGON_M + 266 + 21 + 1,
      gate: 30,
      free: DRAGON_M + 266 + 21,
    },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(
          enemy.calcMagicDamage(ELEMENTS.FIRE, character, rng, i + 1, { mul: 1, div: 2 }),
        );
      });
    },
  },
  // Lightning (category 4), the AI's target only: the 128-tick particle phase, 124 ticks with no
  // RNG, then the damage roll. Timing: see DRAGON_TIMING. The particle phase starts at
  // P = M + 15..19 (M + 17 used); the target reacts P + 144..P + 214, damage at D = P + 251; her busy
  // clears and her turn ends at B = D + 22, and the gate is set to 30 the tick after. Nothing else
  // rolls in between, so the particle rolls run with the damage roll.
  DRAGON_LIGHTNING: {
    name: 'Lightning',
    held: {
      startAfter: 0,
      damage: DRAGON_M + 17 + 251,
      end: DRAGON_M + 17 + 251 + 22 + 1,
      gate: 30,
      free: DRAGON_M + 17 + 251 + 22,
      targetFree: DRAGON_M + 17 + 214,
    },
    apply: (enemy, { target, rng }) => {
      dragonLightningBurn(rng);
      target.takeDamage(enemy.calcMagicDamage(ELEMENTS.LIGHTNING, target, rng));
    },
  },
  // Static analysis (Battle_Damage_Formula.md's slot-bug table, va4.bin): Earth
  // (category 3) on every living party member in slot order, one roll each; the loop counter is
  // in $s1, so the slot bug halves slot 3. All of its timing are unmeasured.
  GOLEM_SPECIAL: {
    name: 'Golem Special',
    cast: {},
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(enemy.calcMagicDamage(ELEMENTS.EARTH, character, rng, i + 1));
      });
    },
  },
  // Script 0x800700c0. Live (VerifyTalismanUnite, 15 runs): target busy from +0 and free at +125,
  // the next actor copied at +108, Sydonia free at +180. sydonia_special_apply_damage
  // (0x8001258c): floor(calc_damage * 4/3), its one rand(). No hit or crit roll, so it can't miss;
  // Defend halving is inside calc_damage, before the x4/3.
  SYDONIA_SPECIAL: {
    name: 'Sydonia Special',
    strike: { damage: 80, recover: 107, free: 180, targetFree: 125 },
    apply: (enemy, { target, rng }) =>
      target.takeDamage(enemy.calcAttackDamage(target, rng, { mul: 4, div: 3 })),
  },
};

/**
 * Plain attack. Front-row pass, then basic attack.
 * @type {EnemyAI}
 */
export const defaultAI = (_enemy, { party, rng, tick }) => {
  if (!party.getFrontRow().length) return { action: ACTION_TYPES.NOTHING }; // turn skipped
  const target = frontRowTarget(party, rng, tick);
  return target ? attack(target) : UNDETERMINED;
};

/**
 * The Holly Boy: the front-row pass, then, for a target of LVL >= 4 only, one more roll:
 * (r % 100) > 25 -> Flee (73.97%), else Attack. A target below LVL 4 is always attacked, with no
 * second roll (the gate reads the accepted target's own LVL).
 * @type {EnemyAI}
 */
const hollyBoyAI = (enemy, params) => {
  const choice = defaultAI(enemy, params);
  if (choice.action !== ACTION_TYPES.ATTACK) return choice;
  if (choice.target.LVL < 4) return choice;
  if (params.rng.next().rand % 100 > 25) return useMove(ENEMY_MOVES.HOLLY_BOY_FLEE, choice.target);
  return choice;
};

/**
 * oannes_ai_select_target_and_move (vb5.bin 0x80011074 on v1.0): the front-row pass, then, once a target is
 * accepted, one more roll: (r % 100) < 76 -> Attack (76.05%), else Special. No level, HP or status gate.
 * @type {EnemyAI}
 */
const oannesAI = (enemy, params) => {
  const choice = defaultAI(enemy, params);
  if (choice.action !== ACTION_TYPES.ATTACK) return choice;
  if (params.rng.next().rand % 100 < 76) return choice;
  return useMove(ENEMY_MOVES.OANNES_SPECIAL, choice.target);
};

/**
 * Ghost Armor's Ghost Spirits (paths c0165cdf, ce08fa3d; ghost_armor_ai_select_target_and_move 0x8001017c on
 * v1.0, callbacks ghost_armor_vb5_cb_pick_targets and cb_attack_tick): no roll in the AI. The targets are the
 * first three party members in index order that are in the fight and not busy (no row test), picked at the
 * AI tick; none: the turn is skipped. One helper actor per target (list slots 1, 2, 3) hits it, no hit roll
 * (240 of 240 landed): the hit frames are B + {1, 47, 0} for slots 1, 2, 3 where B = the AI tick + 42 + the
 * idle-cycle wait (a recorded input, Battle.idleTimer: the script waits for bit 2 of the sprite flag word,
 * 0-32 frames). Each hit is one damage roll, busies its victim for 45 ticks from the hit and takes the
 * victim's reaction slot 2 ticks later (the Kobold's reaction: busy 43, hold 21). The three helpers take
 * their slots at the AI tick + 1 + wait and hold them 120, 132 and 136 ticks. The turn is 93 + wait frames
 * with two or three targets and 91 + wait with one (measured, not decoded).
 * @param {number} count how many targets
 * @param {Character[]} targets
 * @returns {EnemyMove}
 */
const ghostSpirits = (count, targets) => ({
  name: 'Ghost Spirits',
  held: {
    idleTimer: true,
    damage: GHOST_BASE,
    end: count === 1 ? GHOST_END - 2 : GHOST_END,
    gate: 1,
    free: GHOST_FREE,
  },
  apply: (enemy, { battle: b }) => {
    const battle = /** @type {Battle} */ (b);
    const idx = targets.map((t) => battle.indexOf(t));
    const enemyIdx = battle.indexOf(enemy);
    const hit = (/** @type {number} */ slot) => (/** @type {Battle} */ bt) => {
      const victim = /** @type {Character} */ (bt.combatants[idx[slot]]);
      const attacker = /** @type {Enemy} */ (bt.combatants[enemyIdx]);
      const tick = bt.turn.tick;
      victim.takeDamage(attacker.calcAttackDamage(victim, bt.rng));
      victim.busyUntil = Math.max(victim.busyUntil, tick + 45);
      bt.requestReaction(tick + 2, victim, { busy: 43, hold: 21 });
    };
    // list slot 3 at B, slot 1 at B + 1, slot 2 at B + 47 (the order their damage rolls come in)
    if (idx[2] !== undefined) hit(2)(battle);
    if (idx[0] !== undefined) battle.queueEvent(battle.turn.tick + 1, enemy, hit(0));
    if (idx[1] !== undefined) battle.queueEvent(battle.turn.tick + 47, enemy, hit(1));
  },
});

/**
 * @type {EnemyAI}
 */
const ghostArmorAI = (_enemy, { party, tick }) => {
  const targets = party.combatants.filter((c) => !c.outOfFight && !c.isBusy(tick)).slice(0, 3);
  if (!targets.length) return { action: ACTION_TYPES.NOTHING };
  return useMove(ghostSpirits(targets.length, targets));
};

/**
 * slot_man_ai_select_target_and_move (vb3.bin 0x800114f0 on v1.0): the front-row pass; once a target is
 * accepted the script's state machine rolls the outcome, symbol = floor(r * 100 / 32767) % 6 mapped to
 * D, C, A, E, B, F (0..5; 280 of 280 recorded turns), 34 ticks later with nothing else rolling in between,
 * then spins the three reels for 60 ticks: one roll a tick, re-rolled until its symbol differs from the one
 * its reel (tick % 3) shows (no reel shows anything at first). Both are made here at the AI tick, which
 * keeps the RNG order.
 * @type {EnemyAI}
 */
const slotManAI = (enemy, params) => {
  const choice = defaultAI(enemy, params);
  if (choice.action !== ACTION_TYPES.ATTACK) return choice;
  const { rng } = params;
  const symbol = () => Math.floor((rng.next().rand * 100) / 32767) % 6;
  const outcome = symbol();
  const shown = [-1, -1, -1];
  for (let tick = 0; tick < 60; tick++) {
    let s = symbol();
    while (s === shown[tick % 3]) s = symbol();
    shown[tick % 3] = s;
  }
  if (outcome === 2) {
    // A's particle effect: 30 particles over 128 ticks; a dead particle respawns with 3 rolls (x, y, life) and
    // lives `life + 1` ticks. Only the roll count matters here (positions are not modelled).
    const due = new Array(30).fill(1);
    for (let tick = 1; tick <= 128; tick++) {
      for (let i = 0; i < 30; i++) {
        if (due[i] > tick) continue;
        rng.next();
        rng.next();
        due[i] = tick + (Math.floor((rng.next().rand * 100) / 32767) % 60) + 1;
      }
    }
  }
  const move = [
    ENEMY_MOVES.SLOT_MAN_D,
    ENEMY_MOVES.SLOT_MAN_C,
    ENEMY_MOVES.SLOT_MAN_A,
    ENEMY_MOVES.SLOT_MAN_E,
    ENEMY_MOVES.SLOT_MAN_B,
    ENEMY_MOVES.SLOT_MAN_F,
  ][outcome];
  return useMove(move, choice.target);
};

/**
 * slasher_rabbit_ai (va8.bin 0x8001086c on v1.0, Mt. Seifu Lv6 hp60). Every tick: a leap roll,
 * floor(r * 100 / 32767) > 50 (not % 100: this one divides by 32767), then a second roll picks any
 * party member, (floor(r * 100 / 32767)) % partySize, either row. An eligible one (in the fight and
 * not busy) is leapt at, and the move ends there. Otherwise, in the same tick, the front-row pass
 * with the same 32767 scale. No front-row member in the fight: the turn is skipped. The leap needs a
 * free enemy slot for the clone; that isn't modelled (never failed in the recordings). Killer Rabbit
 * (b_data.bin 0x800805fc on v1.0, world map 1 Lv10 hp60) is the same function.
 * @type {EnemyAI}
 */
const rabbitLeapAI = (_enemy, { party, rng, tick }) => {
  const pct = () => Math.floor((rng.next().rand * 100) / 32767);
  if (pct() > 50) {
    const target = party.combatants[pct() % party.combatants.length];
    if (!target.outOfFight && !target.isBusy(tick))
      return useMove(ENEMY_MOVES.SLASHER_RABBIT_LEAP, target);
  }
  if (!party.getFrontRow().length) return { action: ACTION_TYPES.NOTHING };
  const target = party.combatants.find(
    (c) => c.position < 4 && !c.outOfFight && !c.isBusy(tick) && pct() > 50,
  );
  return target ? attack(target) : UNDETERMINED;
};

/**
 * Monsters whose AI (attack_data_table[Id]+0x30) isn't the plain attacker. Called every tick of
 * the monster's turn until it commits.
 * @type {Partial<Record<EnemyKey, EnemyAI>>}
 */
export const ENEMY_AI = {
  [ENEMY_KEYS.SLASHER_RABBIT]: rabbitLeapAI,
  [ENEMY_KEYS.KILLER_RABBIT]: rabbitLeapAI,

  // beast_commander_ai_select_target_and_move (b_data.bin 0x80080e6c on v1.0, world map 1 Lv13 hp90). The
  // Command while the commander stands outside the front row and some enemy is ready (front row, hasn't
  // acted, not busy: itself included). Otherwise the Sleep attack: the any-row pass (the same roll as
  // Sydonia's: busy and out-of-fight members skipped for free, one roll per other member, accepted on
  // % 100 > 50), retried every tick until someone accepts; nobody in the fight: the turn is skipped.
  [ENEMY_KEYS.BEAST_COMMANDER]: (enemy, { party, enemies, rng, tick }) => {
    const ready = enemies.combatants.some((e) => !e.acted && !e.isBusy(tick) && e.position < 4);
    if (enemy.position >= 4 && ready) return useMove(ENEMY_MOVES.BEAST_COMMANDER_COMMAND);
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    return target ? useMove(ENEMY_MOVES.BEAST_COMMANDER_SLEEP, target) : UNDETERMINED;
  },

  // holly_boy_ai_select_target_and_move (va4.bin 0x800109cc, Magician's Island Lv3 hp10; the Great Forest
  // Lv5 hp80 is vb6.bin 0x80010eb4 on v1.0, the same logic): see hollyBoyAI.
  [ENEMY_KEYS.HOLLY_BOY_1]: hollyBoyAI,
  [ENEMY_KEYS.HOLLY_BOY_2]: hollyBoyAI,

  [ENEMY_KEYS.OANNES]: oannesAI,

  [ENEMY_KEYS.SLOT_MAN]: slotManAI,

  [ENEMY_KEYS.GHOST_ARMOR]: ghostArmorAI,

  // holly_spirit_ai_select_target_and_move (vb6.bin 0x80010338 on v1.0, Great Forest Lv21 hp350): in the back
  // row (formation position >= 4) the Command. Otherwise the front-row pass once, with no retry: nobody
  // accepted (or nobody free to scan) skips the turn. No move roll.
  [ENEMY_KEYS.HOLLY_SPIRIT]: (enemy, params) => {
    if (enemy.position >= 4) return useMove(ENEMY_MOVES.HOLLY_SPIRIT_COMMAND);
    const target = frontRowTarget(params.party, params.rng, params.tick);
    return target ? attack(target) : { action: ACTION_TYPES.NOTHING };
  },

  // zombie_dragon_ai_select_target_and_move (vb5g.bin 0x80012968): ~71% Attack, ~29% Fire Breath.
  // The target pass runs first, even on round 1 where Fire Breath ignores it and there's no roll.
  [ENEMY_KEYS.ZOMBIE_DRAGON]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (params.turn_count === 1) return useMove(ENEMY_MOVES.ZOMBIE_DRAGON_FIRE_BREATH);
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 0x47) return choice;
    return useMove(ENEMY_MOVES.ZOMBIE_DRAGON_FIRE_BREATH);
  },

  // The front-row pass, then one move roll: (r * 100) / 32767 < 51 -> Lightning at the target,
  // otherwise Fire Breath on everyone (the target is ignored). It never basic-attacks.
  [ENEMY_KEYS.DRAGON]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51)
      return useMove(ENEMY_MOVES.DRAGON_LIGHTNING, choice.target);
    return useMove(ENEMY_MOVES.DRAGON_FIRE_BREATH);
  },

  // Ain Gide (vac.bin 0x80013b1c): the front-row pass, then one move roll,
  // (r * 100) / 32767 < 0x33 -> basic Attack (51.001%), otherwise the Special on everyone (the
  // target is ignored). No round-counter gate. Live: 80/80 rounds exact on move, target and rolls.
  [ENEMY_KEYS.AIN_GIDE]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 0x33) return choice;
    return useMove(ENEMY_MOVES.AIN_GIDE_SPECIAL);
  },

  // red_soldier_ant_ai_select_target_and_move (a_data.bin 0x80080adc): the front-row pass, then
  // ((r * 100) / 0x7fff) % 100 < 0x4d -> Attack (77.002%), else Double Strike at the target. The
  // % 100 matters: r = 32767 gives 100 % 100 = 0, an Attack. Live: 32/32 picks.
  [ENEMY_KEYS.RED_SOLDIER_ANT]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) % 100 < 0x4d) return choice;
    return useMove(ENEMY_MOVES.RED_SOLDIER_ANT_DOUBLE_STRIKE, choice.target);
  },

  // Mt. Seifu's Soldier Ant (va7.bin 0x800106b0): the Red Soldier Ant's AI (target pass, then
  // Attack 77.002% / Double Strike). Timing matches the Red Soldier Ant's to a frame
  // (Queen_Ant_Turn_Timing.md, 211 turns). Double Strike makes no hit roll: one calc_damage roll,
  // doubled (decompile). UNVERIFIED: its party next-copy offset (one sample).
  [ENEMY_KEYS.SOLDIER_ANT]: (enemy, params) => ENEMY_AI[ENEMY_KEYS.RED_SOLDIER_ANT](enemy, params),

  // queen_ant_ai_self_heal_and_select_move (va7.bin 0x80010ae0): no target pass, one roll,
  // (r * 100) / 32767 < 0x33 -> AoE Earth (51.001%), else CommandAnts. CommandAnts costs no RNG and
  // does nothing (every ant has already acted, SPD 22 beats 20 on every roll). Her HP reset to max
  // each turn isn't modelled.
  [ENEMY_KEYS.QUEEN_ANT_BOSS]: (_enemy, { rng }) =>
    cDiv(rng.next().rand * 100, 0x7fff) < 0x33
      ? useMove(ENEMY_MOVES.QUEEN_ANT_AOE_EARTH)
      : useMove(ENEMY_MOVES.QUEEN_ANT_COMMAND_ANTS),

  // golem AI (va4.bin 0x80010ea4; the threshold is from EnemyAIPredictor.lua's template, decompile): the front-row pass, then one move roll,
  // (r * 100) / 32767 < 0x47 -> Attack (~71%), otherwise the special on everyone.
  [ENEMY_KEYS.GOLEM]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 0x47) return choice;
    return useMove(ENEMY_MOVES.GOLEM_SPECIAL);
  },

  // crow_a_data_ai_select_target_and_move (a_data.bin 0x80080554 on v1.0, 0x80080604 on v1.1): the
  // plain pass over both rows (no formation slot < 4 test in this copy), then the basic Attack. A turn
  // is skipped when nobody is in the fight. Live: targets 1:63 2:47 3:31 4:12 5:5 6:2.
  [ENEMY_KEYS.CROW]: (_enemy, { party, rng, tick }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    return target ? attack(target) : UNDETERMINED;
  },

  // Scans both rows; a back-row target (formation slot > 3) gets his basic Attack
  // A front-row one her special after one more rand() for a check that always passes.
  [ENEMY_KEYS.SYDONIA]: (_enemy, { party, rng, tick }) => {
    const target = anyRowTarget(party, rng, tick);
    if (!target) return UNDETERMINED;
    if (target.position > 3) return attack(target);
    rng.next();
    return useMove(ENEMY_MOVES.SYDONIA_SPECIAL, target);
  },
};
