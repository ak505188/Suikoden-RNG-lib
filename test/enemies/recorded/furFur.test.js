import Rounds from '../../fixtures/enemies/furfur_lv4_hp18_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Magician's Island FurFur (Lv4, 18 HP): va4.bin 0x800100b8. The default front-row target pass and
// the generic Attack, nothing else (no flee roll, no LVL gate).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/furfur_lv4_hp18/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'FurFur Lv4 hp18 matches the recorded rounds');
