import Rounds from '../../fixtures/enemies/anji_lv39_hp1700_rounds.json' with { type: 'json' };
import { describeFixture } from '../../helpers/recordedRounds.js';

// The pirates (screen 1/42/1), one scripted group: Anji Lv39 (actor 7), Kanak Lv35 (actor 8), Leonardo Lv36 (actor 9). All three run the
// plain scan with the generic Attack (no move roll); Anji and Leonardo are cut short, Kanak runs about 110 frames.

// Converted from Suikoden-Bizhawk-HUD enemy_profiles/enemies/anji_lv39_hp1700/sim_fixture.json (v1.0, S-hit and S-def0, the party Defends)
// by scripts/FixtureToRounds.py (ANJI,KANAK,LEONARDO). The Kanak and Leonardo folders record the same fight (identical rounds).
describeFixture(
  Rounds,
  'The pirates Anji, Kanak and Leonardo (screen 1/42/1) match the recorded rounds',
);
