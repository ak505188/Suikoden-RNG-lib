import Rounds from '../../fixtures/enemies/sorcerer_lv40_hp200_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map wm4 (e_data.bin): Sorcerer Lv40 hp200.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/sorcerer_lv40_hp200/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Sorcerer Lv40 hp200 matches the recorded rounds');
