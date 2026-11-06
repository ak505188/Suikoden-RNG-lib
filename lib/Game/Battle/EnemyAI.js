import { ACTION_TYPES, ATTACK_RESULT } from './Actions.js';
import { ELEMENT_CATEGORIES, ELEMENTS, STATUS } from '../Constants.js';
import { RUNES } from '../Magic/Runes.js';
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
/** @typedef {import('./DamageMultiplier.js').DamageMultiplier} DamageMultiplier */

/**
 * A monster move timed like a basic attack, all from the tick it starts (t0).
 * @typedef {Object} StrikeTiming
 * @property {number} damage - t0 -> the damage roll (the move's apply)
 * @property {number} recover - t0 -> its recover script starts: the other side's next actor is
 *   copied in the tick after
 * @property {number} free - t0 -> the frame its busy clears
 * @property {number} targetFree - t0 -> the frame the target's busy clears (busy from t0)
 * @property {number} [gate] - the roll gate it sets (unset: g_FreeWillGate, like a basic attack)
 * @property {(enemy: Enemy, battle: Battle) => void} [onStart] - run on the tick the move starts (a command's side effects)
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
 * @property {{ end: number, free: number, targetFree?: number }} [timed] - the move can run on recorded event ticks (Battle.timingEvents:
 *   `burst` for `rolls`, `hit` for the damage); the turn ends and the enemy is free this many ticks after the hit.
 *   Without them the offsets above apply
 * @property {{ at: number, count?: number, run?: (rng: RNG) => void }} [rolls] - a particle effect's rand() calls
 *   (positions not modelled) on t0 (or the move's start) + `at`, or on the recorded burst tick, before the damage
 *   roll: `count` calls, or `run` for an effect that keeps rolling after its first tick
 * @property {{ before: number, every: number, times: number, count: number }} [hitRolls] - `times` bursts of `count`
 *   rand() calls (an effect's sprites), the first `before` ticks ahead of the recorded hit and then every `every`
 *   ticks, for a timed move that records only its hit. Not run without recorded ticks
 * @property {{ at: number, pick: (roll: number) => number, branches: { end: number, gate: number, free: number }[] }} [script] - a timed move whose
 *   script rolls once on its own at t0 + `at` (the roll, (rand * 100) // 0x7fff, is passed to `pick`; the Wyvern's element roll): the result is
 *   stored as Enemy.scriptPick for `apply`, and the turn's end / gate / free (counted from the recorded hit) come from that branch
 *   instead of `timed`. Only run on recorded event ticks (the roll's tick is t0 + at, which assumes the move did not wait for the party)
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

/** Queen Ant's AoE Earth wind-up (A) after its script starts: the party targets are set 57 ticks in. The script starts on the first tick nobody in the party is busy (50 samples' A = 58 .. 186). */
const QUEEN_AOE_WINDUP = 57;

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

/**
 * The Slot man's particle effect (also the Nightmare's heal): 30 particles over 128 ticks; a dead particle respawns
 * with 3 rolls (x, y, life) and lives `life + 1` ticks, so the first tick rolls 90. Only the roll count matters
 * (positions are not modelled), and nothing else rolls during it.
 * @param {RNG} rng
 * @param {number} [ticks] how many ticks spawn (the Slot man's effect: 128, the Nightmare's: 96)
 */
const particleEffectRolls = (rng, ticks = 128) => {
  const due = new Array(30).fill(1);
  for (let tick = 1; tick <= ticks; tick++) {
    for (let i = 0; i < 30; i++) {
      if (due[i] > tick) continue;
      rng.next();
      rng.next();
      due[i] = tick + (Math.floor((rng.next().rand * 100) / 32767) % 60) + 1;
    }
  }
};

/**
 * The Sorcerer's Special effect (a Flaming Arrow clone, handler e_data.bin 0x80080ad0; Suikoden-Bizhawk-HUD
 * lib/Enemies/Sorcerer.lua particleTicks, exact on every recorded turn): 20 particles, 96 ticks. For the first 65 ticks
 * every inactive particle respawns with 4 rolls (x offset % 198, unused, speed % 64, lifetime % 100). A particle goes
 * inactive when its lifetime < 1 or |trail_x >> 12| < 5 (without that tick's decrement and move); an alive one loses a
 * lifetime and moves by its x velocity. The 20 trail_x words start with the stale low 12 bits of the effect's heap
 * block (read live; valid for the recorded heap layout, another one could differ). Only the roll count matters here:
 * the burst happens on one sim tick (nothing else rolls during the effect).
 * @param {RNG} rng
 */
const SORCERER_RESIDUAL_LOW12 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 256, 256, 256, 2064, 1552,
];
const sorcererEffectRolls = (rng) => {
  const particles = SORCERER_RESIDUAL_LOW12.map((tx) => ({ active: false, life: 0, tx, vx: 0 }));
  for (let tick = 1; tick <= 96; tick++) {
    if (tick <= 65) {
      for (const p of particles) {
        if (p.active) continue;
        const xo = (rng.next().rand % 198) + 1 - 100;
        rng.next();
        const vs = (rng.next().rand % 64) + 128;
        p.tx = (p.tx & 0xfff) | (cDiv(xo * 5, 6) << 12);
        p.vx = -xo * vs;
        p.life = rng.next().rand % 100;
        p.active = true;
      }
    }
    for (const p of particles) {
      if (!p.active) continue;
      if (p.life < 1 || Math.abs(Math.floor(p.tx / 4096)) < 5) p.active = false;
      else {
        p.life -= 1;
        p.tx += p.vx;
      }
    }
  }
};

/**
 * The Sorcerer's Special damage (calc_rune_element_attack_damage, element 6): base = 190 - the target's MGC, from the
 * roll after the particles; halved when the target's category is 6 or 7: Soul Eater (7) and Resurrection (6) always,
 * the other explicit runes never, a rune that sets none (including no rune) by the caller's leftover register, which on
 * v1.0 is the Sorcerer's combatant index: slot 7 (the first enemy) halves, slots 8 and up do not.
 * @param {Enemy} enemy
 * @param {Character} target
 * @param {number} slot the Sorcerer's combatant index (7 = the first enemy slot)
 * @param {RNG} rng
 */
const sorcererSpecialDamage = (enemy, target, slot, rng) => {
  const base = enemy.MGC - target.MGC;
  const { rand } = rng.next();
  const damage = base < 10 ? base + 1 - (rand % 4) : base + cDiv(cDiv(base, 2) - (rand % base), 5);
  const category =
    target.rune.id === RUNES.SOUL_EATER.id ? 7 : (ELEMENT_CATEGORIES[target.rune.element] ?? slot);
  return Math.max(category === 6 || category === 7 ? cDiv(damage, 2) : damage, 1);
};

/**
 * The Hell Unicorn's Special effect rolls (ve3.bin handler 0x8001391c, Suikoden-Bizhawk-HUD lib/Enemies/HellUnicorn.lua
 * effectCalls, exact on every recorded turn): 24 setup rolls, then one handler call per tick, calls 0..186 (the damage
 * rolls of call 187 are the move's own). Every call: in state 1 (calls 32+) each of 24 ring sprites whose delay
 * i * 100 // 24 equals the counter (call - 32) starts with 2 rolls; while the spawn gate is on (calls 0..115) every
 * inactive of the 30 rain sprites respawns with 3 rolls (x, y, lifetime = rand() % 60); an active sprite with a
 * lifetime < 1 goes inactive, else loses one. Only the roll count and order matter here.
 * @param {RNG} rng
 */
