import Rounds from '../../fixtures/enemies/hell_unicorn_lv47_hp700_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Neclord's Castle (ve3.bin): Hell Unicorn Lv47 hp700 alone, behind three Larvae, and behind three Larvae with a Demon Sorcerer (the Kobold C shape; the Special is a rain effect of exactly modelled rolls and a Water hit on every living member, the slot-2 member halved when its rune sets no category). The fixture also holds the Larvae and Demon Sorcerer turns of those groups.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/hell_unicorn_lv47_hp700/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (HELL_UNICORN, LARVAE x3, DEMON_SORCERER).
describeFixture(Rounds, 'Hell Unicorn Lv47 hp700 matches the recorded rounds');
