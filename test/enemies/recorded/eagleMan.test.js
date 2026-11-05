import Rounds from '../../fixtures/enemies/eagle_man_lv22_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarf Trail Eagle man (Lv22, 150 HP; vc1.bin 0x80010004 on v1.0, shared with the Dwarf): the Giant Snail's
// logic, the default front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/eagle_man_lv22_hp150/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (EAGLE_MAN).
describeFixture(Rounds, 'Eagle man Lv22 hp150 matches the recorded rounds');
