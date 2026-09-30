import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BATTLE_STATUS, Battle, CHARACTER_KEYS, Character, ENEMY_KEYS, Enemy, EnemyParty, PlayerParty, RNG } from '../battle.js';
import { bruteForce } from '../lib/Game/Battle/BruteForce.js';
import ResultsDB from '../lib/Search/ResultsDB.js';

const ants = () => new Battle({
  party: new PlayerParty([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.GREMIO].map(key => new Character(key).setLVL(8).rest())),
  enemies: new EnemyParty([new Enemy(ENEMY_KEYS.SOLDIER_ANT), new Enemy(ENEMY_KEYS.SOLDIER_ANT), new Enemy(ENEMY_KEYS.SOLDIER_ANT)]),
  rng: new RNG(0x1234),
});

describe('ResultsDB', () => {
  const t = Date.now();
  const { results, stats } = bruteForce(ants(), {
    maxRounds: 2,
    record: [BATTLE_STATUS.WON, BATTLE_STATUS.LOST],
    score: b => ({ status: b.status, rng: b.rng.getCount() }),
  });
  const elapsedMs = Date.now() - t;

  it('saves a run and one row per ending, with replayable main paths', () => {
    const db = new ResultsDB(':memory:');
    const runId = db.saveRun({ name: 'ants', settings: { fight: 'ants' }, stats, elapsedMs, results, summarise: rounds => `${rounds.length} rounds` });
    const [run] = db.query('SELECT name, settings, stats FROM runs WHERE id = ?', runId);
    assert.strictEqual(run.name, 'ants');
    assert.deepStrictEqual(JSON.parse(/** @type {string} */ (run.stats)), stats);

    const rows = db.query('SELECT * FROM endings WHERE run_id = ? ORDER BY id', runId);
    assert.strictEqual(rows.length, results.length);
    rows.forEach((row, i) => {
      const result = results[i];
      assert.deepStrictEqual(
        [row.status, row.fights, row.frames, row.path_count, row.plan_count, JSON.parse(/** @type {string} */ (row.score))],
        [result.status, result.fights, result.frames, result.pathCount, result.planCount, result.score]);
      assert.strictEqual(row.summary, `${result.rounds.length} rounds`);
      // The stored main path replays to the same ending
      const fromDb = ants(), fromResult = ants();
      JSON.parse(/** @type {string} */ (row.rounds)).forEach(round => fromDb.playTurn(round));
      result.rounds.forEach(round => fromResult.playTurn(round));
      assert.strictEqual(fromDb.stateKey(), fromResult.stateKey());
    });

    // Scores are queryable as JSON
    const [{ lost }] = db.query("SELECT COUNT(*) AS lost FROM endings WHERE json_extract(score, '$.status') = 'Lost'");
    assert.strictEqual(lost, results.filter(r => r.status === BATTLE_STATUS.LOST).length);
    db.close();
  });

  it('keeps several runs apart, and saves nothing of a run that fails partway', () => {
    const db = new ResultsDB(':memory:');
    const first = db.saveRun({ name: 'a', settings: {}, stats, elapsedMs, results });
    const bad = [...results, /** @type {any} */ ({ ...results[0], score: undefined, rounds: undefined, status: null })];
    assert.throws(() => db.saveRun({ name: 'b', settings: {}, stats, elapsedMs, results: bad }));
    assert.deepStrictEqual(db.query('SELECT id FROM runs').map(r => r.id), [first]);
    assert.strictEqual(db.query('SELECT COUNT(*) AS n FROM endings')[0].n, results.length);
    db.close();
  });
});
