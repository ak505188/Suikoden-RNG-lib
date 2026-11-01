import Rounds from './data/slasher_rabbit_lv6_hp60_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/slasher_rabbit_lv6_hp60/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Slasher Rabbit Lv6 hp60 matches the recorded rounds');
