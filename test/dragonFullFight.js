import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import Character from '../lib/Game/Battle/Character.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';

/** @typedef {import('../lib/Game/Battle/ActionLog.js').LogEntry} LogEntry */

// A whole Dragon fight, live (BizHawk, 2026-10-08; test/data/dragon_full_fight_capture.txt): the
// Dragon tests' party (test/battle.js) at RNG 0x43 + 7750, 4 Fight rounds and a Free Will round,
// found by Suikoden-Battle-Search (dragon-speeds run 6, ending 9422). The capture's RNG counts from
// the fight's start (sim = capture + 7750) and its ticks from each round's start, like the sim's
// log; it isn't frame-perfect, so ticks are compared within TOLERANCE.
//
// RNG, damage and HP match the sim everywhere. Falcon Rune and the Dragon's moves wait for the
// party to be idle (Falcon: until the previous attack's busy clears; the Dragon: e.g. Valeria's
// Falcon busy), which explains the old +110 / +25 tick gaps. Round ends run 3-4 ticks long
// (ROUND_END_TOLERANCE).

const TOLERANCE = 3;
/** Round ends add up the drift of every wait in the round (the sim runs 3-4 ticks long) */
const ROUND_END_TOLERANCE = 6;
const RNG_OFFSET = 7750;
/** The capture's names for the sim's */
const NAMES = { Hero: 'McDohl', Dragon: 'Dragon #1' };
/** @param {string} name */
const simName = (name) => NAMES[/** @type {keyof typeof NAMES} */ (name)] ?? name;

/**
 * @typedef {{ round: number, tick: number, rng: number, text: string }} CaptureLine
 * @returns {CaptureLine[]}
 */
const readCapture = () =>
  readFileSync(new URL('./data/dragon_full_fight_capture.txt', import.meta.url), 'utf8')
    .split('\n')
    .flatMap((line) => {
      const m = /^R(\d) t\s*(\d+) rng\s*(\d+)\s+(.*)$/.exec(line);
      return m ? [{ round: Number(m[1]), tick: Number(m[2]), rng: Number(m[3]), text: m[4] }] : [];
    });

const makeBattle = () => {
  const party = new PlayerParty([
    new Character(CHARACTER_KEYS.MCDOHL)
      .setLVL(25)
      .setEXP(679)
      .setStats({ PWR: 82, SKL: 102, DEF: 80, SPD: 93, MGC: 86, LUK: 85, HP: 278 })
      .clearInventory()
      .setRune(RUNES.SOUL_EATER)
      .setWeaponLvl(8),
    new Character(CHARACTER_KEYS.VIKTOR)
      .setLVL(25)
      .setEXP(447)
      .setStats({ PWR: 119, SKL: 48, DEF: 94, SPD: 68, MGC: 51, LUK: 65, HP: 432 })
      .setRune(RUNES.HOLY),
    new Character(CHARACTER_KEYS.KUROMIMI)
      .setLVL(24)
      .setEXP(0)
      .setStats({ PWR: 77, SKL: 65, DEF: 74, SPD: 70, MGC: 40, LUK: 76, HP: 241 }),
    new Character(CHARACTER_KEYS.KIRKIS)
      .setLVL(20)
      .setEXP(566)
      .setStats({ PWR: 64, SKL: 99, DEF: 65, SPD: 76, MGC: 67, LUK: 50, HP: 196 })
      .setRune(RUNES.WIND),
    new Character(CHARACTER_KEYS.VALERIA)
      .setLVL(28)
      .setEXP(150)
      .setStats({ PWR: 94, SKL: 74, DEF: 90, SPD: 68, MGC: 65, LUK: 75, HP: 320 }),
    new Character(CHARACTER_KEYS.GREMIO)
      .setLVL(25)
      .setEXP(674)
      .setStats({ PWR: 65, SKL: 73, DEF: 90, SPD: 53, MGC: 42, LUK: 72, HP: 228 })
      .setRune(RUNES.WIND),
  ]).rest();
  return new Battle({
    party,
    enemies: EnemyParty.fromFormation(AREAS.PANNU_YAKUTA.scripted[0]),
    rng: new RNG(0x43).jump(RNG_OFFSET),
  });
};

// Slot order: McDohl, Viktor, Kuromimi, Kirkis, Valeria, Gremio
const A = { type: ACTION_TYPES.ATTACK, target: 0 };
const D = { type: ACTION_TYPES.DEFEND };
const FALCON = { type: ACTION_TYPES.RUNE, target: 0 };
const SHRED = { type: ACTION_TYPES.RUNE, slot: 1, target: 0 };
const ROUNDS = [
  [A, A, D, A, FALCON, D],
  [D, A, A, SHRED, FALCON, D],
  [A, D, A, SHRED, FALCON, D],
  [A, A, D, A, FALCON, SHRED],
  { command: ROUND_COMMANDS.FREE_WILL },
];

