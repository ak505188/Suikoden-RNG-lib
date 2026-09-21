/** @typedef {import('../../../rng.js').default} RNG */
const CONSTANTS = {
  PARTICLE_COUNT: 20,
  TOTAL_TICKS: 96,
  RADIUS: 100,
}

const FLAMING_ARROW_RESIDUAL_LOW_12 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 78, 2868, 99,
];

/** @param {RNG} rng */
export function flamingArrowRand(rng) {
  /** @param {RNG} rng */
  const startCount = rng.count;

  const particles = [];
  for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
    particles.push({
      active: false,
      lifetime: 0,
      trailX: FLAMING_ARROW_RESIDUAL_LOW_12[i],
      velX: 0
    });
  }

  for (let tick = 0; tick < CONSTANTS.TOTAL_TICKS; tick++) {
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (!particle.active) {
        particles[i] = spawn(particle.trailX & 0xfff, rng)
      }
    }

    if (tick == CONSTANTS.TOTAL_TICKS - 1) {
      break // phase ends here: all particles force-deactivated, no decay step runs
    }

    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (particle.active) {
        if (particle.lifetime < 1) {
          particle.active = false;
        } else {
          const trailXInt = Math.abs(Math.floor(particle.trailX / 4096));
          if (trailXInt < 5) {
            particle.active = false;
          } else {
            particle.lifetime = particle.lifetime - 1;
            particle.trailX = particle.trailX + particle.velX;
          }
        }
      }
    }
  }

  return { calls: rng.count - startCount };
}

/**
 * @param {number} residualLow12
 * @param {RNG} rng
 */
function spawn(residualLow12, rng) {
  const iVar3 = (CONSTANTS.RADIUS - 1) * 2;
  const iVar5 = (rng.next().getRNG2() % iVar3 + 1) - CONSTANTS.RADIUS;

  rng.next(); // Z coordinate, not modeled

  let r3 = rng.next().getRNG2();
  let iVar1 = r3 % 64 + 128;
  let velX = -iVar5 * iVar1;
  let num = iVar5 * 5;
  let den = 6;
  let magnitude = Math.floor(Math.abs(num) / Math.abs(den));
  let q = (num < 0) === (den < 0) ? magnitude : -magnitude;
  let trailX = (residualLow12 & 0xfff) | (q * 4096);
  const lifetime = rng.next().getRNG2() % 100;
  return { active: true, lifetime, trailX, velX };
}
