import { ACTION_TYPES } from './Actions.js';
import { ELEMENTS } from '../Constants.js';
import { ENEMY_KEYS } from '../Keys.js';
import { cDiv } from '../../lib.js';
import { memoizeBurn } from '../Magic/SpellRNG/shared.js';

/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Character.js').default} Character */
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
 * @property {number} damage - t0 -> the damage roll(s) (the move's apply)
 * @property {number} end - t0 -> the tick the turn ends
 * @property {number} gate - the roll gate it sets as the turn ends
 * @property {number} free - t0 -> the frame its busy clears
 * @property {number} [targetFree] - t0 -> the frame its target's busy clears
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
 * @property {(enemy: Enemy, ctx: { party: PlayerParty, rng: RNG, target?: Character }) => void} apply -
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
  return party.combatants.find(c =>
    c.position < 4 && !c.outOfFight && !c.isBusy(tick) && rng.next().rand % 100 > 50) ?? null;
}

/**
 * The same pass over both rows (Sydonia).
 * @param {PlayerParty} party @param {RNG} rng @param {number} tick
 * @returns {Character | null}
 */
export function anyRowTarget(party, rng, tick) {
  return party.combatants.find(c => !c.outOfFight && !c.isBusy(tick) && rng.next().rand % 100 > 50) ?? null;
}

/** @param {Character} target @returns {EnemyAction} */
const attack = target => ({ action: ACTION_TYPES.ATTACK, target });
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
  const particles = Array.from({ length: 30 }, () => ({ active: false, lifetime: 0, posZ: 0, velZ: 0 }));
  for (let tick = 0; tick < 128; tick++) {
    for (const p of particles) {
      if (p.active) continue;
      rng.next(); rng.next(); rng.next(); // X, Y, unused Z
      const r4 = rng.next().rand, r5 = rng.next().rand;
      Object.assign(p, { active: true, lifetime: r5 % 70, velZ: -((r4 % 5) + 5) * 4096, posZ: p.posZ & 0xfff });
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
 * later frames drift over a 5-frame range whose cause is unknown; the middle is used.
 */
const DRAGON_M = 36;

/** @satisfies {Record<string, EnemyMove>} */
export const ENEMY_MOVES = {
  // red_soldier_ant_special_double_strike (a_data.bin 0x80080950). The AI plays script
  // 0x800a5460 and sets the gate to 20; damage = calc_damage << 1, no hit or crit roll (so it
  // can't be dodged, countered or covered). Live (3Mosquito1Ant.State, 12 runs): impact +28,
  // damage +29, target free +63, next actor copied at +83 (opcode 9 at +82), ant free +145 (its
  // own clear, no return script).
  RED_SOLDIER_ANT_DOUBLE_STRIKE: {
    name: 'Double Strike',
    strike: { damage: 29, recover: 82, free: 145, targetFree: 63, gate: 20 },
    apply: (enemy, { target, rng }) => target.takeDamage(enemy.calcAttackDamage(target, rng) * 2),
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
    held: { damage: DRAGON_M + 266, end: DRAGON_M + 266 + 21 + 1, gate: 30, free: DRAGON_M + 266 + 21 },
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(cDiv(enemy.calcMagicDamage(ELEMENTS.FIRE, character, rng, i + 1), 2));
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
  // UNVERIFIED (static only: Battle_Damage_Formula.md's slot-bug table, va4.bin): Earth
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
    apply: (enemy, { target, rng }) => target.takeDamage(Math.floor(enemy.calcAttackDamage(target, rng) * 4 / 3)),
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
 * Monsters whose AI (attack_data_table[Id]+0x30) isn't the plain attacker. Called every tick of
 * the monster's turn until it commits.
 * @type {Partial<Record<EnemyKey, EnemyAI>>}
 */
export const ENEMY_AI = {
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
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 51) return useMove(ENEMY_MOVES.DRAGON_LIGHTNING, choice.target);
    return useMove(ENEMY_MOVES.DRAGON_FIRE_BREATH);
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

  // golem AI (va4.bin 0x80010ea4). UNVERIFIED (static only; the threshold is from
  // EnemyAIPredictor.lua's template): the front-row pass, then one move roll,
  // (r * 100) / 32767 < 0x47 -> Attack (~71%), otherwise the special on everyone.
  [ENEMY_KEYS.GOLEM]: (enemy, params) => {
    const choice = defaultAI(enemy, params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 0x47) return choice;
    return useMove(ENEMY_MOVES.GOLEM_SPECIAL);
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
