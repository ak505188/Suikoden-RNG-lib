import Rounds from '../../fixtures/enemies/viperman_lv30_hp200_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Viperman Lv30 (hp200), group 1 (with a Delf) and group 2 (Delf x3 + Viperman).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/viperman_lv30_hp200/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Viperman Lv30 hp200 matches the recorded rounds');
