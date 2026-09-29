import { ARMOR } from './Armor.js';
import { RUNES } from './Magic/Runes.js';
import { ELEMENTS, ITEM_CATEGORY } from './Constants.js';
import { ITEM_KEYS } from './Keys.js';

/** @typedef {import('./Constants.js').Element} Element */
/** @typedef {import('./Magic/Runes.js').Rune} Rune */
/** @typedef {import('./Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('./Keys.js').ItemKey} ItemKey */

/** @typedef {import('./Constants.js').ItemCategory} ItemCategory */

/**
 * @typedef {Object} BaseItem
 * @property {number} id
 * @property {string} name
 * @property {boolean} [usableInBattle]
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.CONSUMABLE, quantity?: number}} ConsumableItem
 * `quantity` is the default bundle size this item is found/granted in (e.g. Medicine: 6).
 * Omitted means 1. Callers that need a different amount override it per instance.
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.KEY}} KeyItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.UNIQUE}} UniqueItem
 * One-of-a-kind functional items that don't fit CONSUMABLE (no quantity to spend) or plain
 * KEY (they have real in-battle/usable behavior, not just plot-flag presence).
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.EQUIPMENT, armor: ArmorPiece}} EquipmentItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.ANTIQUE, isAppraised?: boolean}} AntiqueItem
 * Omitted means unappraised. Overridden per instance once appraised.
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.COLLECTABLE}} CollectableItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.CRYSTAL, rune: Rune}} CrystalItem
 */

/**
 * @typedef {BaseItem & {category: typeof ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: Element, quantity?: number}} WeaponRunePieceItem
 */

/**
 * @typedef {ConsumableItem|KeyItem|EquipmentItem|AntiqueItem|CollectableItem|CrystalItem|WeaponRunePieceItem|UniqueItem} Item
 */

