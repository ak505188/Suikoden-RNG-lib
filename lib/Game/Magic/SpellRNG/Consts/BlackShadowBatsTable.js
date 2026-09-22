// Captured from BlackShadowBats.State (Neclord used Bats turn 1) the same way - notice this
// table is mostly a uniform 4096 (i.e. "no scaling", spawning right at the reference point)
// with only a handful of large outliers, compared to Wind's much more chaotic table -
// directly explaining why Bats' particles cycle through roughly twice as fast (higher
// per-tick reactivation rate) as Wind's.
export const BLACK_SHADOW_BATS_SLOT_SCALE = [
  4096, 4096, 4096, 4294791168, 4096, 4291624881, 1, 4096,
  4096, 4096, 4096, 504, 4096, 4096, 0, 2149064704,
  4096, 2148132048, 4096, 4290510762, 4096, 2149064704, 4096, 2149124192,
  4096, 4096, 4096, 4290314155, 4096, 4096, 4096, 2149124688,
  42, 0, 4096, 671617024, 0, 2149124856, 2149120640, 4096,
];

export const BLACK_SHADOW_BATS_SLOT_RESIDUAL = [
  3329, 0, 3017, 127, 504, 3967, 3467, 0,
  4032, 0, 1232, 0, 3235, 4031, 0, 2300,
  1776, 1, 0, 155, 1810, 988, 0, 127,
  2144, 104, 1024, 6, 2304, 0, 824, 127,
  2448, 0, 1708, 8, 0, 0, 3928, 146,
];

export const BLACK_SHADOW_BATS_SCALE_INIT = 4096;
