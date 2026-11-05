import Rounds from '../../fixtures/enemies/nightmare_lv32_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Sonierre / Scarletia Nightmare (Lv32, 150 HP; vd5.bin 0x800142f8 on v1.0): the front-row pass, no move roll, then a
// three-way roulette (a first roll and four laps of re-rolls until the pick changes): 0 heals EVERY living enemy by 250
// (capped at max HP) after the Slot man's particle effect, 1 a long single hit (magic), 2 a short single hit. The heal is
// invisible at full HP, so the fixture also holds the rigged-HP recordings (scenario lowhp: the lone Nightmare at 20 / 100
// HP, and Sonierre group 8, Red Slime x3 + Nightmare, all at 20 / 100), where all four enemies gain the same amount on
// the same frame.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/nightmare_lv32_hp150/sim_fixture.json (v1.0, S-hit, the party
// Defends; all three runs ship in it) by scripts/FixtureToRounds.py (Nightmare=NIGHTMARE,"Red Slime"=RED_SLIME).
describeFixture(Rounds, 'Nightmare Lv32 hp150 matches the recorded rounds');
