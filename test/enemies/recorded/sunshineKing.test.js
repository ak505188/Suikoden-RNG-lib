import Rounds from '../../fixtures/enemies/sunshine_king_lv50_hp1600_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Sunshine King (Lv50 hp1600), Dragon's Den, alone: vf1.bin 0x80013e2c on v1.0: the front-row pass only (no move roll), then the
// Sunshine: 8 bursts of 2 sprite rolls, and a hit on every living member at the recorded hit tick, each one calc_damage / 3
// (truncated after the Defend halving).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/sunshine_king_lv50_hp1600/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (SUNSHINE_KING).
describeFixture(Rounds, 'Sunshine King Lv50 hp1600 matches the recorded rounds');
