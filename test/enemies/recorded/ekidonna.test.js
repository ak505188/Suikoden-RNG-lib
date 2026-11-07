import Rounds from '../../fixtures/enemies/ekidonna_lv60_hp1000_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Ekidonna Lv60 (group 8: Imperial Guards x3 + Ekidonna; S-hit, S-rune1, S-rune2): scan, move roll < 51 Attack else one element-5 rune hit.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ekidonna_lv60_hp1000/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (IMPERIAL_GUARDS_SABRE x3, EKIDONNA).
describeFixture(Rounds, 'Ekidonna Lv60 (group 8) matches the recorded rounds');
