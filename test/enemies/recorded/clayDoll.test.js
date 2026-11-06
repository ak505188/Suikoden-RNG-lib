import Rounds from '../../fixtures/enemies/clay_doll_lv44_hp450_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Cave of the Past (ve2.bin): Clay Doll Lv44 hp450, alone and as a pair. The Kobold C shape with the move threshold 71; the
// Special is an Earth hit on every living member (the slot-3 member halved when its rune sets no category).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/clay_doll_lv44_hp450/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py (CLAY_DOLL x1-2).
describeFixture(Rounds, 'Clay Doll Lv44 hp450 matches the recorded rounds');
