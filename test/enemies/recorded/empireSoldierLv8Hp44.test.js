import Rounds from '../../fixtures/enemies/empire_soldier_lv8_hp44_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Soldier Lv8 (screen 0/1/0, scripted group 1: the hp55 spear, hp48 sword and hp44 bow records, actors 7-9): the plain scan, generic Attack.
// Fixture of the hp44 record; the other two records' turns carry foreign labels. Runs: S-hit (DEF 150) and, in the hp44 fixture, S-def0.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_soldier_lv8_hp44/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SPEAR_1,EMPIRE_SOLDIER_SWORD_1,EMPIRE_SOLDIER_BOW_1).
describeFixture(Rounds, 'Empire Soldier Lv8 hp44 (screen 0/1/0) matches the recorded rounds');
