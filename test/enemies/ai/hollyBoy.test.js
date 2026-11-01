import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../../../lib/Game/Battle/Character.js';
import Enemy from '../../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../../lib/Game/Battle/Actions.js';
import { ENEMY_AI, ENEMY_MOVES } from '../../../lib/Game/Battle/EnemyAI.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../../lib/Game/Keys.js';
import RNG from '../../../lib/rng.js';
import Rounds from '../../fixtures/enemies/holly_boy_lv3_hp10_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Magician's Island Holly Boy (Lv3, 10 HP): va4.bin 0x800109cc. The target pass, then for a target of
// LVL >= 4 one more roll, (r % 100) > 25 -> Flee, else Attack; a target below LVL 4 is always attacked.

const member = (/** @type {number} */ LVL) =>
  new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(LVL)
    .setStats({ PWR: 40, SKL: 30, DEF: 20, SPD: 20, MGC: 10, LUK: 20, HP: 400 })
    .rest();

/** Runs his AI tick by tick (nobody busy) until it commits. */
const select = (/** @type {number} */ seed, /** @type {number} */ LVL) => {
  const holly = new Enemy(ENEMY_KEYS.HOLLY_BOY_1);
  const party = new PlayerParty([member(LVL)]);
  const rng = new RNG(seed);
  let choice;
  do {
    choice = ENEMY_AI[ENEMY_KEYS.HOLLY_BOY_1](holly, {
      party,
      enemies: new EnemyParty([holly]),
      rng,
      tick: 0,
      turn_count: 1,
    });
  } while (choice.action === ACTION_TYPES.UNDETERMINED);
  return { rng, choice: /** @type {any} */ (choice) };
};

describe('Holly Boy Lv3 hp10 AI', () => {
  it('never flees from a target below LVL 4, and rolls nothing after the target pass', () => {
    for (let seed = 1; seed < 500; seed++) {
      const { rng, choice } = select(seed, 3);
      assert.strictEqual(choice.action, ACTION_TYPES.ATTACK);
      const passes = new RNG(seed);
      let rolls = 0;
      while (passes.next().rand % 100 <= 50) rolls++;
      assert.strictEqual(rng.count, rolls + 1);
    }
  });

  it('rolls once more for a target of LVL 4 or more: flee on (r % 100) > 25', () => {
    for (let seed = 1; seed < 500; seed++) {
      const { rng, choice } = select(seed, 4);
      const probe = new RNG(seed);
      let rolls = 0;
      while (probe.next().rand % 100 <= 50) rolls++;
      const flees = probe.next().rand % 100 > 25;
      assert.strictEqual(rng.count, rolls + 2);
      if (flees) assert.strictEqual(choice.move, ENEMY_MOVES.HOLLY_BOY_FLEE);
      else assert.strictEqual(choice.action, ACTION_TYPES.ATTACK);
    }
  });

  it('has the exact odds: accept 16040 / 32768, flee 24240 / 32768', () => {
    let accept = 0,
      flee = 0;
    for (let roll = 0; roll < 32768; roll++) {
      if (roll % 100 > 50) accept++;
      if (roll % 100 > 25) flee++;
    }
    assert.deepStrictEqual([accept, flee], [16040, 24240]);
  });

  it('skips its turn with nobody in the front row, and waits (no roll) while they are all busy', () => {
    const holly = new Enemy(ENEMY_KEYS.HOLLY_BOY_1);
    const ai = ENEMY_AI[ENEMY_KEYS.HOLLY_BOY_1];
    const params = (/** @type {PlayerParty} */ party, rng = new RNG(1)) => ({
      party,
      enemies: new EnemyParty([holly]),
      rng,
      tick: 5,
      turn_count: 1,
    });

    const busy = new PlayerParty([member(10), member(10)]);
    for (const c of busy.combatants) c.busyUntil = 50;
    const rng = new RNG(1);
    assert.strictEqual(ai(holly, params(busy, rng)).action, ACTION_TYPES.UNDETERMINED);
    assert.strictEqual(rng.count, 0);

    const gone = new PlayerParty([member(10)]);
    gone.combatants[0].removedFromFight = true;
    assert.strictEqual(ai(holly, params(gone)).action, ACTION_TYPES.NOTHING);
  });
});

// Every round of 30 seeds (20 with the S-hit party, LVL 31-53; 10 with S-lvl3, every member LVL 3),
// four Holly Boys against a party that Defends (a basic attack's turn is the AI tick + 10). That the
// round end waits for a fled Holly Boy is what pins the Flee's busy time (ENEMY_MOVES.HOLLY_BOY_FLEE).
describeFixture(Rounds, 'Holly Boy Lv3 hp10 matches the recorded rounds');
