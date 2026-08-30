import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js'

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */

/**
 * @typedef {Object} CharacterStatBlock
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

    this.HP = initial.HP;
    this.currentHP = this.HP;

    this.MP = getMPFromMGC(initial.MGC);
    this.currentMP = [...this.MP];

    this._PWR = initial.PWR;
    this._SKL = initial.SKL;
    this._DEF = initial.DEF;
    this._SPD = initial.SPD;
    this._MGC = initial.MGC;
    this._LUK = initial.LUK;

    this.growths = growths;

    this.rune = character.rune;
    this.isRuneLocked = character.isRuneLocked;
    this.wearClasses = character.wearClasses;

    this.armor = character.armor;
    this.isArmorLocked = character.isArmorLocked;
  }

  get ATK() {
    return this.weapon.getATK() + this._PWR;
  }

  get ARM() {
    const { head, body, shield, accessories } = this.armor;
    const armorDEF = [head, body, shield, ...accessories]
      .filter(Boolean)
      .reduce((total, piece) => total + piece.def, 0);
    return this._DEF + armorDEF;
  }
}
