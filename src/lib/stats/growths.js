import RNG from '../rng.js';

export const characters = {
  'McDohl': {
    PWR: 6,
    SKL: 7,
    DEF: 5,
    SPD: 7,
    MAG: 6,
    LCK: 6
  },
  'Alen': {
    PWR: 6,
    SKL: 3,
    DEF: 5,
    SPD: 4,
    MAG: 5,
    LCK: 4
  },
  'Anji': {
    PWR: 6,
    SKL: 5,
    DEF: 3,
    SPD: 5,
    MAG: 2,
    LCK: 2
  },
  'Antonio': {
    PWR: 3,
    SKL: 3,
    DEF: 3,
    SPD: 4,
    MAG: 1,
    LCK: 3
  },
  'Blackman': {
    PWR: 5,
    SKL: 3,
    DEF: 6,
    SPD: 3,
    MAG: 1,
    LCK: 3
  },
  'Camille': {
    PWR: 5,
    SKL: 8,
    DEF: 4,
    SPD: 5,
    MAG: 5,
    LCK: 3
  },
  'Cleo': {
    PWR: 5,
    SKL: 6,
    DEF: 5,
    SPD: 6,
    MAG: 6,
    LCK: 2
  },
  'Clive': {
    PWR: 6,
    SKL: 8,
    DEF: 3,
    SPD: 6,
    MAG: 2,
    LCK: 1
  },
  'Crowley': {
    PWR: 2,
    SKL: 3,
    DEF: 1,
    SPD: 5,
    MAG: 8,
    LCK: 3
  },
  'Eikei': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 2,
    MAG: 0,
    LCK: 3
  },
  'Eileen': {
    PWR: 2,
    SKL: 4,
    DEF: 2,
    SPD: 6,
    MAG: 7,
    LCK: 5
  },
  'Flik': {
    PWR: 6,
    SKL: 6,
    DEF: 4,
    SPD: 6,
    MAG: 5,
    LCK: 4
  },
  'Fu Su Lu': {
    PWR: 8,
    SKL: 1,
    DEF: 6,
    SPD: 1,
    MAG: 0,
    LCK: 1
  },
  'Fukien': {
    PWR: 2,
    SKL: 3,
    DEF: 4,
    SPD: 4,
    MAG: 6,
    LCK: 5
  },
  'Fuma': {
    PWR: 5,
    SKL: 5,
    DEF: 5,
    SPD: 6,
    MAG: 1,
    LCK: 3
  },
  'Futch': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 6,
    MAG: 2,
    LCK: 6
  },
  'Gen': {
    PWR: 6,
    SKL: 5,
    DEF: 4,
    SPD: 4,
    MAG: 2,
    LCK: 4
  },
  'Gon': {
    PWR: 4,
    SKL: 4,
    DEF: 5,
    SPD: 3,
    MAG: 2,
    LCK: 8
  },
  'Gremio': {
    PWR: 13,
    SKL: 5,
    DEF: 6,
    SPD: 3,
    MAG: 2,
    LCK: 5
  },
  'Grenseal': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 5,
    MAG: 6,
    LCK: 3
  },
  'Griffith': {
    PWR: 5,
    SKL: 3,
    DEF: 4,
    SPD: 3,
    MAG: 2,
    LCK: 3
  },
  'Hellion': {
    PWR: 1,
    SKL: 1,
    DEF: 3,
    SPD: 3,
    MAG: 7,
    LCK: 4
  },
  'Hix': {
    PWR: 5,
    SKL: 5,
    DEF: 4,
    SPD: 5,
    MAG: 3,
    LCK: 7
  },
  'Humphrey': {
    PWR: 6,
    SKL: 3,
    DEF: 7,
    SPD: 2,
    MAG: 1,
    LCK: 3
  },
  'Juppo': {
    PWR: 3,
    SKL: 7,
    DEF: 4,
    SPD: 4,
    MAG: 4,
    LCK: 6
  },
  'Kage': {
    PWR: 4,
    SKL: 6,
    DEF: 5,
    SPD: 7,
    MAG: 3,
    LCK: 3
  },
  'Kai': {
    PWR: 6,
    SKL: 3,
    DEF: 4,
    SPD: 2,
    MAG: 1,
    LCK: 3
  },
  'Kamandol': {
    PWR: 4,
    SKL: 7,
    DEF: 2,
    SPD: 3,
    MAG: 3,
    LCK: 2
  },
  'Kanak': {
    PWR: 5,
    SKL: 5,
    DEF: 4,
    SPD: 6,
    MAG: 0,
    LCK: 2
  },
  'Kasim': {
    PWR: 7,
    SKL: 4,
    DEF: 6,
    SPD: 3,
    MAG: 1,
    LCK: 2
  },
  'Kasumi': {
    PWR: 5,
    SKL: 6,
    DEF: 4,
    SPD: 8,
    MAG: 4,
    LCK: 3
  },
  'Kessler': {
    PWR: 5,
    SKL: 5,
    DEF: 4,
    SPD: 3,
    MAG: 2,
    LCK: 3
  },
  'Kimberly': {
    PWR: 4,
    SKL: 6,
    DEF: 4,
    SPD: 5,
    MAG: 2,
    LCK: 5
  },
  'Kirke': {
    PWR: 5,
    SKL: 4,
    DEF: 4,
    SPD: 3,
    MAG: 2,
    LCK: 0
  },
  'Kirkis': {
    PWR: 5,
    SKL: 8,
    DEF: 5,
    SPD: 6,
    MAG: 5,
    LCK: 3
  },
  'Kreutz': {
    PWR: 6,
    SKL: 3,
    DEF: 6,
    SPD: 1,
    MAG: 1,
    LCK: 1
  },
  'Krin': {
    PWR: 3,
    SKL: 6,
    DEF: 2,
    SPD: 8,
    MAG: 1,
    LCK: 1
  },
  'Kuromimi': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 5,
    MAG: 2,
    LCK: 5
  },
  'Kwanda': {
    PWR: 6,
    SKL: 3,
    DEF: 8,
    SPD: 2,
    MAG: 1,
    LCK: 3
  },
  'Leonardo': {
    PWR: 6,
    SKL: 3,
    DEF: 4,
    SPD: 4,
    MAG: 1,
    LCK: 1
  },
  'Lepant': {
    PWR: 5,
    SKL: 5,
    DEF: 4,
    SPD: 4,
    MAG: 3,
    LCK: 4
  },
  'Lester': {
    PWR: 4,
    SKL: 4,
    DEF: 3,
    SPD: 5,
    MAG: 1,
    LCK: 5
  },
  'Liukan': {
    PWR: 3,
    SKL: 7,
    DEF: 3,
    SPD: 4,
    MAG: 3,
    LCK: 5
  },
  'Lorelai': {
    PWR: 5,
    SKL: 7,
    DEF: 4,
    SPD: 3,
    MAG: 2,
    LCK: 2
  },
  'Lotte': {
    PWR: 3,
    SKL: 4,
    DEF: 3,
    SPD: 5,
    MAG: 6,
    LCK: 4
  },
  'Luc': {
    PWR: 0,
    SKL: 5,
    DEF: 1,
    SPD: 5,
    MAG: 8,
    LCK: 1
  },
  'Maas': {
    PWR: 4,
    SKL: 5,
    DEF: 4,
    SPD: 4,
    MAG: 2,
    LCK: 4
  },
  'Mace': {
    PWR: 6,
    SKL: 6,
    DEF: 6,
    SPD: 5,
    MAG: 3,
    LCK: 5
  },
  'Meese': {
    PWR: 4,
    SKL: 5,
    DEF: 4,
    SPD: 4,
    MAG: 2,
    LCK: 4
  },
  'Meg': {
    PWR: 4,
    SKL: 5,
    DEF: 4,
    SPD: 4,
    MAG: 3,
    LCK: 8
  },
  'Milia': {
    PWR: 6,
    SKL: 3,
    DEF: 6,
    SPD: 3,
    MAG: 1,
    LCK: 4
  },
  'Milich': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 4,
    MAG: 6,
    LCK: 1
  },
  'Mina': {
    PWR: 2,
    SKL: 4,
    DEF: 4,
    SPD: 4,
    MAG: 6,
    LCK: 6
  },
  'Moose': {
    PWR: 4,
    SKL: 6,
    DEF: 4,
    SPD: 4,
    MAG: 2,
    LCK: 4
  },
  'Morgan': {
    PWR: 6,
    SKL: 3,
    DEF: 5,
    SPD: 2,
    MAG: 0,
    LCK: 1
  },
  'Mose': {
    PWR: 5,
    SKL: 5,
    DEF: 5,
    SPD: 4,
    MAG: 1,
    LCK: 3
  },
  'Pahn': {
    PWR: 7,
    SKL: 5,
    DEF: 6,
    SPD: 2,
    MAG: 0,
    LCK: 4
  },
  'Pesmerga': {
    PWR: 8,
    SKL: 2,
    DEF: 6,
    SPD: 3,
    MAG: 1,
    LCK: 0
  },
  'Quincy': {
    PWR: 4,
    SKL: 8,
    DEF: 5,
    SPD: 5,
    MAG: 1,
    LCK: 5
  },
  'Ronnie': {
    PWR: 6,
    SKL: 4,
    DEF: 6,
    SPD: 4,
    MAG: 0,
    LCK: 3
  },
  'Rubi': {
    PWR: 5,
    SKL: 6,
    DEF: 4,
    SPD: 6,
    MAG: 6,
    LCK: 0
  },
  'Sansuke': {
    PWR: 3,
    SKL: 5,
    DEF: 5,
    SPD: 4,
    MAG: 1,
    LCK: 4
  },
  'Sarah': {
    PWR: 5,
    SKL: 3,
    DEF: 5,
    SPD: 3,
    MAG: 4,
    LCK: 2
  },
  'Sergei': {
    PWR: 2,
    SKL: 6,
    DEF: 6,
    SPD: 3,
    MAG: 2,
    LCK: 2
  },
  'Sheena': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 6,
    MAG: 6,
    LCK: 6
  },
  'Sonya': {
    PWR: 6,
    SKL: 5,
    DEF: 4,
    SPD: 7,
    MAG: 5,
    LCK: 3
  },
  'Stallion': {
    PWR: 3,
    SKL: 6,
    DEF: 5,
    SPD: 8,
    MAG: 4,
    LCK: 4
  },
  'Sydonia': {
    PWR: 4,
    SKL: 6,
    DEF: 3,
    SPD: 6,
    MAG: 3,
    LCK: 2
  },
  'Sylvina': {
    PWR: 3,
    SKL: 5,
    DEF: 4,
    SPD: 6,
    MAG: 5,
    LCK: 6
  },
  'Tai Ho': {
    PWR: 6,
    SKL: 7,
    DEF: 3,
    SPD: 5,
    MAG: 1,
    LCK: 4
  },
  'Tengaar': {
    PWR: 3,
    SKL: 6,
    DEF: 4,
    SPD: 5,
    MAG: 7,
    LCK: 2
  },
  'Valeria': {
    PWR: 6,
    SKL: 4,
    DEF: 6,
    SPD: 3,
    MAG: 3,
    LCK: 4
  },
  'Varkas': {
    PWR: 6,
    SKL: 3,
    DEF: 5,
    SPD: 3,
    MAG: 1,
    LCK: 2
  },
  'Viktor': {
    PWR: 9,
    SKL: 2,
    DEF: 7,
    SPD: 5,
    MAG: 3,
    LCK: 4
  },
  'Warren': {
    PWR: 5,
    SKL: 4,
    DEF: 5,
    SPD: 3,
    MAG: 2,
    LCK: 3
  },
  'Yam Koo': {
    PWR: 5,
    SKL: 6,
    DEF: 3,
    SPD: 6,
    MAG: 2,
    LCK: 4
  }
}

