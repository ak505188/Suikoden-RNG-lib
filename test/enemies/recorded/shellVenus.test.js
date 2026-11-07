import Rounds from '../../fixtures/enemies/shell_venus_lv65_hp15000_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Shell Venus Lv65 (screen 9/49/6), scripted lone fight: scan, 51% generic Attack, else a six-member element Special (PWR 470, MGC 350, Lightning Special).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/shell_venus_lv65_hp15000/sim_fixture.json
// (v1.0, S-hit, S-def0, S-rune1, S-rune2 and S-miss, the party Defends) by scripts/FixtureToRounds.py (SHELL_VENUS).
describeFixture(Rounds, 'Shell Venus Lv65 (screen 9/49/6) matches the recorded rounds');
