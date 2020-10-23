import enemies from './enemies';

export function numToHexString(num) {
  return '0x' + `0000000${num.toString(16)}`.substr(-8);
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
  'Panna Yakuta Area',
  'Panna Yakuta',
  'Scarleticia Area',
  'Scarleticia',
  'Seek Valley',
  'Seika Area',
  'Shasarazade Fortress',
  'Soniere Prison',
  'Toran Lake Castle'
];

export const Areas = initAreas(enemies);
