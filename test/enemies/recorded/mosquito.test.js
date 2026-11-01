import Rounds from '../../fixtures/enemies/mosquito_lv4_hp17_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/mosquito_lv4_hp17/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Mosquito Lv4 hp17 matches the recorded rounds');
