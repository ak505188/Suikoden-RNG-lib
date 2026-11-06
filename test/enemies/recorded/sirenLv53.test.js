import Rounds from '../../fixtures/enemies/siren_lv53_hp300_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Siren Lv53 (screen 9/49/2): the Lv32 Siren's code, PWR 260 / MGC 210; x2.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/siren_lv53_hp300/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (SIREN_2,SIREN_2).
describeFixture(Rounds, 'Siren Lv53 (screen 9/49/2) matches the recorded rounds');
