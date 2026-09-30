// Node only: stores bruteForce results in a SQLite file (node:sqlite, built into Node), so they
// can be queried instead of read. Kept out of lib/Game so the engine stays usable in a browser.
import { DatabaseSync } from 'node:sqlite';

/** @typedef {import('../Game/Battle/Actions.js').Round} Round */
/** @typedef {import('../Game/Battle/BruteForce.js').BruteForceStats} BruteForceStats */

/**
 * @template S
 * @typedef {import('../Game/Battle/BruteForce.js').BruteForceResult<S>} BruteForceResult
 */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    created     TEXT NOT NULL,      -- ISO time the run was saved
    settings    TEXT NOT NULL,      -- JSON: the fight and search settings, as the caller describes them
    stats       TEXT NOT NULL,      -- JSON: bruteForce's stats
    elapsed_ms  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS endings (
    id          INTEGER PRIMARY KEY,
    run_id      INTEGER NOT NULL REFERENCES runs(id),
    status      TEXT NOT NULL,      -- Won / Lost / Escaped
    fights      INTEGER NOT NULL,   -- Fight rounds on the main path (tie-break: fewer first)
    frames      INTEGER NOT NULL,   -- frames the main path plays (tie-break: fewer first)
    path_count  INTEGER NOT NULL,   -- paths to this ending
    plan_count  INTEGER NOT NULL,   -- round-by-round plans those paths stand for
    score       TEXT NOT NULL,      -- JSON: the search's score for this ending
    rounds      TEXT NOT NULL,      -- JSON: the main path, one Round per round (replayable with playTurn)
    summary     TEXT                -- the main path, readable, if the caller formats it
  );
  CREATE INDEX IF NOT EXISTS endings_run ON endings(run_id, fights, frames);
`;

/**
 * A SQLite file of bruteForce runs. Query it with any SQLite client, e.g.
 *   sqlite3 output/bonbon.db "SELECT json_extract(score, '$.drop') AS drop_, COUNT(*) FROM endings GROUP BY drop_"
 */
export default class ResultsDB {
  /** @param {string} path - created if missing; ':memory:' for a throwaway one */
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(SCHEMA);
  }

  /**
   * Saves one search run and all its endings, in one transaction.
   * @template S
   * @param {Object} run
   * @param {string} run.name
   * @param {object} run.settings - anything JSON-serialisable describing the fight and search
   * @param {BruteForceStats} run.stats
   * @param {number} run.elapsedMs
   * @param {BruteForceResult<S>[]} run.results
   * @param {(rounds: Round[]) => string} [run.summarise] - a readable main path, for the summary column
   * @returns {number} the run's id
   */
  saveRun({ name, settings, stats, elapsedMs, results, summarise }) {
    const insertRun = this.db.prepare(
      'INSERT INTO runs (name, created, settings, stats, elapsed_ms) VALUES (?, ?, ?, ?, ?)');
    const insertEnding = this.db.prepare(`INSERT INTO endings
      (run_id, status, fights, frames, path_count, plan_count, score, rounds, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    this.db.exec('BEGIN');
    try {
      const { lastInsertRowid } = insertRun.run(
        name, new Date().toISOString(), JSON.stringify(settings), JSON.stringify(stats), Math.round(elapsedMs));
      const runId = Number(lastInsertRowid);
      for (const r of results) {
        insertEnding.run(runId, r.status, r.fights, r.frames, r.pathCount, r.planCount,
          JSON.stringify(r.score), JSON.stringify(r.rounds), summarise ? summarise(r.rounds) : null);
      }
      this.db.exec('COMMIT');
      return runId;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Runs a read query.
   * @param {string} sql
   * @param {...(string | number | null)} params
   * @returns {Record<string, unknown>[]}
   */
  query(sql, ...params) {
    return /** @type {Record<string, unknown>[]} */ (this.db.prepare(sql).all(...params));
  }

  close() {
    this.db.close();
  }
}
