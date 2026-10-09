import RNG from '../lib/rng.js';
import { calculateDamageRoll } from '../lib/Game/Rolls.js';

const rng = new RNG(0xb0a9b6c8).jump(20);

const characters = [{ mgc: 47 }, { mgc: 39 }, { mgc: 80 }, { mgc: 93 }, { mgc: 36 }, { mgc: 21 }];
const zombieDragonMgcAtk = 130;
const damageRolls = characters.map(({ mgc }) => {
  rng.next();
  const roll = calculateDamageRoll(zombieDragonMgcAtk, mgc, rng.rand);
  return zombieDragonMgcAtk - mgc + roll;
});

console.log(damageRolls);
