import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { BATTLE_STATUS } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import RNG from '../lib/rng.js';

/** @typedef {import('../lib/Game/Battle/Actions.js').Round} Round */
/** @typedef {import('../lib/Game/Keys.js').CharacterKey} CharacterKey */

const ATTACK = { type: ACTION_TYPES.ATTACK, target: 0 };
const RUN = { command: ROUND_COMMANDS.RUN };
const FREE_WILL = { command: ROUND_COMMANDS.FREE_WILL };

/** @param {CharacterKey[]} keys @param {number} [lvl] */
const party = (keys, lvl = 1) => new PlayerParty(keys.map(key =>
  new Character(key).setLVL(lvl).setStats({ PWR: 150, SKL: 150, DEF: 150, SPD: 150, MGC: 60, LUK: 60, HP: 500 }).rest()));

/** @param {number} [count] */
const furfurs = (count = 2) => new EnemyParty(Array.from({ length: count }, () => new Enemy(ENEMY_KEYS.FURFUR)));

/**
 * Two LVL 1 members vs LVL 4 FurFurs: Run needs the roll.
 * @param {{ seed?: number, turns?: Round[], lvl?: number, escapable?: boolean }} [options]
 */
const battle = ({ seed = 1, turns = [], lvl = 1, escapable = true } = {}) => new Battle({
  party: party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO], lvl),
  enemies: furfurs(),
  rng: new RNG(seed),
  turns,
  escapable,
});

/** The first seed whose escape roll (the next RNG call) gives `escapes`. */
const seedWhere = (escapes) => {
  for (let seed = 1; ; seed++) if (RNG.isRun(new RNG(seed).next().getRNG2()) === escapes) return seed;
};

describe('Round commands: Fight', () => {
  it('a Fight command plays the same as its bare Action[]', () => {
    const bare = battle({ turns: [[ATTACK, ATTACK]] });
    const command = battle({ turns: [{ command: ROUND_COMMANDS.FIGHT, actions: [ATTACK, ATTACK] }] });
    bare.run();
    command.run();
    assert.deepStrictEqual(command.log.entries, bare.log.entries);
  });
});

describe('Round commands: Run', () => {
  it('escapes with no RNG when the party average LVL is higher', () => {
    const b = battle({ lvl: 40, turns: [RUN, [ATTACK, ATTACK]] });
    b.run();
    assert.strictEqual(b.status, BATTLE_STATUS.ESCAPED);
    assert.strictEqual(b.rng.getCount(), 0);
    assert.strictEqual(b.turn_count, 0);
    assert.strictEqual(b.log.ofType(LOG_TYPES.ROUND_START).length, 0);
  });

  it('rolls when the averages are equal (strictly greater escapes outright)', () => {
    const seed = seedWhere(false);
    const b = battle({ seed, lvl: 4, turns: [RUN] });
    b.run();
    assert.strictEqual(b.status, BATTLE_STATUS.IN_PROGRESS);
  });

  it('counts fallen members in the party average', () => {
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO]);
    p.combatants[0].setLVL(10);
    p.combatants[1].setLVL(1); // average 5.5, not floored
    assert.strictEqual(p.averageLVL, 5.5);
    const b = new Battle({ party: p, enemies: furfurs(), rng: new RNG(seedWhere(false)), turns: [RUN] });
    b.party.combatants[0].knockedOut = true;
    b.run();
    assert.strictEqual(b.status, BATTLE_STATUS.ESCAPED);
  });

  it('a successful roll escapes before the round starts', () => {
    const b = battle({ seed: seedWhere(true), turns: [RUN, [ATTACK, ATTACK]] });
    const { status, result } = b.run({ finish: true });
    assert.strictEqual(status, BATTLE_STATUS.ESCAPED);
    assert.strictEqual(b.rng.getCount(), 1);
    assert.strictEqual(b.turn_count, 0);
    assert.strictEqual(b.log.ofType(LOG_TYPES.ROUND_START).length, 0);
    assert.strictEqual(result.drop, null);
    assert.deepStrictEqual(result.rewards, []);
  });

  it('a failed roll plays the round with everyone Defending', () => {
    const b = battle({ seed: seedWhere(false), turns: [RUN] });
    b.run();
    assert.strictEqual(b.status, BATTLE_STATUS.IN_PROGRESS);
    assert.strictEqual(b.turn_count, 1);
    const [command, roundStart] = b.log.entries;
    assert.deepStrictEqual([command.type, command.detail, command.rng], [LOG_TYPES.ROUND_COMMAND, 'Run: failed', 1]);
    assert.strictEqual(roundStart.type, LOG_TYPES.ROUND_START);
    assert.deepStrictEqual(b.log.ofType(LOG_TYPES.DEFEND).map(e => e.actor).sort(), b.party.combatants.map(c => c.label).sort());
  });

  it("in a battle that can't be escaped, everyone Defends with no roll", () => {
    const b = battle({ lvl: 40, escapable: false, turns: [RUN] });
    b.run();
    assert.strictEqual(b.status, BATTLE_STATUS.IN_PROGRESS);
    assert.strictEqual(b.log.entries[0].detail, 'Run: no escape');
    assert.strictEqual(b.log.ofType(LOG_TYPES.ROUND_START)[0].rng, 1); // only the camera roll
    assert.strictEqual(b.log.ofType(LOG_TYPES.DEFEND).length, 2);
  });
});

