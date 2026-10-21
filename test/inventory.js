import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Inventory } from '../lib/Game/Inventory.js';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS, ITEM_KEYS } from '../lib/Game/Keys.js';
import { ARMOR } from '../lib/Game/Armor.js';
import { ARMOR_SLOT, STATUS } from '../lib/Game/Constants.js';
import RNG from '../lib/rng.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';

describe('Inventory', () => {
  it("fills in each item's default quantity", () => {
    const inventory = new Inventory([
      { key: ITEM_KEYS.MEDICINE },
      { key: ITEM_KEYS.ANTITOXIN, quantity: 2 },
      { key: ITEM_KEYS.ESCAPE_TALISMAN },
    ]);
    assert.strictEqual(inventory.get(ITEM_KEYS.MEDICINE).quantity, 6);
    assert.strictEqual(inventory.get(ITEM_KEYS.ANTITOXIN).quantity, 2);
    assert.strictEqual(inventory.get(ITEM_KEYS.ESCAPE_TALISMAN).quantity, 1);
  });

  it('holds at most 9 slots, equipped armor included', () => {
    const nine = Array.from({ length: 9 }, () => ({ key: ITEM_KEYS.MEDICINE }));
    assert.throws(
      () => new Inventory([...nine, { key: ITEM_KEYS.BANDANNA, slot: ARMOR_SLOT.HEAD }]),
      /at most 9/,
    );
    const inventory = new Inventory(nine);
    assert.strictEqual(inventory.isFull, true);
    assert.strictEqual(inventory.add(ITEM_KEYS.NEEDLE), false);
    assert.strictEqual(inventory.has(ITEM_KEYS.NEEDLE), false);
  });

  it('adds an item in a new slot', () => {
    const inventory = new Inventory();
    assert.strictEqual(inventory.add(ITEM_KEYS.MEGA_MEDICINE), true);
    assert.strictEqual(inventory.get(ITEM_KEYS.MEGA_MEDICINE).quantity, 3);
  });

  it('uses up a consumable one use at a time, emptying its slot at 0', () => {
    const inventory = new Inventory([{ key: ITEM_KEYS.MEDICINE, quantity: 2 }]);
    inventory.use(ITEM_KEYS.MEDICINE);
    assert.strictEqual(inventory.get(ITEM_KEYS.MEDICINE).quantity, 1);
    inventory.use(ITEM_KEYS.MEDICINE);
    assert.strictEqual(inventory.has(ITEM_KEYS.MEDICINE), false);
    assert.throws(() => inventory.use(ITEM_KEYS.MEDICINE), /No MEDICINE/);
  });

  it("doesn't use up non-consumables", () => {
    const inventory = new Inventory([{ key: ITEM_KEYS.DRAGON_SEAL_INCENSE }]);
    inventory.use(ITEM_KEYS.DRAGON_SEAL_INCENSE);
    inventory.use(ITEM_KEYS.DRAGON_SEAL_INCENSE);
    assert.strictEqual(inventory.has(ITEM_KEYS.DRAGON_SEAL_INCENSE), true);
  });

  it('only allows battle-usable items in battle', () => {
    const inventory = new Inventory([
      { key: ITEM_KEYS.MEDICINE },
      { key: ITEM_KEYS.ESCAPE_TALISMAN },
    ]);
    assert.strictEqual(inventory.canUseInBattle(ITEM_KEYS.MEDICINE), true);
    assert.strictEqual(inventory.canUseInBattle(ITEM_KEYS.ESCAPE_TALISMAN), false);
    assert.strictEqual(inventory.canUseInBattle(ITEM_KEYS.NEEDLE), false);
  });

  it('gives the armor worn in each slot', () => {
    const inventory = new Inventory([
      { key: ITEM_KEYS.BANDANNA, slot: ARMOR_SLOT.HEAD, locked: true },
      { key: ITEM_KEYS.TUNIC },
    ]);
    assert.strictEqual(inventory.armorIn(ARMOR_SLOT.HEAD), ARMOR.BANDANNA);
    assert.strictEqual(inventory.armorIn(ARMOR_SLOT.BODY), null);
    assert.strictEqual(inventory.equippedIn(ARMOR_SLOT.HEAD).locked, true);
  });

  it("gives each Character its own copy of the roster's starting items", () => {
    const first = new Character(CHARACTER_KEYS.GREMIO);
    first.inventory.use(ITEM_KEYS.MEDICINE);
    const second = new Character(CHARACTER_KEYS.GREMIO);
    assert.strictEqual(first.inventory.get(ITEM_KEYS.MEDICINE).quantity, 5);
    assert.strictEqual(second.inventory.get(ITEM_KEYS.MEDICINE).quantity, 6);
  });
});

