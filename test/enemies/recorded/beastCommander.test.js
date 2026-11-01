import Rounds from '../../fixtures/enemies/beast_commander_lv13_hp90_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// World map 1 Beast Commander (Lv13, 90 HP) with three Flying Squirrels: b_data.bin 0x80080e6c on v1.0. The
// Command (the squirrels attack the members in their formation slots) while the commander stands in the
// back, the Sleep attack once a dead squirrel's slot has moved it forward. The runs: S-hit (the party
// Defends), then atk1 / atk2 / atk8 / atk9, where McDohl (and Flik) kill squirrels in round 1.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/beast_commander_lv13_hp90/sim_fixture.json
// (v1.0) by scripts/FixtureToRounds.py.
describeFixture(Rounds, 'Beast Commander Lv13 hp90 matches the recorded rounds');
