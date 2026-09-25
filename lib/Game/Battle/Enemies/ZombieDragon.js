import Enemy from '../Enemy.js';
import { ENEMY_KEYS } from '../../Keys.js';
import { ENEMY_ACTION_TYPES } from '../../Battle/Actions.js';
import { TARGET } from '../../Constants.js';

/** @typedef {import('../../../rng.js').default} RNG */
/** @typedef {import('../Actions.js').ActionParams} ActionParams */
/** @typedef {import('../Combatant.js').ResolveActionParams} ResolveActionParams */

class ZombieDragon extends Enemy {
  constructor() {
    super(ENEMY_KEYS.ZOMBIE_DRAGON);
    this.moveThreshold = 71;
  }

  fireBreath({ party, rng }) {


  }

  /** @param {ResolveActionParams} */
  selectMove({ party, rng, turn_count }) {
    const numCandidates = party.getFrontRow().length;
    const targetIndex = this.selectTarget(rng, numCandidates);

  }

  /** @param {ResolveActionParams} params @returns {ActionParams} */
  resolveAction({ party, rng }) {
    // This unfinished, need to check character state to see if target is valid
    // And to determine if wait is needed.
    const numCandidates = party.getFrontRow().length;
    const targetIndex = this.selectTarget(rng, numCandidates);
  }
}

export default ZombieDragon;
