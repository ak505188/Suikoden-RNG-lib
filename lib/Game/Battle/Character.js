import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js'
import { STATUS } from '../Constants.js';
import RNG from '../../rng.js';
import { calculateLevelupGrowth, getGrowthValue, GROWTHS, LEVEL_UP_STAT_ORDER } from '../Growths.js';

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */

/**
 * @typedef {Object} CharacterStatBlock
 * @property {number} LVL
 * @property {number} EXP
 * @property {number} HP
 * @property {number} PWR
 * @property {number} SKL
 * @property {number} DEF
 * @property {number} SPD
 * @property {number} MGC
 * @property {number} LUK
 */

/**
 * @typedef {Object} CharacterGrowths
 * @property {number} PWR
 * @property {number} SKL
 * @property {number} DEF
 * @property {number} SPD
 * @property {number} MGC
 * @property {number} LUK
 */

/**
 * @typedef {Object} CharacterWeaponRef
 * @property {number} id - Index into the WEAPONS table.
 * @property {number} lvl
 */

/**
 * @typedef {Object} CharacterArmorSlots
 * @property {ArmorPiece|null} head
 * @property {ArmorPiece|null} body
 * @property {ArmorPiece|null} shield
 * @property {Array<ArmorPiece|null>} accessories
 */

/**
 * @typedef {Object} CharacterArmorLocked
 * @property {boolean} head
 * @property {boolean} body
 * @property {boolean} shield
 * @property {boolean[]} accessories
 */

/**
 * @typedef {Object} CharacterData
 * @property {string} name
 * @property {Rune} rune
 * @property {boolean} isRuneLocked
 * @property {CharacterWeaponRef} weapon
 * @property {WearClass[]} wearClasses
 * @property {CharacterArmorSlots} armor
 * @property {CharacterArmorLocked} isArmorLocked
 * @property {{initial: CharacterStatBlock, growths: CharacterGrowths}} stats
 */

export default class Character {
  /**
   * @param {CharacterData} character
   */
  constructor(character) {
    this.name = character.name;
    this.LVL = 1;
    this.EXP = 0;

    this.weapon = new Weapon(WEAPONS[character.weapon.id], character.weapon.lvl);

    const { initial, growths } = character.stats;

    this.stats = {
      PWR: initial.PWR,
      SKL: initial.SKL,
      DEF: initial.DEF,
      SPD: initial.SPD,
      MGC: initial.MGC,
      LUK: initial.LUK,
      HP: initial.HP,
    };

    this.initial = initial;
    this.growths = growths;

    this.rune = character.rune;
    this.isRuneLocked = character.isRuneLocked;
    this.wearClasses = character.wearClasses;

    this.armor = character.armor;
    this.isArmorLocked = character.isArmorLocked;

    // Battle-runtime state, managed by Battle/TurnOrder (see ../Battle/).
    this.acted = false;
    this.busy = false;
    this.action = null;

    this.status = {
      [STATUS.POISON]: false,
      [STATUS.BALLOON]: 0,
      [STATUS.BUCKET]: false,
      [STATUS.UNBALANCED]: 0,
      [STATUS.SLEEP]: false,
    };

    this.init();
  }

  init() {
    // Current HP & MP
    this.HP = this.stats.HP;
    this.maxMP = getMPFromMGC(this.stats.MGC);
    this.MP = [...this.MP];
  }

  clearTurnState() {
    this.acted = false;
    this.busy = false;
    this.action = null;
  }

  get ATK() {
    return this.weapon.getATK() + this.stats.PWR;
  }

  get ARM() {
    const { head, body, shield, accessories } = this.armor;
    const armorDEF = [head, body, shield, ...accessories]
      .filter(Boolean)
      .reduce((total, piece) => total + piece.def, 0);
    return this.stats.DEF + armorDEF;
  }

  get MGC() {
    // TODO: Add equipment bonus
    return this.stats.MGC;
  }

  get SPD() {
    // TODO: Add equipment bonus
    return this.stats.SPD;
  }

  get SKL() {
    // TODO: Add equipment bonus
    return this.stats.SKL;
  }

  get LUK() {
    // TODO: Add equipment bonus
    return this.stats.LUK;
  }

  get alive() {
    return this.HP > 0;
  }

  /** @param {number} lvl */
  setLevel(lvl) {
    this.lvl = lvl;
    return this;
  }

  /** @param {number} exp */
  setExp(exp) {
    this.exp = exp;
    return this;
  }

  /**
   * @param {RNG} rng
   * @param {number} startingLVL
   * @param {number} levels
   */
  calculateLevelups(rng, startingLVL, levels = 1) {
    rng = rng || new RNG();
    startingLVL = startingLVL || this.LVL;

    if (startingLVL + levels > 99) {
      levels = 99 - startingLVL;
    }

    const statGrowths = {};

    for (let i = 0; i < levels; i++) {
      LEVEL_UP_STAT_ORDER.forEach(stat => {
        rng.next();
        const growthValue = getGrowthValue(this.growths, stat, startingLVL + i);
        statGrowths[stat] = calculateLevelupGrowth(rng.getRNG2(), growthValue, stat);
      });
    }
    return statGrowths;
  }

  /**
   * @param {RNG} rng
   * @param {number} startingLVL
   * @param {number} levels
   */
  levelUp(rng, startingLVL, levels = 1) {
    const statGrowths = this.calculateLevelups(rng, startingLVL, levels)
    Object.entries(statGrowths).forEach(([stat, value]) => {
      this.stats[stat] = this.stats[stat] + value;
    });

    this.LVL = Math.min(startingLVL + levels, 99);
    return this;
  }

  /**
   * @param {CharacterStatBlock} stats
   * @param {boolean} reinit
   */
  setStats(stats, reinit = true) {
    this.stats = { ...this.stats, ...stats };
    if (reinit) this.init();
    return this;
  }



  /**
   * @param {number} amount
   */
  takeDamage(amount) {
    this.HP = Math.max(0, this.HP - amount);
  }
}
