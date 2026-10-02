import { describe, it } from 'node:test';
import assert from 'node:assert';
import Duel, {
  DUELS, DUEL_COUNTER, DUEL_HITS, DUEL_MOVES, DUEL_RESULTS, DUEL_SIDES, duelEnemyMove, duelHitDamage, duelistFromCharacter,
} from '../lib/Game/Duel.js';
import Character from '../lib/Game/Battle/Character.js';
import { CHARACTER_KEYS } from '../lib/Game/Keys.js';
import RNG from '../lib/rng.js';
import LuaCases from './data/duels_lua.json' with { type: 'json' };

const { ATTACK, DEFEND, DESPERATE } = DUEL_MOVES;
const { PLAYER, ENEMY } = DUEL_SIDES;

describe('duelEnemyMove', () => {
  it('splits rand() into thirds, with 0x7fff wrapping back to Attack', () => {
    assert.strictEqual(duelEnemyMove(0), ATTACK);
    assert.strictEqual(duelEnemyMove(0x2aaa), ATTACK);
    assert.strictEqual(duelEnemyMove(0x2aab), DEFEND);
    assert.strictEqual(duelEnemyMove(0x5554), DEFEND);
    assert.strictEqual(duelEnemyMove(0x5555), DESPERATE);
    assert.strictEqual(duelEnemyMove(0x7ffe), DESPERATE);
    assert.strictEqual(duelEnemyMove(0x7fff), ATTACK);
  });
});

describe('duelHitDamage', () => {
  it('has no variance while base < 100', () => {
    for (const rand of [0, 7, 0x7fff]) assert.strictEqual(duelHitDamage(150, 84, 220, DUEL_HITS.NORMAL, rand), 66);
  });
  it('adds ((base / 100) * rand) % 10 from base 100 (the Teo capture: even offsets only at base 225)', () => {
    assert.strictEqual(duelHitDamage(240, 88, 324, DUEL_HITS.NORMAL, 3), 155);
    assert.strictEqual(duelHitDamage(330, 105, 180, DUEL_HITS.NORMAL, 2), 229);
    assert.strictEqual(duelHitDamage(330, 105, 180, DUEL_HITS.NORMAL, 7), 229);
  });
  it('halves with no floor of 1', () => {
    assert.strictEqual(duelHitDamage(10, 50, 100, DUEL_HITS.HALF, 0), 0);
    assert.strictEqual(duelHitDamage(125, 75, 280, DUEL_HITS.HALF, 0), 25);
  });
  it('doubles, floored at a quarter of the defender\'s current HP', () => {
    assert.strictEqual(duelHitDamage(125, 75, 280, DUEL_HITS.DOUBLE, 0), 100);
    assert.strictEqual(duelHitDamage(80, 75, 280, DUEL_HITS.COUNTER, 0), 70);
  });
});

describe('Duel: the live Kwanda capture (KwandaDuelPreStart.State)', () => {
  // McDohl 220/301, STR 125, DEF 84. Played Desp, Def, Atk, Def, Desp; lost in round 5.
  const duel = new Duel(DUELS.KWANDA, { HP: 220, maxHP: 301, ATK: 125, DEF: 84 }, 0x7bf604db);
  const rounds = [DESPERATE, DEFEND, ATTACK, DEFEND, DESPERATE].map(move => duel.resolveRound(move));

  it('matches every enemy move, dialogue row and outcome', () => {
    assert.deepStrictEqual(rounds.map(r => r.enemyMove), [0, 1, 2, 2, 1]);
    assert.deepStrictEqual(rounds.map(r => r.outcome), [7, 5, 3, 6, 8]);
    assert.strictEqual(rounds[0].line, 'Taste the sharpness of my blade!');
    assert.strictEqual(rounds[1].line, 'Arghhh! I underestimated you.'); // row 7, Defend
  });
  it('lands hits in order: outcome 7 player then enemy, outcome 3 enemy then player', () => {
    assert.deepStrictEqual(rounds[0].hits.map(h => [h.side, h.damage]), [[PLAYER, 66], [ENEMY, 100]]);
    assert.deepStrictEqual(rounds[1].hits, []);
    assert.deepStrictEqual(rounds[2].hits.map(h => [h.side, h.damage]), [[ENEMY, 50], [PLAYER, 132]]);
  });
  it('loses in round 5 with the captured final RNG', () => {
    assert.deepStrictEqual(rounds.map(r => r.result), [null, null, null, null, DUEL_RESULTS.LOSE]);
    assert.strictEqual(duel.rng.rng, 0x03531a8e);
    assert.strictEqual(duel.rng.count, 11); // 5 move rolls + 6 hits
    assert.strictEqual(duel.player.HP, -110);
    assert.strictEqual(duel.enemy.HP, 30);
    assert.throws(() => duel.startRound(), /over/);
  });
});

