import Rounds from '../../fixtures/enemies/mirage_lv52_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 7 Mirage (Lv52, 400 HP; h_data.bin copy, MIRAGE_2): the wm5 Mirage's AI, rolls, hit tick and turn lengths, but its script tail is one frame shorter (measured busy clear 181 / 174 against 182 / 175): its own `free`. Lone and Mirage x3.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/mirage_lv52_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (400=MIRAGE_2).
describeFixture(Rounds, 'Mirage Lv52 hp400 (wm7) matches the recorded rounds');
