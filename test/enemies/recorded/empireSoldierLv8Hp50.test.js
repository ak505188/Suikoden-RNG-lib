import Rounds from '../../fixtures/enemies/empire_soldier_lv8_hp50_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Soldier Lv8 hp50 (screen 0/1/10): the plain scan, generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_soldier_lv8_hp50/sim_fixture.json
// by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SWORD_1,EMPIRE_SOLDIER_SABER_1,EMPIRE_SOLDIER_SWORD_1,EMPIRE_CAPTAIN).
describeFixture(Rounds, 'Empire Soldier Lv8 hp50 (screen 0/1/10) matches the recorded rounds');
