import Rounds from '../../fixtures/enemies/shadow_lv36_hp170_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Kalekka Shadow x2 (Lv36, 170 HP; vg2.bin v1.0 0x80013b04): plain target scan, no move roll, no hit roll; a windup script then one strike; the script holds the next actor (back to back turns).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/shadow_lv36_hp170/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (SHADOW,SHADOW).
describeFixture(Rounds, 'Shadow Lv36 hp170 matches the recorded rounds');
