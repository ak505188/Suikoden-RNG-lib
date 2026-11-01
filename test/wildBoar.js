import Rounds from './data/wild_boar_lv7_hp60_rounds.json' with { type: 'json' };
import { describeFixture } from './enemyRounds.js';

// Wild boar (Lv7, 60 HP): a_data.bin 0x800806b4 on v1.0 (0x80080760 on v1.1), world-map region wm0.
// The default front-row target pass and the generic Attack, nothing else (no move roll, no flee, no
// party-state gate). Same template as the Giant Snail (ai.json "template": giant_snail_lv9_hp120),
// with its own animation timings: turn length 78/79 frames, damage 68 frames after the AI tick.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/wild_boar_lv7_hp60/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Wild boar Lv7 hp60 matches the recorded rounds');
