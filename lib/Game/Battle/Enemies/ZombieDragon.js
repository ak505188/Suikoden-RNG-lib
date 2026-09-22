import Enemy from '../Enemy.js';
import { BOSSES } from '../../Bestiary/Bosses.js';

/** @typedef {import('../../../rng.js').default} RNG */

class ZombieDragon extends Enemy {
  constructor() {
    super(BOSSES.ZOMBIE_DRAGON);
    this.moveThreshold = 71;
    console.log(this);
  }

  /** @param {RNG} rng */
  selectMove(rng) {


  }
}

export default ZombieDragon;
