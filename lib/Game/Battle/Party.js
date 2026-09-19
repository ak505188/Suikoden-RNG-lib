import { DEFAULT_ACTION } from './Actions.js';

/** @typedef {import('./Character.js').default} Character */
/** @typedef {import('./Enemy.js').default} Enemy */
/** @typedef {import('./Actions.js').Action} Action */
/** @typedef {import('../../rng.js').default} RNG */

/** @template {Character|Enemy} T */
export class Party {
  /** @param {T[]} actors */
  constructor(actors) {
    this.actors = actors;
    this.partySize = actors.length;

    if (this.partySize > 6) {
      throw new Error(`Party size > 6: ${actors}`);
    }
  }

  isAlive() {
    return this.actors.filter(actor => actor.isAlive).length > 0;
  }

  /** @param {RNG} rng */
  calcSpeed(rng) {
    this.actors.forEach(actor => {
      const weight = rng.next().getRNG2() % 10 - 5;
      const speed = actor.SPD * 10 + weight;
      console.log(speed);
    });
  }
}

/** @extends {Party<Character>} */
export class PlayerParty extends Party {
  /** @param {Character[]} characters */
  constructor(characters) {
    super(characters);
  }

  /** @param {Action[]} actions */
  setActionPlan(actions = new Array(6).fill(DEFAULT_ACTION)) {
    if (actions.length > 6) {
      actions = actions.slice(0, 6);
    } else if (actions.length < this.partySize) {
      const remainderLength = this.partySize - actions.length;
      actions = [...actions, ...Array(remainderLength).fill(DEFAULT_ACTION)];
    }

    this.actors.forEach((actor, index) => {
      actor.setAction(actions[index]);
    });
  }
}

/** @extends {Party<Enemy>} */
export class EnemyParty extends Party {
  /** @param {Enemy[]} enemies */
  constructor(enemies) {
    super(enemies);
  }
}
