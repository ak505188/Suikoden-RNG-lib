export default class Battle {
  constructor({ party, enemies, rng, turn_count }) {
    this.party = party;
    this.enemies = enemies;
    this.rng = rng;
    this.turn_count = turn_count || 0;
    this.turns = [];
  }
}
