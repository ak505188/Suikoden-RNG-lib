import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES, ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import { STATUS, WEAPON_ELEMENTS } from '../lib/Game/Constants.js';
import CHARACTERS from '../lib/Game/Characters.js';
import RNG from '../lib/rng.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { KeyWriter, pushKeyInt, shallowCloneInstance } from '../lib/lib.js';

const ATTACK = { type: ACTION_TYPES.ATTACK, target: 0 };

const makeBattle = (turns = []) => {
  const party = [CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.CLEO].map((key) =>
    new Character(key)
      .setLVL(22)
      .setStats({ PWR: 70, SKL: 70, DEF: 80, SPD: 50, MGC: 60, LUK: 60, HP: 220 })
      .rest(),
  );
  return new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
    rng: new RNG(1),
    turns,
  });
};

/** Everything that can change during a battle, for comparing two of them. */
const snapshot = (/** @type {Battle} */ battle) => ({
  rng: [battle.rng.getRNG(), battle.rng.getCount()],
  turn: battle.turn_count,
  frames: battle.frames,
  combatants: battle.combatants.slice(1).map((c) => [c.HP, c.knockedOut, { ...c.status }]),
  log: battle.log.format(),
});

describe('Battle.clone', () => {
  it('plays out exactly like the original', () => {
    const turns = [
      [ATTACK, ATTACK, ATTACK],
      [ATTACK, ATTACK, ATTACK],
    ];
    const original = makeBattle(turns);
    const copy = original.clone();
    original.run();
    copy.run();
    assert.deepStrictEqual(snapshot(copy), snapshot(original));
  });

  it('branches from a later round without touching the original', () => {
    const battle = makeBattle();
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    const before = snapshot(battle);

    const copy = battle.clone();
    copy.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.notDeepStrictEqual(snapshot(copy), before);
    assert.deepStrictEqual(snapshot(battle), before);

    // ...and the original still plays that round the same way the copy did
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.deepStrictEqual(snapshot(battle), snapshot(copy));
  });

  it('copies every combatant and their mutable state', () => {
    const battle = makeBattle();
    const copy = battle.clone();
    const [mcdohl, copyMcdohl] = [battle.party.combatants[0], copy.party.combatants[0]];

    assert.notStrictEqual(copyMcdohl, mcdohl);
    assert.ok(copyMcdohl instanceof Character);
    assert.strictEqual(copy.combatants[1], copyMcdohl);
    assert.strictEqual(copy.combatants[4], copy.enemies.combatants[0]);

    copyMcdohl.setHP(1);
    copyMcdohl.stats.PWR = 1;
    copyMcdohl.status[STATUS.POISON] = true;
    copyMcdohl.MP[0] = 0;
    copyMcdohl.inventory.use(ITEM_KEYS.MEDICINE);
    copyMcdohl.weapon.setRunePiece(WEAPON_ELEMENTS.FIRE);
    copy.enemies.combatants[0].setHP(1);
    copy.rng.next();
    copy.log.record({ type: LOG_TYPES.ROUND_START, round: 0, tick: 0, rng: 0 });

    assert.strictEqual(mcdohl.HP, 220);
    assert.strictEqual(mcdohl.stats.PWR, 70);
    assert.strictEqual(mcdohl.status[STATUS.POISON], false);
    assert.notStrictEqual(mcdohl.MP[0], 0);
    assert.strictEqual(mcdohl.inventory.get(ITEM_KEYS.MEDICINE).quantity, 6);
    assert.strictEqual(mcdohl.weapon.runePiece.element, WEAPON_ELEMENTS.NONE);
    assert.strictEqual(battle.enemies.combatants[0].HP, battle.enemies.combatants[0].stats.HP);
    assert.strictEqual(battle.rng.getCount(), 0);
    assert.strictEqual(battle.log.entries.length, 0);
  });
});

describe('Character stats', () => {
  it("levelling up doesn't change the roster's starting stats", () => {
    const before = { ...CHARACTERS[CHARACTER_KEYS.MCDOHL].stats.initial };
    new Character(CHARACTER_KEYS.MCDOHL).levelUp(10, 1, new RNG(1));
    assert.deepStrictEqual(CHARACTERS[CHARACTER_KEYS.MCDOHL].stats.initial, before);
  });
});

