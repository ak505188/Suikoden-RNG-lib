import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js'
import { RUNES } from '../Magic/Runes.js';
import { RANGE, STATS, STATUS } from '../Constants.js';
import { ACTION_TYPES, ATTACK_RESULTS, DEFAULT_ACTION } from './Actions.js';
import Combatant from './Combatant.js';
import RNG from '../../rng.js';
import { clamp } from '../../lib.js';
import { calculateLevelupGrowth, getGrowthValue, LEVEL_UP_STAT_ORDER } from '../Growths.js';

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */
/** @typedef {import('../Items.js').Item} Item */
/** @typedef {import('../Characters.js').CharacterData} CharacterData */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Combatant.js').CombatantStatBlock} CombatantStatBlock */

/**
 * @typedef {'HEAD'|'BODY'|'SHIELD'|'ACCESSORY_1'|'ACCESSORY_2'} ArmorSlot
 */

/**
 * @typedef {Object} InventoryEntry
 * @property {ArmorPiece|Item} item
 * @property {number} [quantity] - For stackable non-equipment items.
 * @property {boolean} [equipped] - True if this armor piece is currently worn.
 * @property {ArmorSlot} [slot] - Which slot it's worn in; only meaningful when equipped.
 * @property {boolean} [locked] - True if it can't be unequipped/removed for this character.
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

export default class Character extends Combatant {
  /** @param {CharacterData} character */
  constructor(character) {
    const { initial, growths } = character.stats;
    super(character.name, 1, initial);
    this.EXP = 0;

    this.range = character.range;
    this.weapon = new Weapon(WEAPONS[character.weapon.id], character.weapon.lvl);

    this.initial = initial;
    this.growths = growths;

    this.rune = character.rune;
    this.isRuneLocked = character.isRuneLocked;
    this.wearClasses = character.wearClasses;

    this.inventory = character.inventory;

    this.action = null;
    this.defending = false;

    this.status = {
      [STATUS.POISON]: false,
      [STATUS.BALLOON]: 0,
      [STATUS.BUCKET]: false,
      [STATUS.UNBALANCED]: 0,
      [STATUS.SLEEP]: false,
    };

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
    this.acted = false;
    this.busy = false;
    this.action = null;
  }

  /** @returns {CharacterArmorSlots} */
  get armor() {
    const equippedIn = (/** @type {ArmorSlot} */ slot) =>
      /** @type {ArmorPiece | null} */ (
        this.inventory.find(entry => entry.equipped && entry.slot === slot)?.item ?? null
      );

    return {
      head: equippedIn('HEAD'),
      body: equippedIn('BODY'),
      shield: equippedIn('SHIELD'),
      accessories: [equippedIn('ACCESSORY_1'), equippedIn('ACCESSORY_2')],
    };
  }

  /** @returns {CharacterArmorLocked} */
  get isArmorLocked() {
    const lockedIn = (/** @type {ArmorSlot} */ slot) =>
      this.inventory.find(entry => entry.equipped && entry.slot === slot)?.locked ?? false;

    return {
      head: lockedIn('HEAD'),
      body: lockedIn('BODY'),
      shield: lockedIn('SHIELD'),
      accessories: [lockedIn('ACCESSORY_1'), lockedIn('ACCESSORY_2')],
    };
  }

  get armorStats() {
    const { head, body, shield, accessories } = this.armor;
    const equipment = [head, body, shield, ...accessories]
    return equipment
      .filter(Boolean)
      .reduce((totals, piece) => {
        Object.entries(piece.stats).forEach(([stat, value]) => {
          totals[stat] = totals[stat] + value;
        });
        return totals;
      }, Object.fromEntries(LEVEL_UP_STAT_ORDER.map(stat => [stat, 0])));
  }

  get ATK() {
    return this.weapon.ATK + this.stats.PWR + this.armorStats.PWR;
  }

  get ARM() {
    return this.stats.DEF + this.armorStats.DEF;
  }

  get MGC() {
    return this.stats.MGC + this.armorStats.MGC;
  }

  get SPD() {
    return this.stats.SPD + this.armorStats.SPD;
  }

  get SKL() {
    return this.stats.SKL + this.armorStats.SKL;
  }

  get LUK() {
    return this.stats.LUK + this.armorStats.LUK;
  }

  get canAct() {
    return super.canAct && !this.status[STATUS.SLEEP];
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

  rest() {
    this.HP = this.stats.HP;
    this.MP = [...this.maxMP];
    return this;
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
      [STATS.HP] : 0,
    };

    for (let i = 0; i < levels; i++) {
      LEVEL_UP_STAT_ORDER.forEach(stat => {
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
    Object.entries(statGrowths).forEach(([stat, value]) => {
      this.stats[stat] = this.stats[stat] + value;
    });

    this.setLVL(Math.min(startingLVL + levels, 99));
    this.HP += statGrowths.HP;
    this.maxMP = getMPFromMGC(this.stats.MGC);
    return this;
  }

  /** @param {CombatantStatBlock} stats */
  setStats(stats, reinit = true) {
    this.stats = { ...this.stats, ...stats };
    if (reinit) this.init();
    return this;
  }

  /**
   * @param {Enemy} target
   * @param {RNG} rng
   */
  willHitTarget(target, rng) {
    let hitChance = clamp(this.SKL - (target.SKL - 80), 60, 99);
    if (this.status[STATUS.BUCKET]) {
      // TODO: Validate this gets rounded down
      hitChance = Math.floor(hitChance / 2);
    }

    let willHit = rng.next().getRNG2() % 100 < hitChance;
    if (!target.speciesFlags.canDodge) return true;
    if (target.speciesFlags.forceMissOnHit) return false;
    return willHit;
  }

  /** @param {RNG} rng */
  willCrit(rng) {
    let critChance = clamp(((this.SKL + this.LUK) / 8), 3, 25);
    if (this.rune.id === RUNES.KILLER.id) critChance *= 2;
    const willCrit = rng.next().getRNG2() % 100 < critChance;
    return willCrit;
  }

  /**
   * @param {Enemy} target
   * @param {RNG} rng
   * @returns ATTACK_RESULTS
   */
  handleAttack(target, rng) {
    const willHit = this.willHitTarget(target, rng)

    if (willHit) {
      return this.willCrit(rng) ? ATTACK_RESULTS.CRIT : ATTACK_RESULTS.HIT;
    }

    // Handle miss branch
    let willCounter = false;
    if (target.speciesFlags.canCounter) {
      willCounter = this.range !== RANGE.LONG;
    }

    return willCounter ? ATTACK_RESULTS.COUNTERED : ATTACK_RESULTS.MISSED;
  }

  resolveAction({ party, enemies, rng, turn_count }) {
    const rngInfo = { rng: rng.getRNG(), index: rng.count };
    switch(this.action.type) {
      case ACTION_TYPES.ATTACK: {
        // TODO: Validate target
        const targetIndex = this.action.target || 0;
        const targetEnemy = enemies[targetIndex];
        this.handleAttack(targetEnemy, rng);


        break;
      }
      case ACTION_TYPES.RUNE: {

        break;
      }
      default: {
        this.defending = true;
      }
    }
    this.acted = true;
  }
}
