import Rounds from '../../fixtures/enemies/red_soldier_ant_lv8_hp28_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/red_solider_ant_lv8_hp28/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Red Soldier Ant Lv8 hp28 matches the recorded rounds');
