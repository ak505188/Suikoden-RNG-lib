import Rounds from '../../fixtures/enemies/kobold_lv20_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Random-encounter Kobold (Lv20, 150 HP, alone; sword): vb6.bin 0x80010048. The default front-row target
// pass and the generic Attack, nothing else (no status, no party-dependent branch).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/kobold_lv20_hp150/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Kobold Lv20 hp150 matches the recorded rounds');
