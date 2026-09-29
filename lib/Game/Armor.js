/**
 * @typedef {Object} ArmorSources
 * @property {string[]} shop
 * @property {string[]} treasure
 * @property {string[]} loot
 */

/**
 * @typedef {Object} ArmorStats
 * @property {number} DEF
 * @property {number} [PWR]
 * @property {number} [SKL]
 * @property {number} [SPD]
 * @property {number} [MGC]
 * @property {number} [LUK]
 */

/**
 * @typedef {Object} ArmorPiece
 * @property {string} name
 * @property {ArmorType} type
 * @property {ArmorStats} stats
 * @property {WearClass[]} wear
 * @property {string[]} description
 * @property {ArmorSources} sources
 */

/** @typedef {typeof ARMOR_TYPES[keyof typeof ARMOR_TYPES]} ArmorType */
export const ARMOR_TYPES = /** @type {const} */ ({
  HEAD: 'Head',
  BODY: 'Body',
  SHIELD: 'Shield',
  ACCESSORY: 'Accessory',
});

/** @typedef {typeof WEAR_CLASSES[keyof typeof WEAR_CLASSES]} WearClass */
export const WEAR_CLASSES = /** @type {const} */ ({
  CAP: 'C',
  HELMET: 'E',
  LIGHT_ARMOR: 'L',
  HEAVY_ARMOR: 'H',
  VEST: 'V',
  ROBE: 'R',
  SHIELD: 'S',
  MALE: 'M',
  FEMALE: 'F',
  KOBOLD: 'K',
  NOBILITY: 'N',
});

