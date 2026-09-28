import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { ENEMY_MOVES } from '../lib/Game/Battle/EnemyAI.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import RNG from '../lib/rng.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').EnemyAction} EnemyAction */

// Every expected value was confirmed against a live BizHawk capture (savestate + injected RNG
// seed); see Suikoden-Bizhawk-HUD's tests/test_Dragon.lua and Battle_Damage_Formula.md, "Dragon's
// move selection" and "How much RNG does a Lightning attack advance?". A seed here is the RNG
// state just before the first rand() of the step being tested.

/**
 * Dragon.State's party, in slot order (the same stats as test/battle.js's Dragon tests): MGC read
 * live (scripts/CheckDragonStats.lua), runes from the capture's DUMP. Slots 1-3 are the front row, so the target scan has 3 candidates.
 */
const makeParty = () => new PlayerParty([
  new Character(CHARACTER_KEYS.MCDOHL)
    .setStats({ PWR: 82, SKL: 102, DEF: 80, SPD: 93, MGC: 86, LUK: 85, HP: 278 })
    .setRune(RUNES.SOUL_EATER),
  new Character(CHARACTER_KEYS.VIKTOR)
    .setStats({ PWR: 119, SKL: 48, DEF: 94, SPD: 68, MGC: 51, LUK: 65, HP: 432 })
    .setRune(RUNES.HOLY),
  new Character(CHARACTER_KEYS.KUROMIMI)
    .setStats({ PWR: 77, SKL: 65, DEF: 74, SPD: 70, MGC: 40, LUK: 76, HP: 241 }),
  new Character(CHARACTER_KEYS.KIRKIS)
    .setStats({ PWR: 64, SKL: 99, DEF: 65, SPD: 76, MGC: 67, LUK: 50, HP: 196 })
    .setRune(RUNES.WIND),
  new Character(CHARACTER_KEYS.VALERIA)
    .setStats({ PWR: 94, SKL: 74, DEF: 90, SPD: 68, MGC: 65, LUK: 75, HP: 320 }),
  new Character(CHARACTER_KEYS.GREMIO)
    .setStats({ PWR: 65, SKL: 73, DEF: 90, SPD: 53, MGC: 42, LUK: 72, HP: 228 })
    .setRune(RUNES.WIND),
]);

/**
 * Runs the Dragon's AI tick by tick (the target scan retries with fresh rolls until someone
 * accepts) until it picks a move.
 * @param {number} seed
 */
const selectMove = seed => {
  const dragon = new Enemy(ENEMY_KEYS.DRAGON);
  const party = makeParty();
  const rng = new RNG(seed);
  /** @type {EnemyAction} */
  let choice;
  do {
    choice = dragon.selectAction({ party, enemies: null, rng, turn_count: 1, tick: 0 });
  } while (choice.action === ACTION_TYPES.UNDETERMINED);
  assert.strictEqual(choice.action, ACTION_TYPES.ABILITY, `seed 0x${seed.toString(16)}: not a move`);
  return { dragon, party, rng, move: choice.move, target: choice.target };
};

/**
 * Applies a move and returns the damage each party member took, in slot order.
 * @param {import('../lib/Game/Battle/EnemyAI.js').EnemyMove} move
 * @param {ReturnType<typeof selectMove>} selection
 */
const applyMove = (move, { dragon, party, rng, target }) => {
  move.apply(dragon, { party, rng, target });
  return party.combatants.map(c => c.pendingDamage);
};

const hex = (/** @type {number} */ seed) => `0x${seed.toString(16).padStart(8, '0')}`;

