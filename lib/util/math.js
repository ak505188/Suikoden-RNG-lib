export function mult32ulo(n, m) {
  n >>>= 0;
  m >>>= 0;
  const nlo = n & 0xffff;
  const nhi = n - nlo;
  return ((((nhi * m) >>> 0) + nlo * m) & 0xffffffff) >>> 0;
}

export function mult32uhi(n, m) {
  n >>>= 0;
  m >>>= 0;

  return (n * m - mult32ulo(n, m)) / Math.pow(2, 32);
}

export function div32ulo(n, m) {
  return Math.floor(n / m) >>> 0;
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
  return num < 0 === den < 0 ? magnitude : -magnitude;
}
