/** @typedef {import('./Party.js').PlayerParty} PlayerParty */
/** @typedef {import('./Party.js').EnemyParty} EnemyParty */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */

/**
 * @typedef {Object} BattleOptions
 * @property {PlayerParty} party
 * @property {EnemyParty} enemies
 * @property {RNG} rng
 * @property {Action[][]} turns - One entry per round; each round is one Action per party-member slot.
 * @property {number} [turn_count]
 */

export default class Battle {
  /**
   * @param {BattleOptions} options
   */
  constructor({ party, enemies, rng, turns, turn_count = 0 }) {
    this.party = party;
    this.enemies = enemies;
    this.rng = rng;
    this.turns = turns;
    this.turn_count = turn_count;
  }

  run() {
    for (const turn of this.turns) {
      this.turn_count++;
      this.playTurn(turn);
    }

  }

  /** @param {Action[]} turn */
  playTurn(turn) {
    this.party.setActionPlan(turn);
    this.rng.next();
  }
}
