import { enemies } from './enemies.js';
import { ELEMENTAL_RESISTANCES } from './Game/Constants.js';
import AreaFactory from './Area/AreaFactory.js';

export function numToHexString(num) {
  return '0x' + `0000000${num.toString(16)}`.substr(-8);
}

export function generateLevelPermutations(levelups) {
  const result = [];

  function helper(index, currentSum) {
    if (index === levelups.length) {
      result.push(currentSum);
      return;
    }

    // Exclude current element
    helper(index + 1, currentSum);

    // Include current element
    helper(index + 1, currentSum + levelups[index]);
  }

  helper(0, 0);
  return [...new Set(result)].sort((a, b) => a - b);
}

export function mult32ulo(n, m) {
  n >>>= 0;
  m >>>= 0;
  const nlo = n & 0xffff;
  const nhi = n - nlo;
  return (((nhi * m >>> 0) + (nlo * m)) & 0xFFFFFFFF) >>> 0;
}

export function mult32uhi(n, m) {
  n >>>= 0;
  m >>>= 0;

  return ((n * m) - mult32ulo(n, m)) / Math.pow(2, 32);
}

export function div32ulo(n, m) {
  return Math.floor(n / m) >>> 0;
}

export function initAreas(enemies) {
  const factory = new AreaFactory();
  const areas = {};
  for (const area in enemies) {
    areas[area] = factory.createArea(enemies[area].name, enemies[area]);
  }
  return areas;
}

