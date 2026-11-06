import Rounds from '../../fixtures/enemies/earth_golem_lv53_hp600_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 7 Earth Golem (Lv53, 600 HP): the Clay Doll's shape: scan, move roll (under 71 = Attack, else Special), PWR 340; the Special is six Earth hits (MGC 230) with the CalcRune halving. Lone, x2 and the S-rune1 / S-rune2 parties.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/earth_golem_lv53_hp600/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (600=EARTH_GOLEM).
describeFixture(Rounds, 'Earth Golem Lv53 hp600 matches the recorded rounds');
