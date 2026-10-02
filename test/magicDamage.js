import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { SPELLS } from '../lib/Game/Magic/Spells.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';

// apply_elemental_multiplier (0x80125b28) is all integer; see Battle_Damage_Formula.md,
// "apply_elemental_multiplier". The Dragon resists Fire and is weak to Wind.

// Flaming Arrows (power 100) with MGC 51: base_total = 100 + 25 = 125, odd
const makeCaster = () => new Character(CHARACTER_KEYS.VIKTOR)
  .setStats({ PWR: 119, SKL: 48, DEF: 94, SPD: 68, MGC: 51, LUK: 65, HP: 432 })
  .setRune(RUNES.FIRE);

describe('Party spell elemental modifier', () => {
  it('resist floors an odd base: 125 -> 62', () => {
    assert.strictEqual(makeCaster().calcMagicDamage(SPELLS.FLAMING_ARROWS, new Enemy(ENEMY_KEYS.DRAGON)), 62);
  });
  it('weak doubles: 400 + 25 -> 850', () => {
    assert.strictEqual(makeCaster().calcMagicDamage(SPELLS.THE_SHREDDING, new Enemy(ENEMY_KEYS.DRAGON)), 850);
  });

  // Neclord lists Dark as Invulnerable, but Dark skips the affinity table: base_total = power + 43
  const soulEater = new Character(CHARACTER_KEYS.MCDOHL)
    .setStats({ PWR: 82, SKL: 102, DEF: 80, SPD: 93, MGC: 86, LUK: 85, HP: 278 });
  for (const key of [ENEMY_KEYS.NECLORD, ENEMY_KEYS.NECLORD_L]) {
    it(`Dark ignores ${key}'s Dark invulnerability: Black Shadow 343, Judgement 1543`, () => {
      assert.strictEqual(soulEater.calcMagicDamage(SPELLS.BLACK_SHADOW, new Enemy(key)), 343);
      assert.strictEqual(soulEater.calcMagicDamage(SPELLS.JUDGEMENT, new Enemy(key)), 1543);
    });
  }

  for (const spell of [SPELLS.DEADLY_FINGERTIPS, SPELLS.HELL, SPELLS.WIND_OF_SLEEP]) {
    it(`${spell.name} does no damage, even to an instant-death-immune enemy`, () => {
      assert.strictEqual(soulEater.calcMagicDamage(spell, new Enemy(ENEMY_KEYS.NECLORD)), 0);
      assert.strictEqual(soulEater.calcMagicDamage(spell, new Enemy(ENEMY_KEYS.DRAGON)), 0);
    });
  }

  it('a resisted spell leaves integer HP and a valid stateKey', () => {
    const dragon = new Enemy(ENEMY_KEYS.DRAGON);
    const startHP = dragon.HP;
    const battle = new Battle({
      party: new PlayerParty([makeCaster()]),
      enemies: new EnemyParty([dragon]),
      rng: new RNG(0x12345678),
      turns: [],
    });
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 0, target: 0 }]);

    const HP = battle.enemies.combatants[0].HP;
    assert.ok(Number.isInteger(HP), `HP ${HP} is not an integer`);
    assert.strictEqual(HP, startHP - 62);
    assert.doesNotThrow(() => battle.stateKey());
  });
});
