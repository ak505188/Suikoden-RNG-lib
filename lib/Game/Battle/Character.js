import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js';
import { RUNES } from '../Magic/Runes.js';
import {
  ARMOR_SLOT,
  COMBATANT_SIDE,
  ELEMENTAL_RESISTANCES,
  ELEMENTS,
  ITEM_CATEGORY,
  RANGE,
  STATS,
  STATUS,
  WEAPON_ELEMENTS,
} from '../Constants.js';
import { ATTACK_RESULT, ROLL_KINDS, DEFAULT_ACTION } from './Actions.js';
import Combatant from './Combatant.js';
import RNG from '../../rng.js';
import { calcMagicElementModifier, cDiv, clamp, pushKeyInt } from '../../lib.js';
import { calculateLevelupGrowth, getGrowthValue, LEVEL_UP_STAT_ORDER } from '../Growths.js';
import CHARACTERS from '../Characters.js';
import { CHARACTER_ATTACK_TIMINGS } from './CharacterAttackTimings.js';
import { Inventory } from '../Inventory.js';
import { ITEMS } from '../Items.js';
import { EXP_PER_LEVEL } from '../Experience.js';

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/** @typedef {import('../Characters.js').CharacterData} CharacterData */
/** @typedef {import('../Keys.js').CharacterKey} CharacterKey */
/** @typedef {import('../Keys.js').ItemKey} ItemKey */
/** @typedef {import('../Keys.js').RuneKey} RuneKey */
/** @typedef {import('../Inventory.js').InventoryEntry} InventoryEntry */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Actions.js').AttackRoll} AttackRoll */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Combatant.js').CombatantStatBlock} CombatantStatBlock */
/** @typedef {import('./Combatant.js').CombatantTurnParams} CombatantTurnParams */
/** @typedef {import('../Constants.js').WeaponElement} WeaponElement */

/** @typedef {import('../Constants.js').ArmorSlot} ArmorSlot */
/** @typedef {import('../Constants.js').Stat} Stat */
/** @typedef {Record<Stat, number>} StatGrowths - stat gains from level-ups, one entry per stat */

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
 * One character in the HUD's exchange format (Suikoden-Bizhawk-HUD
 * docs/Character_JSON_Format.md). Ids are what import goes by; keys are for reading.
 * @typedef {Object} CharacterJSON
 * @property {CharacterKey} [key] - checked against `id` when given
 * @property {number} id - roster id, CHARACTERS[key].id
 * @property {number} LVL
 * @property {number} EXP
 * @property {Record<Stat, number>} stats - base stats; HP is max HP
 * @property {number} HP - current HP
 * @property {number[]} MP - current MP per spell level 1-4
 * @property {{ id: number, key?: RuneKey }} rune
 * @property {{ lvl: number, runePiece: { element: keyof typeof WEAPON_ELEMENTS, amount: number } }} weapon
 * @property {{ poison: boolean, balloon: number }} status
 * @property {InventoryEntryJSON[]} inventory - in slot order
 */

/**
 * @typedef {Object} InventoryEntryJSON
 * @property {ItemKey} [key] - ignored on import
 * @property {number} id - ITEMS[key].id
 * @property {ArmorSlot} [slot] - worn equipment only
 * @property {boolean} [locked]
 * @property {boolean} [appraised] - antiques only. Omitted means appraised, as in the HUD.
 * @property {number} [quantity] - omitted means the item's default
 */

/** @param {Record<string, { id: number }>} table @returns {Map<number, string>} */
const keysById = (table) => new Map(Object.entries(table).map(([key, { id }]) => [id, key]));
const CHARACTER_KEY_BY_ID = /** @type {Map<number, CharacterKey>} */ (keysById(CHARACTERS));
const RUNE_KEY_BY_ID = /** @type {Map<number, RuneKey>} */ (keysById(RUNES));
const ITEM_KEY_BY_ID = /** @type {Map<number, ItemKey>} */ (keysById(ITEMS));
const WEAPON_ELEMENT_KEYS = new Map(
  Object.entries(WEAPON_ELEMENTS).map(([key, element]) => [element, key]),
);
/** The JSON's stats, in its order */
const JSON_STATS = [STATS.HP, STATS.PWR, STATS.SKL, STATS.DEF, STATS.SPD, STATS.MGC, STATS.LUK];

/** @param {ItemKey} key */
const isAntique = (key) => ITEMS[key].category === ITEM_CATEGORY.ANTIQUE;

/** @param {ItemKey} key */
const defaultItemQuantity = (key) => {
  const item = ITEMS[key];
  return 'quantity' in item ? item.quantity : 1;
};