describe('Battle logging', () => {
  const turns = () => [
    [ATTACK, ATTACK, ATTACK],
    [ATTACK, ATTACK, ATTACK],
  ];

  it('off: plays exactly the same, with nothing logged', () => {
    const logged = makeBattle(turns());
    const silent = makeBattle(turns()).setLogging(false);
    logged.run();
    silent.run();
    assert.strictEqual(silent.stateKey(), logged.stateKey());
    assert.strictEqual(silent.frames, logged.frames);
    assert.strictEqual(silent.log.entries.length, 0);
    assert.ok(logged.log.entries.length > 0);
  });

  it('off: clones share the (unchanging) log; turning it back on gives the clone its own', () => {
    const battle = makeBattle();
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    const before = battle.log.entries.length;
    battle.setLogging(false);
    const copy = battle.clone();
    assert.strictEqual(copy.log, battle.log);

    copy.setLogging(true);
    assert.notStrictEqual(copy.log, battle.log);
    copy.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.ok(copy.log.entries.length > before);
    assert.strictEqual(battle.log.entries.length, before);
  });
});

describe('Battle.stateKey', () => {
  it('is equal for a battle and its clone', () => {
    const battle = makeBattle();
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    assert.strictEqual(battle.clone().stateKey(), battle.stateKey());
  });

  it('tells apart battles differing only in HP, MP, a status or an item quantity', () => {
    const battle = makeBattle();
    battle.playTurn([ATTACK, ATTACK, ATTACK]);
    const keys = new Set([battle.stateKey()]);
    /** @param {(b: Battle) => void} change */
    const differs = (change) => {
      const copy = battle.clone();
      change(copy);
      keys.add(copy.stateKey());
    };
    differs((b) => b.party.combatants[0].setHP(b.party.combatants[0].HP - 1));
    differs((b) => {
      b.party.combatants[0].MP[0] -= 1;
    });
    differs((b) => {
      b.party.combatants[0].status[STATUS.POISON] = true;
    });
    differs((b) => b.party.combatants[0].inventory.use(ITEM_KEYS.MEDICINE));
    differs((b) => b.enemies.combatants[0].setHP(1));
    differs((b) => b.rng.next());
    assert.strictEqual(keys.size, 7);
  });
});

describe('pushKeyInt', () => {
  it('encodes every value differently, including the escaped ones', () => {
    const values = [
      0,
      1,
      0xfffd,
      0xfffe,
      0xffff,
      0x10000,
      2 ** 32 - 1,
      2 ** 32,
      -1,
      -0xffff,
      2 ** 47,
    ];
    const encoded = values.map((v) => {
      const out = [];
      pushKeyInt(out, v);
      return String.fromCharCode(...out);
    });
    assert.strictEqual(new Set(encoded).size, values.length);
    assert.strictEqual(encoded[0].length, 1);
    assert.strictEqual(encoded[3].length, 4);
  });

  it("refuses what it can't encode exactly", () => {
    assert.throws(() => pushKeyInt([], 1.5));
    assert.throws(() => pushKeyInt([], 2 ** 48));
    assert.throws(() => pushKeyInt([], NaN));
  });
});

