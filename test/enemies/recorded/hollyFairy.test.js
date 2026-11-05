import Rounds from '../../fixtures/enemies/holly_fairy_lv26_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 3 Holly Fairy (Lv26, 400 HP; d_data.bin 0x800801b0 on v1.0): the front-row pass once with no retry (a turn is skipped when nobody accepts, 13.3%), then her own attack script; its hit reaction rolls Balloon (30%, a sub-actor 2 ticks after the damage roll). Lone, forced group 1.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/holly_fairy_lv26_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (HOLLY_FAIRY).
describeFixture(Rounds, 'Holly Fairy Lv26 hp400 matches the recorded rounds');
