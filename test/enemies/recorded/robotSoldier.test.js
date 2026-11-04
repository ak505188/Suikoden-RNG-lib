import Rounds150 from '../../fixtures/enemies/robot_soldier_lv18_hp150_rounds.json' with { type: 'json' };
import Rounds160 from '../../fixtures/enemies/robot_soldier_lv18_hp160_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Lepant's Mansion Robot Soldiers, sword (Lv18, 150 HP; vb3.bin 0x8001038c on v1.0) and spear (Lv18,
// 160 HP; 0x80010d20): the Giant Snail's logic at two more addresses, the default front-row target pass and
// the generic Attack. Group 2 (one spear, two swords) and group 3 (three of each). In group 3 several attacks
// run at once and most turns are cut short; the party's counter-attacks after a missed Attack on a Defending
// member are the only enemy HP losses (the first enemy slot is never countered).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/robot_soldier_lv18_hp{150,160}/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py
// (150=ROBOT_SOLDIER_SWORD,160=ROBOT_SOLDIER_SPEAR). The two folders hold the same two fights.
describeFixture(Rounds150, 'Robot Soldier Lv18 hp150 folder matches the recorded rounds');
describeFixture(Rounds160, 'Robot Soldier Lv18 hp160 folder matches the recorded rounds');
