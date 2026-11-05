import Rounds from '../../fixtures/enemies/crimson_dwarf_lv23_hp250_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarves' Vault Crimson Dwarf (Lv23, 250 HP; vc3.bin 0x80010034 on v1.0): the Giant Snail's logic, the default front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/crimson_dwarf_lv23_hp250/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (CRIMSON_DWARF).
describeFixture(Rounds, 'Crimson Dwarf Lv23 hp250 matches the recorded rounds');
