import { ARMOR } from './Armor.js';
import { RUNES } from './Magic/Runes.js';
import { ANTIQUE_TYPES, ELEMENTS, ITEM_CATEGORY, STATS } from './Constants.js';
import { ITEM_KEYS } from './Keys.js';

/** @typedef {import('./Constants.js').Element} Element */
/** @typedef {import('./Constants.js').AntiqueType} AntiqueType */
/** @typedef {import('./Constants.js').Stat} Stat */
/** @typedef {import('./Magic/Runes.js').Rune} Rune */
/** @typedef {import('./Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('./Keys.js').ItemKey} ItemKey */

/** @typedef {import('./Constants.js').ItemCategory} ItemCategory */

/**
 * @typedef {Object} BaseItem
 * @property {number} id
 * @property {string} name
 * @property {number} price Shop price in bits (item def +0x18). Selling pays half.
 * @property {boolean} [usableInBattle]
 * @property {boolean} [usableInField]
 * @property {boolean} [consumable] Using it spends one use (the slot's quantity drops, and the
 *   item is removed at 0). Omitted means it's never used up. In memory a non-consumable slot
 *   holds quantity 0; a new consumable one holds `quantity` (default 1).
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.CONSUMABLE, quantity?: number}} ConsumableItem
 * `quantity` is how many uses a new item comes with (item def +0x1e, e.g. Medicine: 6).
 * Omitted means 1. Callers that need a different amount override it per instance.
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.KEY}} KeyItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.UNIQUE}} UniqueItem
 * One-of-a-kind functional items that don't fit CONSUMABLE (never used up) or plain KEY (they
 * have a real effect when used, not just plot-flag presence): Dragon seal incense (battle only),
 * Blinking Mirror (field only).
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.EQUIPMENT, armor: ArmorPiece}} EquipmentItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.ANTIQUE, antiqueType: AntiqueType}} AntiqueItem
 * Whether one has been appraised is per instance: InventoryEntry.appraised.
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.COLLECTABLE}} CollectableItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.MISC}} MiscItem
 * Non-unique items (you can hold copies) with miscellaneous, non-menu uses: trade/sidequest
 * goods like Salt and Soap, flower seeds.
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.CRYSTAL, rune: Rune}} CrystalItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: Element}} WeaponRunePieceItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.STAT_RUNE_PIECE, stat: Stat}} StatRunePieceItem
 * Single-use, doesn't stack: using one raises the target's `stat` by 1.
 */

/**
 * @typedef {ConsumableItem|KeyItem|EquipmentItem|AntiqueItem|CollectableItem|MiscItem|CrystalItem|WeaponRunePieceItem|StatRunePieceItem|UniqueItem} Item
 */

