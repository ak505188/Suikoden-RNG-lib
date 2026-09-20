import Combatant from './Combatant.js';

/** @typedef {import('../Bestiary/Enemies.js').EnemyEntry} EnemyEntry */
/** @typedef {import('../../rng.js').default} RNG */

// Mirrors the Character class's stat/combat surface (ATK, ARM, SPD, MGC,
// currentHP, isAlive, takeDamage) so Battle/TurnOrder can drive party members
// and enemies interchangeably, built directly from a Bestiary (Enemies.js /
// Bosses.js) entry instead of the Character/Weapon/Armor data model (enemies
// have no weapon or armor slots).
export default class Enemy extends Combatant {
  /**
   * @param {EnemyEntry} entry
   */
  constructor(entry) {
    super(entry.name, entry.LVL, entry.stats);
    this.nickname = entry.nickname;
    this.bits = entry.bits;
    this.drops = entry.drops;
    this.elements = entry.elements ?? {};

    const speciesFlags = entry.speciesFlags;
    this.speciesFlags = {
      canBeCountered: (speciesFlags & 0x1) !== 0,
      canCounter: (speciesFlags & 0x2) !== 0,
      canDodge: (speciesFlags & 0x4) !== 0,
      alwaysHitIfNotCounter: (speciesFlags & 0x8) !== 0, // Combines with canBeCountered, only applies to Enemy Attack
      flying: (speciesFlags & 0x20) !== 0,
      instantDeathImmune: (speciesFlags & 0x4000) !== 0,
      forceMissOnHit: (speciesFlags & 0x8000) !== 0,
    };
  }

  /**
   * @param {RNG} rng
   * @param {number} numCandidates
   */
  selectTarget(rng, numCandidates = 3) {
    let target = null;
    do {
      for (let slot = 0; slot < numCandidates; slot++) {
        const rng2 = rng.next().getRNG2();
        if (rng2 % 100 > 50) {
          target = slot;
          break;
        }
      }
    } while (target === null);
    return target;
  }
}