export default class Character extends Combatant {
  /** @param {CharacterKey} key */
  constructor(key) {
    /** @type {CharacterData} */
    const character = CHARACTERS[key];
    const { initial, growths } = character.stats;
    super(character.name, 1, { ...initial }); // levelUp adds into stats, so not the table's own
    this.key = key;
    this.rosterId = character.id; // the game's roster Id (classData[0]), e.g. for cover pairs
    this.gender = character.gender; // classData+10, for the Phero Rune's cover scan
    this.EXP = 0;

    this.range = character.range;
    this.weapon = new Weapon(WEAPONS[character.weapon.id], character.weapon.lvl);
    this.type = COMBATANT_SIDE.ALLY;

    this.initial = initial;
    this.growths = growths;

    this.rune = character.rune;
    this.isRuneLocked = character.isRuneLocked;
    this.wearClasses = character.wearClasses;
    this.counterEligible = character.counterEligible;

    this.inventory = new Inventory(character.inventory);

    this.action = null;

    this.init();

    return this;
  }

  init() {
    // Current HP & MP
    this.HP = this.stats.HP;
    this.maxMP = getMPFromMGC(this.stats.MGC);
    this.MP = [...this.maxMP];
  }

  clearTurnState() {
    super.clearTurnState();
    this.action = null;
  }

  /** Combatant.stateKeyInto plus MP and the inventory. @param {import('../../lib.js').KeyOut} out */
  stateKeyInto(out) {
    super.stateKeyInto(out);
    pushKeyInt(out, this.MP.length);
    for (const mp of this.MP) pushKeyInt(out, mp);
    this.inventory.stateKeyInto(out);
  }

  clone() {
    const copy = super.clone();
    copy.weapon = this.weapon.clone();
    copy.inventory = this.inventory.clone();
    // maxMP stays shared: it's only ever replaced (levelUp), never changed in place
    copy.MP = [...this.MP];
    copy.action = this.action && { ...this.action };
    return copy;
  }

  /**
   * FUN_800e2c90: also clears all statuses. Its death script sets and clears busy in the same
   * frame, so no extra busy time. A member holding a Sacrificial Buddha is revived instead (see
   * Battle.reviveWithBuddha).
   * @param {number} tick
   */
  die(tick) {
    super.die(tick);
    this.status = Character.createStatus();
  }

  clearInventory() {
    this.inventory.clear();
    return this;
  }

  /** @returns {CharacterArmorSlots} */
  get armor() {
    const equippedIn = (/** @type {ArmorSlot} */ slot) => this.inventory.armorIn(slot);

    return {
      head: equippedIn(ARMOR_SLOT.HEAD),
      body: equippedIn(ARMOR_SLOT.BODY),
      shield: equippedIn(ARMOR_SLOT.SHIELD),
      accessories: [equippedIn(ARMOR_SLOT.ACCESSORY_1), equippedIn(ARMOR_SLOT.ACCESSORY_2)],
    };
  }

  /** @returns {CharacterArmorLocked} */
  get isArmorLocked() {
    const lockedIn = (/** @type {ArmorSlot} */ slot) =>
      this.inventory.equippedIn(slot)?.locked ?? false;

    return {
      head: lockedIn(ARMOR_SLOT.HEAD),
      body: lockedIn(ARMOR_SLOT.BODY),
      shield: lockedIn(ARMOR_SLOT.SHIELD),
      accessories: [lockedIn(ARMOR_SLOT.ACCESSORY_1), lockedIn(ARMOR_SLOT.ACCESSORY_2)],
    };
  }

  /**
   * One stat's total bonus from worn armor. The stat getters below read it on every turn roll and
   * damage calc, so the inventory caches it (Inventory.armorBonus).
   * @param {Stat} stat
   * @returns {number}
   */
  armorStat(stat) {
    return this.inventory.armorBonus(stat);
  }

  get ATK() {
    return this.weapon.ATK + this.stats.PWR + this.armorStat(STATS.PWR);
  }

  get ARM() {
    const runePieceBonus =
      this.weapon.runePiece.element === WEAPON_ELEMENTS.EARTH
        ? this.weapon.runePiece.amount * 3
        : 0;
    return this.stats.DEF + this.armorStat(STATS.DEF) + runePieceBonus;
  }

  get MGC() {
    return this.stats.MGC + this.armorStat(STATS.MGC);
  }

  get SPD() {
    return this.stats.SPD + this.armorStat(STATS.SPD);
  }

