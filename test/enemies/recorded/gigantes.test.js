import Rounds from '../../fixtures/enemies/gigantes_lv35_hp3900_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Gigantes Lv35 (screen 2/2/29), scripted lone fight: scan, 51% generic Attack, else a six-member Fire Special (PWR 260, MGC 120).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/gigantes_lv35_hp3900/sim_fixture.json
// (v1.0, S-hit, S-def0, S-rune1, S-rune2, S-miss and the MGC-60 parties, the party Defends) by scripts/FixtureToRounds.py (GIGANTES).
describeFixture(Rounds, 'Gigantes Lv35 (screen 2/2/29) matches the recorded rounds');
