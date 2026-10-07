import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Character from '../../lib/Game/Battle/Character.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../../lib/Game/Battle/ActionLog.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { applySpell } from '../../lib/Game/Magic/Behavior.js';

// Deadly Fingertips (Soul Eater slot 0, one enemy) and Hell (slot 2, all enemies): instant death. No
// damage roll and no hit roll; each target not instant-death immune (species flag 0x4000, the bosses) just
// dies, however much HP it has. Their spell power is a sentinel, not damage. The RNG they burn is the
// animation's alone (see test/spells/soulEater.js).
const DEADLY_FINGERTIPS_SLOT = 0;
const HELL_SLOT = 2;

const makeCleo = () => new Character(CHARACTER_KEYS.CLEO)
  .setLVL(22)
  .setRune(RUNES.SOUL_EATER)
  .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
  .rest();

/**
 * @param {import('../../lib/Game/Magic/Spells.js').Spell} spell
 * @param {Character} actor
 * @param {Enemy[]} enemies
 * @param {Enemy} [target]
 */
const resolve = (spell, actor, enemies, target) => {
  const party = new PlayerParty([actor]);
  const applied = applySpell({ actor, spell, target, party, enemies: new EnemyParty(enemies), rng: new RNG(1) });
  enemies.forEach(e => e.commitPendingDamage());
  return applied;
};

const kobold = () => new Enemy(ENEMY_KEYS.KOBOLD_SWORD);

describe('Deadly Fingertips effect', () => {
  it('kills the one target at full HP, and nobody else', () => {
    const [a, b] = [kobold(), kobold()];
    assert.strictEqual(resolve(SPELLS.DEADLY_FINGERTIPS, makeCleo(), [a, b], a), true);
    assert.strictEqual(a.HP, 0);
    assert.ok(b.HP > 0);
  });

  it('does nothing to an instant-death immune enemy', () => {
    const boss = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
    assert.strictEqual(boss.speciesFlags.statusImmune, true);
    const hpBefore = boss.HP;
    resolve(SPELLS.DEADLY_FINGERTIPS, makeCleo(), [boss], boss);
    assert.strictEqual(boss.HP, hpBefore);
  });
});

describe('Hell effect', () => {
  it('kills every enemy that is not immune, and only those', () => {
    const [a, b] = [kobold(), kobold()];
    const boss = new Enemy(ENEMY_KEYS.ZOMBIE_DRAGON);
    const bossHP = boss.HP;
    assert.strictEqual(resolve(SPELLS.HELL, makeCleo(), [a, boss, b]), true);
    assert.strictEqual(a.HP, 0);
    assert.strictEqual(b.HP, 0);
    assert.strictEqual(boss.HP, bossHP);
  });

  it('leaves an already dead enemy alone', () => {
    const [a, b] = [kobold(), kobold()];
    a.setHP(0);
    resolve(SPELLS.HELL, makeCleo(), [a, b]);
    assert.strictEqual(b.HP, 0);
  });
});

describe('Instant death in a battle round', () => {
  /** @param {Character} cleo @param {Enemy[]} enemies */
  const makeBattle = (cleo, enemies) => new Battle({
    party: new PlayerParty([cleo]),
    enemies: new EnemyParty(enemies),
    rng: new RNG(0x12345678),
    turns: [],
  });

  it('Deadly Fingertips kills the chosen enemy and logs its death', () => {
    const cleo = makeCleo();
    const [a, b] = [kobold(), kobold()];
    const mpBefore = cleo.MP[DEADLY_FINGERTIPS_SLOT];
    const battle = makeBattle(cleo, [a, b]);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: DEADLY_FINGERTIPS_SLOT, target: 1 }]);
    assert.strictEqual(cleo.MP[DEADLY_FINGERTIPS_SLOT], mpBefore - 1);
    assert.strictEqual(b.knockedOut, true);
    assert.strictEqual(a.knockedOut, false);
    assert.ok(battle.log.entries.some(e => e.type === LOG_TYPES.DEATH && e.target === b.label));
  });

  it('Hell kills every enemy', () => {
    const cleo = makeCleo();
    const enemies = [kobold(), kobold(), kobold()];
    const battle = makeBattle(cleo, enemies);
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: HELL_SLOT }]);
    assert.ok(enemies.every(e => e.knockedOut));
  });
});
