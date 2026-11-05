import Rounds from '../../fixtures/enemies/death_machine_lv25_hp150_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Dwarves' Vault Death Machine, sword (Red Machine; Lv25, 150 HP; vc3.bin 0x80010370 on v1.0, 0x80010360 on v1.1): the Giant Snail's logic, the default front-row target pass and the generic Attack. Single-enemy fight.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/death_machine_lv25_hp150/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (DEATH_MACHINE_SWORD).
describeFixture(Rounds, 'Death Machine (sword) Lv25 hp150 matches the recorded rounds');
