import Rounds from '../../fixtures/enemies/empire_soldier_lv8_hp48_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Soldier Lv8 hp48 x2 (screen 0/1/3, scripted table 0; PWR 65): the plain scan, generic Attack, two countered turns.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_soldier_lv8_hp48/sim_fixture.json
// (v1.0, the party Defends; S-hit and S-def0) by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SWORD_1,EMPIRE_SOLDIER_SWORD_1).
describeFixture(Rounds, 'Empire Soldier Lv8 hp48 (screen 0/1/3) matches the recorded rounds');
