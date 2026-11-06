import Rounds from '../../fixtures/enemies/ninja_master_lv55_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Ninja Master Lv55 (wm11): 51% Attack, else a single guaranteed critical hit. Lone.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ninja_master_lv55_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja Master=NINJA_MASTER).
describeFixture(Rounds, 'Ninja Master Lv55 (wm11) matches the recorded rounds');
