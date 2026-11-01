import Rounds from './data/bandit_lv5_hp34_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/bandit_lv5_hp34/sim_fixture.json
// (v1.0, 20 seeds x 4 rounds, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Bandit Lv5 hp34 matches the recorded rounds');
