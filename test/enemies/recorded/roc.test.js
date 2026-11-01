import Rounds from '../../fixtures/enemies/roc_lv14_hp110_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 1 Roc (Lv14, 110 HP, alone): b_data.bin 0x8008006c, the function Flying Squirrel shares. The
// default front-row target pass and the generic Attack, nothing else.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/roc_lv14_hp110/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Roc Lv14 hp110 matches the recorded rounds');
