import Rounds from '../../fixtures/enemies/grizzly_bear_lv34_hp470_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Grizzly Bear (Lv34, 470 HP), world map 6 forced group 7, alone: g_data.bin 0x80080014 on v1.0: the default front-row target
// pass and the generic Attack, nothing else (no move roll, no status roll). The party status bytes are checked too: nobody gets a status.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/grizzly_bear_lv34_hp470/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (GRIZZLY_BEAR).
describeFixture(Rounds, 'Grizzly Bear Lv34 hp470 matches the recorded rounds');