export const statGrowths = [
  [ 242, 172, 98],
  [ 336, 224, 124],
  [ 431, 288, 144],
  [ 525, 364, 144],
  [ 646, 435, 144],
  [ 741, 499, 157],
  [ 835, 563, 177],
  [ 970, 614, 216],
  [ 1118, 672, 249],
  [ 1682, 420, 196],
  [ 1050, 352, 164],
  [ 714, 608, 492],
  [ 538, 480, 459],
  [ 646, 128, 689],
  [ 94, 140, 2560],
  [ 714, 608, 492]
];

export const HPGrowths = [
  [ 835, 1472, 984],
  [ 1145, 1632, 984],
  [ 1441, 1856, 1115],
  [ 1805, 2048, 1181],
  [ 2021, 2304, 1115],
  [ 2236, 2624, 1115],
  [ 2613, 2816, 1115],
  [ 2991, 3008, 1181],
  [ 3368, 3328, 1247],
  [ 5052, 1280, 1312],
  [ 2667, 1152, 984],
  [ 1913, 2496, 2297],
  [ 1077, 1984, 2100],
  [ 2021, 2304, 1115],
  [ 889, 1491, 4365],
  [ 714, 608, 492]
];

const levelupStatOrder = [
  'PWR',
  'SKL',
  'DEF',
  'SPD',
  'MAG',
  'LCK',
  'HP'
]

