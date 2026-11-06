import Rounds from '../../fixtures/enemies/rock_buster_lv51_hp600_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Seek Valley Rock Buster (Lv51, 600 HP; vf2.bin 0x800147e0): the Clay Doll's shape: scan, move roll (under 71 = Attack, else the Special), PWR 300; the Special is six Earth hits (MGC 240) with the CalcRune halving. Lone, x3 and the S-rune1 / S-rune2 parties.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/rock_buster_lv51_hp600/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (600=ROCK_BUSTER).
describeFixture(Rounds, 'Rock Buster Lv51 hp600 matches the recorded rounds');
