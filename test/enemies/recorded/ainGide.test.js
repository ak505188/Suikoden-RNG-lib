import Rounds from '../../fixtures/enemies/ain_gide_lv60_hp8000_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Ain Gide Lv60 (screen 11/0/17), scripted lone fight: scan, 51% generic Attack, else a six-member Fire Special (PWR 500, MGC 410).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ain_gide_lv60_hp8000/sim_fixture.json
// (v1.0, S-hit, S-def0, S-rune1, S-rune2 and S-miss, the party Defends) by scripts/FixtureToRounds.py (AIN_GIDE).
describeFixture(Rounds, 'Ain Gide Lv60 (screen 11/0/17) matches the recorded rounds');