/** @satisfies {Record<ItemKey, Item>} */
export const ITEMS = {
  // 1-24: Head/Body armor
  [ITEM_KEYS.BANDANNA]: { id: 1, name: 'Bandanna', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BANDANNA },
  [ITEM_KEYS.HEADBAND]: { id: 2, name: 'Headband', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HEADBAND },
  [ITEM_KEYS.POINTED_HAT]: { id: 3, name: 'Pointed Hat', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POINTED_HAT },
  [ITEM_KEYS.HALF_HELMET]: { id: 4, name: 'Half Helmet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HALF_HELMET },
  [ITEM_KEYS.HEAD_GEAR]: { id: 5, name: 'Head Gear', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HEAD_GEAR },
  [ITEM_KEYS.FULL_HELMET]: { id: 6, name: 'Full Helmet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FULL_HELMET },
  [ITEM_KEYS.SILVER_HAT]: { id: 7, name: 'Silver Hat', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_HAT },
  [ITEM_KEYS.HORNED_HELMET]: { id: 8, name: 'Horned Helmet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HORNED_HELMET },
  [ITEM_KEYS.ROBE]: { id: 9, name: 'Robe', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.ROBE },
  [ITEM_KEYS.TUNIC]: { id: 10, name: 'Tunic', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TUNIC },
  [ITEM_KEYS.LEATHER_COAT]: { id: 11, name: 'Leather Coat', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEATHER_COAT },
  [ITEM_KEYS.BRASS_ARMOR]: { id: 12, name: 'Brass Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BRASS_ARMOR },
  [ITEM_KEYS.GUARD_ROBE]: { id: 13, name: 'Guard Robe', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GUARD_ROBE },
  [ITEM_KEYS.KARATE_UNIFORM]: { id: 14, name: 'Karate Uniform', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.KARATE_UNIFORM },
  [ITEM_KEYS.LEATHER_ARMOR]: { id: 15, name: 'Leather Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEATHER_ARMOR },
  [ITEM_KEYS.HALF_ARMOR]: { id: 16, name: 'Half Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.HALF_ARMOR },
  [ITEM_KEYS.MAGIC_ROBE]: { id: 17, name: 'Magic Robe', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MAGIC_ROBE },
  [ITEM_KEYS.NINJA_SUIT]: { id: 18, name: 'Ninja Suit', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.NINJA_SUIT },
  [ITEM_KEYS.DRAGON_ARMOR]: { id: 19, name: 'Dragon Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.DRAGON_ARMOR },
  [ITEM_KEYS.MASTER_ROBE]: { id: 20, name: 'Master Robe', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MASTER_ROBE },
  [ITEM_KEYS.FULL_ARMOR]: { id: 21, name: 'Full Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FULL_ARMOR },
  [ITEM_KEYS.TAIKIOKU_WEAR]: { id: 22, name: 'Taikioku Wear', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TAIKIOKU_WEAR },
  [ITEM_KEYS.MASTER_GARB]: { id: 23, name: 'Master Garb', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MASTER_GARB },
  [ITEM_KEYS.WINDSPUN_ARMOR]: { id: 24, name: 'Windspun Armor', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WINDSPUN_ARMOR },

  // 25-26: Consumables
  [ITEM_KEYS.MEDICINE]: { id: 25, name: 'Medicine', category: ITEM_CATEGORY.CONSUMABLE, quantity: 6, usableInBattle: true },
  [ITEM_KEYS.ANTITOXIN]: { id: 26, name: 'Antitoxin', category: ITEM_CATEGORY.CONSUMABLE, quantity: 4, usableInBattle: true },

  // 27-56: Accessory armor
  [ITEM_KEYS.WOODEN_SHOES]: { id: 27, name: 'Wooden Shoes', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WOODEN_SHOES },
  [ITEM_KEYS.BOOTS]: { id: 28, name: 'Boots', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BOOTS },
  [ITEM_KEYS.TOE_SHOES]: { id: 29, name: 'Toe Shoes', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.TOE_SHOES },
  [ITEM_KEYS.WING_BOOTS]: { id: 30, name: 'Wing Boots', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WING_BOOTS },
  [ITEM_KEYS.EARTH_BOOTS]: { id: 31, name: 'Earth Boots', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EARTH_BOOTS },
  [ITEM_KEYS.GLOVES]: { id: 32, name: 'Gloves', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GLOVES },
  [ITEM_KEYS.GAUNTLET]: { id: 33, name: 'Gauntlet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GAUNTLET },
  [ITEM_KEYS.SILVERLET]: { id: 34, name: 'Silverlet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVERLET },
  [ITEM_KEYS.GOLDLET]: { id: 35, name: 'Goldlet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GOLDLET },
  [ITEM_KEYS.MANGOSH]: { id: 36, name: 'Mangosh', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.MANGOSH },
  [ITEM_KEYS.POWER_GLOVES]: { id: 37, name: 'Power Gloves', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POWER_GLOVES },
  [ITEM_KEYS.CAPE]: { id: 38, name: 'Cape', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CAPE },
  [ITEM_KEYS.FUR_CAPE]: { id: 39, name: 'Fur Cape', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FUR_CAPE },
  [ITEM_KEYS.CAPE_OF_DARKNESS]: { id: 40, name: 'Cape of Darkness', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CAPE_OF_DARKNESS },
  [ITEM_KEYS.CRIMSON_CAPE]: { id: 41, name: 'Crimson Cape', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CRIMSON_CAPE },
  [ITEM_KEYS.CIRCLET]: { id: 42, name: 'Circlet', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CIRCLET },
  [ITEM_KEYS.BLUE_RIBBON]: { id: 43, name: 'Blue Ribbon', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.BLUE_RIBBON },
  [ITEM_KEYS.FEATHER]: { id: 44, name: 'Feather', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.FEATHER },
  [ITEM_KEYS.SILVER_RING]: { id: 45, name: 'Silver Ring', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_RING },
  [ITEM_KEYS.LEGGINGS]: { id: 46, name: 'Leggings', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.LEGGINGS },
  [ITEM_KEYS.SHOULDER_PADS]: { id: 47, name: 'Shoulder Pads', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SHOULDER_PADS },
  [ITEM_KEYS.EMBLEM]: { id: 48, name: 'Emblem', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EMBLEM },
  [ITEM_KEYS.STAR_EARRINGS]: { id: 49, name: 'Star Earrings', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.STAR_EARRINGS },
  [ITEM_KEYS.ROSE_BROOCH]: { id: 50, name: 'Rose Brooch', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.ROSE_BROOCH },
  [ITEM_KEYS.GUARD_RING]: { id: 51, name: 'Guard Ring', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GUARD_RING },
  [ITEM_KEYS.SPEED_RING]: { id: 52, name: 'Speed Ring', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SPEED_RING },
  [ITEM_KEYS.POWER_RING]: { id: 53, name: 'Power Ring', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.POWER_RING },
  [ITEM_KEYS.NECKLACE]: { id: 54, name: 'Necklace', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.NECKLACE },
  [ITEM_KEYS.SILVER_NECKLACE]: { id: 55, name: 'Silver Necklace', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.SILVER_NECKLACE },
  [ITEM_KEYS.GOLD_NECKLACE]: { id: 56, name: 'Gold Necklace', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.GOLD_NECKLACE },

  // 57-61: Weapon rune pieces (socketed into a weapon to add elemental damage) — distinct
  // from crystals (which install a rune into a character's rune slot).
  [ITEM_KEYS.FIRE_RUNE_PIECE]: { id: 57, name: 'Fire Rune Piece', category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.FIRE },
  [ITEM_KEYS.WATER_RUNE_PIECE]: { id: 58, name: 'Water Rune Piece', category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.WATER },
  [ITEM_KEYS.WIND_RUNE_PIECE]: { id: 59, name: 'Wind Rune Piece', category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.WIND },
  // "Thunder" here refers to the Lightning element (ELEMENTS has no separate "Thunder" entry);
  // not to be confused with item #169 "Thunder crystal", which installs the RUNES.THUNDER command rune.
  [ITEM_KEYS.THUNDER_RUNE_PIECE]: { id: 60, name: 'Thunder Rune Piece', category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.LIGHTNING },
  [ITEM_KEYS.EARTH_RUNE_PIECE]: { id: 61, name: 'Earth Rune Piece', category: ITEM_CATEGORY.WEAPON_RUNE_PIECE, element: ELEMENTS.EARTH },

  // 62-66: Elemental crystals (install a rune into a character's rune slot)
  [ITEM_KEYS.FIRE_CRYSTAL]: { id: 62, name: 'Fire Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FIRE },
  [ITEM_KEYS.WATER_CRYSTAL]: { id: 63, name: 'Water Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.WATER },
  [ITEM_KEYS.WIND_CRYSTAL]: { id: 64, name: 'Wind Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.WIND },
  [ITEM_KEYS.LIGHTNING_CRYSTAL]: { id: 65, name: 'Lightning Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.LIGHTNING },
  [ITEM_KEYS.EARTH_CRYSTAL]: { id: 66, name: 'Earth Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.EARTH },

  // 67-70: Shields
  [ITEM_KEYS.WOODEN_SHIELD]: { id: 67, name: 'Wooden Shield', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.WOODEN_SHIELD },
  [ITEM_KEYS.STEEL_SHIELD]: { id: 68, name: 'Steel Shield', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.STEEL_SHIELD },
  [ITEM_KEYS.CHAOS_SHIELD]: { id: 69, name: 'Chaos Shield', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.CHAOS_SHIELD },
  [ITEM_KEYS.EARTH_SHIELD]: { id: 70, name: 'Earth Shield', category: ITEM_CATEGORY.EQUIPMENT, armor: ARMOR.EARTH_SHIELD },

  // 71-79: More consumables (including the 6 stat-boosting rune pieces, which level up an
  // already-installed rune rather than socketing a weapon or installing a new rune)
  [ITEM_KEYS.NEEDLE]: { id: 71, name: 'Needle', category: ITEM_CATEGORY.CONSUMABLE, quantity: 4, usableInBattle: true },
  [ITEM_KEYS.MEGA_MEDICINE]: { id: 72, name: 'Mega Medicine', category: ITEM_CATEGORY.CONSUMABLE, quantity: 3, usableInBattle: true },
  [ITEM_KEYS.ESCAPE_TALISMAN]: { id: 73, name: 'Escape Talisman', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.POWER_RUNE_PIECE]: { id: 74, name: 'Power Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.SKILL_RUNE_PIECE]: { id: 75, name: 'Skill Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.DEFENSE_RUNE_PIECE]: { id: 76, name: 'Defense Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.MAGIC_RUNE_PIECE]: { id: 77, name: 'Magic Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.SPEED_RUNE_PIECE]: { id: 78, name: 'Speed Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.FORTUNE_RUNE_PIECE]: { id: 79, name: 'Fortune Rune Piece', category: ITEM_CATEGORY.CONSUMABLE },

  // 80-90: Key items
  // UNIQUE, not KEY or CONSUMABLE: usable in battle with no quantity to spend, but it's a
  // functional item rather than a plot flag.
  [ITEM_KEYS.DRAGON_SEAL_INCENSE]: { id: 80, name: 'Dragon Seal Incense', category: ITEM_CATEGORY.UNIQUE, usableInBattle: true },
  [ITEM_KEYS.BLINKING_MIRROR]: { id: 81, name: 'Blinking Mirror', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.SUIKO_MAP]: { id: 82, name: 'Suiko Map', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.SACRIFICIAL_BUDDHA]: { id: 83, name: 'Sacrificial Buddha', category: ITEM_CATEGORY.CONSUMABLE },
  [ITEM_KEYS.ASTRAL_CONCLUSIONS]: { id: 84, name: 'Astral Conclusions', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.EARRINGS]: { id: 85, name: 'Earrings', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.RUNNING_WATER_ROOT]: { id: 86, name: 'Running Water Root', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.FAKE_ORDERS]: { id: 87, name: 'Fake Orders', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.FIRE_SPEAR]: { id: 88, name: 'Fire Spear', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.MOONLIGHT_GRASS]: { id: 89, name: 'Moonlight Grass', category: ITEM_CATEGORY.KEY },
  // "Mathiu's letter" appears twice (id 90 and 179) — two distinct letters, same display name.
  [ITEM_KEYS.MATHIUS_LETTER_1]: { id: 90, name: "Mathiu's Letter", category: ITEM_CATEGORY.KEY },

  // 91-105: HQ customization (sound/window settings, paint colors)
  [ITEM_KEYS.SOUND_SETTING_0]: { id: 91, name: 'Sound Setting 0', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_1]: { id: 92, name: 'Sound Setting 1', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_2]: { id: 93, name: 'Sound Setting 2', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOUND_SETTING_3]: { id: 94, name: 'Sound Setting 3', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_0]: { id: 95, name: 'Window Setting 0', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_1]: { id: 96, name: 'Window Setting 1', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_2]: { id: 97, name: 'Window Setting 2', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_SETTING_3]: { id: 98, name: 'Window Setting 3', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.RED_PAINT]: { id: 99, name: 'Red Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.BLUE_PAINT]: { id: 100, name: 'Blue Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.YELLOW_PAINT]: { id: 101, name: 'Yellow Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.GREEN_PAINT]: { id: 102, name: 'Green Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WHITE_PAINT]: { id: 103, name: 'White Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.BLACK_PAINT]: { id: 104, name: 'Black Paint', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.PINK_PAINT]: { id: 105, name: 'Pink Paint', category: ITEM_CATEGORY.COLLECTABLE },

  // 106-113: Old Book set
  [ITEM_KEYS.OLD_BOOK_VOL_1]: { id: 106, name: 'Old Book Vol. 1', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_2]: { id: 107, name: 'Old Book Vol. 2', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_3]: { id: 108, name: 'Old Book Vol. 3', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_4]: { id: 109, name: 'Old Book Vol. 4', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_5]: { id: 110, name: 'Old Book Vol. 5', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_6]: { id: 111, name: 'Old Book Vol. 6', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_7]: { id: 112, name: 'Old Book Vol. 7', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.OLD_BOOK_VOL_8]: { id: 113, name: 'Old Book Vol. 8', category: ITEM_CATEGORY.COLLECTABLE },

  // 114-134: Antiques (sold/appraised at the antique shop)
  [ITEM_KEYS.FAILURE_URN]: { id: 114, name: 'Failure Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.OCTOPUS_URN]: { id: 115, name: 'Octopus Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.VASE]: { id: 116, name: 'Vase', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.WIDE_URN]: { id: 117, name: 'Wide Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.PERSIAN_LAMP]: { id: 118, name: 'Persian Lamp', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.BLUE_DRAGON_URN]: { id: 119, name: 'Blue Dragon Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.CELADON_URN]: { id: 120, name: 'Celadon Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.BLACK_URN]: { id: 121, name: 'Black Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.FINE_BONE_CHINA]: { id: 122, name: 'Fine Bone China', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.HEX_DOLL]: { id: 123, name: 'Hex Doll', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.JAPANESE_DISH]: { id: 124, name: 'Japanese Dish', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.CHINESE_DISH]: { id: 125, name: 'Chinese Dish', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.PEEING_BOY]: { id: 126, name: 'Peeing Boy', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.BONSAI]: { id: 127, name: 'Bonsai', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.KNIGHT_STATUE]: { id: 128, name: 'Knight Statue', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.GODDESS_STATUE]: { id: 129, name: 'Goddess Statue', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.GRAFFITI]: { id: 130, name: 'Graffiti', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.FLOWER_PAINTING]: { id: 131, name: 'Flower Painting', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.LOVERS_GARDEN]: { id: 132, name: "Lover's Garden", category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.LANDSCAPE_PAINTING]: { id: 133, name: 'Landscape Painting', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.BEAUTIES_OF_NATURE]: { id: 134, name: 'Beauties of Nature', category: ITEM_CATEGORY.ANTIQUE },

  // 135-153: Passive/command rune crystals
  [ITEM_KEYS.BOAR_CRYSTAL]: { id: 135, name: 'Boar Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.BOAR },
  [ITEM_KEYS.SHRIKE_CRYSTAL]: { id: 136, name: 'Shrike Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SHRIKE },
  [ITEM_KEYS.FALCON_CRYSTAL]: { id: 137, name: 'Falcon Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FALCON },
  // "Flame crystal" is this translation's name for the Hate rune — confirmed accurate to the
  // game, not a mismatch with Runes.js.
  [ITEM_KEYS.FLAME_CRYSTAL]: { id: 138, name: 'Flame Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HATE },
  [ITEM_KEYS.TRICK_CRYSTAL]: { id: 139, name: 'Trick Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.TRICK },
  [ITEM_KEYS.CLONE_CRYSTAL]: { id: 140, name: 'Clone Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CLONE },
  [ITEM_KEYS.DOUBLE_BEAT_CRYSTAL]: { id: 141, name: 'Double-beat Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.DOUBLE_BEAT },
  [ITEM_KEYS.KILLER_CRYSTAL]: { id: 142, name: 'Killer Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.KILLER },
  [ITEM_KEYS.COUNTER_CRYSTAL]: { id: 143, name: 'Counter Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.COUNTER },
  [ITEM_KEYS.SPARK_CRYSTAL]: { id: 144, name: 'Spark Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SPARK },
  [ITEM_KEYS.HAZY_CRYSTAL]: { id: 145, name: 'Hazy Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HAZY },
  [ITEM_KEYS.GALE_CRYSTAL]: { id: 146, name: 'Gale Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.GALE },
  [ITEM_KEYS.SUNBEAM_CRYSTAL]: { id: 147, name: 'Sunbeam Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.SUNBEAM },
  [ITEM_KEYS.HOLY_RUNE]: { id: 148, name: 'Holy Rune', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.HOLY },
  [ITEM_KEYS.FORTUNE_CRYSTAL]: { id: 149, name: 'Fortune Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FORTUNE },
  [ITEM_KEYS.PROSPERITY_CRYSTAL]: { id: 150, name: 'Prosperity Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.PROSPERITY },
  [ITEM_KEYS.CHAMPIONS_CRYSTAL]: { id: 151, name: "Champion's Crystal", category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CHAMPIONS },
  [ITEM_KEYS.TURTLE_CRYSTAL]: { id: 152, name: 'Turtle Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.TURTLE },
  [ITEM_KEYS.PHERO_CRYSTAL]: { id: 153, name: 'Phero Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.PHERO },

  // 154-155: More antiques
  [ITEM_KEYS.NAMELESS_URN]: { id: 154, name: 'Nameless Urn', category: ITEM_CATEGORY.ANTIQUE },
  [ITEM_KEYS.OPAL]: { id: 155, name: 'Opal', category: ITEM_CATEGORY.ANTIQUE },

  // 156-163: Sidequest ingredients / HQ garden
  [ITEM_KEYS.SOAP]: { id: 156, name: 'Soap', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SOY_SAUCE]: { id: 157, name: 'Soy Sauce', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SALT]: { id: 158, name: 'Salt', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.YARDSTICK]: { id: 159, name: 'Yardstick', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.SUGAR]: { id: 160, name: 'Sugar', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.RED_FLOWER_SEEDS]: { id: 161, name: 'Red Flower Seeds', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.BLUE_FLOWER_SEEDS]: { id: 162, name: 'Blue Flower Seeds', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.YELLOW_FLOWER_SEEDS]: { id: 163, name: 'Yellow Flower Seeds', category: ITEM_CATEGORY.COLLECTABLE },

  // 164-169: More elemental/command rune crystals
  [ITEM_KEYS.RESURRECTION_CRYSTAL]: { id: 164, name: 'Resurrection Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.RESURRECTION },
  [ITEM_KEYS.RAGE_CRYSTAL]: { id: 165, name: 'Rage Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.RAGE },
  [ITEM_KEYS.FLOWING_CRYSTAL]: { id: 166, name: 'Flowing Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.FLOWING },
  [ITEM_KEYS.CYCLONE_CRYSTAL]: { id: 167, name: 'Cyclone Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.CYCLONE },
  [ITEM_KEYS.MOTHER_EARTH_CRYSTAL]: { id: 168, name: 'Mother Earth Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.MOTHER_EARTH },
  [ITEM_KEYS.THUNDER_CRYSTAL]: { id: 169, name: 'Thunder Crystal', category: ITEM_CATEGORY.CRYSTAL, rune: RUNES.THUNDER },

  // 170: Unverified — not antique-shop related; exact behavior unknown.
  [ITEM_KEYS.JUNK]: { id: 170, name: 'Junk', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.SOUND_CRYSTAL]: { id: 171, name: 'Sound Crystal', category: ITEM_CATEGORY.COLLECTABLE },
  [ITEM_KEYS.WINDOW_CRYSTAL]: { id: 172, name: 'Window Crystal', category: ITEM_CATEGORY.COLLECTABLE },

  // 173-179: Key items
  [ITEM_KEYS.WAR_SCROLL]: { id: 173, name: 'War Scroll', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.BINOCULARS]: { id: 174, name: 'Binoculars', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.KIRINJI]: { id: 175, name: 'Kirinji', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.PRODIGY]: { id: 176, name: 'Prodigy', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.BLUEPRINT]: { id: 177, name: 'Blueprint', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.COPPER_AXE]: { id: 178, name: 'Copper Axe', category: ITEM_CATEGORY.KEY },
  [ITEM_KEYS.MATHIUS_LETTER_2]: { id: 179, name: "Mathiu's Letter", category: ITEM_CATEGORY.KEY },
};
