import Rounds from '../../fixtures/enemies/shadow_man_lv50_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 5 Shadow Man (Lv50, 400 HP; f_data.bin, v1.0 0x800821e0): the Kalekka Shadow's shape: plain target scan, no move roll, no hit
// roll, a windup script and one strike that holds the next actor. Lone and Shadow Man x2.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/shadow_man_lv50_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (400=SHADOW_MAN).
describeFixture(Rounds, 'Shadow Man Lv50 hp400 matches the recorded rounds');
