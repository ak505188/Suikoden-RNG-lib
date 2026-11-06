import Rounds from '../../fixtures/enemies/kerberos_lv55_hp900_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Kerberos Lv55 (screen 9/49/2): the plain scan, generic Attack (PWR 370), hit at turn frame 23-24.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/kerberos_lv55_hp900/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (KERBEROS).
describeFixture(Rounds, 'Kerberos Lv55 (screen 9/49/2) matches the recorded rounds');