  get SKL() {
    const runePieceBonus =
      this.weapon.runePiece.element === WEAPON_ELEMENTS.WIND ? this.weapon.runePiece.amount * 2 : 0;
    return this.stats.SKL + this.armorStat(STATS.SKL) + runePieceBonus;
  }

  get LUK() {
    return this.stats.LUK + this.armorStat(STATS.LUK);
  }

  get attackTiming() {
    return CHARACTER_ATTACK_TIMINGS[this.key];
  }

  /**
   * Damage roll -> the frame the target's busy bit 8 clears. A Fire/Lightning rune piece
   * replaces the character's own reaction script. The same against every target.
   * @param {Enemy} [_target]
   * @returns {number}
   */
  reactionFrames(_target) {
    return this.weapon.runePieceReaction ?? this.attackTiming.reaction;
  }

  getAction() {
    return this.action;
  }

  /** @param {Action} action */
  setAction(action = DEFAULT_ACTION) {
    this.action = action;
    return this;
  }

  /** @param {number} lvl */
  setLVL(lvl) {
    this.LVL = lvl;
    return this;
  }

  /** @param {number} exp */
  setEXP(exp) {
    this.EXP = exp;
    return this;
  }

  /**
   * Adds `exp` and levels up once per EXP_PER_LEVEL, keeping the remainder. Each level-up rolls
   * its stat growths from `rng` (7 advances per level).
   * @param {number} exp
   * @param {RNG} rng
   * @returns {{ levels: number, growths: StatGrowths | null }} levels gained and the stat gains they rolled
   */
  gainEXP(exp, rng = new RNG()) {
    const total = this.EXP + exp;
    const levels = Math.min(Math.floor(total / EXP_PER_LEVEL), 99 - this.LVL);
    this.EXP = total % EXP_PER_LEVEL;
    if (levels === 0) return { levels, growths: null };

    const growths = this.calculateLevelups(levels, this.LVL, rng);
    this.applyLevelups(growths, this.LVL + levels);
    return { levels, growths };
  }

  rest() {
    this.HP = this.stats.HP;
    this.MP = [...this.maxMP];
    return this;
  }

  /**
   * Spends one MP of a spell level.
   * @param {number} level - 0-3
   */
  spendMP(level) {
    if (!(this.MP[level] > 0)) throw new Error(`${this.name}: no level ${level + 1} MP left`);
    this.MP[level]--;
  }

  /** @param {Rune} rune */
  setRune(rune) {
    // TODO: Check validity
    this.rune = rune;
    return this;
  }

  /**
   * @param {number} levels
   * @param {number} startingLVL
   * @param {RNG} rng
   * @returns {StatGrowths}
   */
  calculateLevelups(levels = 1, startingLVL = this.LVL, rng = new RNG()) {
    if (startingLVL + levels > 99) {
      levels = 99 - startingLVL;
    }

    const statGrowths = {
      [STATS.PWR]: 0,
      [STATS.SKL]: 0,
      [STATS.DEF]: 0,
      [STATS.SPD]: 0,
      [STATS.MGC]: 0,
      [STATS.LUK]: 0,
      [STATS.HP]: 0,
    };

    for (let i = 0; i < levels; i++) {
      LEVEL_UP_STAT_ORDER.forEach((stat) => {
        rng.next();
        const growthValue = getGrowthValue(this.growths, stat, startingLVL + i + 1);
        statGrowths[stat] += calculateLevelupGrowth(rng.getRNG2(), growthValue, stat);
      });
    }
    return statGrowths;
  }

  /**
   * @param {number} levels
   * @param {number} startingLVL
   * @param {RNG} rng
   */
  levelUp(levels = 1, startingLVL = this.LVL, rng = new RNG()) {
    const statGrowths = this.calculateLevelups(levels, startingLVL, rng);
    return this.applyLevelups(statGrowths, Math.min(startingLVL + levels, 99));
  }

  /**
   * Adds rolled stat growths and sets the new level. HP goes up by the max HP gained.
   * @param {StatGrowths} statGrowths
   * @param {number} lvl
   */
  applyLevelups(statGrowths, lvl) {
    Object.entries(statGrowths).forEach(([stat, value]) => {
      this.stats[stat] = this.stats[stat] + value;
    });

    this.setLVL(lvl);
    this.HP += statGrowths.HP;
    this.maxMP = getMPFromMGC(this.stats.MGC);
    return this;
  }

