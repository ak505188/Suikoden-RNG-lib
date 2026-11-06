import Rounds from '../../fixtures/enemies/hawk_man_lv35_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Kalekka Hawk Man x2 (Lv35, 300 HP; vg2.bin 0x8001301c): plain target scan and the generic Attack; the first Hawk Man's attack is cut short when the other follows.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/hawk_man_lv35_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (HAWK_MAN,HAWK_MAN).
describeFixture(Rounds, 'Hawk Man Lv35 hp300 matches the recorded rounds');