const makeFighter = (/** @type {import('../lib/Game/Keys.js').CharacterKey} */ key) =>
  new Character(key)
    .setLVL(22)
    .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
    .rest();

/** @param {Character[]} party */
const makeBattle = (party) =>
  new Battle({
    party: new PlayerParty(party),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON)]),
    rng: new RNG(1),
    turns: [],
  });

/**
 * Puts `character` in DISPATCH with `action` at the current tick and ticks the round driver
 * until the turn ends.
 * @returns {number} the tick the turn ended on
 */
const playItemTurn = (/** @type {Battle} */ battle, /** @type {Character} */ character, action) => {
  character.setAction({ type: ACTION_TYPES.ITEM, ...action });
  battle.turn.current = battle.combatants.indexOf(character);
  battle.phase = PHASE_STATE.DISPATCH;
  for (let guard = 0; guard < 1000; guard++) {
    const tick = battle.turn.tick;
    battle.tick();
    if (battle.phase !== PHASE_STATE.DISPATCH) return tick;
  }
  throw new Error('item turn never ended');
};

/**
 * Keeps ticking until the battle's tick is past `tick` (the turn has ended; scheduled events fall
 * due on the way).
 */
const tickPast = (/** @type {Battle} */ battle, /** @type {number} */ tick) => {
  for (let guard = 0; guard < 1000; guard++) {
    if (battle.turn.tick > tick) return;
    battle.tick();
  }
  throw new Error(`never reached tick ${tick}`);
};

