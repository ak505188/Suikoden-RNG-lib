import Rounds from '../../fixtures/enemies/mad_ivy_lv28_hp600_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 3 Mad Ivy (Lv28, 600 HP; d_data.bin 0x80080038 on v1.0): the Giant Snail's logic, the default front-row target pass and the generic Attack. Lone, forced group 4.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/mad_ivy_lv28_hp600/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (MAD_IVY).
describeFixture(Rounds, 'Mad Ivy Lv28 hp600 matches the recorded rounds');
