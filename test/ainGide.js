import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle, { PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { ENEMY_AI, ENEMY_MOVES } from '../lib/Game/Battle/EnemyAI.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import RNG from '../lib/rng.js';
import AinGideParty from './data/ain_gide_proper_full_hp_party.json' with { type: 'json' };

// Every vector is a live capture (Suikoden-Bizhawk-HUD's tests/test_AinGide.lua: scripts/TraceAinGide.lua
// on AinGide.State, 40 injected seeds x 2 rounds, 2026-10-07, 80/80 exact). A seed is the RNG at the
// frame Ain Gide became the current actor; every capture had 3 front-row candidates.

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */
/** @typedef {import('../lib/Game/Battle/Actions.js').Round} Round */
/** @typedef {import('../lib/Game/Battle/Character.js').CharacterJSON[]} CharacterJSON */

const KEYS = [
  CHARACTER_KEYS.MCDOHL,
  CHARACTER_KEYS.VIKTOR,
  CHARACTER_KEYS.KUROMIMI,
  CHARACTER_KEYS.KIRKIS,
  CHARACTER_KEYS.VALERIA,
  CHARACTER_KEYS.GREMIO,
];

/** AinGide.State's party: MGC read live, `runes` by slot (undefined: none) */
const MGC = [154, 79, 132, 201, 138, 190];
const makeParty = (/** @type {(typeof RUNES[keyof typeof RUNES] | undefined)[]} */ runes = []) =>
  new PlayerParty(
    KEYS.map((key, i) => {
      const c = new Character(key)
        .setLVL(40)
        .setStats({ PWR: 90, SKL: 80, DEF: 80, SPD: 60 - i, MGC: MGC[i], LUK: 60, HP: 9000 })
        .rest();
      return runes[i] ? c.setRune(runes[i]) : c;
    }),
  );

/** Runs his AI tick by tick until it commits. */
const select = (/** @type {number} */ seed, /** @type {PlayerParty} */ party) => {
  const gide = new Enemy(ENEMY_KEYS.AIN_GIDE);
  const rng = new RNG(seed);
  let choice;
  do {
    choice = ENEMY_AI[ENEMY_KEYS.AIN_GIDE](gide, {
      party,
      enemies: new EnemyParty([gide]),
      rng,
      tick: 0,
      turn_count: 1,
    });
  } while (choice.action === ACTION_TYPES.UNDETERMINED);
  return { gide, rng, choice: /** @type {any} */ (choice) };
};

const front3 = () => makeParty(); // 3 candidates: slots 4-6 are the back row

describe('Ain Gide move selection', () => {
  const specials = [
    { seed: 0x0627a76d, target: 0, calls: 2, living: 6, finalSeed: 0x103c4075 },
    { seed: 0xcbcd91dc, target: 1, calls: 3, living: 6, finalSeed: 0xf5fb0ced },
    { seed: 0x231ed89f, target: 1, calls: 3, living: 6, finalSeed: 0x3e1ef914 },
    { seed: 0x8e64d1ae, target: 0, calls: 2, living: 5, finalSeed: 0x584123b1 },
    { seed: 0xf32cdd26, target: 2, calls: 7, living: 6, finalSeed: 0x2196534b },
    { seed: 0xff2f7485, target: 1, calls: 6, living: 6, finalSeed: 0x9b0b7289 },
    { seed: 0x3aee29c3, target: 1, calls: 9, living: 6, finalSeed: 0xce9c9032 },
    { seed: 0x17f88194, target: 1, calls: 3, living: 5, finalSeed: 0x073257bc },
  ];
  for (const { seed, calls, living, finalSeed } of specials) {
    it(`picks the Special for ${seed.toString(16)}: ${calls} rolls, then 48 + ${living} more`, () => {
      const party = front3();
      if (living === 5) party.combatants[5].die(0); // a back-row member: no scan roll, one less damage roll
      const { gide, rng, choice } = select(seed, party);
      assert.strictEqual(choice.move, ENEMY_MOVES.AIN_GIDE_SPECIAL);
      assert.strictEqual(rng.count, calls);
      ENEMY_MOVES.AIN_GIDE_SPECIAL.apply(gide, { party, rng });
      assert.strictEqual(rng.count, calls + 48 + living);
      assert.strictEqual(rng.raw, finalSeed);
    });
  }

  const attacks = [
    { seed: 0x12df7e47, target: 0, calls: 2 },
    { seed: 0x3f88c4ff, target: 0, calls: 2 },
    { seed: 0xd1c16625, target: 0, calls: 5 },
    { seed: 0x8063f3ab, target: 2, calls: 4 },
    { seed: 0xd7b53a6e, target: 1, calls: 6 },
    { seed: 0x8c4b9c3d, target: 1, calls: 3 },
  ];
  for (const { seed, target, calls } of attacks) {
    it(`picks a basic Attack on slot ${target + 1} for ${seed.toString(16)} after ${calls} rolls`, () => {
      const party = front3();
      const { rng, choice } = select(seed, party);
      assert.strictEqual(choice.action, ACTION_TYPES.ATTACK);
      assert.strictEqual(choice.target, party.combatants[target]);
      assert.strictEqual(rng.count, calls);
    });
  }
});

describe('Ain Gide Special damage', () => {
  // Capture s1 r1 (seed 0x0627a76d), every rune config of scripts/TestAinGideRunes.lua
  const damages = (/** @type {Parameters<typeof makeParty>[0]} */ runes) => {
    const party = makeParty(runes);
    const gide = new Enemy(ENEMY_KEYS.AIN_GIDE);
    const rng = new RNG(0x0627a76d);
    rng.next();
    rng.next();
    ENEMY_MOVES.AIN_GIDE_SPECIAL.apply(gide, { party, rng });
    return party.combatants.map((c) => c.pendingDamage);
  };

  it('halves only slot 1 when the rune is unlisted (the $s1 bug)', () => {
    assert.deepStrictEqual(
      damages([RUNES.BOAR, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR]),
      [137, 332, 259, 192, 291, 203],
    );
    assert.deepStrictEqual(damages([]), [137, 332, 259, 192, 291, 203]);
  });
  it('halves everyone for Fire runes', () => {
    assert.deepStrictEqual(damages(Array(6).fill(RUNES.FIRE)), [137, 166, 129, 96, 145, 101]);
  });
  it('a listed rune in slot 1 masks the bug', () => {
    assert.strictEqual(damages(Array(6).fill(RUNES.WATER))[0], 275);
    assert.strictEqual(
      damages([RUNES.WATER, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR, RUNES.BOAR])[0],
      275,
    );
    assert.strictEqual(
      damages([RUNES.BOAR, RUNES.WATER, RUNES.WATER, RUNES.WATER, RUNES.WATER, RUNES.WATER])[0],
      137,
    );
  });
});

describe('Ain Gide in a battle', () => {
  const begin = (/** @type {number} */ seed) => {
    const battle = new Battle({
      party: front3(),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.AIN_GIDE)]),
      rng: new RNG(seed),
      escapable: false,
    });
    battle.beginRound(Array(6).fill({ type: ACTION_TYPES.DEFEND }));
    return battle;
  };

  /**
   * Ticks a begun round to its end, listing each tick the RNG advanced.
   * @param {Battle} battle @param {(battle: Battle) => void} [onTick] runs before every tick
   * @returns {{ tick: number, rolls: number }[]}
   */
  const rolls = (battle, onTick) => {
    const out = [];
    let count = battle.rng.count;
    while (battle.phase !== PHASE_STATE.ROUND_OVER) {
      onTick?.(battle);
      battle.tick();
      const rolled = battle.rng.count - count;
      if (rolled) out.push({ tick: battle.turn.tick, rolls: rolled });
      count += rolled;
    }
    return out;
  };

  it('plays a round to its end with every party member Defending', () => {
    for (const seed of [0x0627a76d, 0x12df7e47, 0xf32cdd26]) {
      const battle = begin(seed);
      battle.playRound();
      assert.ok(battle.frames > 0, `seed ${seed.toString(16)}`);
    }
  });

  // Seed 0x12df7e47 reaches his turn with a Special on the first scan: 48 particle rolls and 6 damage
  // rolls at t0 + 219 (S + 190, S = T0 + 30), and the next turn-order roll at t0 + 264 (S + 235)
  it('rolls the Special 219 ticks after its AI tick and the next turn-order roll 45 later', () => {
    const list = rolls(begin(0x12df7e47));
    const ai = list.findIndex((r) => r.rolls === 2);
    const t0 = list[ai].tick;
    assert.deepStrictEqual(list[ai + 1], { tick: t0 + 219, rolls: 54 });
    assert.deepStrictEqual(list[ai + 2], { tick: t0 + 264, rolls: 6 });
  });

  it('delays the whole Special while a party member is busy', () => {
    const base = rolls(begin(0x12df7e47));
    const t0 = base.find((r) => r.rolls === 2).tick;
    const battle = begin(0x12df7e47);
    const busyUntil = t0 + 10;
    const list = rolls(battle, (b) => {
      if (b.turn.tick === t0) b.party.combatants[4].busyUntil = busyUntil;
    });
    // t0 is the tick after his AI tick, the Special's normal start: it starts the tick after the busy clears
    const delay = busyUntil + 1 - t0;
    assert.deepStrictEqual(
      list.find((r) => r.rolls === 54),
      { tick: t0 + 219 + delay, rolls: 54 },
    );
  });
});

