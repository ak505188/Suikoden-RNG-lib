import Rounds from '../../fixtures/enemies/slot_man_lv19_hp200_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Lepant's Mansion Slot Man (Lv19, 200 HP, alone): vb3.bin 0x800114f0 on v1.0 (0x8001151c on v1.1). The front-row
// pass, then the slot machine: the first roll after it picks one of six outcomes (symbol % 6 -> D a physical
// hit, C a late Lightning hit, A a 150 self-heal, E a Fire hit, B a +7 heal of the party, F an Earth hit on
// everyone), 60 reel-spin rolls, then the outcome. Outcome A's particle effect (about 500 rolls) is not modelled.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/slot_man_lv19_hp200/sim_fixture.json
// (v1.0; S-hit, S-def100, S-hp100, S-hp500, S-mgc60 and hplevels, the party Defends) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Slot Man Lv19 hp200 matches the recorded rounds');
