import Rounds from '../../fixtures/enemies/red_elemental_lv42_hp80_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Red Elemental x3 + Clay Doll, and x3 + Banshee (Cave of the Past groups 9 and 10): the Red Elementals (ve2.bin 0x80015be4 on
// v1.0) are the Black Elemental's scan and generic Attack, cut short to 12-13 frames when another actor follows. The fixture
// also holds the Clay Doll's and the Banshee's turns in those groups (their Specials wait for the party members the Elementals hit).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/red_elemental_lv42_hp80/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py (RED_ELEMENTAL x3, CLAY_DOLL / BANSHEE).
describeFixture(Rounds, 'Red Elemental Lv42 hp80 matches the recorded rounds');