/** @satisfies {Record<ItemKey, Item>} */
export const ITEMS = {
  // 1-24: Head/Body armor
  [ITEM_KEYS.BANDANNA]: { id: 1, name: 'Bandanna', price: 50, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BANDANNA },
  [ITEM_KEYS.HEADBAND]: { id: 2, name: 'Headband', price: 300, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HEADBAND },
  [ITEM_KEYS.POINTED_HAT]: { id: 3, name: 'Pointed hat', price: 1200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POINTED_HAT },
  [ITEM_KEYS.HALF_HELMET]: { id: 4, name: 'Half helmet', price: 3300, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HALF_HELMET },
  [ITEM_KEYS.HEAD_GEAR]: { id: 5, name: 'Head gear', price: 6500, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HEAD_GEAR },
  [ITEM_KEYS.FULL_HELMET]: { id: 6, name: 'Full helmet', price: 13200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FULL_HELMET },
  [ITEM_KEYS.SILVER_HAT]: { id: 7, name: 'Silver hat', price: 27000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_HAT },
  [ITEM_KEYS.HORNED_HELMET]: { id: 8, name: 'Horned helmet', price: 43000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HORNED_HELMET },
  [ITEM_KEYS.ROBE]: { id: 9, name: 'Robe', price: 100, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.ROBE },
  [ITEM_KEYS.TUNIC]: { id: 10, name: 'Tunic', price: 200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TUNIC },
  [ITEM_KEYS.LEATHER_COAT]: { id: 11, name: 'Leather coat', price: 700, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEATHER_COAT },
  [ITEM_KEYS.BRASS_ARMOR]: { id: 12, name: 'Brass armor', price: 1000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BRASS_ARMOR },
  [ITEM_KEYS.GUARD_ROBE]: { id: 13, name: 'Guard robe', price: 1700, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GUARD_ROBE },
  [ITEM_KEYS.KARATE_UNIFORM]: { id: 14, name: 'Karate uniform', price: 3000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.KARATE_UNIFORM },
  [ITEM_KEYS.LEATHER_ARMOR]: { id: 15, name: 'Leather armor', price: 5900, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEATHER_ARMOR },
  [ITEM_KEYS.HALF_ARMOR]: { id: 16, name: 'Half armor', price: 8700, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HALF_ARMOR },
  [ITEM_KEYS.MAGIC_ROBE]: { id: 17, name: 'Magic robe', price: 15000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MAGIC_ROBE },
  [ITEM_KEYS.NINJA_SUIT]: { id: 18, name: 'Ninja suit', price: 22000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.NINJA_SUIT },
  [ITEM_KEYS.DRAGON_ARMOR]: { id: 19, name: 'Dragon Armor', price: 37000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.DRAGON_ARMOR },
  [ITEM_KEYS.MASTER_ROBE]: { id: 20, name: 'Master robe', price: 78000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MASTER_ROBE },
  [ITEM_KEYS.FULL_ARMOR]: { id: 21, name: 'Full armor', price: 57000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FULL_ARMOR },
  [ITEM_KEYS.TAIKIOKU_WEAR]: { id: 22, name: 'Taikioku wear', price: 80000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TAIKIOKU_WEAR },
  [ITEM_KEYS.MASTER_GARB]: { id: 23, name: 'Master garb', price: 93000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MASTER_GARB },
  [ITEM_KEYS.WINDSPUN_ARMOR]: { id: 24, name: 'Windspun armor', price: 120000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WINDSPUN_ARMOR },

  // 25-26: Consumables
  [ITEM_KEYS.MEDICINE]: { id: 25, name: 'Medicine', price: 100, category: ITEM_CATEGORY.CONSUMABLE, consumable: true, quantity: 6, usableInBattle: true, usableInField: true },
  [ITEM_KEYS.ANTITOXIN]: { id: 26, name: 'Antitoxin', price: 200, category: ITEM_CATEGORY.CONSUMABLE, consumable: true, quantity: 4, usableInBattle: true, usableInField: true },

  // 27-56: Accessory armor
  [ITEM_KEYS.WOODEN_SHOES]: { id: 27, name: 'Wooden shoes', price: 100, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WOODEN_SHOES },
  [ITEM_KEYS.BOOTS]: { id: 28, name: 'Boots', price: 800, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BOOTS },
  [ITEM_KEYS.TOE_SHOES]: { id: 29, name: 'Toe shoes', price: 2800, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TOE_SHOES },
  [ITEM_KEYS.WING_BOOTS]: { id: 30, name: 'Wing boots', price: 10200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WING_BOOTS },
  [ITEM_KEYS.EARTH_BOOTS]: { id: 31, name: 'Earth boots', price: 22000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EARTH_BOOTS },
  [ITEM_KEYS.GLOVES]: { id: 32, name: 'Gloves', price: 300, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GLOVES },
  [ITEM_KEYS.GAUNTLET]: { id: 33, name: 'Gauntlet', price: 1700, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GAUNTLET },
  [ITEM_KEYS.SILVERLET]: { id: 34, name: 'Silverlet', price: 7000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVERLET },
  [ITEM_KEYS.GOLDLET]: { id: 35, name: 'Goldlet', price: 19000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GOLDLET },
  [ITEM_KEYS.MANGOSH]: { id: 36, name: 'Mangosh', price: 21000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MANGOSH },
  [ITEM_KEYS.POWER_GLOVES]: { id: 37, name: 'Power gloves', price: 20000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POWER_GLOVES },
  [ITEM_KEYS.CAPE]: { id: 38, name: 'Cape', price: 400, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CAPE },
  [ITEM_KEYS.FUR_CAPE]: { id: 39, name: 'Fur cape', price: 2800, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FUR_CAPE },
  [ITEM_KEYS.CAPE_OF_DARKNESS]: { id: 40, name: 'Cape of Darkness', price: 8500, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CAPE_OF_DARKNESS },
  [ITEM_KEYS.CRIMSON_CAPE]: { id: 41, name: 'Crimson Cape', price: 32000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CRIMSON_CAPE },
  [ITEM_KEYS.CIRCLET]: { id: 42, name: 'Circlet', price: 600, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CIRCLET },
  [ITEM_KEYS.BLUE_RIBBON]: { id: 43, name: 'Blue ribbon', price: 1150, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BLUE_RIBBON },
  [ITEM_KEYS.FEATHER]: { id: 44, name: 'Feather', price: 4000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FEATHER },
  [ITEM_KEYS.SILVER_RING]: { id: 45, name: 'Silver ring', price: 5500, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_RING },
  [ITEM_KEYS.LEGGINGS]: { id: 46, name: 'Leggings', price: 200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEGGINGS },
  [ITEM_KEYS.SHOULDER_PADS]: { id: 47, name: 'Shoulder pads', price: 2000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SHOULDER_PADS },
  [ITEM_KEYS.EMBLEM]: { id: 48, name: 'Emblem', price: 2700, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EMBLEM },
  [ITEM_KEYS.STAR_EARRINGS]: { id: 49, name: 'Star earrings', price: 12000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.STAR_EARRINGS },
  [ITEM_KEYS.ROSE_BROOCH]: { id: 50, name: 'Rose brooch', price: 7000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.ROSE_BROOCH },
  [ITEM_KEYS.GUARD_RING]: { id: 51, name: 'Guard ring', price: 8500, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GUARD_RING },
  [ITEM_KEYS.SPEED_RING]: { id: 52, name: 'Speed ring', price: 13000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SPEED_RING },
  [ITEM_KEYS.POWER_RING]: { id: 53, name: 'Power ring', price: 14000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POWER_RING },
  [ITEM_KEYS.NECKLACE]: { id: 54, name: 'Necklace', price: 1200, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.NECKLACE },
  [ITEM_KEYS.SILVER_NECKLACE]: { id: 55, name: 'Silver necklace', price: 6000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_NECKLACE },
  [ITEM_KEYS.GOLD_NECKLACE]: { id: 56, name: 'Gold necklace', price: 17000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GOLD_NECKLACE },

  // 57-61: Weapon rune pieces (socketed into a weapon to add elemental damage) — distinct
  // from crystals (which install a rune into a character's rune slot).
  [ITEM_KEYS.FIRE_RUNE_PIECE]: { id: 57, name: 'Fire rune piece', price: 1000, category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.FIRE },
  [ITEM_KEYS.WATER_RUNE_PIECE]: { id: 58, name: 'Water rune piece', price: 1000, category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.WATER },
  [ITEM_KEYS.WIND_RUNE_PIECE]: { id: 59, name: 'Earth rune piece', price: 1000, category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.WIND },
  // "Thunder" here refers to the Lightning element (ELEMENTS has no separate "Thunder" entry);
  // not to be confused with item #169 "Thunder crystal", which installs the RUNES.THUNDER command rune.
  [ITEM_KEYS.THUNDER_RUNE_PIECE]: { id: 60, name: 'Thunder rune piece', price: 1000, category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.LIGHTNING },
  [ITEM_KEYS.EARTH_RUNE_PIECE]: { id: 61, name: 'Wind rune piece', price: 1000, category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.EARTH },

  // 62-66: Elemental crystals (install a rune into a character's rune slot)
  [ITEM_KEYS.FIRE_CRYSTAL]: { id: 62, name: 'Fire crystal', price: 7000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FIRE },
  [ITEM_KEYS.WATER_CRYSTAL]: { id: 63, name: 'Water crystal', price: 7000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.WATER },
  [ITEM_KEYS.WIND_CRYSTAL]: { id: 64, name: 'Wind crystal', price: 8000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.WIND },
  [ITEM_KEYS.LIGHTNING_CRYSTAL]: { id: 65, name: 'Lightning crystal', price: 8000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.LIGHTNING },
  [ITEM_KEYS.EARTH_CRYSTAL]: { id: 66, name: 'Earth crystal', price: 6000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.EARTH },

  // 67-70: Shields
  [ITEM_KEYS.WOODEN_SHIELD]: { id: 67, name: 'Wooden shield', price: 300, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WOODEN_SHIELD },
  [ITEM_KEYS.STEEL_SHIELD]: { id: 68, name: 'Steel shield', price: 7300, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.STEEL_SHIELD },
  [ITEM_KEYS.CHAOS_SHIELD]: { id: 69, name: 'Chaos shield', price: 32000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CHAOS_SHIELD },
  [ITEM_KEYS.EARTH_SHIELD]: { id: 70, name: 'Earth shield', price: 68000, category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EARTH_SHIELD },

  // 71-73: More consumables
  [ITEM_KEYS.NEEDLE]: { id: 71, name: 'Needle', price: 200, category: ITEM_CATEGORY.CONSUMABLE, consumable: true, quantity: 4, usableInBattle: true, usableInField: true },
  [ITEM_KEYS.MEGA_MEDICINE]: { id: 72, name: 'Mega medicine', price: 500, category: ITEM_CATEGORY.CONSUMABLE, consumable: true, quantity: 3, usableInBattle: true, usableInField: true },
  [ITEM_KEYS.ESCAPE_TALISMAN]: { id: 73, name: 'Escape talisman', price: 500, category: ITEM_CATEGORY.CONSUMABLE, consumable: true, usableInField: true },

  // 74-79: Stat rune pieces (use one on a character for +1 to that stat)
  [ITEM_KEYS.POWER_RUNE_PIECE]: { id: 74, name: 'Power rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.PWR, consumable: true, usableInField: true },
  [ITEM_KEYS.SKILL_RUNE_PIECE]: { id: 75, name: 'Skill rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.SKL, consumable: true, usableInField: true },
  [ITEM_KEYS.DEFENSE_RUNE_PIECE]: { id: 76, name: 'Defense rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.DEF, consumable: true, usableInField: true },
  [ITEM_KEYS.MAGIC_RUNE_PIECE]: { id: 77, name: 'Magic rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.MGC, consumable: true, usableInField: true },
  [ITEM_KEYS.SPEED_RUNE_PIECE]: { id: 78, name: 'Speed rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.SPD, consumable: true, usableInField: true },
  [ITEM_KEYS.FORTUNE_RUNE_PIECE]: { id: 79, name: 'Fortune rune piece', price: 3000, category: ITEM_CATEGORY.STAT_RUNE_PIECE, stat: STATS.LUK, consumable: true, usableInField: true },

  // 80-90: Key items
  // Dragon seal incense and Blinking Mirror are UNIQUE, not KEY or CONSUMABLE: never used up,
  // but functional items rather than plot flags.
  [ITEM_KEYS.DRAGON_SEAL_INCENSE]: { id: 80, name: 'Dragon seal incense', price: 0, category: ITEM_CATEGORY.UNIQUE, usableInBattle: true },
  [ITEM_KEYS.BLINKING_MIRROR]: { id: 81, name: 'Blinking Mirror', price: 0, category: ITEM_CATEGORY.UNIQUE, usableInField: true },
  [ITEM_KEYS.SUIKO_MAP]: { id: 82, name: 'Suiko Map', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.SACRIFICIAL_BUDDHA]: { id: 83, name: 'Sacrificial Buddha', price: 5000, category: ITEM_CATEGORY.CONSUMABLE, consumable: true },
  [ITEM_KEYS.ASTRAL_CONCLUSIONS]: { id: 84, name: 'Astral Conclusions', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.EARRINGS]: { id: 85, name: 'Earrings', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.RUNNING_WATER_ROOT]: { id: 86, name: 'Running Water Root', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.FAKE_ORDERS]: { id: 87, name: 'Fake orders', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.FIRE_SPEAR]: { id: 88, name: 'Fire Spear', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.MOONLIGHT_GRASS]: { id: 89, name: 'Moonlight grass', price: 0, category: ITEM_CATEGORY.KEY },
  // "Mathiu's letter" appears twice (id 90 and 179) — two distinct letters, same display name.
  [ITEM_KEYS.MATHIUS_LETTER_1]: { id: 90, name: "Mathiu's letter", price: 0, category: ITEM_CATEGORY.KEY },

  // 91-105: HQ customization (sound/window settings, paint colors)
  [ITEM_KEYS.SOUND_SETTING_0]: { id: 91, name: 'Sound setting 0', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_1]: { id: 92, name: 'Sound setting 1', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_2]: { id: 93, name: 'Sound setting 2', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_3]: { id: 94, name: 'Sound setting 3', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_0]: { id: 95, name: 'Window setting 0', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_1]: { id: 96, name: 'Window setting 1', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_2]: { id: 97, name: 'Window setting 2', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_3]: { id: 98, name: 'Window setting 3', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.RED_PAINT]: { id: 99, name: 'Red paint', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.BLUE_PAINT]: { id: 100, name: 'Blue paint', price: 500, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.YELLOW_PAINT]: { id: 101, name: 'Yellow paint', price: 500, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.GREEN_PAINT]: { id: 102, name: 'Green paint', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WHITE_PAINT]: { id: 103, name: 'White paint', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.BLACK_PAINT]: { id: 104, name: 'Black paint', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.PINK_PAINT]: { id: 105, name: 'Pink paint', price: 0, category: ITEM_CATEGORY.COLLECTABLE },

  // 106-113: Old Book set
  [ITEM_KEYS.OLD_BOOK_VOL_1]: { id: 106, name: 'Old Book Vol. 1', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_2]: { id: 107, name: 'Old Book Vol. 2', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_3]: { id: 108, name: 'Old Book Vol. 3', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_4]: { id: 109, name: 'Old Book Vol. 4', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_5]: { id: 110, name: 'Old Book Vol. 5', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_6]: { id: 111, name: 'Old Book Vol. 6', price: 97, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_7]: { id: 112, name: 'Old Book Vol. 7', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_8]: { id: 113, name: 'Old Book Vol. 8', price: 0, category: ITEM_CATEGORY.COLLECTABLE },

  // 114-134: Antiques (sold/appraised at the antique shop)
  [ITEM_KEYS.FAILURE_URN]: { id: 114, name: 'Failure urn', price: 20, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.OCTOPUS_URN]: { id: 115, name: 'Octopus urn', price: 1000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.VASE]: { id: 116, name: 'Vase', price: 5000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.WIDE_URN]: { id: 117, name: 'Wide urn', price: 8000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.PERSIAN_LAMP]: { id: 118, name: 'Persian lamp', price: 15000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.BLUE_DRAGON_URN]: { id: 119, name: 'Blue Dragon Urn', price: 16000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.CELADON_URN]: { id: 120, name: 'Celadon urn', price: 20000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.BLACK_URN]: { id: 121, name: 'Black urn', price: 40000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.FINE_BONE_CHINA]: { id: 122, name: 'Fine Bone China', price: 120000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.POT },
  [ITEM_KEYS.HEX_DOLL]: { id: 123, name: 'Hex doll', price: 120, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.JAPANESE_DISH]: { id: 124, name: 'Japanese dish', price: 6000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.CHINESE_DISH]: { id: 125, name: 'Chinese dish', price: 12000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.PEEING_BOY]: { id: 126, name: 'Peeing Boy', price: 32000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.BONSAI]: { id: 127, name: 'Bonsai', price: 50000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.KNIGHT_STATUE]: { id: 128, name: 'Knight statue', price: 60000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.GODDESS_STATUE]: { id: 129, name: 'Goddess statue', price: 200000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.ORNAMENT },
  [ITEM_KEYS.GRAFFITI]: { id: 130, name: 'Graffiti', price: 200, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },
  [ITEM_KEYS.FLOWER_PAINTING]: { id: 131, name: 'Flower painting', price: 14000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },
  [ITEM_KEYS.LOVERS_GARDEN]: { id: 132, name: "Lover's garden", price: 58000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },
  [ITEM_KEYS.LANDSCAPE_PAINTING]: { id: 133, name: 'Landscape painting', price: 80000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },
  [ITEM_KEYS.BEAUTIES_OF_NATURE]: { id: 134, name: 'Beauties of nature', price: 400000, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },

  // 135-153: Passive/command rune crystals
  [ITEM_KEYS.BOAR_CRYSTAL]: { id: 135, name: 'Boar crystal', price: 0, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.BOAR },
  [ITEM_KEYS.SHRIKE_CRYSTAL]: { id: 136, name: 'Shrike crystal', price: 0, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SHRIKE },
  [ITEM_KEYS.FALCON_CRYSTAL]: { id: 137, name: 'Falcon crystal', price: 0, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FALCON },
  // "Flame crystal" is this translation's name for the Hate rune — confirmed accurate to the
  // game, not a mismatch with Runes.js.
  [ITEM_KEYS.FLAME_CRYSTAL]: { id: 138, name: 'Flame crystal', price: 0, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HATE },
  [ITEM_KEYS.TRICK_CRYSTAL]: { id: 139, name: 'Trick crystal', price: 0, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.TRICK },
  [ITEM_KEYS.CLONE_CRYSTAL]: { id: 140, name: 'Clone crystal', price: 5000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CLONE },
  [ITEM_KEYS.DOUBLE_BEAT_CRYSTAL]: { id: 141, name: 'Double-beat crystal', price: 7000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.DOUBLE_BEAT },
  [ITEM_KEYS.KILLER_CRYSTAL]: { id: 142, name: 'Killer crystal', price: 8000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.KILLER },
  [ITEM_KEYS.COUNTER_CRYSTAL]: { id: 143, name: 'Counter crystal', price: 7500, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.COUNTER },
  [ITEM_KEYS.SPARK_CRYSTAL]: { id: 144, name: 'Spark crystal', price: 10000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SPARK },
  [ITEM_KEYS.HAZY_CRYSTAL]: { id: 145, name: 'Hazy crystal', price: 9000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HAZY },
  [ITEM_KEYS.GALE_CRYSTAL]: { id: 146, name: 'Gale crystal', price: 12000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.GALE },
  [ITEM_KEYS.SUNBEAM_CRYSTAL]: { id: 147, name: 'Sunbeam crystal', price: 20000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SUNBEAM },
  [ITEM_KEYS.HOLY_CRYSTAL]: { id: 148, name: 'Holy crystal', price: 5000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HOLY },
  [ITEM_KEYS.FORTUNE_CRYSTAL]: { id: 149, name: 'Fortune crystal', price: 50000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FORTUNE },
  [ITEM_KEYS.PROSPERITY_CRYSTAL]: { id: 150, name: 'Prosperity crystal', price: 100000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.PROSPERITY },
  [ITEM_KEYS.CHAMPIONS_CRYSTAL]: { id: 151, name: "Champion's crystal", price: 200000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CHAMPIONS },
  [ITEM_KEYS.TURTLE_CRYSTAL]: { id: 152, name: 'Turtle crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.TURTLE },
  [ITEM_KEYS.PHERO_CRYSTAL]: { id: 153, name: 'Phero crystal', price: 50000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.PHERO },

  // 154-163: Misc goods. Nameless Urn and Opal aren't antiques in-game (no antique flag, price 0).
  [ITEM_KEYS.NAMELESS_URN]: { id: 154, name: 'Nameless urn', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.OPAL]: { id: 155, name: 'Opal', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.SOAP]: { id: 156, name: 'Soap', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.SOY_SAUCE]: { id: 157, name: 'Soy sauce', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.SALT]: { id: 158, name: 'Salt', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.YARDSTICK]: { id: 159, name: 'Yardstick', price: 0, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.SUGAR]: { id: 160, name: 'Sugar', price: 100, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.RED_FLOWER_SEEDS]: { id: 161, name: 'Red flower seeds', price: 200, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.BLUE_FLOWER_SEEDS]: { id: 162, name: 'Blue flower seeds', price: 200, category: ITEM_CATEGORY.MISC },
  [ITEM_KEYS.YELLOW_FLOWER_SEEDS]: { id: 163, name: 'Yellow flower seeds', price: 200, category: ITEM_CATEGORY.MISC },

  // 164-169: More elemental/command rune crystals
  [ITEM_KEYS.RESURRECTION_CRYSTAL]: { id: 164, name: 'Resurrection crystal', price: 6000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.RESURRECTION },
  [ITEM_KEYS.RAGE_CRYSTAL]: { id: 165, name: 'Rage crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.RAGE },
  [ITEM_KEYS.FLOWING_CRYSTAL]: { id: 166, name: 'Flowing crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FLOWING },
  [ITEM_KEYS.CYCLONE_CRYSTAL]: { id: 167, name: 'Cyclone crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CYCLONE },
  [ITEM_KEYS.MOTHER_EARTH_CRYSTAL]: { id: 168, name: 'Mother earth crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.MOTHER_EARTH },
  [ITEM_KEYS.THUNDER_CRYSTAL]: { id: 169, name: 'Thunder crystal', price: 15000, category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.THUNDER },

  // 170: The game flags Junk as a painting-type antique (item def flags 0x4000).
  [ITEM_KEYS.JUNK]: { id: 170, name: 'Junk', price: 10, category: ITEM_CATEGORY.ANTIQUE, antiqueType: ANTIQUE_TYPES.PAINTING },
  [ITEM_KEYS.SOUND_CRYSTAL]: { id: 171, name: 'Sound crystal', price: 0, category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_CRYSTAL]: { id: 172, name: 'Window crystal', price: 0, category: ITEM_CATEGORY.COLLECTABLE },

  // 173-179: Key items
  [ITEM_KEYS.WAR_SCROLL]: { id: 173, name: 'War scroll', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.BINOCULARS]: { id: 174, name: 'Binoculars', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.KIRINJI]: { id: 175, name: 'Kirinji', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.PRODIGY]: { id: 176, name: 'Prodigy', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.BLUEPRINT]: { id: 177, name: 'Blueprint', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.COPPER_AXE]: { id: 178, name: 'Copper Axe', price: 0, category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.MATHIUS_LETTER_2]: { id: 179, name: "Mathiu's letter", price: 0, category: ITEM_CATEGORY.KEY },
};