describe('Duel: matches lib/Duel.lua (Suikoden-Bizhawk-HUD) on random play', () => {
  const cases = /** @type {any[]} */ (LuaCases);
  it(`${cases.length} duels, every round`, () => {
    for (const { duel: key, seed, player, rounds } of cases) {
      const duel = new Duel(DUELS[key], player, seed);
      for (const expected of rounds) {
        const r = duel.resolveRound(expected.playerMove);
        const where = `${key} 0x${seed.toString(16)} round ${r.round}`;
        assert.strictEqual(r.enemyMove, expected.enemyMove, where);
        assert.strictEqual(r.outcome, expected.outcome, where);
        assert.deepStrictEqual(r.hits.map(({ side, flag, damage }) => ({ side, flag, damage })), expected.hits, where);
        assert.deepStrictEqual([duel.player.HP, duel.enemy.HP], expected.hp, where);
        assert.strictEqual(duel.rng.rng, expected.rng, where);
        assert.strictEqual(r.result, expected.result, where);
      }
    }
  });
});

describe('Duel: round steps and branching', () => {
  const player = { HP: 301, maxHP: 301, ATK: 125, DEF: 84 };

  it('peekRound shows the next move and line without using the RNG; startRound rolls it once', () => {
    const duel = new Duel(DUELS.KWANDA, player, 0x7bf604db);
    const peek = duel.peekRound();
    assert.strictEqual(duel.rng.count, 0);
    assert.deepStrictEqual(duel.startRound(), peek);
    assert.deepStrictEqual(duel.startRound(), peek);
    assert.strictEqual(duel.rng.count, 1);
    assert.deepStrictEqual(duel.peekRound(), peek);
  });

  it('Defend vs Defend costs exactly one roll', () => {
    const duel = new Duel(DUELS.KWANDA, player, 0x7bf604db);
    duel.resolveRound(DESPERATE);
    const before = duel.rng.count;
    assert.strictEqual(duel.peekRound().enemyMove, DEFEND);
    duel.resolveRound(DEFEND);
    assert.strictEqual(duel.rng.count - before, 1);
  });

  it('clone() branches without touching the original', () => {
    const duel = new Duel(DUELS.KWANDA, player, 0x7bf604db);
    duel.startRound();
    const branch = duel.clone();
    branch.resolveRound(DESPERATE);
    assert.strictEqual(duel.roundCount, 0);
    assert.strictEqual(duel.player.HP, 301);
    assert.strictEqual(duel.rng.count, 1);
    const same = duel.clone().resolveRound(DESPERATE);
    assert.deepStrictEqual(same, branch.rounds[0]);
  });

  it('play() with the counter-pick strategy finishes the duel', () => {
    const duel = new Duel(DUELS.KWANDA, player, 0x7bf604db).play((_, enemyMove) => DUEL_COUNTER[enemyMove]);
    assert.ok(duel.isOver);
    assert.ok(duel.rounds.every(r => [2, 6, 7].includes(r.outcome)));
  });

  it('takes an RNG instance and keeps using it', () => {
    const rng = new RNG(0x7bf604db);
    const duel = new Duel(DUELS.KWANDA, player, rng);
    duel.resolveRound(DESPERATE);
    assert.strictEqual(duel.rng, rng);
    assert.strictEqual(rng.count, 3);
  });
});

describe('duelistFromCharacter', () => {
  it('reads current HP, max HP, battle ATK and armored DEF', () => {
    const mcdohl = new Character(CHARACTER_KEYS.MCDOHL).setLVL(10);
    mcdohl.HP = 50;
    assert.deepStrictEqual(duelistFromCharacter(mcdohl), { HP: 50, maxHP: mcdohl.stats.HP, ATK: mcdohl.ATK, DEF: mcdohl.ARM });
  });
});