  /**
   * @param {Enemy} target
   * @param {RNG} rng
   * @param {boolean} isCrit
   */
  calcAttackDamage(target, rng, isCrit) {
    const base = this.ATK - target.DEF;
    const withRand =
      base < 10
        ? base + 1 - (rng.next().getRNG2() % 4)
        : base + cDiv(cDiv(base, 2) - (rng.next().getRNG2() % base), 5);

    // Hitting enemy, no defend check needed.
    const element = this.weapon.element;
    const weakToElement = target.elements[element] === ELEMENTAL_RESISTANCES.WEAK;
    const withElement = weakToElement ? withRand + cDiv(withRand, 2) : withRand;

    const withRunePiece = this.weapon.applyRunePieceAmp(withElement);
    const damage = Math.max(withRunePiece, 1);
    return isCrit ? damage * 3 : damage;
  }

  /** @param {Spell} spell @param {Enemy} target */
  calcMagicDamage(spell, target) {
    const { power, element } = spell;
    if (power === 0) return 0;

    const baseDamage = power + Math.floor(this.MGC / 2);
    // Dark damage spells skip elemental modifier and always return base damage
    if (element === ELEMENTS.DARK) return baseDamage;

    const elements = Array.isArray(element) ? element : [element];
    const elementalModifier = calcMagicElementModifier(elements, target.elements);

    return elementalModifier === 0.5 ? cDiv(baseDamage, 2) : baseDamage * elementalModifier;
  }

  /** @param {CombatantStatBlock} stats */
  setStats(stats, reinit = true) {
    this.stats = { ...this.stats, ...stats };
    if (reinit) this.init();
    return this;
  }

  /** @param {Enemy} target @param {RNG} rng @param {AttackRoll[] | null} [rolls] - gets the roll, if given @returns {boolean} */
  rollHit(target, rng, rolls = null) {
    let hitChance = clamp(this.SKL - (target.SKL - 80), 60, 99);
    if (this.status[STATUS.BUCKET]) {
      hitChance = Math.floor(hitChance / 2);
    }

    const roll = rng.next().getRNG2() % 100;
    const halved = this.status[STATUS.BUCKET];
    rolls?.push({
      kind: ROLL_KINDS.HIT,
      roll,
      chance: hitChance,
      min: halved ? 30 : 60,
      max: halved ? 49 : 99,
      pass: roll < hitChance,
    });
    return roll < hitChance;
  }

  /** @param {RNG} rng @param {AttackRoll[] | null} [rolls] - gets the roll, if given @returns {boolean} */
  willCrit(rng, rolls = null) {
    let critChance = clamp(Math.floor((this.SKL + this.LUK) / 8), 3, 25);
    if (this.rune.id === RUNES.KILLER.id) critChance *= 2;
    const roll = rng.next().getRNG2() % 100;
    const killer = this.rune.id === RUNES.KILLER.id;
    rolls?.push({
      kind: ROLL_KINDS.CRIT,
      roll,
      chance: critChance,
      min: killer ? 6 : 3,
      max: killer ? 50 : 25,
      pass: roll < critChance,
    });
    return roll < critChance;
  }

  /** @param {Enemy} target @returns {boolean} True if enemy will counter */
  willGetCountered(target) {
    if (!target.speciesFlags.canCounter) return false;
    if (!this.counterEligible || this.range === RANGE.LONG) return false;
    return true;
  }

  /**
   * FUN_800eec20's weapon-reach rule, used by the Attack menu and Free Will (the attack executor
   * never checks it). Short range can't attack from the back row; Long reaches every row; Short
   * and Medium otherwise reach only the enemy front row.
   * @param {Enemy} enemy
   * @returns {boolean}
   */
  canReach(enemy) {
    if (!enemy.isValidCombatant) return false;
    if (this.range === RANGE.LONG) return true;
    if (this.range === RANGE.SHORT && this.position > 3) return false;
    return enemy.position < 4;
  }

  /**
   * @param {Enemy} target @param {RNG} rng
   * @param {AttackRoll[] | null} [rolls] - gets each roll made, in order, if given (for the log)
   * @returns ATTACK_RESULTS
   */
  calcAttackResult(target, rng, rolls = null) {
    const willMiss = target.speciesFlags.forceMissOnHit || !this.rollHit(target, rng, rolls);

    if (willMiss) {
      if (this.willGetCountered(target)) return ATTACK_RESULT.COUNTERED;
      if (target.speciesFlags.canBeMissed) return ATTACK_RESULT.MISSED;
    }

    return this.willCrit(rng, rolls) ? ATTACK_RESULT.CRIT : ATTACK_RESULT.HIT;
  }

  /** @param {number} lvl */
  setWeaponLvl(lvl) {
    this.weapon.setLvl(lvl);
    return this;
  }

