import Enemy from '../../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../../lib/Game/Battle/ActionLog.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { STATUS } from '../../lib/Game/Constants.js';
import RNG from '../../lib/rng.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * One recorded round of one seed, from a Suikoden-Bizhawk-HUD fixture
 * (enemy_profiles/enemies/<slug>/sim_fixture.json, see its SIMULATOR.md), converted by
 * scripts/FixtureToRounds.py. Frames are the round clock: frames counted from the confirm, which is
 * the sim's tick + 30 (the confirm to the camera roll); a turn starts one frame after its turn roll.
 * g_FreeWillGate is 10 in every recorded state.
 * @typedef {Object} RecordedRound
 * @property {number} round
 * @property {number} rngAtConfirm
 * @property {number} rngAtRoundEnd
 * @property {number[]} hpAtConfirm - every combatant, party first, in the battle's 1-based order
 * @property {boolean} ended
 * @property {boolean[]} [bucketAtRoundEnd] - per party member, Bucket set at the round end
 * @property {boolean[]} [sleepAtRoundEnd] - per party member, Sleep set at the round end
 * @property {string[]} [partyActions] - type.slot.target per member as recorded: 1.0.0 Defend, 0.0.N Attack
 *   combatant N. Absent: everyone Defends
 * @property {[number, number, number, number, string][]} turns - [actor, start, end, target, move]
 * @property {[number, number, number][]} hpChanges - [frame, combatant, hp delta]
 * @property {number} frames - the round's length
 * @property {string} randTimeline - frame:rand() calls on the round clock
 * @property {[number, number, number, number, number, string, number][]} enemyTurns - [actor, start,
 *   rng0, rand() calls of the turn, target, move, frames]; a turn's rand() calls = every call in its
 *   own frame window (its rolls plus any earlier attack's roll that lands in it), not the turn roll
 *   that starts the next turn
 * @property {[number, number, number, number][]} counters - [frame, attacker, countered by, damage]
 */

/** @typedef {{ party: string, scenario?: string | null, characters: any[], enemies: string[], seeds: { seed: string, rounds: RecordedRound[] }[] }} RecordedRun */

const CLOCK = 30;

/** The RNG's raw value `calls` calls after `from` */
const rawAfter = (/** @type {number} */ from, /** @type {number} */ calls) =>
  new RNG(from).jump(calls).raw;

/** The fixture's move label as the log's cast detail reads: the path's "(clone)" note and spaces dropped */
const moveName = (/** @type {string} */ move) => move.replace(/ \(clone\)$/, '').replace(' ', '');

/** frame -> rand() calls, from a round's rand_timeline */
const timeline = (/** @type {string} */ text) =>
  Object.fromEntries(
    text
      .split(';')
      .filter(Boolean)
      .map((part) => part.split(':').map(Number)),
  );

/**
 * 1 when a turn starts on the frame the previous turn ends: the fixture counts a roll on that shared
 * frame in the previous turn only (its window's inclusive end), and the turn's RNG is taken after it.
 * @param {(string | number | null)[][]} turns the round's enemy turns as [actor, start, end, ...]
 * @param {number} t index of the turn
 */
const sharedFrame = (turns, t) => (t > 0 && turns[t - 1][2] === turns[t][1] ? 1 : 0);

/**
 * One round: the sim plays it from the recorded confirm (RNG and HP) and returns what it did
 * beside what the fixture recorded, in the same shapes, so a test can compare them.
 * @param {Battle} battle
 * @param {RNG} rng
 * @param {Map<string, number>} idxOf label -> 1-based combatant index
 * @param {number} partyLen
 * @param {RecordedRound} round
 */
function playRound(battle, rng, idxOf, partyLen, round) {
  rng.raw = round.rngAtConfirm;
  // hpAtConfirm is 1-based: index 0 = combatant 1
  battle.combatants.forEach((c, i) => {
    if (c) c.HP = round.hpAtConfirm[i - 1];
  });
  const from = battle.log.entries.length;
  const startCount = rng.count; // the log's rng counts are cumulative over the battle
  battle.playTurn(
    battle.party.combatants.map((_, i) => {
      const [type, , target] = (round.partyActions?.[i] ?? '1.0.0').split('.').map(Number);
      // 0 = Attack on combatant `target` (1-based, party first); the sim's target is the enemy index
      return type === 0
        ? { type: ACTION_TYPES.ATTACK, target: target - partyLen - 1 }
        : { type: ACTION_TYPES.DEFEND };
    }),
  );
  const entries = battle.log.entries.slice(from);

  const roundEnd = /** @type {number} | undefined */ (
    entries.filter((e) => e.type === LOG_TYPES.ROUND_END).at(-1)?.tick
  );

  // every enemy turn the log recorded, in order
  const turnEntries = entries
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) => e.type === LOG_TYPES.TURN && /** @type {number} */ (idxOf.get(e.actor)) > partyLen,
    );
  const turns = turnEntries.map(({ e, i }) => {
    const dec = entries
      .slice(i + 1)
      .find((x) => x.type === LOG_TYPES.ATTACK || x.type === LOG_TYPES.CAST);
    // a turn ends as the next actor of either side becomes current (a party member can act between
    // two enemies: the Beast Commander's, then Hellion's, then a Squirrel's). The roll that picks an
    // enemy starts its turn a tick later; a party member's copy can wait for the current actor's
    // release, so it's read off the member's own first action
    const next = entries.slice(i + 1).find((x) => x.type === LOG_TYPES.TURN);
    const nextAction =
      next && entries.slice(i + 1).find((x) => x.actor === next.actor && x.type !== LOG_TYPES.TURN);
    const nextIsEnemy = next && /** @type {number} */ (idxOf.get(next.actor)) > partyLen;
    const fallback = entries.slice(i + 1).find((x) => x.type === LOG_TYPES.DEFEND);
    return [
      /** @type {number} */ (idxOf.get(e.actor)),
      e.tick + CLOCK + 1,
      nextIsEnemy
        ? next.tick + CLOCK + 1
        : next || fallback
          ? /** @type {number} */ ((nextAction ?? fallback)?.tick) - 1 + CLOCK
          : /** @type {number} */ (roundEnd) + CLOCK + 19, // no later actor: the round's own length
      dec ? /** @type {number} */ (idxOf.get(dec.target)) : 0,
      dec?.type === LOG_TYPES.CAST
        ? /** @type {string} */ (moveName(dec.detail ?? ''))
        : dec
          ? 'Attack'
          : null,
    ];
  });

  const calls = timeline(round.randTimeline);
  const windowCalls = (/** @type {number} */ start, /** @type {number} */ frames) =>
    Object.entries(calls)
      .filter(([f]) => Number(f) >= start && Number(f) <= start + frames)
      .reduce((s, [, n]) => s + n, 0);

  // HP changes: the log's amount is the raw roll, the fixture's delta is what the HP actually moved
  // (a hit that kills deals at most the target's HP), so take the delta from the log's hp field
  const hp = new Map(battle.combatants.map((c, i) => [c?.label, round.hpAtConfirm[i - 1]]));
  const damage = entries
    .filter((e) => e.type === LOG_TYPES.DAMAGE)
    .map((e) => {
      const idx = /** @type {number} */ (idxOf.get(e.target));
      const before = /** @type {number} */ (hp.get(e.target));
      const after = e.hp ?? Math.max(before - (e.amount ?? 0), 0);
      hp.set(e.target, after);
      return [e.tick + CLOCK, idx, after - before];
    });

  // the party's counter-attacks: a DAMAGE entry on an enemy, whose attacker is the member it
  // countered (the fixture infers counters from HP changes + the turn clock)
  const counters = entries
    .filter(
      (e) => e.type === LOG_TYPES.DAMAGE && /** @type {number} */ (idxOf.get(e.target)) > partyLen,
    )
    .map((e) => [
      e.tick + CLOCK,
      /** @type {number} */ (idxOf.get(e.target)),
      /** @type {number} */ (idxOf.get(e.actor)),
    ]);

  return {
    round: round.round,
    turns,
    expectedTurns: round.turns.map(([a, s, e, t, move]) => [a, s, e, t, moveName(move)]),
    rng0: turnEntries.map(({ e }, t) =>
      rawAfter(
        round.rngAtConfirm,
        e.rng - startCount + (sharedFrame(turns, t) ? (calls[turns[t][1]] ?? 0) : 0),
      ),
    ),
    expectedRng0: round.enemyTurns.map((t) => t[2]),
    windows: turnEntries.map(({ e }, t) =>
      windowCalls(
        e.tick + CLOCK + 1 + sharedFrame(turns, t),
        round.enemyTurns[t][6] - sharedFrame(turns, t),
      ),
    ),
    expectedWindows: round.enemyTurns.map((t) => t[3]),
    damage,
    expectedDamage: round.hpChanges,
    counters,
    expectedCounters: round.counters.map((c) => [c[0], c[1], c[2]]),
    rngEnd: rng.raw,
    expectedRngEnd: round.rngAtRoundEnd,
    frames: roundEnd === undefined ? null : roundEnd + CLOCK + 19,
    expectedFrames: round.frames,
    ended: battle.status !== 'In Progress',
    bucket: battle.party.combatants.map((c) => !!c.status[STATUS.BUCKET]),
    expectedBucket: round.bucketAtRoundEnd,
    sleep: battle.party.combatants.map((c) => !!c.status[STATUS.SLEEP]),
    expectedSleep: round.sleepAtRoundEnd,
    expectedEnded: round.ended,
  };
}

