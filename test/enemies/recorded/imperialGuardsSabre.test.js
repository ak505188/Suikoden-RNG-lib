import Rounds from '../../fixtures/enemies/imperial_guards_lv56_hp500_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Imperial Guards Lv56 hp500 (sabre, PWR 325; group 2, x2): the plain scan, generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/imperial_guards_lv56_hp500/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (IMPERIAL_GUARDS_SABRE).
describeFixture(Rounds, 'Imperial Guards Lv56 hp500 matches the recorded rounds');