describe('Dragon move selection', () => {
  // 50 live seeds (scripts/SweepDragonMove.lua, TurnOrderRNGCall.State: 3 front-row members). slot
  // is the 0-based party slot Lightning hit; Fire Breath hits everyone.
  const cases = [
    { seed: 0x6aa79987, move: 'FireBreath' },
    { seed: 0xbb91433a, move: 'Lightning', slot: 0 },
    { seed: 0x029a7245, move: 'FireBreath' },
    { seed: 0xd1f6f86c, move: 'Lightning', slot: 0 },
    { seed: 0xd340bbcd, move: 'Lightning', slot: 0 },
    { seed: 0xcd8778e7, move: 'Lightning', slot: 0 },
    { seed: 0x4c73a942, move: 'FireBreath' },
    { seed: 0xdaea58ba, move: 'Lightning', slot: 0 },
    { seed: 0x5e503a67, move: 'Lightning', slot: 0 },
    { seed: 0xee897110, move: 'FireBreath' },
    { seed: 0x3193ca54, move: 'Lightning', slot: 1 },
    { seed: 0x452ec40a, move: 'FireBreath' },
    { seed: 0x90e5e945, move: 'FireBreath' },
    { seed: 0x6facaa50, move: 'FireBreath' },
    { seed: 0x29645f8b, move: 'Lightning', slot: 2 },
    { seed: 0x5f811cb9, move: 'Lightning', slot: 0 },
    { seed: 0x1fcff454, move: 'Lightning', slot: 0 },
    { seed: 0xdfc9e3b1, move: 'FireBreath' },
    { seed: 0x6ed4e94b, move: 'FireBreath' },
    { seed: 0x42d6cb5c, move: 'FireBreath' },
    { seed: 0x8fe46024, move: 'FireBreath' },
    { seed: 0xa091250e, move: 'Lightning', slot: 1 },
    { seed: 0x2ca1c789, move: 'Lightning', slot: 0 },
    { seed: 0x9c9cea0c, move: 'FireBreath' },
    { seed: 0x8d9fe5b9, move: 'FireBreath' },
    { seed: 0x2fd2b7a4, move: 'FireBreath' },
    { seed: 0x5adad121, move: 'Lightning', slot: 0 },
    { seed: 0xbcf74d7a, move: 'FireBreath' },
    { seed: 0xf543bbcf, move: 'Lightning', slot: 2 },
    { seed: 0xbb9d58e4, move: 'FireBreath' },
    { seed: 0x175f0cd2, move: 'FireBreath' },
    { seed: 0x87f26aee, move: 'Lightning', slot: 1 },
    { seed: 0xfa882692, move: 'Lightning', slot: 1 },
    { seed: 0xbc428d42, move: 'FireBreath' },
    { seed: 0x6980a81f, move: 'FireBreath' },
    { seed: 0x95c5fb98, move: 'FireBreath' },
    { seed: 0x8101e89a, move: 'FireBreath' },
    { seed: 0x2aa4857e, move: 'Lightning', slot: 0 },
    { seed: 0x25ece845, move: 'FireBreath' },
    { seed: 0x34a9af41, move: 'Lightning', slot: 0 },
    { seed: 0xb80e3b0d, move: 'Lightning', slot: 2 },
    { seed: 0x13ed748b, move: 'FireBreath' },
    { seed: 0x30a1f6d5, move: 'Lightning', slot: 1 },
    { seed: 0xd64a3ce0, move: 'FireBreath' },
    { seed: 0x57708107, move: 'FireBreath' },
    { seed: 0x527122dc, move: 'FireBreath' },
    { seed: 0x06057c82, move: 'FireBreath' },
    { seed: 0x7576714a, move: 'Lightning', slot: 2 },
    { seed: 0x56eaa301, move: 'FireBreath' },
    { seed: 0x06e0f458, move: 'FireBreath' },
  ];
  const MOVES = { Lightning: ENEMY_MOVES.DRAGON_LIGHTNING, FireBreath: ENEMY_MOVES.DRAGON_FIRE_BREATH };

  for (const { seed, move, slot } of cases) {
    it(`${hex(seed)}: ${move}${slot === undefined ? '' : ` on slot ${slot}`}`, () => {
      const selection = selectMove(seed);
      assert.strictEqual(selection.move, MOVES[move]);
      if (slot !== undefined) assert.strictEqual(selection.target, selection.party.combatants[slot]);
    });
  }
});

describe('Dragon Lightning RNG', () => {
  // 16 live seeds (scripts/SettleLightningRNG.lua): the seed is the RNG state right after move
  // selection, and calls is every rand() the move makes, the final damage roll included.
  const cases = [
    [0x9e68560c, 681], [0x2781e494, 716], [0xa078995f, 686], [0x8ff0f2ca, 711],
    [0x0a2a285f, 651], [0x8af157af, 656], [0x843603c9, 701], [0x0c815ed7, 711],
    [0x08087bfc, 706], [0x133b08b9, 666], [0x3f3b291f, 736], [0xa53cf772, 736],
    [0x1ddcd542, 736], [0x19b260fd, 686], [0x8312ec9f, 756], [0x926f56d7, 711],
  ];

  for (const [seed, calls] of cases) {
    it(`${hex(seed)}: ${calls} rand() calls`, () => {
      const party = makeParty();
      const rng = new RNG(seed);
      ENEMY_MOVES.DRAGON_LIGHTNING.apply(new Enemy(ENEMY_KEYS.DRAGON), { party, rng, target: party.combatants[1] });
      assert.strictEqual(rng.getCount(), calls);
    });
  }
});

