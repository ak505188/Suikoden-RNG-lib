import Rounds from '../../fixtures/enemies/whip_master_lv51_hp700_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Whip Master Lv51 (screen 7/0/1): the Whip Wolf's commander; ordinal k attacks formation position k. Groups 1, 2, 3, 16.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/whip_master_lv51_hp700/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja=NINJA,Magus=MAGUS).
describeFixture(Rounds, 'Whip Master Lv51 (screen 7/0/1) matches the recorded rounds');
