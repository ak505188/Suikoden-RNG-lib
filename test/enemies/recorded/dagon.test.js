import Rounds from '../../fixtures/enemies/dagon_lv31_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dagon (Lv31, 400 HP), world map 6 forced group 1, alone: g_data.bin 0x80080338 on v1.0: the front-row pass, one move roll
// (rand % 100 < 76 on the raw value -> the generic Attack, else the Special), the Special a half-damage hit and a 30% Poison
// roll as the second roll of the hit frame (the Oannes' Special's timing). The party's Poison bytes are checked per round.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/dagon_lv31_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DAGON).
describeFixture(Rounds, 'Dagon Lv31 hp400 matches the recorded rounds');
