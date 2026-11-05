import { describe, it } from 'node:test';
import assert from 'node:assert';
import Rounds from '../../fixtures/enemies/beast_commander_lv13_hp90_rounds.json' with { type: 'json' };
import Enemy from '../../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../../lib/Game/Battle/Party.js';
import Battle from '../../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../../lib/Game/Battle/Actions.js';
import { ENEMY_KEYS } from '../../../lib/Game/Keys.js';
import RNG from '../../../lib/rng.js';

// The turn-order roll's inputs. Every poll the simulator makes (one rand() per combatant whose acted byte
// +0x46 and busy byte are both clear) must see the same combatants as the recording's turn_order_inputs
// (every change of each combatant's action_tag and busy, round clock, frame 1 = the state the previous round
// left), read strictly before the poll's frame. This is what the Sleep target being busy at once rests on.

/** the round-clock frame is the sim's tick + 30 */
const CLOCK = 30;

describe('Beast Commander turn-order polls see the recorded acted / busy bytes', () => {
  for (const run of Rounds.runs) {
    for (const { seed, rounds } of run.seeds) {
      it(`${run.party}${run.scenario ? ` ${run.scenario}` : ''} seed ${seed}`, () => {
        const party = PlayerParty.fromCharacterJSON(
          structuredClone(/** @type {any} */ (run.characters)),
        );
        const enemies = new EnemyParty(
          run.enemies.map((key) => new Enemy(/** @type {any} */ (ENEMY_KEYS)[key])),
        );
        const rng = new RNG(rounds[0].rngAtConfirm);
        const battle = new Battle({ party, enemies, rng, freeWillGate: 10 });
        /** @type {{ frame: number, eligible: number[] }[]} */
        let polls = [];
        const turnRoll = battle.turnRoll.bind(battle);
        battle.turnRoll = () => {
          const eligible = [];
          for (let i = 1; i < battle.combatants.length; i++) {
            const c = battle.combatants[i];
            if (!c.acted && !c.isBusy(battle.turn.tick)) eligible.push(i);
          }
          polls.push({ frame: battle.turn.tick + CLOCK, eligible });
          return turnRoll();
        };
        for (const round of rounds) {
          rng.raw = round.rngAtConfirm;
          battle.combatants.forEach((c, i) => {
            if (c) c.HP = round.hpAtConfirm[i - 1];
          });
          polls = [];
          battle.playTurn(
            party.combatants.map((_, i) => {
              const [type, , target] = (round.partyActions?.[i] ?? '1.0.0').split('.').map(Number);
              return type === 0
                ? { type: ACTION_TYPES.ATTACK, target: target - party.combatants.length - 1 }
                : { type: ACTION_TYPES.DEFEND };
            }),
          );
          for (const { frame, eligible } of polls) {
            /** @type {Map<number, [number, number]>} */
            const state = new Map();
            for (const [f, combatant, tag, busy] of /** @type {number[][]} */ (
              round.turnOrderInputs
            ))
              if (f < frame) state.set(combatant, [tag, busy]);
            const recorded = [...state]
              .filter(([, [tag, busy]]) => tag === 0 && busy === 0)
              .map(([c]) => c)
              .sort((a, b) => a - b);
            assert.deepStrictEqual(
              eligible,
              recorded,
              `round ${round.round}, poll at frame ${frame}`,
            );
          }
        }
      });
    }
  }
});
