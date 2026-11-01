import Rounds from './data/killer_slime_lv7_hp40_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Mt. Seifu Killer Slime (Lv7, 40 HP): va8.bin 0x80010028. The default front-row target pass and
// the generic Attack, nothing else (same logic as the Giant Snail at a different address).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/killer_slime_lv7_hp40/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Killer Slime Lv7 hp40 matches the recorded rounds');
