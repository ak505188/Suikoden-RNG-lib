import Rounds from '../../fixtures/enemies/holly_boy_lv5_hp80_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Great Forest Holly Boy (Lv5, 80 HP, six of them): vb6.bin 0x80010eb4 on v1.0, the Magician's Island
// Holly Boy's logic: the front-row target pass, then for a target of LVL >= 4 one more roll
// (% 100 > 25 -> Flee, else Attack); a target below LVL 4 is always attacked.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/holly_boy_lv5_hp80/sim_fixture.json
// (v1.0; S-hit, S-lvl3, S-lvl34, S-lvl4, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Holly Boy Lv5 hp80 matches the recorded rounds');
