import Rounds from './data/giant_snail_lv9_hp120_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Mt. Tigerwolf Giant Snail (Lv9, 120 HP): va8.bin 0x800110dc. The default front-row target pass and
// the generic Attack, nothing else (no flee roll, no LVL gate).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/giant_snail_lv9_hp120/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Giant Snail Lv9 hp120 matches the recorded rounds');