/** @satisfies {Record<string, ArmorPiece>} */
export const ARMOR = {
  BANDANNA: {
    name: 'Bandanna',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 1 },
    wear: [WEAR_CLASSES.CAP],
    description: [],
    sources: {
      shop: ['Gregminster #1'],
      treasure: [],
      loot: ['Crow'],
    },
  },
  HEADBAND: {
    name: 'Headband',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.CAP, WEAR_CLASSES.HELMET],
    description: [],
    sources: {
      shop: ['Gregminster', 'Rockland', 'Lenankamp'],
      treasure: [],
      loot: [],
    },
  },
  POINTED_HAT: {
    name: 'Pointed hat',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 5 },
    wear: [WEAR_CLASSES.CAP],
    description: ['Prevents "Balloon"'],
    sources: {
      shop: ['Lenankamp', 'Kaku'],
      treasure: ['Toran Basement', "Dwarves' Vault"],
      loot: ['Red Soldier Ant', 'Soldier Ant', 'Robot Soldier (spear)'],
    },
  },
  HALF_HELMET: {
    name: 'Half helmet',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 9 },
    wear: [WEAR_CLASSES.CAP, WEAR_CLASSES.HELMET],
    description: [],
    sources: {
      shop: ['Dwarf Village', 'Antei', 'Kirov'],
      treasure: ['Soniere'],
      loot: ['Death Machine (spear)'],
    },
  },
  HEAD_GEAR: {
    name: 'Head gear',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 14 },
    wear: [WEAR_CLASSES.CAP],
    description: [],
    sources: {
      shop: ['Antei', "Warrior's Village"],
      treasure: ['Qlon Cave'],
      loot: ['Mad Ivy', 'Grizzly Bear'],
    },
  },
  FULL_HELMET: {
    name: 'Full helmet',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 20 },
    wear: [WEAR_CLASSES.HELMET],
    description: [],
    sources: {
      shop: ["Warrior's Village"],
      treasure: ["Neclord's Castle"],
      loot: ['Grave Master'],
    },
  },
  SILVER_HAT: {
    name: 'Silver hat',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 27 },
    wear: [WEAR_CLASSES.CAP, WEAR_CLASSES.HELMET],
    description: ['Auto-heal +5'],
    sources: {
      shop: ['Gregminster #2'],
      treasure: [],
      loot: ['Queen Ant'],
    },
  },
  HORNED_HELMET: {
    name: 'Horned helmet',
    type: ARMOR_TYPES.HEAD,
    stats: { DEF: 35 },
    wear: [WEAR_CLASSES.HELMET],
    description: [],
    sources: {
      shop: [],
      treasure: ['Gregminster Palace'],
      loot: ['Elite Soldier'],
    },
  },
  ROBE: {
    name: 'Robe',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 1 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST, WEAR_CLASSES.ROBE],
    description: [],
    sources: {
      shop: ['Gregminster #1'],
      treasure: [],
      loot: ['Holly Boy'],
    },
  },
  TUNIC: {
    name: 'Tunic',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST],
    description: [],
    sources: {
      shop: ['Gregminster #1', 'Rockland', 'Lenankamp'],
      treasure: [],
      loot: ['Bandit (green)'],
    },
  },
  LEATHER_COAT: {
    name: 'Leather coat',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 4 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.HEAVY_ARMOR, WEAR_CLASSES.VEST],
    description: [],
    sources: {
      shop: ['Gregminster #1', 'Rockland', 'Lenankamp', 'Kaku'],
      treasure: ["Magician's Island"],
      loot: [],
    },
  },
  BRASS_ARMOR: {
    name: 'Brass armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 5 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: ['Lenankamp', 'Kaku', 'Dwarf Village'],
      treasure: ["Grady's Mansion"],
      loot: ['Ghost Armor', 'Empire Soldier (sword #4)'],
    },
  },
  GUARD_ROBE: {
    name: 'Guard robe',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 7, MGC: 15 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST, WEAR_CLASSES.ROBE],
    description: [],
    sources: {
      shop: ['Kaku'],
      treasure: ["Dwarves' Trail"],
      loot: ['Kobold (mage)'],
    },
  },
  KARATE_UNIFORM: {
    name: 'Karate uniform',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 10 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: ["Dwarves' Trail"],
      loot: ['Slasher Rabbit', 'Dwarf'],
    },
  },
  LEATHER_ARMOR: {
    name: 'Leather armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 14 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: ['Kouan', 'Dwarf Village'],
      treasure: ["Lepant's House"],
      loot: ['Veteran Soldier (spear)'],
    },
  },
  HALF_ARMOR: {
    name: 'Half armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 18 },
    wear: [WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: ['Dwarf Village'],
      treasure: ['Panna Yakuta'],
      loot: ['Dragon'],
    },
  },
  MAGIC_ROBE: {
    name: 'Magic robe',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 22 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST, WEAR_CLASSES.ROBE],
    description: [],
    sources: {
      shop: ['Antei'],
      treasure: ["Dwarves' Vault", 'Scarleticia'],
      loot: ['Holly Fairy'],
    },
  },
  NINJA_SUIT: {
    name: 'Ninja suit',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 28, SPD: 5 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.VEST],
    description: [],
    sources: {
      shop: ['Antei', 'Kirov'],
      treasure: [],
      loot: ['Viperman'],
    },
  },
  DRAGON_ARMOR: {
    name: 'Dragon Armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 34 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: ["Warrior's Village", 'Kirov', 'Gregminster #2'],
      treasure: [],
      loot: ['Dagon'],
    },
  },
  MASTER_ROBE: {
    name: 'Master robe',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 37 },
    wear: [WEAR_CLASSES.VEST, WEAR_CLASSES.ROBE],
    description: ['Auto-heal +5'],
    sources: {
      shop: ['Gregminster #2'],
      treasure: ['Seek Valley'],
      loot: ['Sorcerer'],
    },
  },
  FULL_ARMOR: {
    name: 'Full armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 45 },
    wear: [WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: ["Warrior's Village"],
      treasure: [],
      loot: ['Clay Doll'],
    },
  },
  TAIKIOKU_WEAR: {
    name: 'Taikioku wear',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 48, SPD: 10 },
    wear: [WEAR_CLASSES.VEST],
    description: [],
    sources: {
      shop: [],
      treasure: ['Moravia'],
      loot: ['Rock Buster'],
    },
  },
  MASTER_GARB: {
    name: 'Master garb',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 55, SKL: 5 },
    wear: [WEAR_CLASSES.LIGHT_ARMOR, WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: [],
      treasure: ['Shasarazade'],
      loot: ['Earth Golem'],
    },
  },
  WINDSPUN_ARMOR: {
    name: 'Windspun armor',
    type: ARMOR_TYPES.BODY,
    stats: { DEF: 63, SPD: 20 },
    wear: [WEAR_CLASSES.HEAVY_ARMOR],
    description: [],
    sources: {
      shop: [],
      treasure: ['Gregminster Palace'],
      loot: ['Ekidonna'],
    },
  },
  WOODEN_SHIELD: {
    name: 'Wooden shield',
    type: ARMOR_TYPES.SHIELD,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.SHIELD],
    description: [],
    sources: {
      shop: ['Rockland', 'Kaku'],
      treasure: [],
      loot: ['Kobold (sword)'],
    },
  },
  STEEL_SHIELD: {
    name: 'Steel shield',
    type: ARMOR_TYPES.SHIELD,
    stats: { DEF: 13 },
    wear: [WEAR_CLASSES.SHIELD],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: ['Panna Yakuta'],
      loot: ['Death Machine (sword)'],
    },
  },
  CHAOS_SHIELD: {
    name: 'Chaos shield',
    type: ARMOR_TYPES.SHIELD,
    stats: { DEF: 27 },
    wear: [WEAR_CLASSES.SHIELD],
    description: [],
    sources: {
      shop: ['Kirov'],
      treasure: ['Shasarazade'],
      loot: ['Devil Shield'],
    },
  },
  EARTH_SHIELD: {
    name: 'Earth shield',
    type: ARMOR_TYPES.SHIELD,
    stats: { DEF: 45 },
    wear: [WEAR_CLASSES.SHIELD],
    description: [],
    sources: {
      shop: ['Gregminster #2'],
      treasure: [],
      loot: ['Magic Shield'],
    },
  },
  WOODEN_SHOES: {
    name: 'Wooden shoes',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 1 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Gregminster #1'],
      treasure: [],
      loot: ['Fur Fur'],
    },
  },
  LEGGINGS: {
    name: 'Leggings',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Rockland'],
      treasure: ['Mt. Seifu'],
      loot: [],
    },
  },
  GLOVES: {
    name: 'Gloves',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Rockland', 'Kaku'],
      treasure: ['Mt. Tigerwolf', 'Panna Yakuta'],
      loot: [],
    },
  },
  CAPE: {
    name: 'Cape',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 2 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Lenankamp', 'Kaku'],
      treasure: [],
      loot: [],
    },
  },
  CIRCLET: {
    name: 'Circlet',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 3 },
    wear: [WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Lenankamp'],
      treasure: ['Mt. Tigerwolf'],
      loot: [],
    },
  },
  BOOTS: {
    name: 'Boots',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 3 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: ['Mt. Seifu'],
      loot: [],
    },
  },
  GAUNTLET: {
    name: 'Gauntlet',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 4 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: ['Great Forest'],
      loot: [],
    },
  },
  SHOULDER_PADS: {
    name: 'Shoulder pads',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 4 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kaku'],
      treasure: ["Lepant's House"],
      loot: ['Bandit (yellow)'],
    },
  },
  BLUE_RIBBON: {
    name: 'Blue ribbon',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 6 },
    wear: [WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: ["Dwarves' Vault"],
      loot: ['Beast Commander'],
    },
  },
  NECKLACE: {
    name: 'Necklace',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 7 },
    wear: [WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Elves Village'],
      treasure: [],
      loot: ['Kobold (bow)'],
    },
  },
  EMBLEM: {
    name: 'Emblem',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 8, MGC: 10 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kouan'],
      treasure: [],
      loot: ['Veteran Soldier (bow)'],
    },
  },
  FUR_CAPE: {
    name: 'Fur cape',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 8 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Dwarf Village'],
      treasure: [],
      loot: ['Death Boar'],
    },
  },
  STAR_EARRINGS: {
    name: 'Star earrings',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 8 },
    wear: [WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: ['Auto-heal +5'],
    sources: {
      shop: [],
      treasure: [],
      loot: ['Hell Unicorn'],
    },
  },
  FEATHER: {
    name: 'Feather',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 9 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Elves Village'],
      treasure: ["Dwarves' Trail"],
      loot: ['Roc'],
    },
  },
  TOE_SHOES: {
    name: 'Toe shoes',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 9 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Antei'],
      treasure: ['Toran Basement'],
      loot: ['Holly Spirit'],
    },
  },
  SILVER_RING: {
    name: 'Silver ring',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 11 },
    wear: [WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kirov'],
      treasure: [],
      loot: ['Strong Arm'],
    },
  },
  SILVERLET: {
    name: 'Silverlet',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 11 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Kirov'],
      treasure: ['Qlon Cave'],
      loot: ['Shadow'],
    },
  },
  MANGOSH: {
    name: 'Mangosh',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 12, SKL: 20 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: ['Counter-rate up'],
    sources: {
      shop: [],
      treasure: [],
      loot: ['Devil Armor'],
    },
  },
  ROSE_BROOCH: {
    name: 'Rose brooch',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 13 },
    wear: [WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: ['Antei'],
      treasure: [],
      loot: ['Shadow', 'Shadow Man'],
    },
  },
  CAPE_OF_DARKNESS: {
    name: 'Cape of Darkness',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 13 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ["Warrior's Village", 'Gregminster #2'],
      treasure: ["Neclord's Castle"],
      loot: ['Ninja'],
    },
  },
  SPEED_RING: {
    name: 'Speed ring',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 13, SPD: 15 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: [],
      treasure: [],
      loot: ['Mirage'],
    },
  },
  WING_BOOTS: {
    name: 'Wing boots',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 14, SPD: 10 },
    wear: [WEAR_CLASSES.FEMALE],
    description: [],
    sources: {
      shop: ['Gregminster #1'],
      treasure: [],
      loot: ['Ninja'],
    },
  },
  POWER_RING: {
    name: 'Power ring',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 14, PWR: 20 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: [],
      treasure: ['Gregminster Palace'],
      loot: ['Colossus'],
    },
  },
  GUARD_RING: {
    name: 'Guard ring',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 15 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Antei', 'Gregminster #2'],
      treasure: ['Shasarazade'],
      loot: ['Grave Master'],
    },
  },
  POWER_GLOVES: {
    name: 'Power gloves',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 16, PWR: 15 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: [],
      treasure: ["Dragon's Den"],
      loot: ['Wyvern'],
    },
  },
  SILVER_NECKLACE: {
    name: 'Silver necklace',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 17 },
    wear: [WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: ['Kirov'],
      treasure: ['Soniere'],
      loot: ['Demon Hound'],
    },
  },
  GOLDLET: {
    name: 'Goldlet',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 18 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY],
    description: [],
    sources: {
      shop: [],
      treasure: ["Dragon's Den"],
      loot: ['Gigantes'],
    },
  },
  EARTH_BOOTS: {
    name: 'Earth boots',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 18 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: [],
      treasure: ["Neclord's Castle"],
      loot: ['Phantom'],
    },
  },
  CRIMSON_CAPE: {
    name: 'Crimson Cape',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 21 },
    wear: [WEAR_CLASSES.MALE, WEAR_CLASSES.FEMALE, WEAR_CLASSES.NOBILITY, WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: [],
      treasure: ['Qlon Cave'],
      loot: ['Ninja Master'],
    },
  },
  GOLD_NECKLACE: {
    name: 'Gold necklace',
    type: ARMOR_TYPES.ACCESSORY,
    stats: { DEF: 25 },
    wear: [WEAR_CLASSES.KOBOLD],
    description: [],
    sources: {
      shop: [],
      treasure: ['Seek Valley'],
      loot: ['Kerberos'],
    },
  },
};
