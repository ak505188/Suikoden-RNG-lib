import Rounds from '../../fixtures/enemies/imperial_guards_lv56_hp550_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Imperial Guards Lv56 hp550 (sword, PWR 330; group 4, x2): the plain scan, generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/imperial_guards_lv56_hp550/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (IMPERIAL_GUARDS_SWORD).
describeFixture(Rounds, 'Imperial Guards Lv56 hp550 matches the recorded rounds');
