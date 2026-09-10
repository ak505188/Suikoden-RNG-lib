/**
 * @typedef {Object} EnemyStatBlock
 * @property {number} DEF
 * @property {number} HP
 * @property {number} LUK
 * @property {number} MGC
 * @property {number} PWR
 * @property {number} SKL
 * @property {number} SPD
 * @property {number} lvl
 */

/**
 * @typedef {Object} EnemyData
 * @property {number} bits
 * @property {Array<{item: string, rate: number}>} drops
 * @property {EnemyStatBlock} stats
 */

// Mirrors the Character class's stat/combat surface (ATK, ARM, SPD, MGC,
// currentHP, isAlive, takeDamage) so Battle/TurnOrder can drive party members
// and enemies interchangeably, built directly from an enemies.js entry
// instead of the Character/Weapon/Armor data model (enemies have no weapon
// or armor slots).
export default class Enemy {
  /**
   * @param {string} name
   * @param {EnemyData} enemy
   */
  constructor(name, enemy) {
    this.name = name;
    this.drops = enemy.drops;

    const { HP, PWR, DEF, SPD, MGC, LUK, SKL, lvl } = enemy.stats;

    this.HP = HP;
    this.currentHP = this.HP;

    this.PWR = PWR;
    this.DEF = DEF;
    this.SPD = SPD;
    this.MGC = MGC;
    this.LUK = LUK;
    this.SKL = SKL;
    this.lvl = lvl;

    // Battle-runtime state, managed by Battle/TurnOrder.
    this.acted = false;
    this.busy = false;
    this.defending = false;
  }

  get isAlive() {
    return this.currentHP > 0;
  }

  /**
   * @param {number} amount
   */
  takeDamage(amount) {
    this.currentHP = Math.max(0, this.currentHP - amount);
  }

  selectTarget(
}
