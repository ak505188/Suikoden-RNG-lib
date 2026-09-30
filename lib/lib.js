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
 * @param {number[]} out
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
  out.push(v < 0 ? 0xFFFE : 0xFFFF, Math.floor(m / 2 ** 32), Math.floor(m / 0x10000) & 0xFFFF, m & 0xFFFF);
}

/**
 * Per class, the copiers built so far: one per set of own property names (usually just one).
 * @type {Map<Function, { keys: string[], copy: (obj: object) => object }[]>}
 */
const copiers = new Map();

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
    const copy = new Function('C', `return o => {\nconst c = Reflect.construct(Object, [], C);\n${body}\nreturn c;\n};`)(constructor);
    return /** @type {(obj: object) => object} */ (copy);
  } catch {
    return obj => Object.assign(Reflect.construct(Object, [], constructor), obj);
  }
}

/**
 * A shallow copy of `obj` (its own enumerable properties) with the same prototype, for clone()
 * methods. The copy starts from an empty instance of obj's class (Reflect.construct, without
 * running its constructor), which V8 sizes to hold the class's fields in-object. Object.assign
 * onto Object.create(proto) instead leaves an object with that many properties in slow
 * dictionary mode, making every property read in the battle loop a hash lookup (~3x slower).
 * The properties are copied by a generated copier, cached per class and property set, so an
 * object with extra or missing properties gets its own copier and nothing is ever dropped.
 * @template {object} T
 * @param {T} obj
 * @returns {T}
 */
export function shallowCloneInstance(obj) {
  const keys = Object.keys(obj);
  let known = copiers.get(obj.constructor);
  if (!known) copiers.set(obj.constructor, known = []);
  let entry = known.find(e => e.keys.length === keys.length && e.keys.every((k, i) => k === keys[i]));
  if (!entry) known.push(entry = { keys, copy: makeCopier(obj.constructor, keys) });
  return /** @type {T} */ (entry.copy(obj));
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