const hellUnicornEffectRolls = (rng) => {
  for (let i = 0; i < 24; i++) rng.next();
  const active = new Array(30).fill(false);
  const life = new Array(30).fill(0);
  for (let call = 0; call < 187; call++) {
    if (call >= 32)
      for (let i = 0; i < 24; i++)
        if (cDiv(i * 100, 24) === call - 32) {
          rng.next();
          rng.next();
        }
    if (call < 116)
      for (let i = 0; i < 30; i++) {
        if (active[i]) continue;
        rng.next();
        rng.next();
        life[i] = rng.next().rand % 60;
        active[i] = true;
      }
    for (let i = 0; i < 30; i++) {
      if (!active[i]) continue;
      if (life[i] < 1) active[i] = false;
      else life[i] -= 1;
    }
  }
};

/** The commanded strikes of a Command in progress, by commander. @type {WeakMap<Enemy, any[]>} */
const commandStrikes = new WeakMap();

/**
 * A commanded attack (Queen Ant Lv52, Whip Master / Wolf): no hit chance is ever rolled, so it can't miss, dodge,
 * counter or be covered. The enemy's own script starts when the command's does and its damage lands on its own
 * `damage` tick from that start; the target is busy until its hit reaction ends (hit + the enemy's `reaction`).
 * The cleanup calls calc_damage `rolls` times and applies the last (the Queen Ant's twice, the Whip Master's once).
 * @param {Battle} battle
 * @param {Enemy} ally
 * @param {Character} target
 * @param {number} start ticks from now to the command's script start
 * @param {number} rolls
 */
const startCommanded = (battle, ally, target, start, rolls) => {
  const hit = battle.turn.tick + start + /** @type {number} */ (ally.attackTiming.damage);
  target.busyUntil = Math.max(target.busyUntil, hit + ally.attackTiming.reaction);
  return { ally, target, hit, rolls };
};

/**
 * Queues the commanded attacks' damage rolls.
 * @param {Battle} battle
 * @param {{ ally: Enemy, target: Character, hit: number, rolls: number }[]} strikes
 */
const queueCommanded = (battle, strikes) => {
  for (const { ally, target, hit, rolls } of strikes)
    battle.queueEvent(hit, ally, (/** @type {Battle} */ b) => {
      let damage = 0;
      for (let i = 0; i < rolls; i++) damage = ally.calcAttackDamage(target, b.rng);
      target.takeDamage(damage);
    });
};

