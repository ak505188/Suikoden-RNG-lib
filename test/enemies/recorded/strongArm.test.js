import Rounds from '../../fixtures/enemies/strong_arm_lv21_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Pannu Yakuta world map group 5 (wm2: bow Kobold, Strong Arm Lv21 hp300, bow Kobold, mage Kobold hp50): the
// Strong Arm's AI is c_data.bin 0x80080018 on v1.0 (the sword Kobold's logic): the default front-row target
// pass and the generic Attack. The mage Kobold's move roll and Special are in the group too.
//
// Its attack script throws the first other enemy that is alive and not busy (path 61a3f895: hit at +102 after the
// decision, turn released at +113) and plays its own punch script when there is none (041212f1: hit at +77, the
// turn released by the free-will gate at +10/11). The sim picks from its own enemy busy flags at the decision tick
// (Enemy.attackVariant); the constants are measured.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/strong_arm_lv21_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py
// (120=KOBOLD_BOW,300=STRONG_ARM,50=KOBOLD_MAGE).
describeFixture(Rounds, 'Strong Arm Lv21 hp300 matches the recorded rounds');
