import Rounds from '../../fixtures/enemies/kobold_lv20_hp50_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Pannu Yakuta world map group 3 (wm2: three sword Kobolds, hp150, and the mage Kobold, Lv20 hp50): c_data.bin
// 0x8008049c on v1.0 (0x80080490 on v1.1). The front-row target pass, then one move roll,
// (r * 100 / 32767) < 51 -> the generic Attack (cut short by the next actor, the mage acts first), otherwise the
// Special: a windup that waits for no busy member, then one magic hit (MGC 130 - the target's MGC, +-10%, minimum 1;
// element not decoded) 243-248 ticks after the decision, the turn ending 34 ticks after the hit. The hit tick is a recorded input (the fixture's `hit`).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/kobold_lv20_hp50/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (KOBOLD_SWORD x3, KOBOLD_MAGE).
describeFixture(Rounds, 'Kobold Lv20 hp50 (mage) matches the recorded rounds');