describe('3 round Queen Ant Free Wills match in-game values', () => {
  /** @type {CharacterJSON} */
  const members = structuredClone(/** @type {any} */ (AinGideParty));
  const party = PlayerParty.fromCharacterJSON(members);
  const enemies = EnemyParty.fromFormation(AREAS.OTHER.scripted[3]);
  const rng = new RNG(0x42).jump(14344);
  const baseBattle = new Battle({ party, enemies, rng });

  /* --- Battle start: 6 allies vs 1 enemies ---
   * R1 t   0 rng   1  --- Round 1 ---
   * R1 t  30 rng   8  Hero's turn
   * R1 t  31 rng   8  Hero casts Judgment on Ain Gide
   * R1 t 552 rng 175  Hero deals 1577 to Ain Gide (HP 6423)
   * R1 t 555 rng 181  Flik's turn
   * R1 t 556 rng 183  Flik attacks Ain Gide
   * R1 t 626 rng 188  Flik deals 234 to Ain Gide (HP 6189)
   * R1 t 655 rng 188  Luc's turn
   * R1 t 687 rng 188  Luc casts Earthquake
   * R1 t 960 rng 1832  Flik deals 800 to Ain Gide (HP 5389)
   * R1 t1026 rng 1836  Ain Gide's turn
   * R1 t1027 rng 1841  Ain Gide attacks Flik
   * R1 t1098 rng 1845  Ain Gide deals 359 to Flik (HP 222)
   * R1 t1136 rng 1845  Tengaar's turn
   * R1 t1182 rng 1845  Tengaar casts Earthquake
   * R1 t1453 rng 3517  Flik deals 795 to Ain Gide (HP 4594)
   * R1 t1519 rng 3519  Viktor's turn
   * R1 t1520 rng 3520  Viktor attacks Ain Gide
   * R1 t1531 rng 3521  Hellion's turn
   * R1 t1616 rng 3522  Tengaar deals 319 to Viktor (HP 231)
   * R1 t1684 rng 3522  Hellion casts Earthquake
   * R1 t1958 rng 5225  Viktor deals 769 to Ain Gide (HP 3825)
   * R1 t2055 rng 5225  --- Round 1 ends --- */

  describe('Ain Gide fight from speedrun', () => {
    const battle = baseBattle.clone();

    const ROUNDS = [
      { count: 19569, partyHPs: [599, 231, 222, 271, 191, 433], enemyHPs: [3825] },
      { count: 24680, partyHPs: [599, 231, 222, 271, 191, 433], enemyHPs: [0] },
    ];

    /** @type {Round[]} */
    const commands = [
      [
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.ATTACK },
        { type: ACTION_TYPES.ATTACK },
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.RUNE, slot: 2 },
        { type: ACTION_TYPES.RUNE, slot: 3 },
      ],
      [
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.DEFEND },
        { type: ACTION_TYPES.DEFEND },
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.RUNE, slot: 2 },
        { type: ACTION_TYPES.RUNE, slot: 3 },
      ],
    ];

    const snapshots = ROUNDS.map((_round, index) => {
      battle.playTurn(commands[index]);
      return Battle.snapshot(battle);
    });

    console.log(battle.log.format());

    ROUNDS.forEach(({ count, partyHPs, enemyHPs }, round) => {
      const snap = snapshots[round];
      describe(`Turn ${round + 1}`, () => {
        it(`RNG index should be ${count}`, () => {
          assert.strictEqual(snap.count, count);
        });
        battle.party.combatants.forEach((c, index) => {
          it(`${c.name} HP == ${partyHPs[index]}`, () => {
            assert.strictEqual(snap.partyHPBySlot[index], partyHPs[index]);
          });
        });
        snap.enemyHPBySlot.forEach((hp, index) => {
          it(`Enemy ${index + 1} HP == ${enemyHPs[index]}`, () => {
            assert.strictEqual(hp, enemyHPs[index]);
          });
        });
      });
    });
  });
  describe('Ain Gide fight with Rune Unite', () => {
    const battle = baseBattle.clone();

    const ROUNDS = [
      { count: 19569, partyHPs: [599, 231, 222, 271, 191, 433], enemyHPs: [3825] },
      { count: 21451, partyHPs: [466, 0, 0, 73, 0, 234], enemyHPs: [387] },
    ];

    /** @type {Round[]} */
    const commands = [
      [
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.ATTACK },
        { type: ACTION_TYPES.ATTACK },
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.RUNE, slot: 2 },
        { type: ACTION_TYPES.RUNE, slot: 3 },
      ],
      [
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.DEFEND },
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.RUNE, slot: 3 },
        { type: ACTION_TYPES.RUNE, slot: 2 },
        { type: ACTION_TYPES.RUNE, slot: 3 },
      ],
    ];

    const snapshots = ROUNDS.map((_round, index) => {
      battle.playTurn(commands[index]);
      return Battle.snapshot(battle);
    });

    console.log(battle.log.format());

    ROUNDS.forEach(({ count, partyHPs, enemyHPs }, round) => {
      const snap = snapshots[round];
      describe(`Turn ${round + 1}`, () => {
        it(`RNG index should be ${count}`, () => {
          assert.strictEqual(snap.count, count);
        });
        battle.party.combatants.forEach((c, index) => {
          it(`${c.name} HP == ${partyHPs[index]}`, () => {
            assert.strictEqual(snap.partyHPBySlot[index], partyHPs[index]);
          });
        });
        snap.enemyHPBySlot.forEach((hp, index) => {
          it(`Enemy ${index + 1} HP == ${enemyHPs[index]}`, () => {
            assert.strictEqual(hp, enemyHPs[index]);
          });
        });
      });
    });
  });
});
