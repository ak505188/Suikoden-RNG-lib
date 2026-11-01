import Rounds from '../../fixtures/enemies/soldier_ant_lv4_hp28_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/soldier_ant_lv4_hp28/sim_fixture.json
// (v1.0, 20 seeds x 4 rounds, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Soldier Ant Lv4 hp28 matches the recorded rounds');
