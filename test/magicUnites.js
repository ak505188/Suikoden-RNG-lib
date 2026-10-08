import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import Battle from '../lib/Game/Battle/Battle.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../lib/Game/Battle/ActionLog.js';
import { magicUnite } from '../lib/Game/Magic/MagicUnites.js';
import { SPELLS } from '../lib/Game/Magic/Spells.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { calcMagicElementModifier } from '../lib/lib.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { ELEMENTAL_RESISTANCES, ELEMENTS } from '../lib/Game/Constants.js';
import RNG from '../lib/rng.js';

describe('Magic Unite pairing', () => {
  const lv4 = {
    fire: [SPELLS.EXPLOSION, SPELLS.FINAL_FLAME],
    earth: [SPELLS.EARTHQUAKE, SPELLS.GUARDIAN_EARTH],
    wind: [SPELLS.STORM, SPELLS.SHINING_WIND],
    water: [SPELLS.RAIN_OF_KINDNESS, SPELLS.MOTHER_OCEAN],
    lightning: [SPELLS.BALL_OF_LIGHTNING, SPELLS.THUNDER_GOD],
  };
  const combos = [
    ['fire', 'earth', SPELLS.SCORCHED_EARTH],
    ['earth', 'wind', SPELLS.STORM_FANG],
    ['lightning', 'fire', SPELLS.BLAZING_CAMP],
    ['water', 'lightning', SPELLS.THOR],
    ['wind', 'water', SPELLS.WATER_DRAGON],
  ];

  for (const [
    x,
    y,
    combo,
  ] of /** @type {[keyof typeof lv4, keyof typeof lv4, import('../lib/Game/Magic/Spells.js').Spell][]} */ (
    combos
  )) {
    it(`${combo.name}: all 8 ordered Lv4 / Lv5 pairings of ${x} and ${y}`, () => {
      for (const a of lv4[x])
        for (const b of lv4[y]) {
          assert.strictEqual(magicUnite(a, b), combo);
          assert.strictEqual(magicUnite(b, a), combo);
        }
    });
  }

  it('makes nothing from the same element, non-adjacent elements, or other spell levels', () => {
    assert.strictEqual(magicUnite(SPELLS.EARTHQUAKE, SPELLS.GUARDIAN_EARTH), null);
    assert.strictEqual(magicUnite(SPELLS.EXPLOSION, SPELLS.STORM), null);
    assert.strictEqual(magicUnite(SPELLS.EARTHQUAKE, SPELLS.STORM_FANG), null);
    assert.strictEqual(magicUnite(SPELLS.EARTHQUAKE, SPELLS.CHARM_ARROW), null);
    assert.strictEqual(magicUnite(SPELLS.EARTHQUAKE, SPELLS.THE_SHREDDING), null);
  });
});

describe('Dual-element damage compatibility', () => {
  const { INVULNERABLE, RESISTANT, WEAK } = ELEMENTAL_RESISTANCES;
  const mod = (/** @type {any} */ resistances) =>
    calcMagicElementModifier([ELEMENTS.FIRE, ELEMENTS.EARTH], resistances);

  it('neutral on both is unchanged, weak doubles, resist halves, immune zeroes', () => {
    assert.strictEqual(mod({}), 1);
    assert.strictEqual(mod({ Fire: WEAK }), 2);
    assert.strictEqual(mod({ Fire: RESISTANT }), 0.5);
    assert.strictEqual(mod({ Fire: INVULNERABLE }), 0);
  });
  it('the worst of the two wins: immune over resist over weak over neutral', () => {
    assert.strictEqual(mod({ Fire: WEAK, Earth: RESISTANT }), 0.5);
    assert.strictEqual(mod({ Fire: RESISTANT, Earth: INVULNERABLE }), 0);
    assert.strictEqual(mod({ Fire: WEAK, Earth: INVULNERABLE }), 0);
    assert.strictEqual(mod({ Earth: WEAK }), 2);
  });
});

describe('Magic Unite in a battle', () => {
  // Fire (Explosion) and Earth (Earthquake) Lv4 casters, plus a third on Earth who can't pair with
  // the second. McDohl is fastest, so his Explosion becomes Scorched Earth with Luc as partner.
  const party = () =>
    new PlayerParty([
      new Character(CHARACTER_KEYS.MCDOHL)
        .setLVL(40)
        .setStats({ PWR: 90, SKL: 80, DEF: 80, SPD: 90, MGC: 100, LUK: 60, HP: 9000 })
        .setRune(RUNES.FIRE)
        .rest(),
      new Character(CHARACTER_KEYS.VIKTOR)
        .setLVL(40)
        .setStats({ PWR: 90, SKL: 80, DEF: 80, SPD: 10, MGC: 100, LUK: 60, HP: 9000 })
        .rest(),
      new Character(CHARACTER_KEYS.LUC)
        .setLVL(40)
        .setStats({ PWR: 90, SKL: 80, DEF: 80, SPD: 20, MGC: 80, LUK: 60, HP: 9000 })
        .setRune(RUNES.EARTH)
        .rest(),
    ]);
  const play = (/** @type {import('../lib/Game/Battle/Actions.js').Action[]} */ actions) => {
    const battle = new Battle({
      party: party(),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.SOLDIER_ANT)]),
      rng: new RNG(1),
      escapable: false,
    });
    for (const c of battle.party.combatants) c.MP = [9, 9, 9, 9];
    battle.playTurn(actions);
    return battle;
  };
  const RUNE4 = { type: ACTION_TYPES.RUNE, slot: 3 };

  it("fires the combo from the initiator, uses up the partner's turn and Lv4 charge", () => {
    const battle = play([RUNE4, { type: ACTION_TYPES.DEFEND }, RUNE4]);
    const casts = battle.log.entries.filter((e) => e.type === LOG_TYPES.CAST);
    assert.deepStrictEqual(
      casts.map((e) => e.detail),
      ['Scorched Earth (with Luc)'],
    );
    const [mcdohl, , luc] = battle.party.combatants;
    assert.deepStrictEqual([mcdohl.MP[3], luc.MP[3]], [8, 8]);
  });

  it('casts the solo Lv4 when nobody pairs', () => {
    const battle = play([RUNE4, { type: ACTION_TYPES.DEFEND }, { type: ACTION_TYPES.DEFEND }]);
    assert.deepStrictEqual(
      battle.log.entries.filter((e) => e.type === LOG_TYPES.CAST).map((e) => e.detail),
      ['Explosion'],
    );
    assert.strictEqual(battle.party.combatants[2].MP[3], 9);
  });

  it("a partner on another slot doesn't pair", () => {
    const battle = play([
      RUNE4,
      { type: ACTION_TYPES.DEFEND },
      { type: ACTION_TYPES.RUNE, slot: 2 },
    ]);
    assert.strictEqual(
      battle.log.entries.find((e) => e.type === LOG_TYPES.CAST)?.detail,
      'Explosion',
    );
  });
});
