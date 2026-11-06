import Rounds from '../../fixtures/enemies/demon_hound_lv37_hp700_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Kalekka Demon Hound (Lv37, 700 HP; vg2.bin 0x8001301c, shared with the Hawk Man): plain target scan and the generic Attack. Lone enemy.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/demon_hound_lv37_hp700/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEMON_HOUND).
describeFixture(Rounds, 'Demon Hound Lv37 hp700 matches the recorded rounds');
