import Rounds from './data/bandit_lv7_hp55_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/bandit_lv7_hp55/sim_fixture.json
// (v1.0, 20 seeds x 4 rounds, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Bandit Lv7 hp55 matches the recorded rounds');
