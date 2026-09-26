import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js'
import { RUNES } from '../Magic/Runes.js';
import { COMBATANT_SIDE, ELEMENTAL_RESISTANCES, RANGE, STATS, STATUS, WEAPON_ELEMENTS } from '../Constants.js';
import { ATTACK_RESULT, DEFAULT_ACTION } from './Actions.js';
import Combatant from './Combatant.js';
import RNG from '../../rng.js';
import { calcMagicElementModifier, cDiv, clamp } from '../../lib.js';
import { calculateLevelupGrowth, getGrowthValue, LEVEL_UP_STAT_ORDER } from '../Growths.js';
import CHARACTERS from '../Characters.js';
import { CHARACTER_ATTACK_TIMINGS } from './CharacterAttackTimings.js';

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/** @typedef {import('../Items.js').Item} Item */
/** @typedef {import('../Characters.js').CharacterData} CharacterData */
/** @typedef {import('../Keys.js').CharacterKey} CharacterKey */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Combatant.js').CombatantStatBlock} CombatantStatBlock */
/** @typedef {import('./Combatant.js').CombatantTurnParams} CombatantTurnParams */
/** @typedef {import('../Constants.js').WeaponElement} WeaponElement */

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
  /** @param {CharacterKey} key */
  constructor(key) {
    /** @type {CharacterData} */
    const character = CHARACTERS[key];
    const { initial, growths } = character.stats;
    super(character.name, 1, initial);
    this.key = key;
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

    this.inventory = character.inventory;

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

  /**
   * FUN_800e2c90: also clears all statuses. Its death script sets and clears busy in the same
   * frame, so no extra busy time.
   * TODO: Sacrificial Buddha (item 83 in this member's own inventory) revives instead.
   * @param {number} tick
   */
  die(tick) {
    super.die(tick);
    this.status = Character.createStatus();
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
    const runePieceBonus = this.weapon.runePiece.element === WEAPON_ELEMENTS.EARTH ?
      this.weapon.runePiece.amount * 3 : 0;
    return this.stats.DEF + this.armorStats.DEF + runePieceBonus;
  }

  get MGC() {
    return this.stats.MGC + this.armorStats.MGC;
  }

  get SPD() {
    return this.stats.SPD + this.armorStats.SPD;
  }

  get SKL() {
    const runePieceBonus = this.weapon.runePiece.element === WEAPON_ELEMENTS.WIND ?
      this.weapon.runePiece.amount * 2 : 0;
    return this.stats.SKL + this.armorStats.SKL + runePieceBonus;
  }

  get LUK() {
    return this.stats.LUK + this.armorStats.LUK;
  }

  get attackTiming() {
    return CHARACTER_ATTACK_TIMINGS[this.key];
  }

  /**
   * Damage roll -> the frame the target's busy bit 8 clears. A Fire/Lightning rune piece
   * replaces the character's own reaction script.
   * @returns {number}
   */
  get reactionFrames() {
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

  /**
   * @param {Enemy} target
   * @param {RNG} rng
   * @param {boolean} isCrit
   */
  calcAttackDamage(target, rng, isCrit) {
    const base = this.ATK - target.DEF;
    const withRand = base < 10 ?
      (base + 1) - (rng.next().getRNG2() % 4) :
      base + cDiv(cDiv(base, 2) - rng.next().getRNG2() % base, 5);

    // Hitting enemy, no defend check needed.
    const element = this.weapon.element;
    const weakToElement = target.elements[element] === ELEMENTAL_RESISTANCES.WEAK;
    const withElement = weakToElement ?
      withRand + cDiv(withRand, 2) :
      withRand;

    const withRunePiece = this.weapon.applyRunePieceAmp(withElement);
    const damage = Math.max(withRunePiece, 1);
    return isCrit ? damage * 3 : damage;
  }

  /** @param {Spell} spell @param {Enemy} target */
  calcMagicDamage(spell, target) {
    const { power, element } = spell;
    const baseDamage = power + Math.floor(this.MGC / 2);

    const elements = Array.isArray(element) ? element : [element];
    const elementalModifier = calcMagicElementModifier(elements, target.elements);

    return baseDamage * elementalModifier;
  }

  /** @param {CombatantStatBlock} stats */
  setStats(stats, reinit = true) {
    this.stats = { ...this.stats, ...stats };
    if (reinit) this.init();
    return this;
  }

  /** @param {Enemy} target @param {RNG} rng @returns {boolean} */
  rollHit(target, rng) {
    let hitChance = clamp(this.SKL - (target.SKL - 80), 60, 99);
    if (this.status[STATUS.BUCKET]) {
      hitChance = Math.floor(hitChance / 2);
    }

    return rng.next().getRNG2() % 100 < hitChance;
  }

  /** @param {RNG} rng @returns {boolean} */
  willCrit(rng) {
    let critChance = clamp(Math.floor(((this.SKL + this.LUK) / 8)), 3, 25);
    if (this.rune.id === RUNES.KILLER.id) critChance *= 2;
    return rng.next().getRNG2() % 100 < critChance;
  }

  /** @param {Enemy} target @returns {boolean} True if enemy will counter */
  willGetCountered(target) {
    if (!target.speciesFlags.canCounter) return false;
    if (!this.counterEligible || this.range === RANGE.LONG) return false;
    return true;
  }

  /** @param {Enemy} target @param {RNG} rng @returns ATTACK_RESULTS */
  calcAttackResult(target, rng) {
    const willMiss = target.speciesFlags.forceMissOnHit || !this.rollHit(target, rng);

    if (willMiss) {
      if (this.willGetCountered(target)) return ATTACK_RESULT.COUNTERED;
      if (target.speciesFlags.canBeMissed) return ATTACK_RESULT.MISSED;
    }

    return this.willCrit(rng) ? ATTACK_RESULT.CRIT : ATTACK_RESULT.HIT;
  }
}