export function getCharacterStatGrowths(name) {
  return characters[name];
}

export function getCharacterStatGrowth(name, stat) {
  if (stat === 'HP') {
    return characters[name].PWR;
  }
  return characters[name][stat];
}

export function getGrowthValue(name, stat, level) {
  const ID = getCharacterStatGrowth(name, stat);
  let levelCutoffs = [20, 60];

  if (ID === 9) {
    levelCutoffs[0] = 15;
  }

  let levelModifier = 0;
  levelCutoffs.forEach(cutoff => {
    if (level >= cutoff) {
      levelModifier++;
    }
  });

  if (stat === 'HP') {
    return HPGrowths[ID][levelModifier];
  }

  return statGrowths[ID][levelModifier];
}

export function characterLevelUps(name, startingLevel, levelsGained, rng) {
  let level = startingLevel;
  const statGrowths = { 'PWR': 0, 'SKL': 0, 'DEF': 0, 'SPD': 0, 'MAG': 0, 'LCK': 0, 'HP': 0 };
  while (level++ < startingLevel + levelsGained) {
    const levelGrowths = characterLevelUp(name, level, rng);
    for (const [stat, growth] of Object.entries(levelGrowths)) {
      statGrowths[stat] += growth;
    }
  }
  return statGrowths;
}

export function characterLevelUp(name, level, rng) {
  const growths = characters[name];
  const levelupGrowths = {};
  levelupStatOrder.forEach(stat => {
    rng.next();
    const growthValue = getGrowthValue(name, stat, level);
    levelupGrowths[stat] = calculateLevelupGrowth(rng.getRNG2(), growthValue, stat === 'HP');
  });
  return levelupGrowths;
}

export function calculateLevelupGrowth(rngNormalized, growthValue, isHP = false) {
  const maxRNG = isHP ? rngNormalized - (rngNormalized >> 9 << 9) : rngNormalized & 0xff;
  return Math.floor((growthValue + maxRNG) / 256);
}
