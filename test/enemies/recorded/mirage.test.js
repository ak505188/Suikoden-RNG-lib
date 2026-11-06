import Rounds from '../../fixtures/enemies/mirage_wm5_lv52_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 5 Mirage (Lv52, 400 HP; f_data.bin, v1.0 0x80083f74; NOT the wm7 h_data copy): the Black Elemental's scan (both rows), then the
// target's row picks the move: front row the generic Attack, back row a special with no hit roll; both hit once 84 ticks after the decision.
// Mirage x2 and Mirage x4.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/mirage_wm5_lv52_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (400=MIRAGE).
describeFixture(Rounds, 'Mirage Lv52 hp400 (wm5) matches the recorded rounds');
