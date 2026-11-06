import Rounds from '../../fixtures/enemies/black_elemental_lv48_hp120_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Black Elemental x3 + Sunshine King (Dragon's Den group 6): the Black Elementals (vf1.bin 0x8001494c on v1.0) scan both rows and
// basic-attack; they act first and the next actor cuts each Attack short (12-13 frames). The fixture also holds the Sunshine King's
// turns in the group (its windup waits for the party members the Elementals hit).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/black_elemental_lv48_hp120/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (BLACK_ELEMENTAL x3, SUNSHINE_KING).
describeFixture(Rounds, 'Black Elemental Lv48 hp120 matches the recorded rounds');
