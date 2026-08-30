import RNG from '../lib/rng.js';

const rng = new RNG(0xb0a9b6c8).next(20);

const characters = [
  { mgc: 47 },
  { mgc: 39 },
  { mgc: 80 },
  { mgc: 93 },
  { mgc: 36 },
  { mgc: 21 },
];
const zombieDragonMgcAtk = 130;
const damageRolls = mgcStats.map(mgc => {
  rng.next();
  const roll = rng.calculateDamageRoll(zombieDragonMgcAtk, mgc)
  return zombieDragonMgcAtk - mgc + roll;
});

console.log(damageRolls);
