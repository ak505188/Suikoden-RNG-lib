import { cDiv } from '../../../util/math.js';

/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {{ active: boolean, lifetime: number, trailX: number, velX: number }} Particle */

// Raw bytes read directly from Ghidra at SquareRoot0's lookup table (0x8017242c), 192
// int16 entries. SquareRoot0 is a standard PSX SDK library routine (GTE-hardware
// leading-zero-count + table lookup), not part of the spell logic itself - reproduced

// here bit-for-bit because spell_flamingarrow_spawn_particle calls it directly.
const sqrt0TableHex =
  '00101f103f105e107e109c10bb10da10f8101611341152116f118c11a911c611e31100121c123812541270128c12a712c212de12f91214132e13491364137e139813b213cc13e6130014191432144c1465147e149714b014c814e114f91412152a1542155a1572158a15a215b915d115e815001617162e1645165c1673168916a016b716cd16e416fa16101726173c17521768177e179417aa17bf17d517ea17001815182a183f18541869187e189318a818bd18d118e618fa180f19231938194c196019741988199c19b019c419d819ec19001a131a271a3a1a4e1a611a751a881a9b1aae1ac21ad51ae81afb1a0e1b211b331b461b591b6c1b7e1b911ba31bb61bc81bdb1bed1b001c121c241c361c481c5a1c6c1c7e1c901ca21cb41cc61cd81ce91cfb1c0d1d1e1d301d411d531d641d761d871d981daa1dbb1dcc1ddd1dee1d001e111e221e331e431e541e651e761e871e981ea81eb91eca1eda1eeb1efb1e0c1f1c1f2d1f3d1f4e1f5e1f6e1f7e1f8f1f9f1faf1fbf1fcf1fdf1fef1f';

/**
 * @typedef {Object} SpellRandResult
 * @property {number} calls
 */

function loadSqrt0Table() {
  const bytes = hexToByteArray(sqrt0TableHex);
  const table16 = {};
  for (let i = 0; i < sqrt0TableHex.length / 4; i++) {
    let lo = bytes[i * 2];
    let hi = bytes[i * 2 + 1];
    let v = lo | (hi << 8);
    if (v >= 0x8000) {
      v = v - 0x10000;
    }
    table16[i] = v;
  }
  return table16;
}

export const Sqrt0Table = loadSqrt0Table();

/** @param {string} hex
 * @returns {number[]}
 */
export function hexToByteArray(hex) {
  /** @type {Number[]} */
  const bytes = [];
  for (let i = 0; i < hex.length; i = i + 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

/**
 * @param {number} residualLow12
 * @param {number} radius
 * @param {RNG} rng
 * @returns {Particle}
 */
export function spawnFireParticle(residualLow12, radius, rng) {
  const xRoll = rng.next().getRNG2();
  const xRange = (radius - 1) * 2;
  const xOffset = (xRoll % xRange) + 1 - radius;

  rng.next(); // Z coordinate, not modeled

  const velRoll = rng.next().getRNG2();
  const velScale = (velRoll % 64) + 128;
  const velX = -xOffset * velScale;
  const q = cDiv(xOffset * 5, 6);
  const trailX = (residualLow12 & 0xfff) | (q * 4096);
  const lifetimeRoll = rng.next().getRNG2();
  const lifetime = lifetimeRoll % 100;
  return { active: true, lifetime, trailX, velX };
}

// Reinterprets a raw 32-bit bit pattern (e.g. read straight from a Ghidra memory dump, where
// a "negative" value shows up as something like 2147483648 instead of -2147483648) as the
// signed int32 the game's own C code would see. JS's `|` (and other bitwise ops) already
// coerce their operand via ToInt32 - mod 2^32, then resign if >= 2^31 - so this is a direct
// equivalent of manually masking-then-resigning. Used wherever a field's raw bits get
// reinterpreted or can overflow/wrap at 32 bits (Hell/Black Shadow's scale and posX fields).

/**
 * @param {number} v
 * @returns {number}
 */
export function signed32(v) {
  return v | 0;
}

/**
 * A memoized RNG burn: a spell or move animation (particles and the like) whose only effect is
 * to advance the RNG, by a number of calls that depends on nothing but the RNG state it starts
 * from. A search plays the same animation from the same state many times over; this runs each
 * start state once and afterwards jumps the RNG (RNG.next jumps in O(log n)).
 *
 * Only wrap a burn that's pure in that sense: no inputs besides the RNG state (bind any fixed
 * parameters first) and no output besides the calls. Anything it decides (a hit, a target, a
 * damage roll) must stay outside it.
 * @typedef {((rng: RNG) => SpellRandResult) & { stats: { hits: number, misses: number }, cache: Map<number, number> }} MemoizedBurn
 * @param {(rng: RNG) => unknown} burn - advances `rng`; its return value is ignored
 * @param {number} [maxEntries] - start states kept; the cache is emptied when it fills
 * @returns {MemoizedBurn}
 */
export function memoizeBurn(burn, maxEntries = 1 << 18) {
  /** @type {Map<number, number>} start state -> calls */
  const cache = new Map();
  const stats = { hits: 0, misses: 0 };
  const memoized = /** @type {MemoizedBurn} */ (
    (/** @type {RNG} */ rng) => {
      const start = rng.rng;
      const known = cache.get(start);
      if (known !== undefined) {
        stats.hits++;
        rng.next(known);
        return { calls: known };
      }
      stats.misses++;
      const before = rng.count;
      burn(rng);
      const calls = rng.count - before;
      if (cache.size >= maxEntries) cache.clear();
      cache.set(start, calls);
      return { calls };
    }
  );
  memoized.stats = stats;
  memoized.cache = cache;
  return memoized;
}