/** @type {DamageMultiplier} */
const THIRD = Object.freeze({ mul: 1, div: 3 });

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

  // The Siren's Special (path ef0393f3; g_data.bin callback 0x800a132e / 0x8009dbd0 on v1.0, Kalekka Area): a 16-roll
  // effect, a magic hit on all six members in slot order (one roll each: MGC 160 - the target's MGC, +-10%, minimum 1,
  // not halved by Defend), and one status roll per member the tick after the damage rolls (member m uses roll m):
  // Silence (status byte 0x80, id 6) lands on ((r * 100) / 0x7fff) % 100 < 10. The roll is made for every living member,
  // also one who is already silenced; only applying it is skipped. Measured from siren_lv32_hp250 (38 Specials): effect rolls at AI
  // tick +60, damage rolls +258, HP changes and status rolls +259, the turn ends at +325 (alone); no recorded timing input.
  // Both Sirens (the Lv53 one's path 33a1100b, vs1.bin 0x800169f4) share it: the callback polls from AI tick + 1 and starts the
  // script on the first tick no living member is busy, so behind another Siren's Attack the hit is at turn frame 335 and the turn
  // 402 frames (alone 261 / 328). The wait is modelled (recorded for the Lv53 Siren; the Lv32's is from the code only, its
  // recording is a lone Siren). Offsets are from that start, so one less than from the AI tick above.
  SIREN_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 1,
      rolls: { at: 59, count: 16 },
      damage: 257,
      end: 324,
      gate: 1,
      free: 324,
    },
    apply: (enemy, { party, rng, battle }) => {
      const slots = party.combatants
        .filter((c) => !c.outOfFight)
        .map((c) => /** @type {Battle} */ (battle).indexOf(c));
      // the damage rolls come a tick before the HP changes (and the status rolls with them)
      const damage = slots.map((i) =>
        Math.max(
          enemy.calcMagicDamage(
            ELEMENTS.NONE,
            /** @type {Character} */ (battle?.combatants[i]),
            rng,
          ),
          1,
        ),
      );
      /** @type {Battle} */ (battle).queueEvent(
        /** @type {Battle} */ (battle).turn.tick + 1,
        enemy,
        (b) => {
          const victims = slots.map((i) => /** @type {Character} */ (b.combatants[i]));
          victims.forEach((character, i) => character.takeDamage(damage[i]));
          for (const character of victims)
            reactionStatusRoll({ status: STATUS.SILENCE, chance: 10 })(b, character);
        },
      );
    },
  },

  // Dagon's Special (path 5479d865; g_data.bin 0x80080338 on v1.0, dagon_ai_await_animation_then_special): the Oannes'
  // Special's shape and offsets (damage +79, recover +117, target busy until +114, free +169: the recording's turn is 119
  // frames, hit at turn frame 81, the target busy 2-115): one hit for half the Attack's damage (calc_damage floored at 1 before
  // the halving), no hit roll, then the second roll of the hit frame, a 30% Poison roll
  // ((r * 100) / 0x7fff % 100 < 30, one roll per Special, on a poisoned target too like the Oannes').
  DAGON_SPECIAL: {
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

  // The mage Kobold's Special (path 2a10451b; c_data.bin windup callback 0x80080678 on v1.0): one magic hit on
  // the scanned member, MGC 130 - the target's MGC, +-10% (calcMagicDamage), minimum 1; no hit roll, so it
  // can't be dodged or countered. Its hit tick is a recorded input (Battle.timingEvents; the fixtures'
  // `hit`, which holds the 0-5 tick screen-effect spread): the turn ends 34 ticks after it (length = hit + 35;
  // kobold_lv20_hp50 and the Strong Arm's group, 80 turns). The offsets below are the no-input default
  // (the hit 243 ticks after the AI tick, no wait). The element is not decoded (NONE: no rune halving). The
  // target is also busy for 34 frames from 133 before the hit, long before the turn ends: not modelled,
  // nothing reads it.
  KOBOLD_MAGE_SPECIAL: {
    name: 'Special',
    held: {
      timed: { end: 34, free: 34 },
      damage: 243,
      end: 277,
      gate: 1,
      free: 277,
    },
    apply: (enemy, { target, rng }) =>
      target?.takeDamage(enemy.calcMagicDamage(ELEMENTS.NONE, target, rng)),
  },

  // The Clay Doll's Special (path 07d7a5a7; ve2.bin callback 0x800150ac on v1.0): an Earth magic hit on every living
  // member in slot order, one roll each (attacker MGC 160 - the target's MGC, +-10%, minimum 1; no hit roll, no
  // status, not halved by Defend). calc_rune_element_attack_damage halves a target whose rune sets no category by the
  // caller's leftover register, here the member loop counter 1..6, so the member in slot 3 is halved (calcMagicDamage's
  // loopSlot); Soul Eater halves all. The callback waits for every member to be idle first; the hit tick is a recorded
  // input (Battle.timingEvents; it holds that wait: 283-364 frames), and the turn ends 6 ticks after it, then the gate of 30 holds the
  // next actor 30 more (length = hit + 36). The offsets are the no-input default (hit 245 ticks after the AI tick, no wait).
  CLAY_DOLL_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 6, free: 6 },
      damage: 245,
      end: 251,
      gate: 30,
      free: 251,
    },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(
          Math.max(enemy.calcMagicDamage(ELEMENTS.EARTH, character, rng, i + 1), 1),
        );
      });
    },
  },

  // The Banshee's only move (path 2a85a2cf; ve2.bin callback 0x800154a8 on v1.0; no move roll, no hit roll): an
  // element-8 magic hit (no category: only Soul Eater halves it, DARK has none) on every living member in slot order,
  // one roll each (attacker MGC 180 - the target's MGC, +-10%, minimum 1), then a Silence roll per member (status
  // id 6, 0x80, chance 10, always rolled, applied unless already set) on the HP-change tick. Like the Clay Doll's it waits
  // for the party to be idle and the hit tick is a recorded input; the turn ends 15 ticks after it, then the gate of 30 adds 30 (length = hit + 45).
  BANSHEE_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 15, free: 15 },
      damage: 234,
      end: 249,
      gate: 30,
      free: 249,
    },
    apply: (enemy, { battle, party, rng }) => {
      const victims = party.combatants.filter((c) => !c.outOfFight);
      const damage = victims.map((character) =>
        Math.max(enemy.calcMagicDamage(ELEMENTS.DARK, character, rng), 1),
      );
      victims.forEach((character, i) => character.takeDamage(damage[i]));
      for (const character of victims)
        reactionStatusRoll({ status: STATUS.SILENCE, chance: 10 })(
          /** @type {Battle} */ (battle),
          character,
        );
    },
  },

  // The Demon Sorcerer's Special (path 1c7670eb; ve3.bin callback 0x80014ed4 on v1.0): three rings of sprites with no rand(),
  // then a Fire (element 1) magic hit on every living member in slot order, one roll each (attacker MGC 290 - the
  // target's MGC, +-10%, minimum 1; no hit roll, no status). Rune halving by calc_rune_element_attack_damage, whose
  // leftover register is the member loop counter 1..6: the member in slot 1 is halved when its rune sets no category;
  // Soul Eater halves all. The callback waits for every member to be idle; the hit tick is a recorded input
  // (Battle.timingEvents; it holds that wait) and the turn ends 18 ticks after it, then the gate of 30 (length = hit + 48).
  // The offsets are the no-input default (hit 190 ticks after the AI tick, no wait).
  DEMON_SORCERER_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 18, free: 18 },
      damage: 190,
      end: 208,
      gate: 30,
      free: 208,
    },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(
          Math.max(enemy.calcMagicDamage(ELEMENTS.FIRE, character, rng, i + 1), 1),
        );
      });
    },
  },

  // The Hell Unicorn's Special (path c800317f; ve3.bin callback 0x800133f8 on v1.0): a rain of 30 sprites (rolls modelled
  // exactly by hellUnicornEffectRolls: 24 setup rolls at the recorded effect_start, then one handler call per tick) and a
  // Water (element 2) magic hit on every living member (attacker MGC 265 - the target's MGC; the member in slot 2 is
  // halved when its rune sets no category), the six damage rolls right after the effect's rolls, the HP change one tick
  // later. Both recorded ticks (effect_start = the burst, hit) hold the wait for the party; hit = effect_start + 189 in
  // all 112 turns. The turn ends 27 ticks after the hit, then the gate of 30 (length = hit + 57 in the recordings). The
  // offsets are the no-input default (effect at turn frame 45, from the AI tick, no wait).
  HELL_UNICORN_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 27, free: 27 },
      rolls: { at: 43, run: (rng) => hellUnicornEffectRolls(rng) },
      damage: 232,
      end: 259,
      gate: 30,
      free: 259,
    },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(
          Math.max(enemy.calcMagicDamage(ELEMENTS.WATER, character, rng, i + 1), 1),
        );
      });
    },
  },

  // The Sorcerer's Special (path 07c2f1b7; e_data.bin callback 0x800814a0 on v1.0): a particle effect (sorcererEffectRolls,
  // 332-414 rolls, exact) from `effect_start` (turn frame ~52), then one magic hit on the scanned member at turn frame
  // 343-346 (sorcererSpecialDamage: the roll right after the particles; halving by the Sorcerer's slot). No hit roll,
  // no status, no heal (the rigged-HP recordings); the turn ends 13 frames after the hit (length 356-359). The effect and
  // hit ticks are recorded inputs (Battle.timingEvents; the fixture's effect_start and hit); the offsets are the no-input default.
  SORCERER_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 12, free: 12 },
      rolls: { at: 50, run: (rng) => sorcererEffectRolls(rng) },
      damage: 343,
      end: 355,
      gate: 1,
      free: 355,
    },
    apply: (enemy, { battle, target, rng }) => {
      if (!target) return;
      const slot = 7 + /** @type {Battle} */ (battle).enemies.combatants.indexOf(enemy);
      target.takeDamage(sorcererSpecialDamage(enemy, target, slot, rng));
    },
  },

  // The Ninja's Special (path 19375b27; vh1.bin callback 0x80010868 on v1.0): ONE hit on the scanned member that is a
  // guaranteed critical: the plain damage (PWR - DEF, +-10%) halved by Defend, then x 3/2 (S-hit 129-156), and a
  // Silence status roll right after the damage roll (the second roll at the hit frame; (r * 100) // 0x7fff % 100 < 30:
  // decoded: animation opcode 40 [status 6, chance 30] in the victim's hit-reaction script (vh1.bin v1.0 0x80073178; the
  // Ninja Master's copy is z_data.bin 0x800a08dc). A Turtle Rune wearer gets no roll; the roll is made even if Silence is
  // already on, only the application is skipped (reactionStatusRoll does all three).
  // No hit roll, so nothing to dodge or counter. The callback polls every tick and starts the script on the first tick
  // (from AI tick + 1) that no living member is busy: the hit comes 56 ticks after that start (hit frame 59 alone,
  // 114 behind an Attack's target), the turn ends 32 ticks after the hit (length hit + 33), and the target stays busy
  // until start + 92 (its hit reaction). No recorded input is needed: the wait is modelled.
  NINJA_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 1,
      timed: { end: 32, free: 32, targetFree: 36 }, // 36 = 92 - 56: the target's reaction ends 36 ticks after the hit
      targetFree: 92,
      damage: 56,
      end: 88,
      gate: 1,
      free: 88,
    },
    apply: (enemy, { battle, target, rng }) => {
      if (!target) return;
      target.takeDamage(enemy.calcAttackDamage(target, rng, { mul: 3, div: 2 }));
      reactionStatusRoll({ status: STATUS.SILENCE, chance: 30 })(
        /** @type {Battle} */ (battle),
        target,
      );
    },
  },

  // The Creeper's Special (path 2a01c0f5; d_data.bin callback 0x80081d50 on v1.0, script 0x800a447c on the
  // stored target): three hits on the target, no hit roll (36 of 36 landed), each one damage roll like the basic
  // attack's (27-33 on S-hit; the formula is not decoded, calcAttackDamage reproduces all 108 rolls), at AI tick
  // + 185, + 209 and + 234 (HP changes at turn frames 187, 211, 236); the next actor is copied at +339 (turn 340 frames). It sets
  // the roll gate to 20 (battle + 0x1264, the Attack's 10 doubled), so the next actor's poll (5 rolls, the target
  // busy) comes at +20, and the target is busy until about +307 (party state, 36 of 36). Constant over all 36
  // turns: no timing input. The element and
  // rune halving are not checked.
  CREEPER_SPECIAL: {
    name: 'Special',
    strike: { damage: 185, recover: 338, free: 339, targetFree: 307, gate: 20 },
    apply: (enemy, { battle, target }) => {
      const hit = (/** @type {Battle} */ b) => {
        const victim = /** @type {Character} */ (target && b.combatants[b.indexOf(target)]);
        victim.takeDamage(enemy.calcAttackDamage(victim, b.rng));
      };
      hit(/** @type {Battle} */ (battle));
      const b = /** @type {Battle} */ (battle);
      b.queueEvent(b.turn.tick + 24, enemy, hit);
      b.queueEvent(b.turn.tick + 49, enemy, hit);
    },
  },

  // The Devil Shield's Special (path fe3d5dd5; vc6.bin callback 0x80010c64 on v1.0): a magic hit on all party
  // members in slot order, one roll each (attacker MGC 90 - the target's MGC, +-10%, minimum 1; the element
  // and any rune halving are not decoded: NONE), after a particle effect of 45 rolls. Its two event ticks, the
  // burst and the hit, are recorded inputs (Battle.timingEvents; the fixture's effect_burst and hit: they hold
  // a 0-4 tick frame skip and, when the previous actor's cut-short Attack still has a member busy, a wait of
  // about 75 ticks); the turn then ends 3 ticks after the hit (hit = burst + 250 in the recordings). The
  // offsets below are the no-input default (no wait, from the AI tick, measured in devil_shield_lv27_hp250).
  DEVIL_SHIELD_SPECIAL: {
    name: 'Special',
    held: {
      startAfter: 0,
      timed: { end: 3, free: 3 },
      rolls: { at: 17, count: 45 },
      damage: 268,
      end: 271,
      gate: 1,
      free: 271,
    },
    apply: (enemy, { party, rng }) => {
      for (const character of party.combatants) {
        if (character.outOfFight) continue;
        character.takeDamage(Math.max(enemy.calcMagicDamage(ELEMENTS.NONE, character, rng), 1));
      }
    },
  },

  // The Sunshine King's only move (path 4aecf353; vf1.bin script 0x8006e5a0, handlers 0x800140e4 / 0x80014274 on v1.1): a
  // circle effect of 16 sprites (2 rolls every 8 ticks, 8 times, the first 96 ticks before the hit), then one hit on EVERY
  // living member in slot order, one roll each (no hit roll, no particle roll at the hit): calc_damage (the basic
  // attack's: PWR 340 - DEF, +-10%, Defend halves, minimum 1) divided by 3, truncated after the Defend halving
  // (28-34 on S-hit, 960 of 960 recorded hits). The hit tick is a recorded input (Battle.timingEvents; alone it is 190
  // or 191 turn ticks, behind Black Elementals it moves with the wait for their targets to clear); the turn ends 4
  // ticks after it (length = hit + 5 turn ticks). Element and rune halving are not applied by calc_damage here. The offsets are the no-input default
  // (from the AI tick, no wait).
  SUNSHINE_KING_SUNSHINE: {
    name: 'Sunshine',
    held: {
      startAfter: 0,
      timed: { end: 4, free: 4 },
      hitRolls: { before: 96, every: 8, times: 8, count: 2 },
      damage: 188,
      end: 192,
      gate: 1,
      free: 192,
    },
    apply: (enemy, { party, rng }) => {
      for (const character of party.combatants)
        if (!character.outOfFight)
          character.takeDamage(enemy.calcAttackDamage(character, rng, THIRD));
    },
  },

  // The Nightmare's three roulette outcomes (see nightmareAI; vd5.bin handlers 0x80014df4, 0x80015600, 0x800145ac on v1.1).
  // Every one runs on recorded event ticks (Battle.timingEvents; the fixture's effect_start / hit), which hold the 0-3 tick
  // spread after the last lap that is not decoded; the offsets below are the no-input default (from the AI tick, no wait).
  // HEAL: the Slot man's particle effect (rolled from the effect's first tick, `effect_start`; spawns stop after 96 ticks
  // here, unlike the Slot man's 128: the round's RNG fits that on 30 of 30 recorded heals, see particleEffectRolls) and,
  // 128 ticks after the first tick, a heal of EVERY living enemy, itself included, by 250 (capped at its max HP), no roll and no damage to
  // the party; the turn ends 93 ticks after the heal (effect_start + 221). Invisible at full HP: checked on the rigged-HP
  // recordings (nightmare_lv32_hp150 lowhp and mixed_g8), where every enemy gains the same amount on the same frame.
  NIGHTMARE_HEAL: {
    name: 'Heal',
    held: {
      startAfter: 0,
      timed: { end: 92, free: 92 },
      rolls: { at: 172, run: (rng) => particleEffectRolls(rng, 96) },
      damage: 301,
      end: 393,
      gate: 1,
      free: 393,
    },
    apply: (_enemy, { battle }) => {
      for (const enemy of /** @type {Battle} */ (battle).enemies.combatants)
        if (!enemy.outOfFight) enemy.takeDamage(-250);
    },
  },
  // The long hit (+94 ticks to the turn's end) and the short hit (+156): one hit on the stored target, no hit roll, one
  // damage roll. The long hit is magic (attacker MGC 240 - the target's MGC, +-10%: about 78 on the first member, up to
  // 175; 31 of 31 on the fixtures), the short one the basic attack's formula (PWR 250, about 49-55); the element and any
  // rune halving are not decoded (NONE).
  NIGHTMARE_LONG_HIT: {
    name: 'Long hit',
    held: {
      startAfter: 0,
      timed: { end: 93, free: 93 },
      damage: 343,
      end: 436,
      gate: 1,
      free: 436,
    },
    apply: (enemy, { target, rng }) =>
      target?.takeDamage(enemy.calcMagicDamage(ELEMENTS.NONE, target, rng)),
  },
  NIGHTMARE_SHORT_HIT: {
    name: 'Short hit',
    held: {
      startAfter: 0,
      timed: { end: 155, free: 155 },
      damage: 238,
      end: 393,
      gate: 1,
      free: 393,
    },
    apply: (enemy, { target, rng }) => target?.takeDamage(enemy.calcAttackDamage(target, rng)),
  },

  // The Shadow's strike (path 416aafaf; shadow_ai_select_target_and_move, v1.0 vg2.bin 0x80013b04, and its continuation 0x80013a28):
  // no move roll and no hit roll, so it cannot be dodged, countered or covered. After the scan accepts, the Shadow is
  // marked acted and starts its windup script, sets battle+0x44 = 1 (holdFlag: the next actor is polled one tick after
  // the AI tick, as after a basic attack, but is not copied until the Shadow's script releases it) and the free-will
  // gate to 1. One damage roll at the strike. The same-side turns run back to back (the next one starts as this one
  // ends, not the generic Attack's cut-short overlap). Measured from shadow_lv36_hp170 (160 turns): from the AI tick,
  // the damage roll at +148, the next actor copied at +177 (recover 176), the Shadow's busy clears at +259, the target
  // is busy from the AI tick to +281. The 0-2 tick spread of the recorded turns (the hit at turn frame 150 / 151 /
  // 152, the turn 178 / 179 / 180) is the scan retrying on later ticks (the AI tick moves, the offsets do not).
  SHADOW_STRIKE: {
    name: 'Shadow strike',
    strike: {
      damage: 148,
      recover: 176,
      free: 259,
      targetFree: 281,
      gate: 1,
      onStart: (_shadow, battle) => {
        battle.turn.holdFlag = true;
      },
    },
    apply: (enemy, { target, rng }) => target?.takeDamage(enemy.calcAttackDamage(target, rng)),
  },

  // The wm5 Mirage's back-row special (paths 3df09085, 8ee2ccc7; mirage_special_continuation, f_data.bin; v1.0 AI 0x80083f74, behavioural): no
  // hit roll, so it cannot be dodged, countered or covered; one damage roll 84 ticks after the AI tick, the same tick as the generic Attack's
  // (3 frames when another actor follows, 113-114 when last: recover = 111). The target is busy from the AI tick until the hit + 45.
  // Measured from mirage_wm5_lv52_hp400 (160 rounds). `free` is not decoded (the walker cannot time the Mirage's recover, a native handler):
  // it is the busy clear that reproduces the recorded round length after a last special turn (the smallest value that matches all 56;
  // 174 = recover + 63). The Attack's (EnemyAttackTimings.js) is calibrated the same way.
  MIRAGE_SPECIAL: {
    name: 'Back-row special',
    strike: {
      damage: 84,
      recover: 111,
      free: 174, // measured: the busy flag clears 175 frames after the turn start (wm5 copy)
      targetFree: 129,
      gate: 1, // the next actor is polled one tick after the AI tick (a 3-frame turn when another actor follows)
    },
    apply: (enemy, { target, rng }) => target?.takeDamage(enemy.calcAttackDamage(target, rng)),
  },

  // The Wyvern's breath (path 00dd7f7b; vf2.bin callback 0x800174d8 on v1.0; its only move): it waits for the party to be idle, then the script
  // rolls ONCE (turn frame 73 = t0 + 71 when it does not wait: (r * 100) // 0x7fff < 51 -> element 1 (Fire), else element 5 (Wind); inferred from
  // which member is halved), then six magic hits in one frame (MGC 260 - the target's MGC, +-10%, minimum 1; no hit roll, no status) with the
  // member loop counter as the leftover register: the member whose index equals the element is halved when its rune sets no category.
  // The hit tick is a recorded input (Battle.timingEvents; Wind: 118, Fire: 183-186). The turn ends 44 ticks after the hit for Wind, 22 for Fire:
  // the branches' end / gate below are fitted to those (the poll at the end of the turn: hit + 43 / hit + 21 in turn frames), not decoded.
  WYVERN_BREATH: {
    name: 'Breath',
    held: {
      startAfter: 0,
      timed: { end: 13, free: 13 },
      damage: 116,
      end: 143,
      gate: 30,
      free: 143,
      script: {
        at: 71,
        pick: (roll) => (roll < 51 ? 0 : 1),
        branches: [
          { end: 0, gate: 21, free: 0 }, // element 1 (Fire)
          { end: 13, gate: 30, free: 13 }, // element 5 (Wind)
        ],
      },
    },
    apply: (enemy, { party, rng }) => {
      const element = enemy.scriptPick === 0 ? ELEMENTS.FIRE : ELEMENTS.WIND;
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(Math.max(enemy.calcMagicDamage(element, character, rng, i + 1), 1));
      });
    },
  },

  // The Lv52 Queen Ant's magic burst (path c62c69c1; vf2.bin callback 0x80015ae4 on v1.0): after the opening pose it waits for the party to be
  // idle, then six Earth (category 3) magic hits in one frame, one roll per member in order (MGC 270 - the target's MGC, +-10%, minimum 1;
  // no hit roll, no status). The caller's leftover register is NOT a member index here, so no runeless slot is halved (only an Earth-category rune
  // and Soul Eater are). The hit tick is a recorded input (Battle.timingEvents; the Clay Doll's offsets after it: the turn ends at hit + 37).
  QUEEN_ANT_2_BURST: {
    name: 'Magic burst',
    held: {
      startAfter: 0,
      timed: { end: 6, free: 6 },
      damage: 292,
      end: 298,
      gate: 30,
      free: 298,
    },
    apply: (enemy, { party, rng }) => {
      for (const character of party.combatants) {
        if (character.outOfFight) continue;
        character.takeDamage(Math.max(enemy.calcMagicDamage(ELEMENTS.EARTH, character, rng), 1));
      }
    },
  },

  // The Lv52 Queen Ant's Command (path 7f64151f; vf2.bin callback 0x80015e04 on v1.0, commander loop 0x80015c64): after the same opening pose
  // (no roll), every OTHER enemy that has not acted and is not busy is ordered, in enemy order, to attack the LAST free living front-row party
  // member (busy once chosen, so the next one takes the one before it): the commanded enemy's acted tag is set (no turn of its own). Their attacks
  // land in her turn at turn frame 72 (the AI roll is turn frame 2, so t0 + 70): per commanded enemy a hit roll and a damage roll (the order of
  // the four rolls for two Rock Busters is not separated by the recording; hit then damage per enemy is used), PWR of the commanded enemy.
  // Alone she only poses. The gate of 90 and the turn's 138 frames are fitted: the poll that ends the turn is at t0 + 135. A commanded miss
  // (counter, dodge) is not modelled and never occurred in the recording.
  QUEEN_ANT_2_COMMAND: {
    name: 'Command',
    // the command's script starts at turn frame 18 (AI tick + 16); each commanded Rock Buster hits at its own damage tick
    // after it (54: turn frame 72) and its target stays busy 36 ticks after the hit. Her turn ends 135 ticks in (gate),
    // fitted to the recorded turn length.
    strike: {
      damage: 16,
      recover: 136,
      free: 136,
      targetFree: 0,
      gate: 135,
      onStart: (commander, battle) => {
        const tick = battle.turn.tick;
        const strikes = [];
        battle.enemies.combatants.forEach((ally) => {
          if (ally === commander || ally.acted || ally.outOfFight || ally.isBusy(tick)) return;
          const target = battle.party.combatants
            .filter((c) => c.position < 4 && !c.outOfFight && !c.isBusy(tick))
            .at(-1);
          if (!target) return;
          ally.setActed(true);
          strikes.push(startCommanded(battle, ally, target, 16, 2));
        });
        commandStrikes.set(commander, strikes);
      },
    },
    // the first calc_damage of each pair is discarded (rolls 2 and 4 of the frame, CommandedRollOrder.lua: 39 / 39)
    apply: (commander, { battle }) => queueCommanded(battle, commandStrikes.get(commander) ?? []),
  },

  // The wm7 Mirage's special: the same as the wm5 copy's but the busy clear is measured one frame earlier (174 after the turn start, 173 here).
  MIRAGE_2_SPECIAL: {
    name: 'Back-row special',
    strike: {
      damage: 84,
      recover: 111,
      free: 173,
      targetFree: 129,
      gate: 1,
    },
    apply: (enemy, { target, rng }) => target?.takeDamage(enemy.calcAttackDamage(target, rng)),
  },

  // Viperman's Command (path 0b0d9403; viperman_command_continuation, script 0x800716d0): no roll in the AI. The
  // continuation (turn frame 31, AI tick + 27) commands every enemy that has not acted and is not busy: it SETS ITS
  // ACTED TAG (no turn of its own, the turn-order poll skips it) and starts its attack on the party member whose
  // formation position equals the enemy's ordinal (members 1-3 are busy from then until turn frame 165), then sets
  // the free-will gate to 60. The poll at turn frame 91 (31 + 60) is the engine's ordinary next-actor poll (one roll
  // per eligible member: 4, 5, 6) and picks the next actor, who waits for the turn to end (the polls after it are
  // 5, 4, 3, 2, 1). The strikes land together at turn frame 120 (one damage roll each, no hit roll); the turn is 216
  // frames. Measured from viperman_lv30_hp200 group 2 (80 turns, all the same). With fewer commanded enemies or
  // matching members there are fewer strikes (decoded, not recorded). Offsets from the AI tick (turn frame 4); the strike (118) and
  // the turn end (recover 214) sit 2 ticks later than the frame numbers above suggest, fitted to the recording:
  VIPERMAN_COMMAND: {
    name: 'Command',
    strike: {
      damage: 118,
      recover: 214,
      free: 213,
      targetFree: 0,
      gate: 87, // 27 ticks to the continuation + its gate of 60
      onStart: (commander, battle) => {
        const tick = battle.turn.tick;
        const pairs = [];
        battle.enemies.combatants.forEach((delf, k) => {
          if (delf.acted || delf.outOfFight || delf.isBusy(tick)) return;
          const target = battle.party.combatants.find((c) => c.position === k + 1 && !c.outOfFight);
          if (!target) return;
          delf.setActed(true);
          target.busyUntil = Math.max(target.busyUntil, tick + 161);
          pairs.push([delf, target]);
        });
        commandStrikes.set(commander, pairs);
      },
    },
    apply: (commander, { rng }) => {
      for (const [delf, target] of commandStrikes.get(commander) ?? [])
        target.takeDamage(delf.calcAttackDamage(target, rng));
    },
  },

  // The Whip Wolf's Command (path fec1afc3; whip_wolf_ai_select_target_and_move, e_data.bin 0x80080198 on v1.0, and its
  // continuation 0x80080338): the Viperman's Command with its own constants. The continuation fires at turn frame 23
  // (AI tick + 19), commands every enemy that has not acted and is not busy (the Hell Hounds: acted tag set, no turn
  // of their own) onto the member whose formation position equals the enemy's ordinal (members 1-3 busy from the
  // command to turn frame 125), and sets the gate to 60 (the next-actor poll at frame 83, members 4-6). The three
  // strikes land together at turn frame 80 (one damage roll each, 49-59, no hit roll); the turn is 169 frames. Measured
  // from whip_wolf_lv38_hp350 (80 turns, all the same). Offsets from the AI tick (turn frame 4), as the Viperman's.
  WHIP_WOLF_COMMAND: {
    name: 'Command',
    // the continuation starts each commanded script at turn frame 23 (AI tick + 21); a commanded enemy hits at its own
    // damage tick after it (Hell Hound 57, Whip Master 67, Elite Soldier 70: turn frames 80 / 90 / 93) with ONE damage
    // roll and no hit roll, its target busy until 45 ticks after the hit. The turn ends 166 ticks in.
    strike: {
      damage: 21,
      recover: 167,
      free: 166,
      targetFree: 0,
      gate: 79, // 19 ticks to the continuation + its gate of 60
      onStart: (commander, battle) => {
        const tick = battle.turn.tick;
        const strikes = [];
        battle.enemies.combatants.forEach((hound, k) => {
          if (hound.acted || hound.outOfFight || hound.isBusy(tick)) return;
          const target = battle.party.combatants.find((c) => c.position === k + 1 && !c.outOfFight);
          if (!target) return;
          hound.setActed(true);
          strikes.push(startCommanded(battle, hound, target, 21, 1));
        });
        commandStrikes.set(commander, strikes);
      },
    },
    apply: (commander, { battle }) => queueCommanded(battle, commandStrikes.get(commander) ?? []),
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
  // A varies (58 x2, 99, 142 x2, 152 x2, 164 x24, 166, 171 x7, 174 x3, 178 x2, 184 x2, 186 x4): stage 1 (va7 v1.0
  // 0x80010d74) waits, with no RNG, while any living party member is busy and starts the wind-up script on the first
  // idle tick, so A = that tick + 57 (58 = idle at once, 164 = right after a Soldier Ant's Attack, 99 = after a Double
  // Strike). Decoded from the code; the per-sample logs are gone, so no sample was re-derived (no recording replays it).
  QUEEN_ANT_AOE_EARTH: {
    name: 'AoE Earth',
    held: {
      startAfter: 0,
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
 * The Oannes' and Dagon's AI (oannes_ai_select_target_and_move, vb5.bin 0x80011074 on v1.0; dagon_ai_select_target_and_move,
 * g_data.bin 0x80080338): the front-row pass, then, once a target is accepted, one more roll on the raw value:
 * (r % 100) < 76 -> Attack (76.05%), else the Special. No level, HP or status gate.
 * @param {EnemyMove} special
 * @returns {EnemyAI}
 */
const attackOrSpecialAI = (special) => (enemy, params) => {
  const choice = defaultAI(enemy, params);
  if (choice.action !== ACTION_TYPES.ATTACK) return choice;
  if (params.rng.next().rand % 100 < 76) return choice;
  return useMove(special, choice.target);
};
const oannesAI = attackOrSpecialAI(ENEMY_MOVES.OANNES_SPECIAL);

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
 * The Devil Armor's Multi-hit (path c32c9edf, devil_armor_ai_count_free_targets_and_start 0x800115e0 on v1.0,
 * callback 0x800116e4) is the same move with the same offsets (44 / +1 / +47 hit frames, 93 + wait turn, wait 0
 * in round 1 and 13 in rounds 2-4 of the recording: an idle-cycle input read off the first hit by the converter).
 * @param {number} count how many targets
 * @param {Character[]} targets
 * @param {string} [name]
 * @returns {EnemyMove}
 */
const ghostSpirits = (count, targets, name = 'Ghost Spirits') => ({
  name,
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
 * The Devil Armor: no roll; the same first-three-free-members list and helper hits as the Ghost Armor.
 * @type {EnemyAI}
 */
const devilArmorAI = (_enemy, { party, tick }) => {
  const targets = party.combatants.filter((c) => !c.outOfFight && !c.isBusy(tick)).slice(0, 3);
  if (!targets.length) return { action: ACTION_TYPES.NOTHING };
  return useMove(ghostSpirits(targets.length, targets, 'Multi-hit'));
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
  if (outcome === 2) particleEffectRolls(rng); // A's effect, rolled here to keep the RNG order
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
 * nightmare_ai_select_target_and_move (vd5.bin 0x800142f8 on v1.0, Sonierre and Scarletia): the front-row pass, no move
 * roll, then the script's roulette (31 ticks after the AI tick, then a lap every 32 ticks): one roll sets the previous
 * pick, ((r * 100) // 0x7fff) % 3, then each of four laps re-rolls until its pick differs from the previous one. The last
 * pick is the outcome: 0 the heal, 1 the long hit, 2 the short hit (80 of 80 recorded turns). Nothing else rolls in
 * between, so all of it is made at the AI tick, which keeps the RNG order (the Slot man's way).
 * @type {EnemyAI}
 */
const nightmareAI = (enemy, params) => {
  const choice = defaultAI(enemy, params);
  if (choice.action !== ACTION_TYPES.ATTACK) return choice;
  const { rng } = params;
  const pick = () => Math.floor((rng.next().rand * 100) / 32767) % 3;
  let prev = pick();
  for (let lap = 0; lap < 4; lap++) {
    let next = pick();
    while (next === prev) next = pick();
    prev = next;
  }
  const move = [
    ENEMY_MOVES.NIGHTMARE_HEAL,
    ENEMY_MOVES.NIGHTMARE_LONG_HIT,
    ENEMY_MOVES.NIGHTMARE_SHORT_HIT,
  ][prev];
  return useMove(move, choice.target);
};

/**
 * viperman_ai_select_target_and_move (vd5.bin 0x800132e8 on v1.0). Own row >= 4 with an ally ready (not acted, not
 * busy, front row, in the fight: itself included): the Command. Otherwise one no-retry pass over the party, both
 * rows, busy and fallen members skipped at no cost, one roll each, accepted on (r * 100) // 0x7fff > 50 (not % 100):
 * the first acceptor is attacked, nobody accepting skips the turn (1 of 160 recorded turns).
 * @type {EnemyAI}
 */
const vipermanAI = (enemy, { party, enemies, rng, tick }) => {
  const ready = enemies.combatants.some(
    (e) => !e.acted && !e.outOfFight && !e.isBusy(tick) && e.position < 4,
  );
  if (enemy.position >= 4 && ready) return useMove(ENEMY_MOVES.VIPERMAN_COMMAND);
  const target = party.combatants.find(
    (c) => !c.outOfFight && !c.isBusy(tick) && Math.floor((rng.next().rand * 100) / 32767) > 50,
  );
  return target ? attack(target) : { action: ACTION_TYPES.NOTHING };
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
  [ENEMY_KEYS.DAGON]: attackOrSpecialAI(ENEMY_MOVES.DAGON_SPECIAL),

  // strong_arm_ai_select_target_and_move (c_data.bin 0x80080018 on v1.0): the front-row pass, then the generic
  // Attack. Its script's native op 31 throws the first other enemy that is in the fight and not busy; with none
  // it plays its own punch script (different timing, see ENEMY_ATTACK_TIMINGS). The handler tests the partner a
  // few frames after the decision; the decision tick's busy flags are used (they agreed in all 32 checked turns).
  [ENEMY_KEYS.STRONG_ARM]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    const partner = params.enemies.combatants.some(
      (e) => e !== enemy && !e.outOfFight && !e.isBusy(params.tick),
    );
    enemy.attackVariant = partner ? 'throw' : 'punch';
    return choice;
  },

  // The mage Kobold (c_data.bin 0x8008049c on v1.0): the front-row pass, then one move roll,
  // (r * 100) / 32767 < 51 -> the generic Attack (51.0%), otherwise the Special at the target.
  [ENEMY_KEYS.KOBOLD_MAGE]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.KOBOLD_MAGE_SPECIAL, choice.target);
  },

  // sorcerer_ai_select_target_and_move (e_data.bin 0x80081284 on v1.0): the mage Kobold's shape, the front-row pass,
  // then (r * 100) / 32767 < 51 -> the generic Attack, otherwise the Special on the same target.
  [ENEMY_KEYS.SORCERER]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.SORCERER_SPECIAL, choice.target);
  },

  // ninja_ai_select_target_and_move (vh1.bin 0x80010680 on v1.0): the front-row pass, then (r * 100) // 0x7fff < 51 ->
  // the generic Attack (51.0%), otherwise the Special on the same target.
  [ENEMY_KEYS.NINJA]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.NINJA_SPECIAL, choice.target);
  },

  // The Ninja Master (z_data.bin) is the Ninja's code with PWR 330: the same scan, move roll and Special.
  [ENEMY_KEYS.NINJA_MASTER]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.NINJA_SPECIAL, choice.target);
  },

  // magus_ai_select_target_and_move (vh1.bin 0x8001166c on v1.0): the Ninja's shape; the Special is the Sorcerer's
  // Flaming Arrow effect (same particle code, same initial words) and one damage roll with MGC 290, element 6.
  [ENEMY_KEYS.MAGUS]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.SORCERER_SPECIAL, choice.target);
  },

  // whip_wolf_ai_select_target_and_move (e_data.bin 0x80080198 on v1.0): row >= 4: the Command, no scan and no roll
  // (no ally check, unlike the Viperman's). A front row (row < 4, unrecorded) scans both rows with
  // (r * 100) // 0x7fff > 50, one roll per free member, and RETRIES next tick when nobody accepts.
  [ENEMY_KEYS.WHIP_WOLF]: (enemy, { party, rng, tick }) => {
    if (enemy.position >= 4) return useMove(ENEMY_MOVES.WHIP_WOLF_COMMAND);
    const target = party.combatants.find(
      (c) => !c.outOfFight && !c.isBusy(tick) && Math.floor((rng.next().rand * 100) / 32767) > 50,
    );
    return target ? attack(target) : UNDETERMINED;
  },

  // whip_master_ai_select_target_and_move (vh1.bin 0x80010198 on v1.0): the Whip Wolf's commander with the same
  // constants (command at turn frame 23, gate 60, poll 83, 169 frames) and the same row rule.
  [ENEMY_KEYS.WHIP_MASTER]: (enemy, params) => ENEMY_AI[ENEMY_KEYS.WHIP_WOLF](enemy, params),

  // creeper_ai_select_target_and_move (d_data.bin 0x80081fa8 on v1.0): the mage Kobold's shape, the front-row pass,
  // then (r * 100) / 32767 < 51 -> the generic Attack (51.0%), otherwise the Special on the same target.
  [ENEMY_KEYS.CREEPER]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.CREEPER_SPECIAL, choice.target);
  },

  // devil_shield_ai_select_target_and_move (vc6.bin 0x80010a80 on v1.0): the mage Kobold's shape, the front-row
  // pass, then (r * 100) / 32767 < 51 -> the generic Attack (51.0%), otherwise the Special.
  [ENEMY_KEYS.DEVIL_SHIELD]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.DEVIL_SHIELD_SPECIAL, choice.target);
  },

  // magic_shield_ai_select_target_and_move (vf1.bin 0x80013184 on v1.0): the Devil Shield's shape, the front-row pass, then
  // (r * 100) / 32767 < 51 -> the generic Attack (51.0%), otherwise the Special (its own MGC 230 does the damage).
  [ENEMY_KEYS.MAGIC_SHIELD]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.DEVIL_SHIELD_SPECIAL, choice.target);
  },

  // siren_g_data_ai_select_target_and_move (g_data.bin 0x800807b0 on v1.0, Kalekka Area Lv32 hp250): the Magic Shield's shape,
  // the front-row pass, then (r * 100) / 32767 < 51 -> the generic Attack (51.0%, its hit reaction rolls Sleep), otherwise
  // the Special. The Lv53 Siren (SIREN_2) is a different record with its own AI entry.
  [ENEMY_KEYS.SIREN_1]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.SIREN_SPECIAL, choice.target);
  },

  // siren_lv53_vs1_ai_select_target_and_move (vs1.bin 0x80016818 on v1.0, screen 9/49/2): the Lv32 Siren's code on its own record
  // (PWR 260, MGC 210): the front-row pass, then (r * 100) // 0x7fff < 51 -> the generic Attack, otherwise the Special.
  [ENEMY_KEYS.SIREN_2]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.SIREN_SPECIAL, choice.target);
  },

  // sunshine_king_ai_select_target_and_move (vf1.bin 0x80013e2c on v1.0): the front-row pass only, no move roll, no hit
  // roll: the Sunshine on everyone (the target is stored but nothing reads it).
  [ENEMY_KEYS.SUNSHINE_KING]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    return useMove(ENEMY_MOVES.SUNSHINE_KING_SUNSHINE, choice.target);
  },

  // black_elemental_ai_select_target_and_move (vf1.bin 0x8001494c on v1.0): the Giant Snail's scan without the
  // formation test (back-row members are candidates too; a busy one costs no roll), then the basic Attack.
  [ENEMY_KEYS.BLACK_ELEMENTAL]: (_enemy, { party, rng, tick }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    return target ? attack(target) : UNDETERMINED;
  },

  // clay_doll_ai_select_target_and_move (ve2.bin 0x80014294 on v1.0): the front-row pass, then (r * 100) / 32767 < 71 ->
  // the generic Attack (71.0%), otherwise the Special (the Kobold C shape with its own threshold).
  [ENEMY_KEYS.CLAY_DOLL]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 71) return choice;
    return useMove(ENEMY_MOVES.CLAY_DOLL_SPECIAL, choice.target);
  },

  // earth_golem_ai_select_target_and_move (h_data.bin 0x80082a78 on v1.0, world map 7): the Clay Doll's shape and threshold: the front-row
  // pass, then (r * 100) / 32767 < 71 -> the generic Attack (PWR 340), otherwise the Special (six Earth hits, MGC 230, the Clay Doll's
  // CalcRune halving). The Special's timing offsets are the Clay Doll's (checked against earth_golem_lv53_hp600).
  [ENEMY_KEYS.EARTH_GOLEM]: (enemy, params) => ENEMY_AI[ENEMY_KEYS.CLAY_DOLL](enemy, params),

  // queen_ant_lv52_ai_select_target_and_move (vf2.bin 0x800155d0 on v1.0; NOT the Lv15 Queen Ant, QUEEN_ANT_BOSS): no target pass; one roll on the
  // first tick, (r * 100) // 0x7fff < 51 -> the magic burst, otherwise the Command.
  [ENEMY_KEYS.QUEEN_ANT]: (_enemy, { party, rng }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    return cDiv(rng.next().rand * 100, 0x7fff) < 51
      ? useMove(ENEMY_MOVES.QUEEN_ANT_2_BURST)
      : useMove(ENEMY_MOVES.QUEEN_ANT_2_COMMAND);
  },

  // wyvern_ai_select_target_and_move (vf2.bin 0x800170c8 on v1.0): the front-row pass, then the breath with no move roll and no hit roll.
  [ENEMY_KEYS.WYVERN]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    return choice.action === ACTION_TYPES.ATTACK
      ? useMove(ENEMY_MOVES.WYVERN_BREATH, choice.target)
      : choice;
  },

  // rock_buster_ai_select_target_and_move (vf2.bin 0x800147e0 on v1.0, Seek Valley): the Clay Doll's shape and threshold again: the front-row pass,
  // then (r * 100) / 32767 < 71 -> the generic Attack (PWR 300), otherwise the Special (six Earth hits, MGC 240, the Clay Doll's CalcRune halving).
  [ENEMY_KEYS.ROCK_BUSTER]: (enemy, params) => ENEMY_AI[ENEMY_KEYS.CLAY_DOLL](enemy, params),

  // banshee_ai_select_target_and_move (ve2.bin 0x80015210 on v1.0): the front-row pass, then the Special with no move roll.
  [ENEMY_KEYS.BANSHEE]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    return choice.action === ACTION_TYPES.ATTACK
      ? useMove(ENEMY_MOVES.BANSHEE_SPECIAL, choice.target)
      : choice;
  },

  // red_elemental_ai_select_target_and_move (ve2.bin 0x80015be4 on v1.0): the Black Elemental's, the scan without the formation
  // test, then the generic Attack (cut short to 12-13 frames when another actor follows).
  [ENEMY_KEYS.RED_ELEMENTAL]: (_enemy, { party, rng, tick }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    return target ? attack(target) : UNDETERMINED;
  },

  // demon_sorcerer_ai_select_target_and_move (ve3.bin 0x80014cd8 on v1.0): the Kobold C shape, the front-row pass, then
  // (r * 100) / 32767 < 51 -> the generic Attack, otherwise the Special on the same target.
  [ENEMY_KEYS.DEMON_SORCERER]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.DEMON_SORCERER_SPECIAL, choice.target);
  },

  // hell_unicorn_ai_select_target_and_move (ve3.bin 0x80013214 on v1.0): the same shape and threshold.
  [ENEMY_KEYS.HELL_UNICORN]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return choice;
    return useMove(ENEMY_MOVES.HELL_UNICORN_SPECIAL, choice.target);
  },

  // holly_fairy_ai_select_target_and_move (d_data.bin 0x800801b0 on v1.0): the front-row pass once, with no retry:
  // when nobody accepts (13.3% of turns) the target is stored as -1 and the turn is skipped (3 frames, no hit).
  // Her own row is 1 in every recording; the back-row branch (a script of its own) is static only, not modelled.
  [ENEMY_KEYS.HOLLY_FAIRY]: (_enemy, { party, rng, tick }) => {
    if (!party.getFrontRow().length) return { action: ACTION_TYPES.NOTHING };
    const target = frontRowTarget(party, rng, tick);
    return target ? attack(target) : { action: ACTION_TYPES.NOTHING };
  },

  [ENEMY_KEYS.SLOT_MAN]: slotManAI,

  [ENEMY_KEYS.NIGHTMARE]: nightmareAI,

  [ENEMY_KEYS.VIPERMAN]: vipermanAI,

  // Shadow (vg2.bin 0x80013b04 on v1.0): the front-row pass (a tick with no acceptor rescans the next), then the strike with no move roll.
  [ENEMY_KEYS.SHADOW]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    return choice.action === ACTION_TYPES.ATTACK
      ? useMove(ENEMY_MOVES.SHADOW_STRIKE, choice.target)
      : choice;
  },

  // Shadow Man (f_data.bin 0x800821e0 on v1.0, world map 5): the Kalekka Shadow's shape, scan then the same windup strike (hit at the AI tick + 148, PWR 310).
  [ENEMY_KEYS.SHADOW_MAN]: (enemy, params) => ENEMY_AI[ENEMY_KEYS.SHADOW](enemy, params),

  // Mirage (f_data.bin 0x80083f74 on v1.0, world map 5; the wm7 h_data copy is different code, not recorded): the Black Elemental's scan
  // (both rows, busy members free), then the accepted target's formation row picks the move: front row (< 4) the generic Attack, back row
  // the special (no hit roll).
  [ENEMY_KEYS.MIRAGE]: (_enemy, { party, rng, tick }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    if (!target) return UNDETERMINED;
    return target.position < 4 ? attack(target) : useMove(ENEMY_MOVES.MIRAGE_SPECIAL, target);
  },

  // The wm7 Mirage (h_data.bin 0x80083f74 copy): the same AI, its own special timing (one frame shorter tail).
  [ENEMY_KEYS.MIRAGE_2]: (_enemy, { party, rng, tick }) => {
    if (party.combatants.every((c) => c.outOfFight)) return { action: ACTION_TYPES.NOTHING };
    const target = anyRowTarget(party, rng, tick);
    if (!target) return UNDETERMINED;
    return target.position < 4 ? attack(target) : useMove(ENEMY_MOVES.MIRAGE_2_SPECIAL, target);
  },

  [ENEMY_KEYS.GHOST_ARMOR]: ghostArmorAI,

  [ENEMY_KEYS.DEVIL_ARMOR]: devilArmorAI,

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
