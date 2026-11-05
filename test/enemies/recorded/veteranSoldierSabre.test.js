import Rounds from '../../fixtures/enemies/veteran_soldier_lv26_hp260_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Veteran Soldier (sabre, Lv26 hp260), group of 2 on 2/5/10; vc6.bin 0x800107ac on v1.0 and v1.1: the Giant Snail's logic, the default front-row target pass and the generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/veteran_soldier_lv26_hp260/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (VETERAN_SOLDIER_SABRE x2).
describeFixture(Rounds, 'Veteran Soldier Lv26 hp260 matches the recorded rounds');
