import Rounds from '../../fixtures/enemies/phantom_lv58_hp550_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Phantom Lv58 (lone): the Mirage's shape, the target's row picks Attack or special, both hit at turn frame 86.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/phantom_lv58_hp550/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (PHANTOM).
describeFixture(Rounds, 'Phantom Lv58 matches the recorded rounds');