describe('Party item use', () => {
  // Each user's item-use script has its own length (BizHawk logs and the Ghidra walk,
  // CharacterAttackTimings.js): Gremio's target script starts 22 frames after R (McDohl's: 19), the
  // HP change lands 32 frames after that, and the target, here Gremio himself, is free 64 after it.
  it("ends the turn at the user's itemDone and heals 32 frames later, with no RNG", () => {
    const gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(50);
    const battle = makeBattle([gremio]);
    const rngBefore = battle.rng.count;
    const end = playItemTurn(battle, gremio, { itemKey: ITEM_KEYS.MEDICINE });
    assert.strictEqual(end, 22);
    assert.strictEqual(gremio.HP, 50);
    assert.strictEqual(gremio.inventory.get(ITEM_KEYS.MEDICINE).quantity, 5);
    assert.strictEqual(gremio.busyUntil, 22 + 64); // self-targeted
    assert.strictEqual(battle.rng.count, rngBefore);
    tickPast(battle, 22 + 32);
    assert.strictEqual(gremio.HP, 150);
    assert.deepStrictEqual(
      battle.log.ofType(LOG_TYPES.ITEM).map((e) => e.tick),
      [0],
    );
    assert.deepStrictEqual(
      battle.log.ofType(LOG_TYPES.DAMAGE).map((e) => [e.tick, e.amount]),
      [[22 + 32, -100]],
    );
  });

  // McDohl's own timing is the spec's (live, Zombie Dragon and the Mosquito fight): done 19, HP
  // change at 19 + 32 = 51, free at 19 + 64 = 83 on himself.
  it("McDohl's item use is the spec's: done 19, heal at 51, free at 83", () => {
    const mcdohl = makeFighter(CHARACTER_KEYS.MCDOHL).setHP(50);
    const battle = makeBattle([mcdohl]);
    const end = playItemTurn(battle, mcdohl, { itemKey: ITEM_KEYS.MEDICINE });
    assert.strictEqual(end, 19);
    assert.strictEqual(mcdohl.busyUntil, 83);
    tickPast(battle, 51);
    assert.strictEqual(mcdohl.HP, 150);
  });

  it('caps the heal at HPMax (Mega medicine)', () => {
    const gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(10);
    gremio.inventory.add(ITEM_KEYS.MEGA_MEDICINE);
    const battle = makeBattle([gremio]);
    playItemTurn(battle, gremio, { itemKey: ITEM_KEYS.MEGA_MEDICINE });
    tickPast(battle, 22 + 32);
    assert.strictEqual(gremio.HP, 201);
  });

  it('on another ally: user free at R+88, target busy R+19 to R+83', () => {
    const mcdohl = makeFighter(CHARACTER_KEYS.MCDOHL),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(1);
    const battle = makeBattle([mcdohl, gremio]);
    playItemTurn(battle, mcdohl, { itemKey: ITEM_KEYS.MEDICINE, target: 1 });
    assert.strictEqual(mcdohl.busyUntil, 88);
    assert.strictEqual(gremio.busyUntil, 83);
    tickPast(battle, 19 + 32);
    assert.strictEqual(gremio.HP, 101);
  });

  it('waits, with no RNG, until nobody is busy', () => {
    const mcdohl = makeFighter(CHARACTER_KEYS.MCDOHL),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    const battle = makeBattle([mcdohl, gremio]);
    gremio.busyUntil = 40;
    const end = playItemTurn(battle, mcdohl, { itemKey: ITEM_KEYS.MEDICINE });
    assert.strictEqual(battle.log.ofType(LOG_TYPES.ITEM)[0].tick, 41);
    assert.strictEqual(end, 41 + 19);
  });

  // Antitoxin on a poisoned ally (BizHawk log, Cleo -> Gremio, Mosquito fight): Cleo's done is 25
  // and her ally-free 105. The target's script starts at done, the Poison bit clears 31 frames
  // later (Items.md, simulated) and the target is free at done + 33. No HP change.
  it('Antitoxin on a poisoned ally runs a 33 frame script', () => {
    const cleo = makeFighter(CHARACTER_KEYS.CLEO),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(100);
    cleo.inventory.add(ITEM_KEYS.ANTITOXIN);
    const battle = makeBattle([cleo, gremio]);
    gremio.status[STATUS.POISON] = true;
    const end = playItemTurn(battle, cleo, { itemKey: ITEM_KEYS.ANTITOXIN, target: 1 });
    assert.strictEqual(end, 25);
    assert.strictEqual(cleo.busyUntil, 105);
    tickPast(battle, 25);
    assert.strictEqual(gremio.busyUntil, 25 + 33);
    assert.strictEqual(gremio.status[STATUS.POISON], true);
    tickPast(battle, 25 + 31);
    assert.strictEqual(gremio.status[STATUS.POISON], false);
    assert.strictEqual(gremio.HP, 100);
  });

  // Antitoxin on a healthy ally (log, Ted -> Cleo, done 24, ally-free 105): the handler plays
  // nothing on the target, no busy and no cure. Ted is free at R + 105.
  it('Antitoxin on a healthy ally does nothing to it', () => {
    const ted = makeFighter(CHARACTER_KEYS.TED),
      cleo = makeFighter(CHARACTER_KEYS.CLEO);
    ted.inventory.add(ITEM_KEYS.ANTITOXIN);
    const battle = makeBattle([ted, cleo]);
    const idle = cleo.busyUntil;
    const held = ted.inventory.get(ITEM_KEYS.ANTITOXIN).quantity;
    const end = playItemTurn(battle, ted, { itemKey: ITEM_KEYS.ANTITOXIN, target: 1 });
    assert.strictEqual(end, 24);
    assert.strictEqual(cleo.busyUntil, idle);
    assert.strictEqual(ted.busyUntil, 105);
    assert.strictEqual(ted.inventory.get(ITEM_KEYS.ANTITOXIN).quantity, held - 1); // still used up
  });

  // Antitoxin on a healthy self (log, Ted -> Ted): the user's script runs to its end, the ally
  // value (R + 105), not Medicine's self value (done + 64 = 88).
  it('Antitoxin on a healthy self frees the user at the ally value', () => {
    const ted = makeFighter(CHARACTER_KEYS.TED);
    ted.inventory.add(ITEM_KEYS.ANTITOXIN);
    const battle = makeBattle([ted]);
    playItemTurn(battle, ted, { itemKey: ITEM_KEYS.ANTITOXIN });
    tickPast(battle, 24 + 40);
    assert.strictEqual(ted.busyUntil, 105);
  });

  // Items.md table: user free done + 33 on self when poisoned
  it('Antitoxin on a poisoned self frees the user at done + 33', () => {
    const ted = makeFighter(CHARACTER_KEYS.TED);
    ted.inventory.add(ITEM_KEYS.ANTITOXIN);
    const battle = makeBattle([ted]);
    ted.status[STATUS.POISON] = true;
    playItemTurn(battle, ted, { itemKey: ITEM_KEYS.ANTITOXIN });
    tickPast(battle, 24 + 31);
    assert.strictEqual(ted.status[STATUS.POISON], false);
    assert.strictEqual(ted.busyUntil, 24 + 33);
  });

  // Needle (Items.md): one Balloon stage per use. The stage clears at done + 12 and the target is
  // free at done + 14. Cleo's done is 25, ally value 105.
  it('Needle clears one Balloon stage and frees the target at done + 14', () => {
    const cleo = makeFighter(CHARACTER_KEYS.CLEO),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(100);
    cleo.inventory.add(ITEM_KEYS.NEEDLE);
    const battle = makeBattle([cleo, gremio]);
    gremio.status[STATUS.BALLOON] = 2;
    const end = playItemTurn(battle, cleo, { itemKey: ITEM_KEYS.NEEDLE, target: 1 });
    assert.strictEqual(end, 25);
    assert.strictEqual(cleo.busyUntil, 105);
    tickPast(battle, 25);
    assert.strictEqual(gremio.busyUntil, 25 + 14);
    assert.strictEqual(gremio.status[STATUS.BALLOON], 2);
    tickPast(battle, 25 + 12);
    assert.strictEqual(gremio.status[STATUS.BALLOON], 1);
  });

  it('Needle on a healthy ally does nothing to it', () => {
    const cleo = makeFighter(CHARACTER_KEYS.CLEO),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    cleo.inventory.add(ITEM_KEYS.NEEDLE);
    const battle = makeBattle([cleo, gremio]);
    const idle = gremio.busyUntil;
    playItemTurn(battle, cleo, { itemKey: ITEM_KEYS.NEEDLE, target: 1 });
    assert.strictEqual(gremio.busyUntil, idle);
    assert.strictEqual(cleo.busyUntil, 105);
  });

  // Dragon Seal Incense (Items.md): the handler waits for the user's own script, so it fires one
  // tick after the user's ally-free time (McDohl: 88 + 1 = 89). Each member's HP change is at
  // fire + 32 and each member, the user included, is free at fire + 65. Never used up.
  it("Dragon seal incense fires after the user's script and heals every living member 50", () => {
    const mcdohl = makeFighter(CHARACTER_KEYS.MCDOHL).setHP(10),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO).setHP(20);
    mcdohl.inventory.add(ITEM_KEYS.DRAGON_SEAL_INCENSE);
    const battle = makeBattle([mcdohl, gremio]);
    const end = playItemTurn(battle, mcdohl, { itemKey: ITEM_KEYS.DRAGON_SEAL_INCENSE });
    assert.strictEqual(end, 89);
    tickPast(battle, 89 + 31);
    assert.deepStrictEqual([mcdohl.HP, gremio.HP], [10, 20]);
    tickPast(battle, 89 + 32);
    assert.deepStrictEqual([mcdohl.HP, gremio.HP], [60, 70]);
    assert.deepStrictEqual([mcdohl.busyUntil, gremio.busyUntil], [89 + 65, 89 + 65]);
    assert.strictEqual(mcdohl.inventory.has(ITEM_KEYS.DRAGON_SEAL_INCENSE), true);
  });

  it('Defends on a dead target, using nothing up', () => {
    const mcdohl = makeFighter(CHARACTER_KEYS.MCDOHL),
      gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    const battle = makeBattle([mcdohl, gremio]);
    gremio.setHP(0).die(0);
    const end = playItemTurn(battle, mcdohl, { itemKey: ITEM_KEYS.MEDICINE, target: 1 });
    assert.strictEqual(end, 0);
    assert.strictEqual(mcdohl.inventory.get(ITEM_KEYS.MEDICINE).quantity, 6);
    assert.strictEqual(battle.log.ofType(LOG_TYPES.DEFEND).length, 1);
  });

  it("rejects an item the character doesn't hold", () => {
    const gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    const battle = makeBattle([gremio]);
    assert.throws(
      () => playItemTurn(battle, gremio, { itemKey: ITEM_KEYS.MEGA_MEDICINE }),
      /can't use MEGA_MEDICINE/,
    );
  });
});

