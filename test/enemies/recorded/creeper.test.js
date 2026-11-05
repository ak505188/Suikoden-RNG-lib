import Rounds from '../../fixtures/enemies/creeper_lv29_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 3 Creeper (Lv29, 300 HP; d_data.bin 0x80081fa8 on v1.0): the front-row pass, one move roll ((r * 100) / 32767 < 51 -> the generic Attack), otherwise the Special: three hits on the target, no hit roll, the roll gate set to 20. Lone, forced group 7.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/creeper_lv29_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (CREEPER).
describeFixture(Rounds, 'Creeper Lv29 hp300 matches the recorded rounds');
