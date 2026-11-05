import Rounds from '../../fixtures/enemies/nightmare_lv32_hp150_rounds.json' with { type: 'json' };
import { describeFixture, playRecordedRun } from '../../helpers/recordedRounds.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Sonierre / Scarletia Nightmare (Lv32, 150 HP; vd5.bin 0x800142f8 on v1.0): the front-row pass, no move roll, then a
// three-way roulette (a first roll and four laps of re-rolls until the pick changes): 0 heals EVERY living enemy by 250
// (capped at max HP) after the Slot man's particle effect, 1 a long single hit (magic), 2 a short single hit. The heal is
// invisible at full HP, so the fixture also holds the rigged-HP recordings (lowhp: the lone Nightmare at 20 / 100 HP;
// group 8: Red Slime x3 + Nightmare, all at 20 / 100), where all four enemies gain the same amount on the same frame.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/nightmare_lv32_hp150 (v1.0, S-hit, the party Defends):
// sim_fixture.json's full-HP run, plus lowhp_v10.txt and mixed_g8_v10.txt run through the same BuildSimFixture.py as
// turns_v10_lowhp.txt / turns_v10_g8.txt (the shipped sim_fixture.json has only the full-HP run) and scripts/FixtureToRounds.py
// (Nightmare=NIGHTMARE,"Red Slime"=RED_SLIME); the Red Slimes' own turns are named by path
// (a8df6a15 Attack, c9853477 Skip) in the converted data.

const isGroup = (/** @type {any} */ run) => run.enemies.length > 1;

// the lone Nightmare: every recorded quantity, the full-HP run and the rigged-HP one (the heals)
describeFixture(
  { ...Rounds, runs: Rounds.runs.filter((run) => !isGroup(run)) },
  'Nightmare Lv32 hp150 matches the recorded rounds',
);

// Red Slime x3 + Nightmare: the Red Slime's AI is not implemented yet (it skips 48 of its 75 recorded turns here, the
// simulator attacks), so only the Nightmare's own turn (it acts first in all 24 rounds: the turn, its RNG and roll count)
// and the heals are compared: every enemy, the Slimes included, gains the same amount on the same frame
describe('Nightmare Lv32 hp150 in a group (Red Slime x3): its turn and the heal of every enemy', () => {
  for (const run of Rounds.runs.filter(isGroup)) {
    for (const { seed, rounds } of playRecordedRun(run)) {
      for (const r of rounds) {
        it(`seed ${seed} round ${r.round}`, () => {
          const heals = (/** @type {number[][]} */ changes) =>
            changes.filter(([, , delta]) => delta > 0);
          assert.strictEqual(r.expectedTurns[0][0], 10, 'the Nightmare acts first');
          assert.deepStrictEqual(
            r.turns[0],
            r.expectedTurns[0],
            'turn start, end, target and move',
          );
          assert.strictEqual(r.rng0[0], r.expectedRng0[0], 'the RNG when it became the actor');
          assert.strictEqual(r.windows[0], r.expectedWindows[0], "the turn's rand() calls");
          assert.deepStrictEqual(
            heals(r.damage),
            heals(r.expectedDamage),
            'heals: frame, combatant, amount',
          );
          const frames = new Set(heals(r.damage).map(([frame]) => frame));
          assert.ok(frames.size <= 1, 'every enemy heals on one frame');
        });
      }
    }
  }
});