  /**
   * This character in the HUD's exchange format. Not named toJSON, which would change what
   * JSON.stringify deep comparisons see.
   * @returns {CharacterJSON}
   */
  toCharacterJSON() {
    const { element, amount } = this.weapon.runePiece;
    return {
      key: this.key,
      id: this.rosterId,
      LVL: this.LVL,
      EXP: this.EXP,
      stats: /** @type {Record<Stat, number>} */ (
        Object.fromEntries(JSON_STATS.map((stat) => [stat, this.stats[stat]]))
      ),
      HP: this.HP,
      MP: [0, 1, 2, 3].map((level) => this.MP[level] ?? 0),
      rune: { key: RUNE_KEY_BY_ID.get(this.rune.id), id: this.rune.id },
      weapon: {
        lvl: this.weapon.lvl,
        runePiece: {
          element: /** @type {keyof typeof WEAPON_ELEMENTS} */ (WEAPON_ELEMENT_KEYS.get(element)),
          amount,
        },
      },
      status: { poison: this.status[STATUS.POISON], balloon: this.status[STATUS.BALLOON] },
      inventory: this.inventory.entries.map((entry) => {
        /** @type {InventoryEntryJSON} */
        const json = { key: entry.key, id: ITEMS[entry.key].id };
        if (entry.slot) json.slot = entry.slot;
        if (entry.locked) json.locked = true;
        // The HUD reads a missing appraised as true, so an antique always says
        if (isAntique(entry.key)) json.appraised = entry.appraised ?? false;
        else if (entry.appraised !== undefined) json.appraised = entry.appraised;
        if (entry.quantity !== defaultItemQuantity(entry.key)) json.quantity = entry.quantity;
        return json;
      }),
    };
  }

  /**
   * A character from the HUD's exchange format. Growths, weapon type and rune lock come from
   * CHARACTERS, as the format doesn't carry them.
   * @param {CharacterJSON} obj
   * @returns {Character}
   */
  static fromCharacterJSON(obj) {
    const key = CHARACTER_KEY_BY_ID.get(obj.id);
    if (key === undefined) throw new Error(`Character JSON: unknown character id ${obj.id}`);
    if (obj.key !== undefined && obj.key !== key) {
      throw new Error(`Character JSON: key ${obj.key} doesn't match id ${obj.id} (${key})`);
    }

    const character = new Character(key).setLVL(obj.LVL).setEXP(obj.EXP).setStats(obj.stats);
    // After setStats, whose init() refills them
    character.HP = obj.HP;
    character.MP = [...obj.MP];

    const runeKey = RUNE_KEY_BY_ID.get(obj.rune.id);
    if (runeKey === undefined) throw new Error(`Character JSON: unknown rune id ${obj.rune.id}`);
    character.setRune(RUNES[runeKey]);

    const { element, amount } = obj.weapon.runePiece;
    if (!Object.hasOwn(WEAPON_ELEMENTS, element))
      throw new Error(`Character JSON: unknown rune piece element ${element}`);
    character.setWeaponLvl(obj.weapon.lvl);
    character.weapon.setRunePiece(WEAPON_ELEMENTS[element], amount);

    character.status[STATUS.POISON] = obj.status.poison;
    character.status[STATUS.BALLOON] = obj.status.balloon;

    character.inventory = new Inventory(
      obj.inventory.map((item) => {
        const itemKey = ITEM_KEY_BY_ID.get(item.id);
        if (itemKey === undefined) throw new Error(`Character JSON: unknown item id ${item.id}`);
        if (item.slot !== undefined && !Object.hasOwn(ARMOR_SLOT, item.slot)) {
          throw new Error(`Character JSON: unknown armor slot ${item.slot}`);
        }
        /** @type {InventoryEntry} */
        const entry = { key: itemKey, quantity: item.quantity };
        if (item.slot !== undefined) entry.slot = item.slot;
        if (item.locked !== undefined) entry.locked = item.locked;
        if (item.appraised !== undefined) entry.appraised = item.appraised;
        else if (isAntique(itemKey)) entry.appraised = true;
        return entry;
      }),
    );

    return character;
  }
}

/**
 * A file's contents: an array of characters.
 * @param {Character[]} characters
 * @returns {CharacterJSON[]}
 */
export function exportCharacters(characters) {
  return characters.map((character) => character.toCharacterJSON());
}

/**
 * @param {CharacterJSON[]} characters - a file's contents
 * @returns {Character[]}
 */
export function importCharacters(characters) {
  return characters.map((obj) => Character.fromCharacterJSON(obj));
}
