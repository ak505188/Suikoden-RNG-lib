import { getMPFromMGC } from '../MP.js';
import { Weapon, WEAPONS } from '../Weapons.js'
import { RUNES } from '../Magic/Runes.js';
import { ARMOR_SLOT, COMBATANT_SIDE, ELEMENTAL_RESISTANCES, RANGE, STATS, STATUS, WEAPON_ELEMENTS } from '../Constants.js';
import { ATTACK_RESULT, DEFAULT_ACTION } from './Actions.js';
import Combatant from './Combatant.js';
import RNG from '../../rng.js';
import { calcMagicElementModifier, cDiv, clamp, pushKeyInt } from '../../lib.js';
import { calculateLevelupGrowth, getGrowthValue, LEVEL_UP_STAT_ORDER } from '../Growths.js';
import CHARACTERS from '../Characters.js';
import { CHARACTER_ATTACK_TIMINGS } from './CharacterAttackTimings.js';
import { Inventory } from '../Inventory.js';
import { EXP_PER_LEVEL } from '../Experience.js';

/** @typedef {import('../Armor.js').ArmorPiece} ArmorPiece */
/** @typedef {import('../Armor.js').WearClass} WearClass */
/** @typedef {import('../Magic/Runes.js').Rune} Rune */
/** @typedef {import('../Magic/Spells.js').Spell} Spell */
/** @typedef {import('../Characters.js').CharacterData} CharacterData */
/** @typedef {import('../Keys.js').CharacterKey} CharacterKey */
/** @typedef {import('./Actions.js').Action} Action */
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

export default class Character extends Combatant {
  /** @param {CharacterKey} key */
  constructor(key) {
    /** @type {CharacterData} */
    const character = CHARACTERS[key];
    const { initial, growths } = character.stats;
    super(character.name, 1, { ...initial }); // levelUp adds into stats, so not the table's own
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

  /** Combatant.stateKeyInto plus MP and the inventory. @param {number[]} out */
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
    copy.maxMP = [...this.maxMP];
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
    const runePieceBonus = this.weapon.runePiece.element === WEAPON_ELEMENTS.EARTH ?
      this.weapon.runePiece.amount * 3 : 0;
    return this.stats.DEF + this.armorStat(STATS.DEF) + runePieceBonus;
  }

  get MGC() {
    return this.stats.MGC + this.armorStat(STATS.MGC);
  }

  get SPD() {
    return this.stats.SPD + this.armorStat(STATS.SPD);
  }

  get SKL() {
    const runePieceBonus = this.weapon.runePiece.element === WEAPON_ELEMENTS.WIND ?
      this.weapon.runePiece.amount * 2 : 0;
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

  /** @param {Enemy} target @param {RNG} rng @returns ATTACK_RESULTS */
  calcAttackResult(target, rng) {
    const willMiss = target.speciesFlags.forceMissOnHit || !this.rollHit(target, rng);

    if (willMiss) {
      if (this.willGetCountered(target)) return ATTACK_RESULT.COUNTERED;
      if (target.speciesFlags.canBeMissed) return ATTACK_RESULT.MISSED;
    }

    return this.willCrit(rng) ? ATTACK_RESULT.CRIT : ATTACK_RESULT.HIT;
  }

  /** @param {number} lvl */
  setWeaponLvl(lvl) {
    this.weapon.setLvl(lvl);
    return this;
  }
}
