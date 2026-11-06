import Rounds from '../../fixtures/enemies/elite_soldier_lv52_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Elite Soldier Lv52 (screen 7/0/1): the plain scan, always the generic Attack (PWR 340). Lone and x2.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/elite_soldier_lv52_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja=NINJA,Magus=MAGUS).
describeFixture(Rounds, 'Elite Soldier Lv52 (screen 7/0/1) matches the recorded rounds');
