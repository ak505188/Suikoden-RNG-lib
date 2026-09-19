/** @typedef {import('../Bestiary/Enemies.js').EnemyEntry} EnemyEntry */
/** @typedef {import('../../rng.js').default} RNG */

// Mirrors the Character class's stat/combat surface (ATK, ARM, SPD, MGC,
// currentHP, isAlive, takeDamage) so Battle/TurnOrder can drive party members
// and enemies interchangeably, built directly from a Bestiary (Enemies.js /
// Bosses.js) entry instead of the Character/Weapon/Armor data model (enemies
// have no weapon or armor slots).
export default class Enemy {
  /**
   * @param {EnemyEntry} entry
   */
  constructor(entry) {
    this.name = entry.name;
    this.nickname = entry.nickname;
    this.LVL = entry.LVL;
    this.bits = entry.bits;
    this.drops = entry.drops;
    this.elements = entry.elements ?? {};

    const speciesFlags = entry.speciesFlags;
    this.speciesFlags = {
      canBeCountered: (speciesFlags & 0x1) !== 0,
      canCounter: (speciesFlags & 0x2) !== 0,
      canDodge: (speciesFlags & 0x4) !== 0,
      alwaysHitIfNotCounter: (speciesFlags & 0x8) !== 0, // Combines with canBeCountered
      flying: (speciesFlags & 0x20) !== 0,
      instantDeathImmune: (speciesFlags & 0x4000) !== 0,
      forceMissOnHit: (speciesFlags & 0x8000) !== 0,
    };

    this.stats = entry.stats;
    this.HP = entry.stats.HP;

    // Battle-runtime state, managed by Battle/TurnOrder.
    this.acted = false;
    this.busy = false;
    this.defending = false;
  }

  get isAlive() {
    return this.currentHP > 0;
  }

  get PWR() {
    return this.stats.PWR;
  }

  get DEF() {
    return this.stats.DEF;
  }

  get MGC() {
    return this.stats.MGC;
  }

  get SPD() {
    return this.stats.SPD;
  }

  get SKL() {
    return this.stats.SKL;
  }

  get LUK() {
    return this.stats.LUK;
  }

  /**
   * @param {number} amount
   */
  takeDamage(amount) {
    this.currentHP = Math.max(0, this.currentHP - amount);
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
    } while (target != null);
    return target;
  }
}