describe('Sacrificial Buddha', () => {
  /**
   * Runs the round driver's steps 2-3 and the death check for ticks from..to, like Battle.tick.
   * @param {Battle} battle @param {number} from @param {number} to
   * @param {(tick: number) => void} [onTick]
   */
  const runTicks = (battle, from, to, onTick = () => {}) => {
    for (let tick = from; tick <= to; tick++) {
      battle.turn.tick = tick;
      battle.runDueEvents();
      battle.commitPendingDamage();
      battle.checkDeaths();
      onTick(tick);
    }
  };

  it('revives instead of dying: slot removed, HP floor(HPMax / 2) at +113, busy until +123', () => {
    const gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    gremio.inventory.add(ITEM_KEYS.SACRIFICIAL_BUDDHA);
    const battle = makeBattle([gremio]);
    gremio.setHP(0);
    /** @type {number[]} */
    const hp = [];
    runTicks(battle, 0, 130, (tick) => {
      hp[tick] = gremio.HP;
    });
    assert.strictEqual(gremio.knockedOut, false);
    assert.strictEqual(gremio.acted, false); // ActionTag kept: still acts this round
    assert.strictEqual(gremio.inventory.has(ITEM_KEYS.SACRIFICIAL_BUDDHA), false);
    assert.strictEqual(gremio.busyUntil, 123);
    assert.deepStrictEqual([hp[112], hp[113]], [0, 100]);
    assert.deepStrictEqual(
      battle.log.ofType(LOG_TYPES.REVIVE).map((e) => e.tick),
      [0],
    );
    assert.strictEqual(battle.log.ofType(LOG_TYPES.DEATH).length, 0);
  });

  it('dies normally without one', () => {
    const gremio = makeFighter(CHARACTER_KEYS.GREMIO);
    const battle = makeBattle([gremio]);
    gremio.setHP(0);
    runTicks(battle, 0, 0);
    assert.strictEqual(gremio.knockedOut, true);
  });
});

