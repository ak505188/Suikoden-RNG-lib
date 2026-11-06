import Rounds from '../../fixtures/enemies/hell_hound_lv37_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map wm4 (e_data.bin): Hell Hound Lv37 hp300.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/hell_hound_lv37_hp300/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Hell Hound Lv37 hp300 matches the recorded rounds');
