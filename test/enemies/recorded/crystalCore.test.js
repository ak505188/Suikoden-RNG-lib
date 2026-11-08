import Rounds from '../../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };
import { describeFixture, playRecordedRun } from '../../helpers/recordedRounds.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Crystal Core Lv60 (screen 5/1/9), scripted lone two-phase boss: phase 1 a swapped-argument Attack (the party member's ATK - 90), then
// its first death refills it in a second form whose only move is a six-member element-8 Special (MGC 275).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/crystal_core_lv60_hp5000/sim_fixture.json
// (v1.0, S-hit / S-def0 / S-miss and the kill_atk, kill_spell, kill_spell_bare, kill_spell_se, final_atk, final_spell scenarios)
// by scripts/FixtureToRounds.py (CRYSTAL_CORE).

const isFinal = (/** @type {{ scenario?: string | null }} */ run) =>
  !!run.scenario?.startsWith('final_');

// The final_* runs' round 2 never closes on the recorder's clock (8027 frames, only periodic turn-order polls: a recording limit), so
// it is not a complete round: only round 1 is compared whole, and round 2 is checked for the kill alone (below).
describeFixture(
  {
    ...Rounds,
    runs: Rounds.runs.map((run) =>
      isFinal(run)
        ? {
            ...run,
            seeds: run.seeds.map((/** @type {any} */ s) => ({
              ...s,
              rounds: s.rounds.slice(0, 1),
            })),
          }
        : run,
    ),
  },
  'Crystal Core Lv60 (screen 5/1/9) matches the recorded rounds',
);

describe('Crystal Core Lv60: the second form dies for good', () => {
  for (const run of Rounds.runs.filter(isFinal)) {
    for (const { seed, rounds } of playRecordedRun(run)) {
      it(`${run.party} ${run.scenario} seed ${seed} round 2: HP 1 -> 0 and the battle ends`, () => {
        const r = rounds[1];
        assert.deepStrictEqual(r.damage, r.expectedDamage, 'the kill: frame, combatant, amount');
        assert.strictEqual(r.ended, r.expectedEnded, 'the battle ended');
      });
    }
  }
});