globalThis.__dump = () => {};
describe('Dragon, a whole fight against a live capture', () => {
  const capture = readCapture();
  const battle = makeBattle();
  for (const round of ROUNDS) battle.playTurn(/** @type {any} */ (round));
  const { entries } = battle.log;

  /** @param {number} round @param {(e: LogEntry) => boolean} where */
  const simIn = (round, where) => entries.filter((e) => e.round === round && where(e));
  /** @param {number} round @param {RegExp} pattern */
  const capIn = (round, pattern) =>
    capture.filter((c) => c.round === round && pattern.test(c.text));

  /**
   * Every damage hit in both, in order: [capture, sim]
   * @returns {[CaptureLine & { actor: string, amount: number, target: string, hp: number }, LogEntry][]}
   */
  const damage = () => {
    const cap = capture.flatMap((c) => {
      const m = /^(\w+) deals (\d+) to (\w+) \(HP (\d+)\)/.exec(c.text);
      return m
        ? [
            {
              ...c,
              actor: simName(m[1]),
              amount: Number(m[2]),
              target: simName(m[3]),
              hp: Number(m[4]),
            },
          ]
        : [];
    });
    const sim = entries.filter((e) => e.type === LOG_TYPES.DAMAGE);
    assert.strictEqual(sim.length, cap.length, 'number of hits');
    return cap.map((c, i) => /** @type {[typeof c, LogEntry]} */ ([c, sim[i]]));
  };

  /**
   * Ticks from each `start` line to the same actor's next hit, in both, for one round.
   * @param {number} round
   * @param {RegExp} capStart - a capture line starting the action; group 1 is the actor
   * @param {(e: LogEntry) => boolean} simStart
   */
  const windUps = (round, capStart, simStart) => {
    const hitAfter = (
      /** @type {string} */ actor,
      /** @type {number} */ tick,
      /** @type {'cap' | 'sim'} */ side,
    ) =>
      side === 'cap'
        ? capIn(
            round,
            new RegExp(
              `^${Object.keys(NAMES).find((k) => NAMES[/** @type {keyof typeof NAMES} */ (k)] === actor) ?? actor} deals`,
            ),
          ).find((c) => c.tick >= tick)?.tick
        : simIn(round, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === actor && e.tick >= tick)[0]
            ?.tick;
    const cap = capIn(round, capStart).map((c) => {
      const actor = simName(/** @type {RegExpExecArray} */ (capStart.exec(c.text))[1]);
      return { actor, ticks: /** @type {number} */ (hitAfter(actor, c.tick, 'cap')) - c.tick };
    });
    const sim = simIn(round, simStart).map((e) => ({
      actor: /** @type {string} */ (e.actor),
      ticks:
        /** @type {number} */ (hitAfter(/** @type {string} */ (e.actor), e.tick, 'sim')) - e.tick,
    }));
    return { cap, sim };
  };

  it("wins with the killing blow on the capture's tick", () => {
    assert.strictEqual(battle.status, 'Won');
    const [cap, sim] = /** @type {[any, LogEntry]} */ (damage().at(-1));
    assert.strictEqual(sim.hp, 0);
    assert.ok(
      Math.abs(sim.tick - cap.tick) <= TOLERANCE,
      `kill at t${sim.tick}, capture t${cap.tick}`,
    );
  });

  it('matches every hit: who, on whom, damage, HP left and RNG', () => {
    for (const [cap, sim] of damage()) {
      const where = `R${cap.round} t${cap.tick} ${cap.text}`;
      assert.deepStrictEqual(
        [sim.actor, sim.target, sim.hp],
        [cap.actor, cap.target, cap.hp],
        where,
      );
      // The game shows a killing blow's damage capped at the HP it took
      if (cap.hp === 0) assert.ok(/** @type {number} */ (sim.amount) >= cap.amount, where);
      else assert.strictEqual(sim.amount, cap.amount, where);
      assert.strictEqual(sim.rng, cap.rng + RNG_OFFSET, `${where}: RNG`);
    }
  });

  it('matches the RNG at the end of every round', () => {
    for (const cap of capture.filter((c) => /Round \d ends/.test(c.text))) {
      const [sim] = simIn(cap.round, (e) => e.type === LOG_TYPES.ROUND_END);
      assert.strictEqual(sim.rng, cap.rng + RNG_OFFSET, `round ${cap.round}`);
    }
  });

  it("basic attacks hit the capture's ticks after their swing", () => {
    for (let round = 1; round <= 5; round++) {
      const { cap, sim } = windUps(
        round,
        /^(\w+) attacks Dragon$/,
        (e) => e.type === LOG_TYPES.ATTACK && !/Missed/.test(e.detail ?? ''),
      );
      // The capture logs one more swing, after the kill (Gremio, t420), that never lands
      const landed = cap.filter((c) => !Number.isNaN(c.ticks));
      assert.strictEqual(sim.length, landed.length, `round ${round}: swings`);
      landed.forEach((c, i) =>
        assert.ok(
          Math.abs(sim[i].ticks - c.ticks) <= TOLERANCE,
          `R${round} ${c.actor}: sim ${sim[i].ticks}, capture ${c.ticks}`,
        ),
      );
    }
  });

  it("Falcon Rune hits the capture's ticks after it starts", () => {
    for (let round = 1; round <= 4; round++) {
      const { cap, sim } = windUps(
        round,
        /^(Valeria) casts Falcon Rune/,
        (e) => e.type === LOG_TYPES.CAST && e.actor === 'Valeria',
      );
      assert.ok(
        Math.abs(sim[0].ticks - cap[0].ticks) <= TOLERANCE,
        `R${round}: sim ${sim[0].ticks}, capture ${cap[0].ticks}`,
      );
    }
  });

  it("The Shredding hits on the capture's ticks (R2, R3) and after Falcon's hit (R4)", () => {
    for (const round of [2, 3]) {
      const [cap] = capIn(round, /^Kirkis deals 866/);
      const [sim] = simIn(round, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === 'Kirkis');
      assert.ok(
        Math.abs(sim.tick - cap.tick) <= TOLERANCE,
        `R${round}: sim t${sim.tick}, capture t${cap.tick}`,
      );
    }
    // R4's starts after Valeria's late Falcon (see the todo below), so measure from that hit
    const capGap = capIn(4, /^Gremio deals/)[0].tick - capIn(4, /^Valeria deals/)[0].tick;
    const simGap =
      /** @type {number} */ (
        simIn(4, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === 'Gremio')[0].tick
      ) -
      /** @type {number} */ (
        simIn(4, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === 'Valeria')[0].tick
      );
    assert.ok(Math.abs(simGap - capGap) <= TOLERANCE, `R4: sim ${simGap}, capture ${capGap}`);
  });

  it('the Free Will round matches the capture tick for tick', () => {
    // Every swing, hit and Defend, in order (the capture's swing after the kill left out)
    const cap = capIn(5, /attacks Dragon$|deals|defends/).filter((c) => c.tick < 400);
    const sim = simIn(
      5,
      (e) =>
        e.type === LOG_TYPES.ATTACK || e.type === LOG_TYPES.DAMAGE || e.type === LOG_TYPES.DEFEND,
    );
    assert.strictEqual(sim.length, cap.length, 'events');
    cap.forEach((c, i) =>
      assert.ok(
        Math.abs(sim[i].tick - c.tick) <= TOLERANCE,
        `${c.text}: sim t${sim[i].tick}, capture t${c.tick}`,
      ),
    );
  });

  it('Falcon Rune starts when the previous attack has landed, not during it', () => {
    for (const round of [1, 4]) {
      const [capFalcon] = capIn(round, /^Valeria casts Falcon Rune/);
      const [simFalcon] = simIn(round, (e) => e.type === LOG_TYPES.CAST && e.actor === 'Valeria');
      const capPrev = capIn(round, /^Viktor deals/)[0].tick;
      const simPrev = /** @type {number} */ (
        simIn(round, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === 'Viktor')[0].tick
      );
      assert.ok(
        Math.abs(simFalcon.tick - simPrev - (capFalcon.tick - capPrev)) <= TOLERANCE,
        `R${round}: sim starts ${simFalcon.tick - simPrev} ticks after Viktor's hit, capture ${capFalcon.tick - capPrev}`,
      );
    }
  });

  it("the Dragon's moves take the capture's ticks from start to damage", () => {
    for (let round = 1; round <= 4; round++) {
      const [capStart] = capIn(round, /^Dragon uses a special move/);
      const [capHit] = capIn(round, /^Dragon deals/);
      const [simStart] = simIn(round, (e) => e.type === LOG_TYPES.CAST && e.actor === 'Dragon #1');
      const [simHit] = simIn(round, (e) => e.type === LOG_TYPES.DAMAGE && e.actor === 'Dragon #1');
      assert.ok(
        Math.abs(simHit.tick - simStart.tick - (capHit.tick - capStart.tick)) <= TOLERANCE,
        `R${round}: sim ${simHit.tick - simStart.tick}, capture ${capHit.tick - capStart.tick}`,
      );
    }
  });

  it("every round ends on the capture's tick", () => {
    for (const cap of capture.filter((c) => /Round \d ends/.test(c.text))) {
      const [sim] = simIn(cap.round, (e) => e.type === LOG_TYPES.ROUND_END);
      assert.ok(
        Math.abs(sim.tick - cap.tick) <= ROUND_END_TOLERANCE,
        `round ${cap.round}: sim t${sim.tick}, capture t${cap.tick}`,
      );
    }
  });
});
