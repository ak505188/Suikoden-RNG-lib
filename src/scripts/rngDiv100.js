import RNG from '../lib/rng.js';

const rng = new RNG(0x43);

for (let i = 0; i < 20000; i++) {
  const result = rng.getRNG2() % 100;
  const curString = `${i.toString().padStart(5, '0')} ${result.toString().padStart(3, '0')} 0x${rng.getRNG().toString(16)}`;
  console.log(curString);
  rng.next();
}
