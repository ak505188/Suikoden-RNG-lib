import { ARMOR } from './Armor.js';
import { RUNES } from './Magic/Runes.js';

/** @typedef {import('./Constants.js').Element} Element */
/** @typedef {import('./Magic/Runes.js').Rune} Rune */
/** @typedef {import('./Armor.js').ArmorPiece} ArmorPiece */

/**
 * @typedef {'CONSUMABLE'|'KEY'|'EQUIPMENT'|'ANTIQUE'|'COLLECTABLE'|'CRYSTAL'|'WEAPON_RUNE_PIECE'|'UNIQUE'} ItemCategory
 */

/**
 * @typedef {Object} BaseItem
 * @property {number} id
 * @property {string} name
 * @property {boolean} [usableInBattle]
 */

/**
 * @typedef {BaseItem & {category: 'CONSUMABLE', quantity?: number}} ConsumableItem
 * `quantity` is the default bundle size this item is found/granted in (e.g. Medicine: 6).
 * Omitted means 1. Callers that need a different amount override it per instance.
 */

/**
 * @typedef {BaseItem & {category: 'KEY'}} KeyItem
 */

/**
 * @typedef {BaseItem & {category: 'UNIQUE'}} UniqueItem
 * One-of-a-kind functional items that don't fit CONSUMABLE (no quantity to spend) or plain
 * KEY (they have real in-battle/usable behavior, not just plot-flag presence).
 */

/**
 * @typedef {BaseItem & {category: 'EQUIPMENT', armor: ArmorPiece}} EquipmentItem
 */

/**
 * @typedef {BaseItem & {category: 'ANTIQUE', isAppraised?: boolean}} AntiqueItem
 * Omitted means unappraised. Overridden per instance once appraised.
 */

/**
 * @typedef {BaseItem & {category: 'COLLECTABLE'}} CollectableItem
 */

/**
 * @typedef {BaseItem & {category: 'CRYSTAL', rune: Rune}} CrystalItem
 */

/**
 * @typedef {BaseItem & {category: 'WEAPON_RUNE_PIECE', element: Element, quantity?: number}} WeaponRunePieceItem
 */

/**
 * @typedef {ConsumableItem|KeyItem|EquipmentItem|AntiqueItem|CollectableItem|CrystalItem|WeaponRunePieceItem|UniqueItem} Item
 */

