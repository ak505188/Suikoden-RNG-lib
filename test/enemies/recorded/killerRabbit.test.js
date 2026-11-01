import Rounds from '../../fixtures/enemies/killer_rabbit_lv10_hp60_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 1 Killer Rabbit (Lv10, 60 HP, six of them): b_data.bin 0x800805fc on v1.0 (0x80080664 on v1.1).
// The Slasher Rabbit's AI: a leap (a clone) at any party member, else the front-row pass and the
// generic Attack.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/killer_rabbit_lv10_hp60/sim_fixture.json
// (v1.0, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Killer Rabbit Lv10 hp60 matches the recorded rounds');
