import Rounds from '../../fixtures/enemies/oannes_lv16_hp200_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Toran Castle Oannes (Lv16, 200 HP, two of them): vb5.bin 0x80011074 on v1.0 (0x800110a8 on v1.1). The
// front-row target pass, then one move roll: % 100 < 76 -> the generic Attack, else the Special (a
// half-damage hit and a 30% Poison roll).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/oannes_lv16_hp200/sim_fixture.json
// (v1.0; S-hit and S-def0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Oannes Lv16 hp200 matches the recorded rounds');
