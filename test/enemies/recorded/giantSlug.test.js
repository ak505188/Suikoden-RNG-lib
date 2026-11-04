import Rounds from '../../fixtures/enemies/giant_slug_lv15_hp120_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Toran Castle Giant Slug (Lv15, 120 HP, two of them): vb5.bin 0x800112f0 on v1.0 (0x8001131c on v1.1), the
// Giant Snail's logic at another address. The default front-row target pass and the generic Attack,
// nothing else (no flee roll, no LVL gate, no move roll).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/giant_slug_lv15_hp120/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Giant Slug Lv15 hp120 matches the recorded rounds');
