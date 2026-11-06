import Rounds from '../../fixtures/enemies/queen_ant_lv52_hp800_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Seek Valley Queen Ant (Lv52, 800 HP; vf2.bin 0x800155d0; not the Lv15 boss): no scan; one roll under 51 = a six-hit Earth magic burst (MGC 270), otherwise the Command: the other enemies attack the last free front-row member in her turn. Lone, with two Rock Busters (group 11) and the S-rune1 / S-rune2 parties.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/queen_ant_lv52_hp800/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (600=ROCK_BUSTER,800=QUEEN_ANT).
describeFixture(Rounds, 'Queen Ant Lv52 hp800 matches the recorded rounds');
