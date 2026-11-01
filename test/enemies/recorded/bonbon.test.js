import Rounds from '../../fixtures/enemies/bonbon_lv5_hp18_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/bonbon_lv5_hp18/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'BonBon Lv5 hp18 matches the recorded rounds');
