import Rounds from '../../fixtures/enemies/death_boar_lv17_hp350_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarf Trail Death boar (Lv17, 350 HP; vc1.bin 0x8001017c on v1.0): the Giant Snail's logic, the default
// front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/death_boar_lv17_hp350/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEATH_BOAR).
describeFixture(Rounds, 'Death boar Lv17 hp350 matches the recorded rounds');