describe('Inventory.armorBonus', () => {
  const worn = () =>
    new Inventory([
      { key: ITEM_KEYS.BANDANNA, slot: ARMOR_SLOT.HEAD }, // DEF 1
      { key: ITEM_KEYS.LEATHER_COAT, slot: ARMOR_SLOT.BODY }, // DEF 4
      { key: ITEM_KEYS.MEDICINE },
    ]);

  it('sums one stat over the worn pieces, and 0 for a stat none of them has', () => {
    const inventory = worn();
    assert.strictEqual(inventory.armorBonus('DEF'), 5);
    assert.strictEqual(inventory.armorBonus('SPD'), 0);
  });

  it('follows the entries: removing a worn piece drops its bonus', () => {
    const inventory = worn();
    assert.strictEqual(inventory.armorBonus('DEF'), 5);
    inventory.remove(ITEM_KEYS.LEATHER_COAT);
    assert.strictEqual(inventory.armorBonus('DEF'), 1);
    inventory.clear();
    assert.strictEqual(inventory.armorBonus('DEF'), 0);
  });

  it('a clone keeps its own bonuses when either side changes', () => {
    const inventory = worn();
    assert.strictEqual(inventory.armorBonus('DEF'), 5); // cached, then shared with the clone
    const copy = inventory.clone();
    inventory.remove(ITEM_KEYS.BANDANNA);
    assert.strictEqual(inventory.armorBonus('DEF'), 4);
    assert.strictEqual(copy.armorBonus('DEF'), 5);
    copy.remove(ITEM_KEYS.LEATHER_COAT);
    assert.strictEqual(copy.armorBonus('DEF'), 1);
    assert.strictEqual(inventory.armorBonus('DEF'), 4);
  });

  it('is left out of comparisons: a fresh copy deep-equals one with its cache filled', () => {
    const inventory = worn();
    inventory.armorBonus('DEF');
    assert.deepStrictEqual(inventory.clone(), worn());
  });
});

