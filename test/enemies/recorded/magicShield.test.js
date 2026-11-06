import Rounds from '../../fixtures/enemies/magic_shield_lv49_hp190_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Magic Shield (Lv49 hp190), Dragon's Den: vf1.bin 0x80013184 on v1.0: the Devil Shield's AI (the front-row pass, one move roll,
// (r * 100) / 32767 < 51 -> the generic Attack), otherwise the Special, a 45-roll particle effect and a magic hit on all six party
// members, on recorded event ticks (the fixture's effect_burst and hit, replayed as inputs).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/magic_shield_lv49_hp190/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (MAGIC_SHIELD).
describeFixture(Rounds, 'Magic Shield Lv49 hp190 matches the recorded rounds');
