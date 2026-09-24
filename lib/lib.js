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
