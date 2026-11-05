import Rounds from '../../fixtures/enemies/devil_armor_lv27_hp400_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Devil Armor (Lv27 hp400), alone on 2/5/10: vc6.bin 0x800115e0 on v1.0: no roll in the AI; three hits on the first three free members, the Ghost Armor's move
// (idle-cycle wait: 0 in round 1, 13 in rounds 2-4, read off the first hit).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/devil_armor_lv27_hp400/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEVIL_ARMOR).
describeFixture(Rounds, 'Devil Armor Lv27 hp400 matches the recorded rounds');
