import { calculateDamageRoll } from './Game/Rolls.js';

export function simulateAssassinTurn(rng, def, defend = true) {
  const atk = 120;
  const { move, move_name } = determineAssassinMove(rng);
  if (move === 1) rng.next();
  const roll = calculateDamageRoll(atk, def, rng.next().rand);

  let dmg = atk - def + roll;

  if (defend) {
    if (dmg < 0) {
      dmg = dmg + 1;
    }
    dmg = dmg >> 1;
  }

  if (move === 1) return { move, move_name, rng, damage: dmg };

  dmg = dmg * 3;
  if (dmg < 0) {
    dmg = dmg + 1;
  }

  dmg = dmg >> 1;

  return { move, move_name, rng, damage: dmg };
}

export function determineAssassinMove(rng) {
  // Push RNG forward for turn start
  // And for McDohl > Assassin turn
  rng.jump(4);

  // Run rng check until it returns true
  do {
    rng.next();
  } while (rng.rand % 100 < 51);

  // Determine Move
  rng.next();

  let r3 = rng.rand << 1;
  r3 = r3 + rng.rand;
  r3 = r3 << 3;
  r3 = r3 + rng.rand;
  r3 = r3 << 2;

  const move = Math.floor(r3 / 0x7fff) < 51 ? 1 : 0;
  const move_name = move === 1 ? 'Shuriken' : 'Melee';

  return { move, move_name, rng: rng.raw };
}

export function simulateAssassinFight(rng, def, defend = true) {
  const turn1 = simulateAssassinTurn(rng, def, defend);
  const turn2 = simulateAssassinTurn(rng, def, defend);

  // Delay at start of turn
  rng.jump(4);

  // Run rng check until it returns true
  do {
    rng.next();
  } while (rng.rand % 100 < 51);

  // Advancement from petal effect;
  rng.jump(200);

  return {
    turns: [turn1, turn2],
    advancement: rng.count,
    rng: rng.raw,
  };
}
