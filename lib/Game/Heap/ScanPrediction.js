import RNG from '../../rng.js';

/**
 * Crystal Core's phase-1 Attack: the target scan, predicted from the round's RNG alone (Suikoden-Bizhawk-HUD
 * scripts/heap/ScanPredict.py; v1.0, screen 5/1/9). The round's RNG is seed + round (the recordings set it before confirming the
 * round). The camera roll is its first rand() % 3; after `prefix` more rolls (the party's turn polls: 23 in all with the slow party,
 * 28 with L-fire) the scan offers party slots 1, 2 and 3 one rand() each, and rand() % 100 > 50 takes the target. A pass nobody takes
 * is repeated on the next tick (one more frame): the hit effect's first draw is frame 50 + `passes` (slow party), 56 + `passes` (L-fire).
 * Exact in 170 of 170 slow-party seeds and 60 of 60 L-fire ones.
 * @param {number} seed
 * @param {number} [round]
 * @param {number} [prefix] - rolls before the first scan roll, the camera roll included
 * @returns {{ slot: number, passes: number, camera: number }} slot 1..3 (party array order, 1-based), failed passes, camera class 0..2
 */
export function scanPrediction(seed, round = 1, prefix = 23) {
  const rng = new RNG((seed + round) >>> 0);
  const camera = rng.next().rand % 3;
  for (let i = 1; i < prefix; i++) rng.next();
  for (let passes = 0; ; passes++)
    for (let slot = 1; slot <= 3; slot++)
      if (rng.next().rand % 100 > 50) return { slot, passes, camera };
}

/**
 * The hit effect's draw-buffer index at round `round`'s last draw: the buffer alternates every frame, so it follows the parity of the
 * frames elapsed. Each round adds a fixed odd number of frames, every failed scan pass one more, and any menu time before a confirm
 * counts (a recorded input, not modelled: 0 here). Exact in all 144 three-round runs (menu delays included) and the 320 two-round ones.
 * @param {number} round - 1-based
 * @param {number} passesSoFar - the failed scan passes of rounds 1 to `round`, summed
 * @param {number} [menuDelays] - frames waited at the Fight menu before the confirms of rounds 1 to `round`, summed
 */
export function drawIndex(round, passesSoFar, menuDelays = 0) {
  // (a negative sum, from a round that started early, has the parity of its absolute value)
  return Math.abs(round + passesSoFar + menuDelays) % 2;
}
