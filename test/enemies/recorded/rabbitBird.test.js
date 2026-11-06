import Rounds from '../../fixtures/enemies/rabbit_bird_lv51_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 7 Rabbit Bird (Lv51, 300 HP; h_data.bin 0x80080038): the Giant Snail's scan and the generic Attack (PWR 305); after every Attack it puts itself to sleep unless a roll at turn frame 97 is under 30; a sleeping bird takes no turn until a round-start wake roll. Lone and x3.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/rabbit_bird_lv51_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (300=RABBIT_BIRD).
describeFixture(Rounds, 'Rabbit Bird Lv51 hp300 matches the recorded rounds');
