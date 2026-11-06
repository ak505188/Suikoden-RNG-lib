import Rounds from '../../fixtures/enemies/grave_master_lv39_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map wm4 (e_data.bin): Grave Master Lv39 hp400.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/grave_master_lv39_hp400/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Grave Master Lv39 hp400 matches the recorded rounds');
