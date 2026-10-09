import { countWheelAttempts, isRun } from './Game/Rolls.js';

export default function createFight(area, enemyGroup, rng) {
  return {
    enemyGroup: enemyGroup,
    area: area,
    startRNG: rng.raw,
    battleRNG: rng.peek().raw,
    index: rng.count,
    run: isRun(rng.peek(2).rand),
    wheel: countWheelAttempts(rng.clone().next()),
  };
}
