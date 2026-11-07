import Rounds from '../../fixtures/enemies/empire_captain_lv10_hp90_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Empire Captain Lv10 hp90 (screen 0/1/3, scripted table 1: hp55 x3, hp44 x2, Captain as actor 12; PWR 80): the plain scan, generic Attack; the hit waits while its target is busy.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/empire_captain_lv10_hp90/sim_fixture.json
// (v1.0, the party Defends; S-hit and S-def0) by scripts/FixtureToRounds.py (EMPIRE_SOLDIER_SPEAR_1x3,EMPIRE_SOLDIER_BOW_1x2,EMPIRE_CAPTAIN).
describeFixture(Rounds, 'Empire Captain Lv10 hp90 (screen 0/1/3) matches the recorded rounds');