describe('Dragon damage', () => {
  // 8 live Lightning seeds (scripts/SweepDragonMove.lua's DragonSweepResults.txt), from move
  // selection on. Slot 0 is McDohl with the Soul Eater (category 7), which halves every monster
  // hit; slots 1 and 2 take full damage.
  const lightning = [
    { seed: 0xbb91433a, slot: 0, damage: 30 },
    { seed: 0xd1f6f86c, slot: 0, damage: 32 },
    { seed: 0xd340bbcd, slot: 0, damage: 31 },
    { seed: 0xcd8778e7, slot: 0, damage: 29 },
    { seed: 0x3193ca54, slot: 1, damage: 102 },
    { seed: 0x29645f8b, slot: 2, damage: 117 },
    { seed: 0xa091250e, slot: 1, damage: 93 },
    { seed: 0xf543bbcf, slot: 2, damage: 113 },
  ];

  for (const { seed, slot, damage } of lightning) {
    it(`Lightning ${hex(seed)}: ${damage} to slot ${slot}`, () => {
      const selection = selectMove(seed);
      assert.strictEqual(selection.move, ENEMY_MOVES.DRAGON_LIGHTNING);
      const expected = selection.party.combatants.map((_, i) => (i === slot ? damage : 0));
      assert.deepStrictEqual(applyMove(selection.move, selection), expected);
    });
  }

  // One live Fire Breath seed, all 6 targets. Slot 0 takes the extra halving (McDohl's Soul
  // Eater here; the Lua test credits the slot-1 register bug, which gives the same 15).
  it('Fire Breath 0x6aa79987: 15, 50, 55, 41, 42, 49', () => {
    const selection = selectMove(0x6aa79987);
    assert.strictEqual(selection.move, ENEMY_MOVES.DRAGON_FIRE_BREATH);
    assert.deepStrictEqual(applyMove(selection.move, selection), [15, 50, 55, 41, 42, 49]);
  });
});

describe('Dragon move timing', () => {
  // Dragon.State, live 2026-09-28 (15 of each move), from T0 = the tick she becomes the current
  // actor: AI at T+1, move roll M = T+37. The damage frame drifts over 5 frames (cause unknown);
  // the sim uses the middle: Fire Breath D = M+266, Lightning P = M+17 and D = P+251. Her turn
  // ends at B (D+21 / D+22), the gate is set to 30 at B+1, and the next turn roll is at B+31.
  /** @param {number} seed */
  const runDragonTurn = seed => {
    const party = makeParty();
    const battle = new Battle({ party, enemies: new EnemyParty([new Enemy(ENEMY_KEYS.DRAGON)]), rng: new RNG(seed), turns: [] });
    battle.turn.pending = party.combatants.length + 1;
    battle.phase = PHASE_STATE.COPY_ACTOR; // T0 = tick 0
    while (/** @type {string} */ (battle.phase) !== PHASE_STATE.ADVANCE_TURN) battle.tick();
    const doneTick = battle.turn.tick - 1;
    while (!battle.log.ofType('turn').length) battle.tick();
    return { battle, party, doneTick, nextRoll: battle.log.ofType('turn')[0].tick };
  };

  it('Fire Breath: damage at T+303, turn over at B = T+324, next roll at B+31', () => {
    const { battle, doneTick, nextRoll } = runDragonTurn(0x6aa79987);
    const damage = battle.log.ofType('damage');
    assert.strictEqual(damage.length, 6);
    assert.ok(damage.every(d => d.tick === 303));
    assert.strictEqual(battle.enemies.combatants[0].busyUntil, 324);
    assert.strictEqual(doneTick, 324 + 1); // DONE with gate 30 the tick after B
    assert.strictEqual(nextRoll, 324 + 31);
  });

  it('Lightning: target reacts until P+214, damage at P+251 = T+305, B = T+327, next roll at B+31', () => {
    const { battle, party, doneTick, nextRoll } = runDragonTurn(0xbb91433a); // hits slot 0
    const [damage] = battle.log.ofType('damage');
    assert.strictEqual(damage.tick, 305);
    assert.strictEqual(damage.target, party.combatants[0].label);
    assert.strictEqual(party.combatants[0].busyUntil, 54 + 214);
    assert.strictEqual(battle.enemies.combatants[0].busyUntil, 327);
    assert.strictEqual(doneTick, 327 + 1);
    assert.strictEqual(nextRoll, 327 + 31);
  });
});
