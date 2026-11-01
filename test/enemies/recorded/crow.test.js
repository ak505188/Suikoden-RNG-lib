import Rounds from '../../fixtures/enemies/crow_lv4_hp15_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/crow_lv4_hp15/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Crow Lv4 hp15 matches the recorded rounds');
