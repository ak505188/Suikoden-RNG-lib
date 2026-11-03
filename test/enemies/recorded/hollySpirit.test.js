import Rounds from '../../fixtures/enemies/holly_spirit_lv21_hp350_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// Great Forest Holly Spirit (Lv21, 350 HP) with its Holly Boys: vb6.bin 0x80010338 on v1.0. In the front
// row the Spirit scans once (no retry; nobody accepted skips the turn) and attacks, its hit giving the
// victim Balloon 30% of the time; in the back row (formation position >= 4) it Commands: after its idle
// timer (a recorded input, Battle.idleTimer) it walks the other enemies for 122 ticks, each unacted free
// one running its own AI at once. Groups 5 (Spirit + 2 Boys), 6 (5 Boys + Spirit), 7 (3 Boys + 3
// Spirits), and group 7 with McDohl attacking Boy 9 so a Boy is commanded.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/holly_spirit_lv21_hp350/sim_fixture.json
// (v1.0; S-hit and S-mid, the party Defends except McDohl in S-mid round 1) by scripts/FixtureToRounds.py
// (80=HOLLY_BOY_2,350=HOLLY_SPIRIT). The cmdtrace, estate and default runs are the same fights and seeds
// recorded three ways, all replayed.
describeFixture(Rounds, 'Holly Spirit Lv21 hp350 matches the recorded rounds');
