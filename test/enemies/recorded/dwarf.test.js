import Rounds from '../../fixtures/enemies/dwarf_lv21_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarf Trail Dwarf (Lv21, 300 HP; vc1.bin 0x80010004 on v1.0, shared with the Eagle man): the Giant Snail's
// logic, the default front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/dwarf_lv21_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DWARF).
describeFixture(Rounds, 'Dwarf Lv21 hp300 matches the recorded rounds');
