import Rounds from '../../fixtures/enemies/ninja_lv52_hp450_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Ninja Lv52 (screen 7/0/1): 51% Attack, else a single guaranteed critical hit. Lone and x2.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ninja_lv52_hp450/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja=NINJA,Magus=MAGUS).
describeFixture(Rounds, 'Ninja Lv52 (screen 7/0/1) matches the recorded rounds');
