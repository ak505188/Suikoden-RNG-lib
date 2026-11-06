import Rounds from '../../fixtures/enemies/siren_lv32_hp250_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Siren (Lv32, 250 HP), Kalekka Area, world map 6 forced group 8, alone: g_data.bin 0x800807b0 on v1.0: the front-row pass, one move
// roll ((r * 100) / 32767 < 51 -> the generic Attack, else the Special). The Attack's hit reaction rolls Sleep (10%) two ticks after the
// damage roll; the Special is a magic hit on all six members and six Silence rolls (10% each) the tick after the damage rolls.
// The party's Sleep and Silence bytes are checked per round.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/siren_lv32_hp250/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (SIREN_1).
describeFixture(Rounds, 'Siren Lv32 hp250 matches the recorded rounds');
