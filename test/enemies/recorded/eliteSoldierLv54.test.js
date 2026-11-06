import Rounds from '../../fixtures/enemies/elite_soldier_lv54_hp550_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Elite Soldier Lv54 (screen 9/49/2): the plain scan, generic Attack (PWR 360), x2.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/elite_soldier_lv54_hp550/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (ELITE_SOLDIER_2,ELITE_SOLDIER_2).
describeFixture(Rounds, 'Elite Soldier Lv54 (screen 9/49/2) matches the recorded rounds');
