import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { ENEMY_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';
import Rounds from './data/mosquito_lv4_hp17_rounds.json' with { type: 'json' };

// Every round of 20 seeds (4 rounds each, one battle per seed, the RNG rewritten at each confirm),
// recorded live on v1.0 (Suikoden-Bizhawk-HUD, enemy_profiles/enemies/mosquito_lv4_hp17): 6 Mosquito
// against a party that Defends. Frames are the round clock: the sim's tick + 30 (the confirm to
// the camera roll), and a turn starts one frame after its turn roll. g_FreeWillGate is 10 in the
// recorded state.
describe('Mosquito Lv4 hp17 matches the recorded rounds', () => {
  const CLOCK = 30;

  for (const run of Rounds.runs) {
    for (const { seed, rounds } of run.seeds) {
      it(`${run.party} seed ${seed}`, () => {
        const party = PlayerParty.fromCharacterJSON(
          structuredClone(/** @type {any} */ (run.characters)),
        );
        const enemies = new EnemyParty(
          Array.from({ length: 6 }, () => new Enemy(ENEMY_KEYS.MOSQUITO)),
        );
        const rng = new RNG(rounds[0].rngAtConfirm);
        const battle = new Battle({ party, enemies, rng, freeWillGate: 10 });

        for (const round of rounds) {
          rng.raw = round.rngAtConfirm;
          party.combatants.forEach((c, i) => (c.HP = round.hpAtConfirm[i]));
          const from = battle.log.entries.length;
          battle.playTurn(party.combatants.map(() => ({ type: ACTION_TYPES.DEFEND })));
          const entries = battle.log.entries.slice(from);

          const turns = entries
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => e.type === LOG_TYPES.TURN && e.actor?.startsWith('Mosquito'))
            .map(({ e, i }) => {
              const decision = entries.slice(i + 1).find((x) => x.type === LOG_TYPES.ATTACK);
              const nextDefend = entries.slice(i + 1).find((x) => x.type === LOG_TYPES.DEFEND);
              return { e, decision, nextDefend };
            });
          const actual = turns.map(({ e, decision, nextDefend }, i) => {
            const next = turns[i + 1];
            return [
              Number(e.actor?.split('#')[1]) + party.combatants.length,
              e.tick + CLOCK + 1,
              next ? next.e.tick + CLOCK + 1 : /** @type {number} */ (nextDefend?.tick) - 1 + CLOCK,
              party.combatants.findIndex((c) => c.label === decision?.target) + 1,
              decision ? 'Attack' : null,
            ];
          });
          assert.deepStrictEqual(actual, round.turns, 'round turns');

          const damage = entries
            .filter((e) => e.type === LOG_TYPES.DAMAGE)
            .map((e) => [
              e.tick + CLOCK,
              party.combatants.findIndex((c) => c.label === e.target) + 1,
              -(e.amount ?? 0),
            ]);
          assert.deepStrictEqual(damage, round.hpChanges);
          assert.strictEqual(rng.raw, round.rngAtRoundEnd);
          if (!round.ended) {
            const end = /** @type {number} */ (
              entries.filter((e) => e.type === LOG_TYPES.ROUND_END).at(-1)?.tick
            );
            assert.strictEqual(end + CLOCK + 19, round.frames, 'round length');
          }
          assert.strictEqual(battle.status !== 'In Progress', round.ended);
          if (round.ended) break;
        }
      });
    }
  }
});
