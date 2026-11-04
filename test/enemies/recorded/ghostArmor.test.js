import Rounds from '../../fixtures/enemies/ghost_armor_lv17_hp250_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Toran Castle Ghost Armor (Lv17, 250 HP, alone): vb5.bin 0x8001017c on v1.0. No roll in the AI: its
// Ghost Spirits hit the first three free party members in index order (no row test), one damage roll each.
// The idle-cycle wait before the first hit is a recorded input (0-32 frames, from the menu time).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ghost_armor_lv17_hp250/sim_fixture.json
// (v1.0; S-hit, S-two, S-one, S-dead, the S-mid busy scenario, menu-hold runs) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Ghost Armor Lv17 hp250 matches the recorded rounds');
