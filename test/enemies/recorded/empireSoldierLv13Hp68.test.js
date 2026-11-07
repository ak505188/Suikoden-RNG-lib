import Rounds from '../../fixtures/enemies/empire_soldier_lv13_hp68_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Soldier Lv13 hp68 (screen 1/0/5): the plain scan, generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_soldier_lv13_hp68/sim_fixture.json
// by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SWORD_3,EMPIRE_SOLDIER_SWORD_3,EMPIRE_SOLDIER_SPEAR_3).
describeFixture(Rounds, 'Empire Soldier Lv13 hp68 (screen 1/0/5) matches the recorded rounds');
