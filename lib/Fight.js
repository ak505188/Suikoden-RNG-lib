import RNG from './rng.js';

export default function createFight(area, enemyGroup, rng) {
  return {
    enemyGroup: enemyGroup,
    area: area,
    startRNG: rng.raw,
    battleRNG: rng.peek().raw,
    index: rng.count,
    run: RNG.isRun(rng.peek(2).rand),
    wheel: RNG.getWheelAttempts(rng.clone().next()),
  };
}
