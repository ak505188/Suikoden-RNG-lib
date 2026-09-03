import { ELEMENTS } from './Constants.js';

/**
 * @typedef {Object} WeaponType
 * @property {string} NAME
 * @property {number[]} ATK - ATK by weapon level, index 0 = level 1.
 */

/**
 * @typedef {Object} WeaponEntry
 * @property {string[]} NAMES - Names by upgrade tier (e.g. base, +1, +2).
 * @property {WeaponType} TYPE
 * @property {string} ELEMENT?
 */

/** @type {Record<string, WeaponType>} */
export const WEAPON_TYPES = {
  BOW: {
    NAME: 'Bow',
    ATK: [5, 7, 10, 14, 18, 35, 42, 48, 54, 63, 70, 81, 105, 117, 132, 155],
  },
  STAFF: {
    NAME: 'Staff',
    ATK: [5, 7, 9, 12, 20, 25, 32, 39, 47, 57, 68, 91, 103, 117, 136, 158],
  },
  AXE: {
    NAME: 'Axe',
    ATK: [9, 14, 18, 23, 28, 32, 37, 42, 67, 77, 86, 95, 106, 130, 150, 170],
  },
  DARTS: {
    NAME: 'Darts',
    ATK: [6, 8, 11, 20, 25, 31, 35, 39, 45, 69, 78, 89, 99, 113, 128, 150],
  },
  CLAWS: {
    NAME: 'Claws',
    ATK: [6, 8, 10, 13, 17, 22, 28, 46, 55, 64, 75, 86, 95, 110, 130, 170],
  },
  TWO_HANDED_SWORD: {
    NAME: 'Two-handed Sword',
    ATK: [7, 9, 11, 14, 22, 27, 34, 41, 49, 59, 70, 93, 105, 119, 138, 160],
  },
  SPEAR: {
    NAME: 'Spear',
    ATK: [7, 11, 15, 19, 27, 33, 40, 47, 56, 66, 88, 97, 107, 119, 136, 150],
  },
  ROD: {
    NAME: 'Rod',
    ATK: [3, 5, 7, 10, 13, 17, 28, 33, 38, 44, 60, 70, 85, 100, 114, 130],
  },
  ONE_HANDED_SWORD: {
    NAME: 'One-handed Sword',
    ATK: [5, 7, 9, 12, 16, 20, 33, 40, 48, 59, 70, 80, 102, 115, 134, 150],
  },
  TALKING_SWORD: {
    NAME: 'Talking Sword',
    ATK: [9, 11, 13, 16, 25, 30, 39, 55, 62, 75, 83, 109, 112, 143, 163, 185],
  },
};

