import Rounds from '../../fixtures/enemies/demon_sorcerer_lv46_hp350_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Neclord's Castle (ve3.bin): Demon Sorcerer Lv46 hp350, alone and as a pair (the Kobold C shape, threshold 51; the Special is a Fire hit on every living member, the slot-1 member halved when its rune sets no category).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/demon_sorcerer_lv46_hp350/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEMON_SORCERER x1-2).
describeFixture(Rounds, 'Demon Sorcerer Lv46 hp350 matches the recorded rounds');
