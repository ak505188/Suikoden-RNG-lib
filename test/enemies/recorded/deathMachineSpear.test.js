import Rounds from '../../fixtures/enemies/death_machine_lv25_hp170_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarves' Vault Death Machine, spear (Blue Machine; Lv25, 170 HP; vc3.bin 0x80010d04 on v1.0, 0x80010d0c on v1.1): the Giant Snail's logic, the default front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/death_machine_lv25_hp170/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEATH_MACHINE_SPEAR).
describeFixture(Rounds, 'Death Machine (spear) Lv25 hp170 matches the recorded rounds');