describe('Battle.clone mid-round', () => {
  const D = { type: ACTION_TYPES.DEFEND };
  /** @param {number} target */
  const A = (target) => ({ type: ACTION_TYPES.ATTACK, target });

  const bonbon = () =>
    new Battle({
      party: new PlayerParty(
        [
          CHARACTER_KEYS.MCDOHL,
          CHARACTER_KEYS.GREMIO,
          CHARACTER_KEYS.PAHN,
          CHARACTER_KEYS.CLEO,
          CHARACTER_KEYS.TED,
        ].map((key) => new Character(key)),
      ),
      enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
      rng: new RNG(0x30a82220).next(5419),
      escapable: true,
    });
  const strong = (/** @type {import('../lib/Game/Keys.js').CharacterKey} */ key) =>
    new Character(key)
      .setLVL(20)
      .setStats({ PWR: 90, SKL: 60, DEF: 70, SPD: 40, MGC: 60, LUK: 40, HP: 300 })
      .rest();

  /** @type {Record<string, { make: () => Battle, rounds: import('../lib/Game/Battle/Actions.js').Round[] }>} */
  const fights = {
    'BonBon: a crit hold, a kill': {
      make: bonbon,
      rounds: [{ command: ROUND_COMMANDS.RUN }, [D, A(1), A(2), D, A(0)]],
    },
    'BonBon: a crit hold, then a retarget': {
      make: bonbon,
      rounds: [{ command: ROUND_COMMANDS.RUN }, [D, A(2), A(0), D, A(0)]],
    },
    'Talisman Unite': {
      make: () =>
        new Battle({
          party: new PlayerParty(
            [CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.GREMIO, CHARACTER_KEYS.PAHN].map(strong),
          ),
          enemies: EnemyParty.fromFormation(AREAS.GREGMINSTER_AREA_1.encounters[1]),
          rng: new RNG(7),
        }),
      rounds: [
        [
          A(0),
          { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN, target: 1 },
          { type: ACTION_TYPES.UNITE, uniteKey: UNITE_KEYS.TALISMAN, target: 1 },
        ],
      ],
    },
    'Boar Rune (idle wait, hold, animation roll)': {
      make: () =>
        new Battle({
          party: new PlayerParty([strong(CHARACTER_KEYS.MCDOHL), strong(CHARACTER_KEYS.PAHN)]),
          enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
          rng: new RNG(3),
        }),
      rounds: [[A(0), { type: ACTION_TYPES.RUNE, target: 0 }]],
    },
    'Zombie Dragon: Fire Breath cast, Flaming Arrows, Medicine': {
      make: () => {
        const battle = makeBattle();
        const cleo = battle.party.combatants[2].setRune(RUNES.FIRE);
        cleo.MP = [2, 0, 0, 0];
        return battle;
      },
      rounds: [
        [
          { type: ACTION_TYPES.ITEM, itemKey: ITEM_KEYS.MEDICINE, target: 1 },
          ATTACK,
          { type: ACTION_TYPES.RUNE, slot: 0, target: 0 },
        ],
      ],
    },
  };

  /** @param {Battle} battle */
  const outcome = (battle) => ({
    key: battle.stateKey(),
    status: battle.status,
    frames: battle.frames,
    log: battle.log.format(),
  });

  for (const [name, { make, rounds }] of Object.entries(fights)) {
    it(`${name}: a clone at any tick finishes exactly like the uncloned battle`, () => {
      const reference = make();
      rounds.forEach((round) => reference.playTurn(round));
      const expected = outcome(reference);
      assert.ok(reference.log.entries.length > 0);

      // Step the last round one tick at a time, cloning at every tick
      const battle = make();
      rounds.slice(0, -1).forEach((round) => battle.playTurn(round));
      assert.ok(battle.beginRound(rounds.at(-1)));
      let clones = 0;
      while (battle.phase !== PHASE_STATE.ROUND_OVER) {
        const copy = battle.clone();
        copy.playRound();
        assert.deepStrictEqual(outcome(copy), expected, `clone at tick ${battle.turn.tick}`);
        clones++;
        battle.tick();
      }
      battle.endRound();
      assert.deepStrictEqual(outcome(battle), expected);
      assert.ok(clones > 100);
    });
  }
});

describe('shallowCloneInstance', () => {
  it('copies every own property, keeping the prototype', () => {
    class Point {
      constructor() {
        this.x = 1;
        this.y = 2;
      }
    }
    const copy = shallowCloneInstance(new Point());
    assert.ok(copy instanceof Point);
    assert.deepStrictEqual({ ...copy }, { x: 1, y: 2 });
  });

  it("throws when a sampled copy finds properties the first instance didn't have", () => {
    class Shape {
      constructor() {
        this.a = 1;
      }
    }
    shallowCloneInstance(new Shape()); // copy 0 (checked): builds the copier from { a }
    for (let i = 1; i < 1024; i++) shallowCloneInstance(new Shape());
    const odd = new Shape();
    /** @type {any} */ (odd).b = 2; // added after construction: the copier can't know it
    assert.throws(() => shallowCloneInstance(odd), /extra: b/); // copy 1024 is checked
  });
});

describe('KeyWriter', () => {
  it('makes the same key as an array would', () => {
    const values = Array.from({ length: 700 }, (_, i) => (i * 7919) % 0x20000); // some need escapes
    const array = [],
      writer = new KeyWriter();
    for (const v of values) {
      pushKeyInt(array, v);
      pushKeyInt(writer, v);
    }
    assert.strictEqual(writer.toString(), String.fromCharCode(...array));
    assert.strictEqual(writer.reset().toString(), '');
  });
});
