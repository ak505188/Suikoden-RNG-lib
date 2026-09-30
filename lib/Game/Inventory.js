import { ITEMS } from './Items.js';
import { ARMOR_SLOT, ITEM_CATEGORY } from './Constants.js';
import { ITEM_KEYS } from './Keys.js';
import { pushKeyInt } from '../lib.js';

/** @typedef {import('./Items.js').Item} Item */
/** @typedef {import('./Keys.js').ItemKey} ItemKey */
/** @typedef {import('./Armor.js').ArmorPiece} ArmorPiece */

/** @typedef {import('./Constants.js').ArmorSlot} ArmorSlot */
/** @typedef {import('./Constants.js').Stat} Stat */

/** @type {readonly ArmorSlot[]} */
const ARMOR_SLOTS = Object.values(ARMOR_SLOT);

/** Each item key's index, for state keys */
const ITEM_INDEX = new Map(Object.values(ITEM_KEYS).map((key, i) => [key, i]));

/**
 * One inventory slot. Equipped armor takes up a slot like any other item.
 * @typedef {Object} InventoryEntry
 * @property {ItemKey} key
 * @property {number} [quantity] - Uses left. Omitted means the item's default bundle size
 *   (`ITEMS[key].quantity`), or 1.
 * @property {ArmorSlot} [slot] - Set when this armor piece is worn, naming the slot it's in.
 * @property {boolean} [locked] - True if it can't be unequipped/removed for this character.
 */

/**
 * A single character's items, up to the game's 9 slots. Slot order isn't modelled (it isn't
 * known to matter), and when a key sits in several slots, which one gets used doesn't matter.
 */
export class Inventory {
  static MAX_SLOTS = 9;

  /**
   * armorBonus per stat, until the entries change. Private, so comparisons and copies of the
   * inventory ignore it (it's a cache, not state). A change to the entries replaces it rather
   * than clearing it, so clones can share their parent's.
   * @type {Partial<Record<Stat, number>>}
   */
  #armorBonuses = {};

  /** @type {number[] | null} stateKeyInto's values, until the entries or a quantity change */
  #keyValues = null;

  /** The entries or a quantity changed: drop the caches (replaced, not cleared: clones may share them) */
  #changed() {
    this.#armorBonuses = {};
    this.#keyValues = null;
  }

  /** @param {InventoryEntry[]} entries - copied, so the source data is never mutated */
  constructor(entries = []) {
    if (entries.length > Inventory.MAX_SLOTS) {
      throw new Error(`Inventory holds at most ${Inventory.MAX_SLOTS} items, got ${entries.length}`);
    }
    /** @type {InventoryEntry[]} */
    this.entries = entries.map(entry => ({ ...entry, quantity: entry.quantity ?? defaultQuantity(entry.key) }));
  }

  /**
   * One stat's total bonus from worn armor (the piece equipped in each slot). Read on every turn
   * roll and damage calc, so it's cached until an item is added or a slot empties.
   * @param {Stat} stat
   * @returns {number}
   */
  armorBonus(stat) {
    let total = this.#armorBonuses[stat];
    if (total !== undefined) return total;
    total = 0;
    for (const slot of ARMOR_SLOTS) {
      const piece = this.armorIn(slot);
      if (piece) total += piece.stats[stat] ?? 0;
    }
    this.#armorBonuses[stat] = total;
    return total;
  }

  get isFull() {
    return this.entries.length >= Inventory.MAX_SLOTS;
  }

  /** @param {ItemKey} key @returns {InventoryEntry | undefined} */
  get(key) {
    return this.entries.find(entry => entry.key === key);
  }

  /** @param {ItemKey} key */
  has(key) {
    return this.get(key) !== undefined;
  }

  /** @param {ItemKey} key */
  canUseInBattle(key) {
    return this.has(key) && Boolean(/** @type {Item} */ (ITEMS[key]).usableInBattle);
  }

  /**
   * Adds `key` in a new slot.
   * @param {ItemKey} key
   * @param {number} [quantity]
   * @returns {boolean} false if every slot is taken
   */
  add(key, quantity = defaultQuantity(key)) {
    if (this.isFull) return false;
    this.entries.push({ key, quantity });
    this.#changed();
    return true;
  }

  /**
   * Uses `key` once. Consumables lose a use and their slot empties at 0; anything else stays.
   * @param {ItemKey} key
   */
  use(key) {
    const entry = this.get(key);
    if (!entry) throw new Error(`No ${key} in inventory`);
    /** @type Item */
    const item = ITEMS[key];
    if (!(item.consumable)) return;
    entry.quantity -= 1;
    if (entry.quantity <= 0) this.entries.splice(this.entries.indexOf(entry), 1);
    this.#changed();
  }

  /**
   * Removes the whole slot holding `key`, whatever its quantity.
   * @param {ItemKey} key
   */
  remove(key) {
    const entry = this.get(key);
    if (!entry) throw new Error(`No ${key} in inventory`);
    this.entries.splice(this.entries.indexOf(entry), 1);
    this.#changed();
  }

  /** @param {ArmorSlot} slot @returns {InventoryEntry | undefined} */
  equippedIn(slot) {
    return this.entries.find(entry => entry.slot === slot);
  }

  /** @param {ArmorSlot} slot @returns {ArmorPiece | null} */
  armorIn(slot) {
    const entry = this.equippedIn(slot);
    if (!entry) return null;
    const item = ITEMS[entry.key];
    if (item.category !== ITEM_CATEGORY.EQUIPMENT) throw new Error(`${entry.key} isn't armor`);
    return item.armor;
  }

  clear() {
    this.entries = [];
    this.#changed();
    return this;
  }

  /**
   * Appends the entries to a state key (Battle.stateKey): their count, then per slot the item,
   * quantity, worn slot and lock.
   * @param {number[]} out
   */
  stateKeyInto(out) {
    if (!this.#keyValues) {
      /** @type {number[]} */
      const values = [];
      pushKeyInt(values, this.entries.length);
      for (const { key, quantity, slot, locked } of this.entries) {
        const item = ITEM_INDEX.get(key);
        if (item === undefined) throw new Error(`Inventory.stateKeyInto: unknown item ${key}`);
        pushKeyInt(values, item);
        pushKeyInt(values, quantity);
        pushKeyInt(values, slot ? ARMOR_SLOTS.indexOf(slot) + 1 : 0);
        pushKeyInt(values, !!locked);
      }
      this.#keyValues = values;
    }
    for (const v of this.#keyValues) out.push(v);
  }

  clone() {
    const copy = new Inventory(this.entries);
    copy.#armorBonuses = this.#armorBonuses; // same entries, so the same caches
    copy.#keyValues = this.#keyValues;
    return copy;
  }
}

/** @param {ItemKey} key */
function defaultQuantity(key) {
  const item = /** @type {Item} */ (ITEMS[key]);
  return 'quantity' in item ? item.quantity : 1;
}
