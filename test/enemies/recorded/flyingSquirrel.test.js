import Rounds from '../../fixtures/enemies/flying_squirrel_lv11_hp90_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 1 Flying Squirrel (Lv11, 90 HP, two of them): b_data.bin 0x8008006c (same address on v1.0
// and v1.1; Roc shares it). The default front-row target pass and the generic Attack, nothing else.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/flying_squirrel_lv11_hp90/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Flying Squirrel Lv11 hp90 matches the recorded rounds');
