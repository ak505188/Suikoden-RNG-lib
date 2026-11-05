import Rounds from '../../fixtures/enemies/red_slime_lv27_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Red Slime (Lv27, 150 HP): the default target pass and the generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/red_slime_lv27_hp150/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Red Slime Lv27 hp150 matches the recorded rounds');
