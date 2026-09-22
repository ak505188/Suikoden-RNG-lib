// Captured from BlackShadowWind.State (Neclord used Wind turn 1) at frame 0, before any
// tick - the 40-slot scale field and posX low-12-bit residue. Genuine per-savestate stale
// VFX-pool memory (unlike Hell's baked table) - see SoulEater.js's blackShadowRand for the
// mechanism.
export const BLACK_SHADOW_WIND_SLOT_SCALE = [
  2147516416, 8191, 2147516416, 0, 2147516416, 908748, 8191, 2147483648,
  8191, 2147516416, 4352, 2147516416, 1118208, 2147516416, 3418152703, 2147483648,
  0, 2147516416, 2952790016, 2147516416, 2576980377, 8191, 10, 0,
  2147516416, 113681, 2684329983, 8191, 2684328959, 0, 2684329983, 0,
  2684328959, 3439329280, 2684329983, 0, 2684328959, 0, 2684329983, 2684289024,
];

export const BLACK_SHADOW_WIND_SLOT_RESIDUAL = [
  0, 256, 0, 3566, 0, 0, 0, 0,
  3904, 0, 0, 0, 0, 0, 2986, 0,
  17, 0, 0, 0, 443, 0, 0, 0,
  2458, 0, 2457, 4095, 0, 0, 4095, 0,
  4095, 0, 4095, 3840, 0, 0, 4095, 0,
];

// scaleAccum's own starting value in this savestate was 8191 (vs. the more common 4096 seen
// in Bats/Hell) - also just whatever was left over.
export const BLACK_SHADOW_WIND_SCALE_INIT = 8191;
