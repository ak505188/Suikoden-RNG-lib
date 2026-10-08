import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { fightPlans } from '../lib/Game/Battle/ActionPlans.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */

const DEFERRED = { type: ACTION_TYPES.DEFERRED };
const DEFEND = { type: ACTION_TYPES.DEFEND };

const bonbon = () =>
  new Battle({
    party: new PlayerParty(
      [
        CHARACTER_KEYS.MCDOHL,
        CHARACTER_KEYS.GREMIO,
        CHARACTER_KEYS.PAHN,
        CHARACTER_KEYS.CLEO,
        CHARACTER_KEYS.TED,
      ].map((key) => new Character(key)),
    ),
    enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
    rng: new RNG(0x30a82220).next(5419),
  });

/** @param {Battle} battle */
const outcome = (battle) => ({
  key: battle.stateKey(),
  status: battle.status,
  frames: battle.frames,
  log: battle.log.format(),
});

/** Actions that can wait for the member's turn: everything but Defend and Unites. @param {Action} action */
const deferrable = (action) =>
  action.type !== ACTION_TYPES.DEFEND && action.type !== ACTION_TYPES.UNITE;

/**
 * Plays `plan` with every deferrable action deferred, choosing each when its member's turn comes.
 * @param {Action[]} plan
 * @returns {{ battle: Battle, asked: number[] }} asked: the slots that were asked, in order
 */
const playDeferred = (plan) => {
  const battle = bonbon();
  battle.beginRound(plan.map((action) => (deferrable(action) ? DEFERRED : action)));
  const asked = [];
  while (!battle.playRound()) {
    const slot = battle.awaitingChoice;
    asked.push(slot);
    battle.chooseAction(plan[slot]);
  }
  return { battle, asked };
};

describe('Deferred actions', () => {
  it('play exactly like the same actions planned at round start (every 13th BonBon round-1 plan)', () => {
    let i = 0,
      checked = 0;
    for (const plan of fightPlans(bonbon())) {
      if (i++ % 13) continue;
      const planned = bonbon();
      planned.playTurn(plan);
      const { battle, asked } = playDeferred(plan);
      assert.deepStrictEqual(outcome(battle), outcome(planned), JSON.stringify(plan));
      // Asked once per deferred member (all of them get a turn here), never twice
      assert.deepStrictEqual(
        [...asked].sort(),
        plan.flatMap((action, slot) => (deferrable(action) ? [slot] : [])),
      );
      checked++;
    }
    assert.ok(checked > 3000);
  });

  it('never asks a member who never gets a turn', () => {
    const battle = bonbon();
    battle.party.combatants[4].setHP(0);
    battle.party.resetBattleState(); // Ted is out of the fight from the start
    battle.beginRound([DEFEND, DEFEND, DEFEND, DEFEND, DEFERRED]);
    assert.strictEqual(battle.playRound(), true);
  });

  it("asks at the member's first dispatch tick, before anything is rolled for their action", () => {
    const battle = bonbon();
    battle.beginRound([DEFERRED, DEFEND, DEFEND, DEFEND, DEFEND]);
    assert.strictEqual(battle.playRound(), false);
    assert.strictEqual(battle.awaitingChoice, 0);
    assert.strictEqual(battle.phase, PHASE_STATE.DISPATCH);
    const rngBefore = battle.rng.getCount();
    // Asking again without choosing changes nothing
    assert.strictEqual(battle.playRound(), false);
    assert.strictEqual(battle.rng.getCount(), rngBefore);
    battle.chooseAction({ type: ACTION_TYPES.ATTACK, target: 0 });
    assert.strictEqual(battle.awaitingChoice, null);
    assert.strictEqual(battle.playRound(), true);
  });

  it('refuses Defend and Unites as a deferred choice, and a deferred plan in playTurn', () => {
    const battle = bonbon();
    battle.beginRound([DEFERRED, DEFEND, DEFEND, DEFEND, DEFEND]);
    battle.playRound();
    assert.throws(() => battle.chooseAction(DEFEND), /round start/);
    assert.throws(
      () => battle.chooseAction({ type: ACTION_TYPES.UNITE, uniteKey: 'TALISMAN', target: 0 }),
      /round start/,
    );
    assert.throws(() => bonbon().playTurn([DEFERRED, DEFEND, DEFEND, DEFEND, DEFEND]), /deferred/);
  });

  it("won't dispatch a deferred action unchosen", () => {
    const battle = bonbon();
    battle.beginRound([DEFERRED, DEFEND, DEFEND, DEFEND, DEFEND]);
    battle.playRound();
    assert.throws(() => battle.tick(), /deferred/);
  });

  it('a clone at the pause can take a different action from the original', () => {
    const battle = bonbon();
    battle.beginRound([DEFERRED, DEFEND, DEFEND, DEFEND, DEFEND]);
    battle.playRound();
    const other = battle.clone();
    battle.chooseAction({ type: ACTION_TYPES.ATTACK, target: 0 });
    other.chooseAction({ type: ACTION_TYPES.ATTACK, target: 2 });
    battle.playRound();
    other.playRound();
    const planned = bonbon();
    planned.playTurn([{ type: ACTION_TYPES.ATTACK, target: 2 }, DEFEND, DEFEND, DEFEND, DEFEND]);
    assert.deepStrictEqual(outcome(other), outcome(planned));
    assert.notStrictEqual(outcome(battle).key, outcome(other).key);
  });
});
