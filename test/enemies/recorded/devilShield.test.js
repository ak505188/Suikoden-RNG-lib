import Rounds from '../../fixtures/enemies/devil_shield_lv27_hp250_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Devil Shield (Lv27 hp250), group of 2 on 2/5/10: vc6.bin 0x80010a80 on v1.0: the front-row pass, one move roll ((r * 100) / 32767 < 51 -> the generic Attack), otherwise the Special, a 45-roll
// particle effect and a magic hit on all six party members, on recorded event ticks (the fixture's effect_burst and hit, replayed as inputs).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/devil_shield_lv27_hp250/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEVIL_SHIELD x2).
describeFixture(Rounds, 'Devil Shield Lv27 hp250 matches the recorded rounds');
