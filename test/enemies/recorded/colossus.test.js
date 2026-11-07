import Rounds from '../../fixtures/enemies/colossus_lv59_hp800_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Colossus Lv59 (screen 11/8/0, lone): the plain scan, generic Attack (PWR 350), hit at turn frame 75-76.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/colossus_lv59_hp800/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (COLOSSUS).
describeFixture(Rounds, 'Colossus Lv59 matches the recorded rounds');