/**
 * Every round of every seed of one fixture run, each played on its own battle (the RNG is
 * rewritten at every confirm, so a seed's rounds continue in one battle).
 * @param {any} run one fixture run, as the converted JSON reads it (see RecordedRun)
 */
export function playRecordedRun(run) {
  return run.seeds.map(({ seed, rounds }) => {
    const party = PlayerParty.fromCharacterJSON(
      structuredClone(/** @type {any} */ (run.characters)),
    );
    const keys = run.enemies.map(
      (key) => /** @type {any} */ (ENEMY_KEYS[/** @type {any} */ (key)]),
    );
    const enemies = new EnemyParty(keys.map((key) => new Enemy(key)));
    const rng = new RNG(rounds[0].rngAtConfirm);
    const battle = new Battle({ party, enemies, rng, freeWillGate: 10 });
    const idxOf = new Map(battle.combatants.map((c, i) => [c?.label, i]));
    const out = [];
    for (const round of rounds) {
      out.push(playRound(battle, rng, idxOf, party.combatants.length, round));
      if (round.ended) break;
    }
    return { seed, rounds: out };
  });
}

/**
 * The test body: one `it` per recorded round of every seed of every run, comparing every quantity the fixture
 * records.
 * @param {any} data the converted fixture JSON (see RecordedRun)
 * @param {string} title
 */