/** @satisfies {Record<string, Item>} */
export const ITEMS = {
  // 1-24: Head/Body armor
  BANDANNA: { id: 1, name: 'Bandanna', category: 'EQUIPMENT', armor: ARMOR.BANDANNA },
  HEADBAND: { id: 2, name: 'Headband', category: 'EQUIPMENT', armor: ARMOR.HEADBAND },
  POINTED_HAT: { id: 3, name: 'Pointed Hat', category: 'EQUIPMENT', armor: ARMOR.POINTED_HAT },
  HALF_HELMET: { id: 4, name: 'Half Helmet', category: 'EQUIPMENT', armor: ARMOR.HALF_HELMET },
  HEAD_GEAR: { id: 5, name: 'Head Gear', category: 'EQUIPMENT', armor: ARMOR.HEAD_GEAR },
  FULL_HELMET: { id: 6, name: 'Full Helmet', category: 'EQUIPMENT', armor: ARMOR.FULL_HELMET },
  SILVER_HAT: { id: 7, name: 'Silver Hat', category: 'EQUIPMENT', armor: ARMOR.SILVER_HAT },
  HORNED_HELMET: { id: 8, name: 'Horned Helmet', category: 'EQUIPMENT', armor: ARMOR.HORNED_HELMET },
  ROBE: { id: 9, name: 'Robe', category: 'EQUIPMENT', armor: ARMOR.ROBE },
  TUNIC: { id: 10, name: 'Tunic', category: 'EQUIPMENT', armor: ARMOR.TUNIC },
  LEATHER_COAT: { id: 11, name: 'Leather Coat', category: 'EQUIPMENT', armor: ARMOR.LEATHER_COAT },
  BRASS_ARMOR: { id: 12, name: 'Brass Armor', category: 'EQUIPMENT', armor: ARMOR.BRASS_ARMOR },
  GUARD_ROBE: { id: 13, name: 'Guard Robe', category: 'EQUIPMENT', armor: ARMOR.GUARD_ROBE },
  KARATE_UNIFORM: { id: 14, name: 'Karate Uniform', category: 'EQUIPMENT', armor: ARMOR.KARATE_UNIFORM },
  LEATHER_ARMOR: { id: 15, name: 'Leather Armor', category: 'EQUIPMENT', armor: ARMOR.LEATHER_ARMOR },
  HALF_ARMOR: { id: 16, name: 'Half Armor', category: 'EQUIPMENT', armor: ARMOR.HALF_ARMOR },
  MAGIC_ROBE: { id: 17, name: 'Magic Robe', category: 'EQUIPMENT', armor: ARMOR.MAGIC_ROBE },
  NINJA_SUIT: { id: 18, name: 'Ninja Suit', category: 'EQUIPMENT', armor: ARMOR.NINJA_SUIT },
  DRAGON_ARMOR: { id: 19, name: 'Dragon Armor', category: 'EQUIPMENT', armor: ARMOR.DRAGON_ARMOR },
  MASTER_ROBE: { id: 20, name: 'Master Robe', category: 'EQUIPMENT', armor: ARMOR.MASTER_ROBE },
  FULL_ARMOR: { id: 21, name: 'Full Armor', category: 'EQUIPMENT', armor: ARMOR.FULL_ARMOR },
  TAIKIOKU_WEAR: { id: 22, name: 'Taikioku Wear', category: 'EQUIPMENT', armor: ARMOR.TAIKIOKU_WEAR },
  MASTER_GARB: { id: 23, name: 'Master Garb', category: 'EQUIPMENT', armor: ARMOR.MASTER_GARB },
  WINDSPUN_ARMOR: { id: 24, name: 'Windspun Armor', category: 'EQUIPMENT', armor: ARMOR.WINDSPUN_ARMOR },

  // 25-26: Consumables
  MEDICINE: { id: 25, name: 'Medicine', category: 'CONSUMABLE', quantity: 6, usableInBattle: true },
  ANTITOXIN: { id: 26, name: 'Antitoxin', category: 'CONSUMABLE', quantity: 4, usableInBattle: true },

  // 27-56: Accessory armor
  WOODEN_SHOES: { id: 27, name: 'Wooden Shoes', category: 'EQUIPMENT', armor: ARMOR.WOODEN_SHOES },
  BOOTS: { id: 28, name: 'Boots', category: 'EQUIPMENT', armor: ARMOR.BOOTS },
  TOE_SHOES: { id: 29, name: 'Toe Shoes', category: 'EQUIPMENT', armor: ARMOR.TOE_SHOES },
  WING_BOOTS: { id: 30, name: 'Wing Boots', category: 'EQUIPMENT', armor: ARMOR.WING_BOOTS },
  EARTH_BOOTS: { id: 31, name: 'Earth Boots', category: 'EQUIPMENT', armor: ARMOR.EARTH_BOOTS },
  GLOVES: { id: 32, name: 'Gloves', category: 'EQUIPMENT', armor: ARMOR.GLOVES },
  GAUNTLET: { id: 33, name: 'Gauntlet', category: 'EQUIPMENT', armor: ARMOR.GAUNTLET },
  SILVERLET: { id: 34, name: 'Silverlet', category: 'EQUIPMENT', armor: ARMOR.SILVERLET },
  GOLDLET: { id: 35, name: 'Goldlet', category: 'EQUIPMENT', armor: ARMOR.GOLDLET },
  MANGOSH: { id: 36, name: 'Mangosh', category: 'EQUIPMENT', armor: ARMOR.MANGOSH },
  POWER_GLOVES: { id: 37, name: 'Power Gloves', category: 'EQUIPMENT', armor: ARMOR.POWER_GLOVES },
  CAPE: { id: 38, name: 'Cape', category: 'EQUIPMENT', armor: ARMOR.CAPE },
  FUR_CAPE: { id: 39, name: 'Fur Cape', category: 'EQUIPMENT', armor: ARMOR.FUR_CAPE },
  CAPE_OF_DARKNESS: { id: 40, name: 'Cape of Darkness', category: 'EQUIPMENT', armor: ARMOR.CAPE_OF_DARKNESS },
  CRIMSON_CAPE: { id: 41, name: 'Crimson Cape', category: 'EQUIPMENT', armor: ARMOR.CRIMSON_CAPE },
  CIRCLET: { id: 42, name: 'Circlet', category: 'EQUIPMENT', armor: ARMOR.CIRCLET },
  BLUE_RIBBON: { id: 43, name: 'Blue Ribbon', category: 'EQUIPMENT', armor: ARMOR.BLUE_RIBBON },
  FEATHER: { id: 44, name: 'Feather', category: 'EQUIPMENT', armor: ARMOR.FEATHER },
  SILVER_RING: { id: 45, name: 'Silver Ring', category: 'EQUIPMENT', armor: ARMOR.SILVER_RING },
  LEGGINGS: { id: 46, name: 'Leggings', category: 'EQUIPMENT', armor: ARMOR.LEGGINGS },
  SHOULDER_PADS: { id: 47, name: 'Shoulder Pads', category: 'EQUIPMENT', armor: ARMOR.SHOULDER_PADS },
  EMBLEM: { id: 48, name: 'Emblem', category: 'EQUIPMENT', armor: ARMOR.EMBLEM },
  STAR_EARRINGS: { id: 49, name: 'Star Earrings', category: 'EQUIPMENT', armor: ARMOR.STAR_EARRINGS },
  ROSE_BROOCH: { id: 50, name: 'Rose Brooch', category: 'EQUIPMENT', armor: ARMOR.ROSE_BROOCH },
  GUARD_RING: { id: 51, name: 'Guard Ring', category: 'EQUIPMENT', armor: ARMOR.GUARD_RING },
  SPEED_RING: { id: 52, name: 'Speed Ring', category: 'EQUIPMENT', armor: ARMOR.SPEED_RING },
  POWER_RING: { id: 53, name: 'Power Ring', category: 'EQUIPMENT', armor: ARMOR.POWER_RING },
  NECKLACE: { id: 54, name: 'Necklace', category: 'EQUIPMENT', armor: ARMOR.NECKLACE },
  SILVER_NECKLACE: { id: 55, name: 'Silver Necklace', category: 'EQUIPMENT', armor: ARMOR.SILVER_NECKLACE },
  GOLD_NECKLACE: { id: 56, name: 'Gold Necklace', category: 'EQUIPMENT', armor: ARMOR.GOLD_NECKLACE },

  // 57-61: Weapon rune pieces (socketed into a weapon to add elemental damage) — distinct
  // from crystals (which install a rune into a character's rune slot).
  FIRE_RUNE_PIECE: { id: 57, name: 'Fire Rune Piece', category: 'WEAPON_RUNE_PIECE', element: 'Fire' },
  WATER_RUNE_PIECE: { id: 58, name: 'Water Rune Piece', category: 'WEAPON_RUNE_PIECE', element: 'Water' },
  WIND_RUNE_PIECE: { id: 59, name: 'Wind Rune Piece', category: 'WEAPON_RUNE_PIECE', element: 'Wind' },
  // "Thunder" here refers to the Lightning element (ELEMENTS has no separate "Thunder" entry);
  // not to be confused with item #169 "Thunder crystal", which installs the RUNES.THUNDER command rune.
  THUNDER_RUNE_PIECE: { id: 60, name: 'Thunder Rune Piece', category: 'WEAPON_RUNE_PIECE', element: 'Lightning' },
  EARTH_RUNE_PIECE: { id: 61, name: 'Earth Rune Piece', category: 'WEAPON_RUNE_PIECE', element: 'Earth' },

  // 62-66: Elemental crystals (install a rune into a character's rune slot)
  FIRE_CRYSTAL: { id: 62, name: 'Fire Crystal', category: 'CRYSTAL', rune: RUNES.FIRE },
  WATER_CRYSTAL: { id: 63, name: 'Water Crystal', category: 'CRYSTAL', rune: RUNES.WATER },
  WIND_CRYSTAL: { id: 64, name: 'Wind Crystal', category: 'CRYSTAL', rune: RUNES.WIND },
  LIGHTNING_CRYSTAL: { id: 65, name: 'Lightning Crystal', category: 'CRYSTAL', rune: RUNES.LIGHTNING },
  EARTH_CRYSTAL: { id: 66, name: 'Earth Crystal', category: 'CRYSTAL', rune: RUNES.EARTH },

  // 67-70: Shields
  WOODEN_SHIELD: { id: 67, name: 'Wooden Shield', category: 'EQUIPMENT', armor: ARMOR.WOODEN_SHIELD },
  STEEL_SHIELD: { id: 68, name: 'Steel Shield', category: 'EQUIPMENT', armor: ARMOR.STEEL_SHIELD },
  CHAOS_SHIELD: { id: 69, name: 'Chaos Shield', category: 'EQUIPMENT', armor: ARMOR.CHAOS_SHIELD },
  EARTH_SHIELD: { id: 70, name: 'Earth Shield', category: 'EQUIPMENT', armor: ARMOR.EARTH_SHIELD },

  // 71-79: More consumables (including the 6 stat-boosting rune pieces, which level up an
  // already-installed rune rather than socketing a weapon or installing a new rune)
  NEEDLE: { id: 71, name: 'Needle', category: 'CONSUMABLE', quantity: 4, usableInBattle: true },
  MEGA_MEDICINE: { id: 72, name: 'Mega Medicine', category: 'CONSUMABLE', quantity: 3, usableInBattle: true },
  ESCAPE_TALISMAN: { id: 73, name: 'Escape Talisman', category: 'CONSUMABLE' },
  POWER_RUNE_PIECE: { id: 74, name: 'Power Rune Piece', category: 'CONSUMABLE' },
  SKILL_RUNE_PIECE: { id: 75, name: 'Skill Rune Piece', category: 'CONSUMABLE' },
  DEFENSE_RUNE_PIECE: { id: 76, name: 'Defense Rune Piece', category: 'CONSUMABLE' },
  MAGIC_RUNE_PIECE: { id: 77, name: 'Magic Rune Piece', category: 'CONSUMABLE' },
  SPEED_RUNE_PIECE: { id: 78, name: 'Speed Rune Piece', category: 'CONSUMABLE' },
  FORTUNE_RUNE_PIECE: { id: 79, name: 'Fortune Rune Piece', category: 'CONSUMABLE' },

  // 80-90: Key items
  // UNIQUE, not KEY or CONSUMABLE: usable in battle with no quantity to spend, but it's a
  // functional item rather than a plot flag.
  DRAGON_SEAL_INCENSE: { id: 80, name: 'Dragon Seal Incense', category: 'UNIQUE', usableInBattle: true },
  BLINKING_MIRROR: { id: 81, name: 'Blinking Mirror', category: 'KEY' },
  SUIKO_MAP: { id: 82, name: 'Suiko Map', category: 'KEY' },
  SACRIFICIAL_BUDDHA: { id: 83, name: 'Sacrificial Buddha', category: 'CONSUMABLE' },
  ASTRAL_CONCLUSIONS: { id: 84, name: 'Astral Conclusions', category: 'KEY' },
  EARRINGS: { id: 85, name: 'Earrings', category: 'KEY' },
  RUNNING_WATER_ROOT: { id: 86, name: 'Running Water Root', category: 'KEY' },
  FAKE_ORDERS: { id: 87, name: 'Fake Orders', category: 'KEY' },
  FIRE_SPEAR: { id: 88, name: 'Fire Spear', category: 'KEY' },
  MOONLIGHT_GRASS: { id: 89, name: 'Moonlight Grass', category: 'KEY' },
  // "Mathiu's letter" appears twice (id 90 and 179) — two distinct letters, same display name.
  MATHIUS_LETTER_1: { id: 90, name: "Mathiu's Letter", category: 'KEY' },

  // 91-105: HQ customization (sound/window settings, paint colors)
  SOUND_SETTING_0: { id: 91, name: 'Sound Setting 0', category: 'COLLECTABLE' },
  SOUND_SETTING_1: { id: 92, name: 'Sound Setting 1', category: 'COLLECTABLE' },
  SOUND_SETTING_2: { id: 93, name: 'Sound Setting 2', category: 'COLLECTABLE' },
  SOUND_SETTING_3: { id: 94, name: 'Sound Setting 3', category: 'COLLECTABLE' },
  WINDOW_SETTING_0: { id: 95, name: 'Window Setting 0', category: 'COLLECTABLE' },
  WINDOW_SETTING_1: { id: 96, name: 'Window Setting 1', category: 'COLLECTABLE' },
  WINDOW_SETTING_2: { id: 97, name: 'Window Setting 2', category: 'COLLECTABLE' },
  WINDOW_SETTING_3: { id: 98, name: 'Window Setting 3', category: 'COLLECTABLE' },
  RED_PAINT: { id: 99, name: 'Red Paint', category: 'COLLECTABLE' },
  BLUE_PAINT: { id: 100, name: 'Blue Paint', category: 'COLLECTABLE' },
  YELLOW_PAINT: { id: 101, name: 'Yellow Paint', category: 'COLLECTABLE' },
  GREEN_PAINT: { id: 102, name: 'Green Paint', category: 'COLLECTABLE' },
  WHITE_PAINT: { id: 103, name: 'White Paint', category: 'COLLECTABLE' },
  BLACK_PAINT: { id: 104, name: 'Black Paint', category: 'COLLECTABLE' },
  PINK_PAINT: { id: 105, name: 'Pink Paint', category: 'COLLECTABLE' },

  // 106-113: Old Book set
  OLD_BOOK_VOL_1: { id: 106, name: 'Old Book Vol. 1', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_2: { id: 107, name: 'Old Book Vol. 2', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_3: { id: 108, name: 'Old Book Vol. 3', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_4: { id: 109, name: 'Old Book Vol. 4', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_5: { id: 110, name: 'Old Book Vol. 5', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_6: { id: 111, name: 'Old Book Vol. 6', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_7: { id: 112, name: 'Old Book Vol. 7', category: 'COLLECTABLE' },
  OLD_BOOK_VOL_8: { id: 113, name: 'Old Book Vol. 8', category: 'COLLECTABLE' },

  // 114-134: Antiques (sold/appraised at the antique shop)
  FAILURE_URN: { id: 114, name: 'Failure Urn', category: 'ANTIQUE' },
  OCTOPUS_URN: { id: 115, name: 'Octopus Urn', category: 'ANTIQUE' },
  VASE: { id: 116, name: 'Vase', category: 'ANTIQUE' },
  WIDE_URN: { id: 117, name: 'Wide Urn', category: 'ANTIQUE' },
  PERSIAN_LAMP: { id: 118, name: 'Persian Lamp', category: 'ANTIQUE' },
  BLUE_DRAGON_URN: { id: 119, name: 'Blue Dragon Urn', category: 'ANTIQUE' },
  CELADON_URN: { id: 120, name: 'Celadon Urn', category: 'ANTIQUE' },
  BLACK_URN: { id: 121, name: 'Black Urn', category: 'ANTIQUE' },
  FINE_BONE_CHINA: { id: 122, name: 'Fine Bone China', category: 'ANTIQUE' },
  HEX_DOLL: { id: 123, name: 'Hex Doll', category: 'ANTIQUE' },
  JAPANESE_DISH: { id: 124, name: 'Japanese Dish', category: 'ANTIQUE' },
  CHINESE_DISH: { id: 125, name: 'Chinese Dish', category: 'ANTIQUE' },
  PEEING_BOY: { id: 126, name: 'Peeing Boy', category: 'ANTIQUE' },
  BONSAI: { id: 127, name: 'Bonsai', category: 'ANTIQUE' },
  KNIGHT_STATUE: { id: 128, name: 'Knight Statue', category: 'ANTIQUE' },
  GODDESS_STATUE: { id: 129, name: 'Goddess Statue', category: 'ANTIQUE' },
  GRAFFITI: { id: 130, name: 'Graffiti', category: 'ANTIQUE' },
  FLOWER_PAINTING: { id: 131, name: 'Flower Painting', category: 'ANTIQUE' },
  LOVERS_GARDEN: { id: 132, name: "Lover's Garden", category: 'ANTIQUE' },
  LANDSCAPE_PAINTING: { id: 133, name: 'Landscape Painting', category: 'ANTIQUE' },
  BEAUTIES_OF_NATURE: { id: 134, name: 'Beauties of Nature', category: 'ANTIQUE' },

  // 135-153: Passive/command rune crystals
  BOAR_CRYSTAL: { id: 135, name: 'Boar Crystal', category: 'CRYSTAL', rune: RUNES.BOAR },
  SHRIKE_CRYSTAL: { id: 136, name: 'Shrike Crystal', category: 'CRYSTAL', rune: RUNES.SHRIKE },
  FALCON_CRYSTAL: { id: 137, name: 'Falcon Crystal', category: 'CRYSTAL', rune: RUNES.FALCON },
  // "Flame crystal" is this translation's name for the Hate rune — confirmed accurate to the
  // game, not a mismatch with Runes.js.
  FLAME_CRYSTAL: { id: 138, name: 'Flame Crystal', category: 'CRYSTAL', rune: RUNES.HATE },
  TRICK_CRYSTAL: { id: 139, name: 'Trick Crystal', category: 'CRYSTAL', rune: RUNES.TRICK },
  CLONE_CRYSTAL: { id: 140, name: 'Clone Crystal', category: 'CRYSTAL', rune: RUNES.CLONE },
  DOUBLE_BEAT_CRYSTAL: { id: 141, name: 'Double-beat Crystal', category: 'CRYSTAL', rune: RUNES.DOUBLE_BEAT },
  KILLER_CRYSTAL: { id: 142, name: 'Killer Crystal', category: 'CRYSTAL', rune: RUNES.KILLER },
  COUNTER_CRYSTAL: { id: 143, name: 'Counter Crystal', category: 'CRYSTAL', rune: RUNES.COUNTER },
  SPARK_CRYSTAL: { id: 144, name: 'Spark Crystal', category: 'CRYSTAL', rune: RUNES.SPARK },
  HAZY_CRYSTAL: { id: 145, name: 'Hazy Crystal', category: 'CRYSTAL', rune: RUNES.HAZY },
  GALE_CRYSTAL: { id: 146, name: 'Gale Crystal', category: 'CRYSTAL', rune: RUNES.GALE },
  SUNBEAM_CRYSTAL: { id: 147, name: 'Sunbeam Crystal', category: 'CRYSTAL', rune: RUNES.SUNBEAM },
  HOLY_RUNE: { id: 148, name: 'Holy Rune', category: 'CRYSTAL', rune: RUNES.HOLY },
  FORTUNE_CRYSTAL: { id: 149, name: 'Fortune Crystal', category: 'CRYSTAL', rune: RUNES.FORTUNE },
  PROSPERITY_CRYSTAL: { id: 150, name: 'Prosperity Crystal', category: 'CRYSTAL', rune: RUNES.PROSPERITY },
  CHAMPIONS_CRYSTAL: { id: 151, name: "Champion's Crystal", category: 'CRYSTAL', rune: RUNES.CHAMPIONS },
  TURTLE_CRYSTAL: { id: 152, name: 'Turtle Crystal', category: 'CRYSTAL', rune: RUNES.TURTLE },
  PHERO_CRYSTAL: { id: 153, name: 'Phero Crystal', category: 'CRYSTAL', rune: RUNES.PHERO },

  // 154-155: More antiques
  NAMELESS_URN: { id: 154, name: 'Nameless Urn', category: 'ANTIQUE' },
  OPAL: { id: 155, name: 'Opal', category: 'ANTIQUE' },

  // 156-163: Sidequest ingredients / HQ garden
  SOAP: { id: 156, name: 'Soap', category: 'COLLECTABLE' },
  SOY_SAUCE: { id: 157, name: 'Soy Sauce', category: 'COLLECTABLE' },
  SALT: { id: 158, name: 'Salt', category: 'COLLECTABLE' },
  YARDSTICK: { id: 159, name: 'Yardstick', category: 'COLLECTABLE' },
  SUGAR: { id: 160, name: 'Sugar', category: 'COLLECTABLE' },
  RED_FLOWER_SEEDS: { id: 161, name: 'Red Flower Seeds', category: 'COLLECTABLE' },
  BLUE_FLOWER_SEEDS: { id: 162, name: 'Blue Flower Seeds', category: 'COLLECTABLE' },
  YELLOW_FLOWER_SEEDS: { id: 163, name: 'Yellow Flower Seeds', category: 'COLLECTABLE' },

  // 164-169: More elemental/command rune crystals
  RESURRECTION_CRYSTAL: { id: 164, name: 'Resurrection Crystal', category: 'CRYSTAL', rune: RUNES.RESURRECTION },
  RAGE_CRYSTAL: { id: 165, name: 'Rage Crystal', category: 'CRYSTAL', rune: RUNES.RAGE },
  FLOWING_CRYSTAL: { id: 166, name: 'Flowing Crystal', category: 'CRYSTAL', rune: RUNES.FLOWING },
  CYCLONE_CRYSTAL: { id: 167, name: 'Cyclone Crystal', category: 'CRYSTAL', rune: RUNES.CYCLONE },
  MOTHER_EARTH_CRYSTAL: { id: 168, name: 'Mother Earth Crystal', category: 'CRYSTAL', rune: RUNES.MOTHER_EARTH },
  THUNDER_CRYSTAL: { id: 169, name: 'Thunder Crystal', category: 'CRYSTAL', rune: RUNES.THUNDER },

  // 170: Unverified — not antique-shop related; exact behavior unknown.
  JUNK: { id: 170, name: 'Junk', category: 'KEY' },
  SOUND_CRYSTAL: { id: 171, name: 'Sound Crystal', category: 'COLLECTABLE' },
  WINDOW_CRYSTAL: { id: 172, name: 'Window Crystal', category: 'COLLECTABLE' },

  // 173-179: Key items
  WAR_SCROLL: { id: 173, name: 'War Scroll', category: 'KEY' },
  BINOCULARS: { id: 174, name: 'Binoculars', category: 'KEY' },
  KIRINJI: { id: 175, name: 'Kirinji', category: 'KEY' },
  PRODIGY: { id: 176, name: 'Prodigy', category: 'KEY' },
  BLUEPRINT: { id: 177, name: 'Blueprint', category: 'KEY' },
  COPPER_AXE: { id: 178, name: 'Copper Axe', category: 'KEY' },
  MATHIUS_LETTER_2: { id: 179, name: "Mathiu's Letter", category: 'KEY' },
};