export function filterPropertiesFromObject(obj, keys) {
  let newObj = {};
  Object.keys(obj).forEach(key => {
    if (keys.indexOf(key) === -1) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}

export function arraysEqual(ar1, ar2) {
  if (ar1.length !== ar2.length) {
    return false;
  }

  for (let i = 0; i < ar1.length; i++)  {
    if (typeof ar1[i] !== typeof ar2[i]) {
      return false;
    }

    if (typeof ar1[i] === 'object') {
      if (JSON.stringify(ar1[i]) !== JSON.stringify(ar2[i])) {
        return false;
      }
    }
  }

  return true;
}

/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @returns {number} clamped number
 */
/**
 * Appends integer `value` to a state key (an array of 16-bit code units, see Battle.stateKey):
 * one unit if it's in 0..0xFFFD, else a marker (0xFFFE negative, 0xFFFF otherwise) and its
 * magnitude in three units. So every sequence of values has exactly one encoding.
 * @param {KeyOut} out
 * @param {number | boolean} value - booleans count as 0 / 1
 */
export function pushKeyInt(out, value) {
  const v = +value;
  if (v >= 0 && v < 0xFFFE && Number.isInteger(v)) {
    out.push(v);
    return;
  }
  const m = Math.abs(v);
  if (!Number.isInteger(v) || m >= 2 ** 48) throw new Error(`pushKeyInt: can't encode ${value}`);
  out.push(v < 0 ? 0xFFFE : 0xFFFF);
  out.push(Math.floor(m / 2 ** 32));
  out.push(Math.floor(m / 0x10000) & 0xFFFF);
  out.push(m & 0xFFFF);
}

/**
 * Where a state key's code units go: a KeyWriter, or any array.
 * @typedef {{ push: (unit: number) => unknown }} KeyOut
 */

/**
 * Collects a state key's 16-bit code units in a reused plain array, then makes the key string in
 * one call. A packed array of small ints is the fastest thing to hand fromCharCode.apply (about
 * 2.5x a Uint16Array subarray), and emptying it with `length = 0` keeps it packed for the next key.
 */
export class KeyWriter {
  constructor() {
    /** @type {number[]} */
    this.buf = [];
  }

  /** @param {number} unit */
  push(unit) {
    this.buf.push(unit);
  }

  get length() {
    return this.buf.length;
  }

  /** @returns {this} emptied, for the next key */
  reset() {
    this.buf.length = 0;
    return this;
  }

  toString() {
    return String.fromCharCode.apply(null, this.buf);
  }
}

/**
 * Per class, its copier: built from the first instance cloned, whose own property names every
 * instance of that class is expected to share (see shallowCloneInstance). `calls` counts copies,
 * for the sampled property check.
 * @type {Map<Function, { keys: string[], copy: (obj: object) => object, calls: number }>}
 */
const copiers = new Map();

/** Every this-many copies of a class, shallowCloneInstance checks the object's property names. */
const CLONE_CHECK_EVERY = 1024;

/**
 * A copier for objects of `constructor` with exactly `keys`: a function with one assignment per
 * property, which V8 runs about 8x faster than Object.assign's generic copy. Falls back to
 * Object.assign where code can't be generated (a browser with a strict CSP).
 * @param {Function} constructor
 * @param {string[]} keys
 * @returns {(obj: object) => object}
 */
function makeCopier(constructor, keys) {
  try {
    const body = keys.map(k => `c[${JSON.stringify(k)}] = o[${JSON.stringify(k)}];`).join('\n');
    const copy = new Function('P', `return o => {\nconst c = Object.create(P);\n${body}\nreturn c;\n};`)(constructor.prototype);
    return /** @type {(obj: object) => object} */ (copy);
  } catch {
    return obj => Object.assign(Reflect.construct(Object, [], constructor), obj);
  }
}

/**
 * A shallow copy of `obj` (its own enumerable properties) with the same prototype, for clone()
 * methods. The copy starts from Object.create(proto), without running obj's constructor, and the
 * generated copier adds the properties one by one in a fixed order, so every copy of a class
 * shares one hidden class. (Object.assign onto Object.create(proto) instead leaves an object with
 * that many properties in slow dictionary mode, making every property read in the battle loop a
 * hash lookup, ~3x slower.) Not Reflect.construct(Object, [], C): it costs 65-90ns a call (vs
 * ~8ns), and it keeps resizing C's constructor-built instances, so every battle built after a
 * search has new hidden classes and the battle code slows down a little more with each one (a
 * script running 6 searches in one process took 1.4s, then 2.2s each; with Object.create, 1.1s).
 * The properties are copied by a generated copier, one per class, built from the first instance
 * cloned. So every instance of a class must have the same own properties: set them all
 * (unconditionally) in the constructor, and never add one later, or the copier won't know it.
 * Checking every object's property names costs ~15% of a brute-force search, so it's sampled:
 * every CLONE_CHECK_EVERY-th copy of a class (the first included), which throws on a mismatch.
 * @template {object} T
 * @param {T} obj
 * @returns {T}
 */
export function shallowCloneInstance(obj) {
  let entry = copiers.get(obj.constructor);
  if (!entry) {
    const keys = Object.keys(obj);
    copiers.set(obj.constructor, entry = { keys, copy: makeCopier(obj.constructor, keys), calls: 0 });
  }
  if (entry.calls++ % CLONE_CHECK_EVERY === 0) checkProperties(obj, entry.keys);
  return /** @type {T} */ (entry.copy(obj));
}

/**
 * Throws unless `obj` has exactly the own properties `keys` (in any order).
 * @param {object} obj @param {string[]} keys
 */
function checkProperties(obj, keys) {
  const own = Object.keys(obj);
  if (own.length === keys.length && own.every(k => keys.includes(k))) return;
  const extra = own.filter(k => !keys.includes(k)), missing = keys.filter(k => !own.includes(k));
  throw new Error(`shallowCloneInstance: this ${obj.constructor.name} has different properties from the first one `
    + `cloned (extra: ${extra.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}). Set every property `
    + 'in the constructor, unconditionally.');
}

export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

// C's `/` truncates toward zero; JS's `Math.floor` floors toward -infinity - replicate C's
// truncation exactly. Shared by every spell whose spawn formula ports a C integer division
// (Flaming Arrow/Explosion's velocity offset, Hell/Black Shadow's finalOff).
/**
 * @param {number} num
 * @param {number} den
 * @returns {number}
 */
export function cDiv(num, den) {
  const magnitude = Math.floor(Math.abs(num) / Math.abs(den));
  return (num < 0) === (den < 0) ? magnitude : -magnitude;
}

export function encounterSequenceToString(encounters) {
  return encounters.map(encounter => encounter.toString(16)).join('');
}

export const areaNamesWithRandomEncounters = [
  'Cave of the Past',
  'Dragon Knights Area',
  'Dragons Den',
  'Dwarves Trail',
  'Dwarves Vault',
  'Great Forest',
  'Gregminster Area 1',
  'Gregminster Area 2',
  'Gregminster Palace',
  'Kalekka',
  'Kalekka Area',
  'Lepants Mansion',
  'Lorimar Area',
  'Magicians Island',
  'Moravia Area',
  'Moravia Castle',
  'Mt Seifu',
  'Mt Tigerwolf',
  'Neclords Castle',
  'Pannu Yakuta Area',
  'Pannu Yakuta',
  'Scarleticia Area',
  'Scarleticia',
  'Seek Valley',
  'Seika Area',
  'Shasarazade Fortress',
  'Soniere Prison',
  'Toran Lake Castle'
];

export const Areas = initAreas(enemies);

/**
 * If the enemy is Invulnerable to one of the elements, it takes 0 DMG.
 * If the enemy is Strong against one of the elements, it takes 0.5x DMG.
 * If the enemy is Weak against one of the elements, it takes 2x DMG.
 * Otherwise, enemy takes normal damage.
 * @typedef {import('./Game/Constants.js').Element} Element
 * @typedef {import('./Game/Constants.js').ElementalResistance} ElementalResistance
 * @param {Element[]} elements
 * @param {Partial<Record<Element, ElementalResistance>>} resistances
 * @returns {number}
 */
export function calcMagicElementModifier(elements, resistances) {
  const elementalModifier = elements.map(el => {
    switch(resistances[el]) {
      case ELEMENTAL_RESISTANCES.INVULNERABLE:
        return 0;
      case ELEMENTAL_RESISTANCES.RESISTANT:
        return 0.5;
      case ELEMENTAL_RESISTANCES.WEAK:
        return 2;
      case ELEMENTAL_RESISTANCES.NEUTRAL:
      default:
        return 10; // Not the real modifier, but this way I can easily select winner via sort.
    }
  }).sort().pop();

  return elementalModifier === 10 ? 1 : elementalModifier;
}

export default {
  areaNamesWithRandomEncounters,
  arraysEqual,
  calcMagicElementModifier,
  cDiv,
  div32ulo,
  encounterSequenceToString,
  filterPropertiesFromObject,
  numToHexString,
  mult32ulo,
  mult32uhi,
}
