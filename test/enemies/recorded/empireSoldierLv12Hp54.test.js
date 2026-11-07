import Rounds from '../../fixtures/enemies/empire_soldier_lv12_hp54_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Soldier Lv12 hp54 (screen 0/2/1): the plain scan, generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_soldier_lv12_hp54/sim_fixture.json
// by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SPEAR_2,EMPIRE_SOLDIER_SWORD_2,EMPIRE_SOLDIER_SPEAR_2,EMPIRE_SOLDIER_BOW_2,EMPIRE_SOLDIER_BOW_2).
describeFixture(Rounds, 'Empire Soldier Lv12 hp54 (screen 0/2/1) matches the recorded rounds');
