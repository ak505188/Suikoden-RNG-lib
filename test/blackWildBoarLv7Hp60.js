import Rounds from './data/black_wild_boar_lv7_hp60_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/black_wild_boar_lv7_hp60/sim_fixture.json
// (v1.0, 20 seeds x 4 rounds, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Black Wild Boar Lv7 hp60 matches the recorded rounds');
