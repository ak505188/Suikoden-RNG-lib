import { ENEMY_KEYS as E } from '../Keys.js';
import { formationEnemies } from '../Encounters.js';

/** @typedef {import('./Areas.js').Formation} Formation */

// Overrides for formation display names whose default name reads badly.
/** @type {[keys: (typeof E[keyof typeof E])[], name: string][]} */
const OVERRIDES = [
  [[E.BANDIT_RED, E.BANDIT_RED, E.BANDIT_YELLOW], '3 Bandit'],
  [[E.KOBOLD_SWORD], '1 Kobold'],
  [[E.KOBOLD_BOW, E.KOBOLD_BOW], '2 Kobold'],
  [[E.KOBOLD_SWORD, E.KOBOLD_SWORD, E.KOBOLD_SWORD], '3 Kobold'],
  [
    [E.KOBOLD_SWORD, E.KOBOLD_SWORD, E.KOBOLD_SWORD, E.KOBOLD_BOW, E.KOBOLD_BOW, E.KOBOLD_BOW],
    '6 Kobold',
  ],
  [[E.ROBOT_SOLDIER_SPEAR, E.ROBOT_SOLDIER_SWORD, E.ROBOT_SOLDIER_SWORD], '3 Robot Soldier'],
  [
    [
      E.ROBOT_SOLDIER_SWORD,
      E.ROBOT_SOLDIER_SWORD,
      E.ROBOT_SOLDIER_SWORD,
      E.ROBOT_SOLDIER_SPEAR,
      E.ROBOT_SOLDIER_SPEAR,
      E.ROBOT_SOLDIER_SPEAR,
    ],
    '6 Robot Soldier',
  ],

  // Bosses / Scripted fights
  [[E.GOLEM], 'Golem'],
  [[E.BANDIT_YELLOW, E.BANDIT_RED, E.BANDIT_RED, E.BANDIT_GREEN, E.BANDIT_GREEN], '5 Bandit'],
  [[E.VARKAS, E.SYDONIA], 'Varkas & Sydonia'],
  [[E.ZOMBIE_DRAGON], 'Zombie Dragon'],
  [[E.GIGANTES], 'Gigantes'],
  [[E.NECLORD_L], 'Neclord (Unwinnable)'],
  [[E.NECLORD], 'Neclord'],
  [[E.CRYSTAL_CORE], 'Crystal Core'],
  [[E.SHELL_VENUS], 'Shell Venus'],
  [[E.SONYA_SHULEN], 'Sonya Shulen'],
  [[E.AIN_GIDE], 'Ain Gide'],
  [[E.GOLDEN_HYDRA_RIGHT, E.GOLDEN_HYDRA_MIDDLE, E.GOLDEN_HYDRA_LEFT], 'Golden Hydra'],
];

/** @param {Formation} formation */
const signature = (formation) =>
  formation
    .filter((key) => key !== null)
    .sort()
    .join(',');

const BY_SIGNATURE = new Map(OVERRIDES.map(([keys, name]) => [signature(keys), name]));

/** @param {Formation} formation */
function defaultName(formation) {
  const counts = new Map();
  for (const enemy of formationEnemies(formation)) {
    const { name, nickname } = /** @type {import('./Enemies.js').EnemyEntry} */ (enemy);
    const label = nickname ?? name;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => `${count} ${name}`).join(' ');
}

// Per formation object: the sort and lookup happen once for each formation in AREAS
const cache = new WeakMap();

/**
 * @param {Formation} formation
 * @returns {string} The formation's display name: its override if it has one, else "2 Clay Doll"
 */
export function formationName(formation) {
  let name = cache.get(formation);
  if (name === undefined) {
    name = BY_SIGNATURE.get(signature(formation)) ?? defaultName(formation);
    cache.set(formation, name);
  }
  return name;
}
