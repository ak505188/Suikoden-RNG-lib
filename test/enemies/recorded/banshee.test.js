import Rounds from '../../fixtures/enemies/banshee_lv41_hp120_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Cave of the Past (ve2.bin): Banshee Lv41 hp120, alone and as a pair. No move roll, no hit roll: always the Special, an
// element-8 hit on every living member (unhalved) with six Silence rolls.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/banshee_lv41_hp120/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py (BANSHEE x1-2).
describeFixture(Rounds, 'Banshee Lv41 hp120 matches the recorded rounds');
