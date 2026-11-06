import Rounds from '../../fixtures/enemies/whip_wolf_lv38_hp350_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map wm4 (e_data.bin): Whip Wolf Lv38 hp350.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/whip_wolf_lv38_hp350/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Whip Wolf Lv38 hp350 matches the recorded rounds');
