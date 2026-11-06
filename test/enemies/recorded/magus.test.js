import Rounds from '../../fixtures/enemies/magus_lv54_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Magus Lv54 (screen 7/0/1): 51% Attack, else the Sorcerer's Flaming Arrow then one damage roll (MGC 290, element 6).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/magus_lv54_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (Elite Soldier=ELITE_SOLDIER_1,Hell Hound=HELL_HOUND_2,Whip Master=WHIP_MASTER,Ninja=NINJA,Magus=MAGUS).
describeFixture(Rounds, 'Magus Lv54 (screen 7/0/1) matches the recorded rounds');
