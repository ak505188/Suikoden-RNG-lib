import { ITEMS } from './Items.js';
import { ITEM_CATEGORY } from './Constants.js';

/** @typedef {import('./Items.js').Item} Item */
/** @typedef {import('./Keys.js').ItemKey} ItemKey */
/** @typedef {import('./Armor.js').ArmorPiece} ArmorPiece */

/** @typedef {import('./Constants.js').ArmorSlot} ArmorSlot */

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

  /** @param {InventoryEntry[]} entries - copied, so the source data is never mutated */
  constructor(entries = []) {
    if (entries.length > Inventory.MAX_SLOTS) {
      throw new Error(`Inventory holds at most ${Inventory.MAX_SLOTS} items, got ${entries.length}`);
    }
    /** @type {InventoryEntry[]} */
    this.entries = entries.map(entry => ({ ...entry, quantity: entry.quantity ?? defaultQuantity(entry.key) }));
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
  }

  /**
   * Removes the whole slot holding `key`, whatever its quantity.
   * @param {ItemKey} key
   */
  remove(key) {
    const entry = this.get(key);
    if (!entry) throw new Error(`No ${key} in inventory`);
    this.entries.splice(this.entries.indexOf(entry), 1);
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
    return this;
  }

  clone() {
    return new Inventory(this.entries);
  }
}

/** @param {ItemKey} key */
function defaultQuantity(key) {
  const item = /** @type {Item} */ (ITEMS[key]);
  return 'quantity' in item ? item.quantity : 1;
}
