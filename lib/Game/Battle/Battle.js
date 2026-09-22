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
    this.combatants = [...party.combatants, ...enemies.combatants];
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

  genCombatantSpeed() {
    this.combatants
      .filter(actor => actor.canAct)
      .forEach(actor => {
        actor.genSpdRoll(this.rng)
      });
  }

  hasUnresolvedActors() {
    return this.combatants.filter(actor => !actor.acted && actor.isAlive).length > 0;
  }

  getNextActor() {
    const possibleActors = this.combatants.filter(actor => actor.canAct);
    if (possibleActors.length < 0) return null;
    let maxIndex = 0;
    for (let i = 1; i < possibleActors.length; i++) {
      if (possibleActors[i].spdRoll > possibleActors[maxIndex].spdRoll) maxIndex = i;
    };
    return possibleActors[maxIndex];
  }

  /** @param {Action[]} turn */
  playTurn(turn) {
    this.party.setActionPlan(turn);
    this.rng.next();
    while (this.hasUnresolvedActors()) {
      const actionQueue = [];
      this.genCombatantSpeed();
      let nextActor = this.getNextActor();
      nextActor.resolveAction({ party: this.party, enemies: this.enemies, rng: this.rng, turn_count: this.turn_count })
    }
  }
}
