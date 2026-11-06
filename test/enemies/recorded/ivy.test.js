import Rounds from '../../fixtures/enemies/ivy_lv49_hp250_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 5 / screen 5/1/0 Ivy (Lv49, 250 HP; k_data.bin 0x80012f34, packed overlay: the decode is behavioural): the Giant Snail's
// front-row scan and the generic Attack, nothing else. Lone Ivy and Ivy x3 (the first two are cut short when another actor follows).

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/ivy_lv49_hp250/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (250=IVY).
describeFixture(Rounds, 'Ivy Lv49 hp250 matches the recorded rounds');