describe('Inventory.stateKeyInto', () => {
  const key = (/** @type {Inventory} */ inventory) => {
    const out = [];
    inventory.stateKeyInto(out);
    return out.join(',');
  };

  it('changes when a use changes a quantity, and a clone keeps its own', () => {
    const inventory = new Inventory([
      { key: ITEM_KEYS.MEDICINE },
      { key: ITEM_KEYS.BANDANNA, slot: ARMOR_SLOT.HEAD },
    ]);
    const before = key(inventory);
    const copy = inventory.clone();
    inventory.use(ITEM_KEYS.MEDICINE);
    assert.notStrictEqual(key(inventory), before);
    assert.strictEqual(key(copy), before);
    assert.strictEqual(key(copy.clone()), before);
  });
});

describe('Inventory.clone (copy-on-write)', () => {
  const medicine = (/** @type {Inventory} */ inventory) =>
    inventory.get(ITEM_KEYS.MEDICINE)?.quantity;
  const fresh = () => new Inventory([{ key: ITEM_KEYS.MEDICINE }, { key: ITEM_KEYS.ANTITOXIN }]);

  it('shares nothing either side can see: every change on one leaves the other as it was', () => {
    for (const change of [
      (/** @type {Inventory} */ i) => i.use(ITEM_KEYS.MEDICINE),
      (/** @type {Inventory} */ i) => i.remove(ITEM_KEYS.ANTITOXIN),
      (/** @type {Inventory} */ i) => i.add(ITEM_KEYS.ESCAPE_TALISMAN),
      (/** @type {Inventory} */ i) => i.clear(),
    ]) {
      const original = fresh(),
        copy = original.clone();
      change(copy);
      assert.deepStrictEqual(original.entries, fresh().entries, String(change));
      const copy2 = original.clone();
      change(original);
      assert.deepStrictEqual(copy2.entries, fresh().entries, String(change));
    }
  });

  it('keeps a chain of clones apart, each using its own items', () => {
    const a = fresh(),
      b = a.clone(),
      c = b.clone();
    b.use(ITEM_KEYS.MEDICINE);
    c.use(ITEM_KEYS.MEDICINE);
    c.use(ITEM_KEYS.MEDICINE);
    assert.deepStrictEqual([medicine(a), medicine(b), medicine(c)], [6, 5, 4]);
    for (let n = 0; n < 4; n++) c.use(ITEM_KEYS.MEDICINE);
    assert.deepStrictEqual([medicine(a), medicine(b), medicine(c)], [6, 5, undefined]); // c's slot emptied
  });

  it('never changes the entries it was built from', () => {
    const source = [{ key: ITEM_KEYS.MEDICINE, quantity: 2 }];
    const inventory = new Inventory(source);
    inventory.clone().use(ITEM_KEYS.MEDICINE);
    inventory.use(ITEM_KEYS.MEDICINE);
    assert.deepStrictEqual(source, [{ key: ITEM_KEYS.MEDICINE, quantity: 2 }]);
  });
});
