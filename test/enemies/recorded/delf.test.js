import Rounds from '../../fixtures/enemies/delf_lv25_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Viperman Lv30 + Delf Lv25 (group 1): each enemy's own turns.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/delf_lv25_hp150/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Delf Lv25 hp150 matches the recorded rounds');
