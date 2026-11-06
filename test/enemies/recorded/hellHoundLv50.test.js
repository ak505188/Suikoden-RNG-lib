import Rounds from '../../fixtures/enemies/hell_hound_lv50_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Hell Hound Lv50 (screen 7/0/1): the plain scan, generic Attack (PWR 335); group 13 with two Ninjas.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/hell_hound_lv50_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja=NINJA,Magus=MAGUS).
describeFixture(Rounds, 'Hell Hound Lv50 (screen 7/0/1) matches the recorded rounds');
