import Rounds from '../../fixtures/enemies/wyvern_lv53_hp1000_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Seek Valley Wyvern (Lv53, 1000 HP; vf2.bin 0x800170c8): the scan always accepts into the breath (no move roll, no hit roll): one script roll picks element 1 or 5, then six magic hits (MGC 260). Lone and the S-rune1 / S-rune2 parties.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/wyvern_lv53_hp1000/sim_fixture.json
// (v1.0, S-hit, the party Defends) by scripts/FixtureToRounds.py (1000=WYVERN).
describeFixture(Rounds, 'Wyvern Lv53 hp1000 matches the recorded rounds');
