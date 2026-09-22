// Fixed per-slot "scale" constants (offset 0x30 in each particle slot), confirmed
// byte-identical across TedHell.State, McDohlHell.State, and McDohlHellGregminster.State -
// this is baked into the spell's own static data, not derived from prior gameplay.
// Interpreted as raw signed 32-bit values >>12 in the spawn formula - most are far from a
// "1.0-ish" 4096, several look like large/negative bit patterns, which is expected and
// intentional (not corruption).
export const HELL_SLOT_SCALE = [
  4096, 2147483648, 4096, 2147516416, 5648, 2147516416, 69632, 2147516416,
  4276092913, 2147483648, 0, 2147516416, 0, 2147516416, 2863311530, 4096,
  0, 4096, 2147516416, 4096, 2147516416, 4096, 2147516416, 1048576,
  2147516416, 27, 2684328959, 4096, 2684329983, 0, 4096, 0,
  2684329983, 2684289024, 0, 2684329983, 4096, 2684329983, 0, 2684329983,
];

// Stale low-12-bit residue in each slot's initial posX field (captured at frame0, before any
// tick has run). All 40 slots start inactive.
export const HELL_INITIAL_RESIDUAL_LOW_12 = [
  0, 0, 544, 0, 0, 0, 0, 0,
  510, 0, 272, 0, 0, 0, 29, 0,
  0, 0, 2458, 1536, 2457, 0, 0, 0,
  0, 0, 4095, 0, 4095, 0, 4000, 0,
  4095, 0, 4095, 0, 4095, 0, 0, 3071,
];
