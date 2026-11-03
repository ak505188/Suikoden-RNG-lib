import Rounds from '../../fixtures/enemies/kobold_lv20_hp120_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Random-encounter Kobold (Lv20, 120 HP, two of them; bow): vb6.bin 0x800101c0 on v1.0 (0x800101bc on v1.1),
// the sword Kobold's logic with its own animation scripts. The default front-row target pass and the
// generic Attack; each shot spawns an arrow sub-actor.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/kobold_lv20_hp120/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Kobold Lv20 hp120 matches the recorded rounds');
