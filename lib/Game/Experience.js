import { clamp } from '../util/math.js';

/** @typedef {import('./Battle/Character.js').default} Character */
/** @typedef {import('./Battle/Enemy.js').default} Enemy */

export const EXP_PER_LEVEL = 1000;
export const MIN_BATTLE_EXP = 5;

/**
 * EXP one enemy is worth to one character, by level difference (enemy LVL - character LVL),
 * from -14 (index 0) to +15 (index 29). Differences beyond either end use the end value.
 */
export const EXP_BY_LEVEL_DIFF = [
  1,
  2,
  3,
  5,
  7,
  10,
  15,
  20,
  30,
  50,
  70,
  90,
  120,
  160, // -14 to -1
  200, // 0
  400,
  900,
  1600,
  2600,
  3900,
  5100,
  6000,
  6900,
  7500,
  8000,
  8500,
  9000,
  9300,
  9700,
  10000, // +1 to +15
];

const MIN_LEVEL_DIFF = -14;
const MAX_LEVEL_DIFF = 15;

/**
 * @param {number} enemyLVL
 * @param {number} characterLVL
 * @returns {number}
 */
export function getEnemyEXP(enemyLVL, characterLVL) {
  const diff = clamp(enemyLVL - characterLVL, MIN_LEVEL_DIFF, MAX_LEVEL_DIFF);
  return EXP_BY_LEVEL_DIFF[diff - MIN_LEVEL_DIFF];
}

/**
 * EXP one living party member gets at the end of a battle: every enemy's table value added up,
 * split between the living party members, at least MIN_BATTLE_EXP, then doubled by the Fortune
 * Rune.
 * @param {number} characterLVL
 * @param {number[]} enemyLVLs - every enemy in the battle
 * @param {number} livingPartySize
 * @param {boolean} hasFortuneRune
 * @returns {number}
 */
export function calculateBattleEXP(
  characterLVL,
  enemyLVLs,
  livingPartySize,
  hasFortuneRune = false,
) {
  const total = enemyLVLs.reduce((sum, enemyLVL) => sum + getEnemyEXP(enemyLVL, characterLVL), 0);
  const exp = Math.max(Math.floor(total / livingPartySize), MIN_BATTLE_EXP);
  return hasFortuneRune ? exp * 2 : exp;
}
