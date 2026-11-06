import Rounds from '../../fixtures/enemies/larvae_lv45_hp180_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Neclord's Castle (ve3.bin): Larvae Lv45 hp180, alone and x3 (the Giant Snail's scan, the generic Attack PWR 260 cut short to 12-18 frames when another actor follows; one Sleep roll (30%) two frames after the damage frame, outside the turn when cut short).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/larvae_lv45_hp180/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (LARVAE x1-3).
describeFixture(Rounds, 'Larvae Lv45 hp180 matches the recorded rounds');
