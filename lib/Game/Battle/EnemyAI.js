import { ACTION_TYPES } from './Actions.js';
import { ELEMENTS } from '../Constants.js';
import { ENEMY_KEYS } from '../Keys.js';
import { cDiv } from '../../lib.js';

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
 */

/**
 * A monster-specific move. Exactly one of:
 *   cast   a wind-up (Battle.castMagic): waits for everyone to be idle, `frames` ticks, then apply
 *   strike runs like a basic attack from the tick the AI picks it (Battle.resolveEnemyStrike)
 * @typedef {Object} EnemyMove
 * @property {string} name
 * @property {{ frames: number }} [cast]
 * @property {StrikeTiming} [strike]
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

/** @satisfies {Record<string, EnemyMove>} */
export const ENEMY_MOVES = {
  // calc_rune_element_attack_damage's element argument is 6: the Resurrection Rune's category, so
  // Resurrection resists it and Fire doesn't.
  FIRE_BREATH: {
    name: 'Fire Breath',
    cast: { frames: 392 },
    // Every living party member, in actor order. The loop counter sits in $s1, which an unlisted
    // rune's category reads (the register-reuse bug), so party member 6 matches element 6 and
    // takes half damage. Live-confirmed.
    apply: (enemy, { party, rng }) => {
      party.combatants.forEach((character, i) => {
        if (character.outOfFight) return;
        character.takeDamage(enemy.calcMagicDamage({ element: ELEMENTS.RESURRECTION }, character, rng, i + 1 === 6));
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
    if (params.turn_count === 1) return useMove(ENEMY_MOVES.FIRE_BREATH);
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < 0x47) return choice;
    return useMove(ENEMY_MOVES.FIRE_BREATH);
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
