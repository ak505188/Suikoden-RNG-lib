import Rounds from '../../fixtures/enemies/sonya_shulen_lv58_hp6000_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Sonya Shulen Lv58 (screen 9/49/2), scripted lone fight: scan, 51% generic Attack, else a six-member element Special (PWR 480, MGC 390, Water Special).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/sonya_shulen_lv58_hp6000/sim_fixture.json
// (v1.0, S-hit, S-def0, S-rune1, S-rune2 and S-miss, the party Defends) by scripts/FixtureToRounds.py (SONYA_SHULEN).
describeFixture(Rounds, 'Sonya Shulen Lv58 (screen 9/49/2) matches the recorded rounds');