describe('Round commands: Free Will', () => {
  it('sets the Free Will gate to 10, and it stays set', () => {
    const b = battle();
    b.enemies.combatants.forEach(enemy => enemy.HP = enemy.stats.HP = 100000); // survives two rounds
    b.playTurn(FREE_WILL);
    assert.strictEqual(b.freeWillGate, 10);
    b.playTurn([ATTACK, ATTACK]);
    assert.strictEqual(b.freeWillGate, 10);
  });

  it('spreads attacks across the enemies in slot order, wrapping', () => {
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.CLEO]);
    assert.deepStrictEqual(p.freeWillActions(furfurs(3)).map(a => a.target), [0, 1, 2]);
    assert.deepStrictEqual(p.freeWillActions(furfurs(2)).map(a => a.target), [0, 1, 0]);
  });

  it('skips enemies out of the fight', () => {
    const enemies = furfurs(3);
    enemies.combatants[1].knockedOut = true;
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.CLEO]);
    assert.deepStrictEqual(p.freeWillActions(enemies).map(a => a.target), [0, 2, 0]);
  });

  it('Short range in the back row Defends, without moving the cursor', () => {
    // Slots 1-3 front, 4 back: Flik (Short) is in the back row
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.CLEO, CHARACTER_KEYS.FLIK, CHARACTER_KEYS.EILEEN]);
    const actions = p.freeWillActions(furfurs(3));
    assert.deepStrictEqual(actions.map(a => a.type), [ACTION_TYPES.ATTACK, ACTION_TYPES.ATTACK, ACTION_TYPES.ATTACK, ACTION_TYPES.DEFEND, ACTION_TYPES.ATTACK]);
    assert.strictEqual(actions[4].target, 0);
  });

  it('only Long range reaches the enemy back row', () => {
    const enemies = furfurs(2);
    enemies.combatants[0].position = 4;
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.CLEO]);
    // McDohl (Medium) skips the back-row FurFur; the cursor passes it, so Cleo (Long) wraps to it
    assert.deepStrictEqual(p.freeWillActions(enemies).map(a => a.target), [1, 0]);
  });

  it('Unbalanced members Defend', () => {
    const p = party([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO]);
    p.combatants[0].unbalance();
    const actions = p.freeWillActions(furfurs(2));
    assert.deepStrictEqual(actions.map(a => a.type), [ACTION_TYPES.DEFEND, ACTION_TYPES.ATTACK]);
    assert.strictEqual(actions[1].target, 0);
  });

  it('picks targets from the state when the round is played', () => {
    const b = battle({ lvl: 40 });
    b.enemies.combatants[0].knockedOut = true;
    b.playTurn(FREE_WILL);
    assert.deepStrictEqual(b.party.combatants.map(c => c.action.target), [1, 1]);
  });
});

describe('Battle.clone with round commands', () => {
  it('copies Fight commands, so editing one plan leaves the other alone', () => {
    const original = battle({ turns: [RUN, { command: ROUND_COMMANDS.FIGHT, actions: [ATTACK] }, [ATTACK]] });
    const copy = original.clone();
    /** @type {any} */ (copy.turns[1]).actions[0].target = 1;
    assert.strictEqual(/** @type {any} */ (original.turns[1]).actions[0].target, 0);
    assert.notStrictEqual(copy.turns[0], original.turns[0]);
  });
});
