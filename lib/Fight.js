import RNG from './rng.js';

export default function createFight(area, enemyGroup, rng) {
  return {
    enemyGroup: enemyGroup,
    area: area,
    startRNG: rng.getRNG(),
    battleRNG: rng.getNext().rng,
    index: rng.getCount(),
    run: RNG.isRun(rng.getNext(2).rng2),
    wheel: RNG.getWheelAttempts(rng.clone().next()),
  };
}
