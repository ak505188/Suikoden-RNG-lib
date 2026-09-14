import { STATS } from './Constants.js';

export const StatGrowths = [
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

export const GROWTHS = {
  HP: HPGrowths,
  STAT: StatGrowths,
};

export const LEVEL_UP_STAT_ORDER = [
  STATS.PWR,
  STATS.SKL,
  STATS.DEF,
  STATS.SPD,
  STATS.MGC,
  STATS.LUK,
  STATS.HP,
];

function getStatGrowth(growths, stat) {
  return stat === STATS.HP ? growths.PWR : growths[stat];
}

export function getGrowthValue(growths, stat, level) {
  const growthId = getStatGrowth(growths, stat);

  // ID 9 is a special case that changes cutoff to 15
  const levelCutoffs = [
    growthId === 9 ? 15 : 20,
    60
  ];

  const levelModifier = levelCutoffs.filter(cutoff => level >= cutoff).length;

  return stat === STATS.HP ? GROWTHS.HP[growthId][levelModifier] : GROWTHS.STAT[growthId][levelModifier];
}

export function calculateLevelupGrowth(rng2, growthValue, stat) {
  const maxRNG = stat === STATS.HP ? rng2 & 0x1ff : rng2 & 0xff;
  return Math.floor((growthValue + maxRNG) / 256);
}