/** @type {Array<WeaponEntry|null>} */
export const WEAPONS = [
  null,
  {
    NAMES: ['Wolf Fang Staff', 'Dragon Fang Staff', 'Heaven Fang Staff'],
    TYPE: WEAPON_TYPES.STAFF,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Axe', 'Copper Axe', 'Axe of the Oath'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Claws', 'Super Claws', 'Ultra Claws'],
    TYPE: WEAPON_TYPES.CLAWS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Air Sword', 'Air Moon Sword', 'Air Moonstar Sword'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Taia Sword', 'Shiko Sword', 'Koten Sword'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Galm', 'Fenril', 'Loki'], TYPE: WEAPON_TYPES.SPEAR, ELEMENT: ELEMENTS.NONE },
  { NAMES: ['Slavenil', 'Gunnigle', 'Odin'], TYPE: WEAPON_TYPES.SPEAR, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Lighting Hatchet', 'Rockbreaker Hatchet', 'Leppa Hatchet'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Ruisui', 'Ryuseisui', 'Mikagetsusui'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Masamune', 'Murasame', 'Murasama'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Odessa', 'Odessa+', 'Odessa++'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.WIND,
  },
  { NAMES: ['Axe', 'Battle Axe', 'Ogre Axe'], TYPE: WEAPON_TYPES.AXE, ELEMENT: ELEMENTS.NONE },
  { NAMES: ['Satsuki', 'Akemi', 'Mizuki'], TYPE: WEAPON_TYPES.SPEAR, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Uranami Spear', 'Seigetsu Spear', 'Matsukaze Spear'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Wind Rod', 'Gale Rod', 'Gust Rod'], TYPE: WEAPON_TYPES.ROD, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Kirinji', 'Kirinji 2', 'Kirinji 3'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Darts', 'Ruby Darts', 'Crystal Darts'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Needle', 'Gold Needle', 'Super Needle'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  { NAMES: ['Gear', 'Iron Gear', 'Metal Gear'], TYPE: WEAPON_TYPES.DARTS, ELEMENT: ELEMENTS.WIND },
  {
    NAMES: ['Light Bow', 'Shine Bow', 'Elfin Bow'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.WIND,
  },
  { NAMES: ['Stick', 'Oak Stick', 'Ebony Stick'], TYPE: WEAPON_TYPES.ROD, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Light Steel', 'Regular Steel', 'Heavy Steel'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Steed Rod', 'Master Rod', 'Rod of Hermes'],
    TYPE: WEAPON_TYPES.ROD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Kitchen Knife', 'Silver Kitchen Knife', 'Gold Kitchen Knife'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Sakura', 'Big Sakura', 'Max Sakura'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Aluminum Hammer', 'Titanium Hammer', 'Iron Hammer'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Punishment', 'Super Punishment', 'Ultra Punishment'],
    TYPE: WEAPON_TYPES.ROD,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Verserk', 'Sigmund', 'Sigurd'], TYPE: WEAPON_TYPES.SPEAR, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Valkryie', 'Valhalla', 'Brunhildt'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Light Knife', 'Ray Knife', 'Shining Knife'],
    TYPE: WEAPON_TYPES.ROD,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Tengaar', 'Tengaar+', 'Tengaar++'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Alkaid Hatchet', 'Mizar Hatchet', 'Alioth Hatchet'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Star Sword', 'Seven Star Sword', 'Conqueror Star Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Rose', 'Marguerite', 'Orchid'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Black Knife', 'Black Blade', 'Black Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Moonlight', 'Blue Moonlight', 'Emerald Moonlight'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.WATER,
  },
  {
    NAMES: ['Blue', 'Turquoise Blue', 'Royal Blue'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Night Bow', 'Moon Bow', 'Elfin Bow'], TYPE: WEAPON_TYPES.BOW, ELEMENT: ELEMENTS.WIND },
  {
    NAMES: ['Bow of Amrita', 'Bow of Shiva', 'Bow of Vishnu'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Claw', 'Tiger Claw', 'Dragon Claw'],
    TYPE: WEAPON_TYPES.CLAWS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Sword', 'Good Sword', 'Excellent Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Fire Sword', 'Flame Sword', 'True Flame Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Flashing Sword', 'Lightning Sword', 'True Lightning Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.LIGHTNING,
  },
  {
    NAMES: ['First Sword', 'Second Sword', 'Third Sword'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Rapier', 'Silver Rapier', 'Platinum Rapier'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Demon Spear', 'Demon God Spear', 'Demon Army Spear'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Horse-killer Hatchet', 'Killer Steel Hatchet', 'Killer Big Hatchet'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Sickle & chain', 'Steel sickle & chain', 'Copper sickle & chain'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Double Axe', 'Double Big Axe', 'Double Battle Axe'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Sword', 'Cool Sword', 'Very Neat Sword'],
    TYPE: WEAPON_TYPES.ONE_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Bow of Vlitra', 'Bow of Garuda', 'Bow of Ashra'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.WIND,
  },
  { NAMES: ['Silver Rod', 'Moon Rod', 'Star Rod'], TYPE: WEAPON_TYPES.ROD, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Shuriken', 'Super Shuriken', 'Ultra Shuriken'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Short Bow', 'Silver Bow', 'Magic Bow'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Talons', 'Hooked Talons', 'Hawk Talons'],
    TYPE: WEAPON_TYPES.CLAWS,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Thunder', 'Lightning', 'Holy Thunderbolt'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.LIGHTNING,
  },
  {
    NAMES: ['Pretty Shawl', 'Lovely Shawl', 'Sexy Shawl'],
    TYPE: WEAPON_TYPES.STAFF,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Seeding How', 'Mowing How', 'Harvest How'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.EARTH,
  },
  {
    NAMES: ['Denta', 'Big Denta', 'Kamui'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Tower', 'Death', 'Judgment'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Dagger', "Assassin's Dagger", 'Silver Dagger'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Throwing Knife', 'Laser Knife', 'Slash Knife'],
    TYPE: WEAPON_TYPES.DARTS,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ["Pilgrim's Staff", "Conjurer's Staff", "Exorcist's Staff"],
    TYPE: WEAPON_TYPES.STAFF,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Wolf', 'Tiger', 'Dragon'], TYPE: WEAPON_TYPES.CLAWS, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Wrench', 'Iron Wrench', 'Killer Wrench'],
    TYPE: WEAPON_TYPES.ROD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Saw', 'Long Saw', 'Giant Saw'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Rod', 'Earth Rod', 'Gaia Rod'], TYPE: WEAPON_TYPES.ROD, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Milk Pan', 'Frying Pan', 'Ceramic Pan'],
    TYPE: WEAPON_TYPES.AXE,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Pan', 'Pot', 'Wok'], TYPE: WEAPON_TYPES.AXE, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Wooden Hammer', 'Stone Hammer', 'Rock Hammer'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Carbon Hammer', 'Chrome Hammer', 'Tin Hammer'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Brass Hammer', 'Bronze Hammer', 'Copper Hammer'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Silver Hammer', 'Gold Hammer', 'Platinum Hammer'],
    TYPE: WEAPON_TYPES.SPEAR,
    ELEMENT: ELEMENTS.NONE,
  },
  { NAMES: ['Wind', 'Storm', 'Tornado'], TYPE: WEAPON_TYPES.DARTS, ELEMENT: ELEMENTS.NONE },
  {
    NAMES: ['Crimson', 'Death Crimson', 'King Crimson'],
    TYPE: WEAPON_TYPES.TWO_HANDED_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Comet Rod', 'Meteor Rod', 'Cosmo Rod'],
    TYPE: WEAPON_TYPES.ROD,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Steel Bow', 'Copper Bow', 'Gold Bow'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.WIND,
  },
  {
    NAMES: ['Steel Bow', 'Copper Bow', 'Gold Bow'],
    TYPE: WEAPON_TYPES.BOW,
    ELEMENT: ELEMENTS.NONE,
  },
  {
    NAMES: ['Star Dragon Sword', 'Black Dragon Sword', 'King Dragon Sword'],
    TYPE: WEAPON_TYPES.TALKING_SWORD,
    ELEMENT: ELEMENTS.NONE,
  },
];

export class Weapon {
  /**
   * @param {WeaponEntry} weapon
   * @param {number} [lvl]
   */
  constructor(weapon, lvl = 1) {
    this.wpn = weapon;
    this.lvl = lvl;
    return this;
  }

  updateLvl(lvl = 1) {
    this.lvl = lvl;
    return this.sanitize();
  }

  sanitize() {
    if (this.lvl > 16) this.lvl = 16;
    if (this.lvl < 1) this.lvl = 1;
    return this;
  }

  sharpen(amount = 1) {
    this.lvl += amount;
    return this.sanitize();
  }

  getATK() {
    return this.wpn.TYPE.ATK[this.lvl - 1];
  }
}
