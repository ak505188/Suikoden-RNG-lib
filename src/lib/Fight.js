import { div32ulo } from './lib';

function isRun(r2) {
  let r3 = 100;
  r3 = r2 % r3;
  return r3 > 50 ? true : false;
}

export function wheelSuccess(rng) {
  let counter = 0;
  const success = pos => {
    return pos >= 0x7f && pos <= 0xa0;
  };
  do {
    counter++;
    rng.next();
  } while (!success(div32ulo(rng.getRNG2(), 0x5a)));
  return --counter;
}

export default function createFight(area, enemyGroup, rng) {
  return {
    enemyGroup: enemyGroup,
    area: area,
    startRNG: rng.getRNG(),
    battleRNG: rng.getNext().rng,
    index: rng.getCount(),
    run: isRun(rng.getNext(2).rng2),
    wheel: wheelSuccess(rng.clone().next()),
  };
}