export function describeFixture(data, title) {
  describe(title, () => {
    for (const run of data.runs) {
      for (const { seed, rounds } of playRecordedRun(run)) {
        for (const r of rounds) {
          it(`${run.party}${run.scenario ? ` ${run.scenario}` : ''} seed ${seed} round ${r.round}`, () => {
            assert.deepStrictEqual(
              r.turns,
              r.expectedTurns,
              'turn order, start, end, target and move',
            );
            assert.deepStrictEqual(
              r.rng0,
              r.expectedRng0,
              'the RNG when each enemy became the actor',
            );
            assert.deepStrictEqual(r.windows, r.expectedWindows, "each turn's rand() calls");
            assert.deepStrictEqual(
              r.damage,
              r.expectedDamage,
              'HP changes: frame, combatant, amount',
            );
            assert.deepStrictEqual(
              r.counters,
              r.expectedCounters,
              'counter-attacks: frame, attacker, retaliator',
            );
            assert.strictEqual(r.rngEnd, r.expectedRngEnd, 'RNG at the round end');
            // the victory wait after a round that ends the battle isn't modelled
            if (!r.expectedEnded) assert.strictEqual(r.frames, r.expectedFrames, 'round length');
            assert.strictEqual(r.ended, r.expectedEnded, 'the battle ended');
            if (r.expectedBucket)
              assert.deepStrictEqual(r.bucket, r.expectedBucket, 'Bucket per member');
            if (r.expectedSleep)
              assert.deepStrictEqual(r.sleep, r.expectedSleep, 'Sleep per member');
          });
        }
      }
    }
  });
}
