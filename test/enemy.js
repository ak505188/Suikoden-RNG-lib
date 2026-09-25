import { describe, it } from 'node:test';
import assert from 'node:assert';
import Enemy from '../lib/Game/Battle/Enemy.js';
import Character from '../lib/Game/Battle/Character.js';
import ZombieDragon from '../lib/Game/Battle/Enemies/ZombieDragon.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../lib/Game/Keys.js';

describe('Enemy construction', () => {
  it('builds an enemy from its key', () => {
    const e = new Enemy(ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.key, ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.name, 'FurFur');
  });

  it('builds a boss the same way', () => {
    const e = new ZombieDragon();
    assert.strictEqual(e.key, ENEMY_KEYS.ZOMBIE_DRAGON);
    assert.strictEqual(e.name, 'Zombie Dragon');
  });

  it('keeps Queen Ant (LVL 52) and Queen Ant boss (LVL 15) apart', () => {
    assert.strictEqual(new Enemy(ENEMY_KEYS.QUEEN_ANT).LVL, 52);
    assert.strictEqual(new Enemy(ENEMY_KEYS.QUEEN_ANT_BOSS).LVL, 15);
  });
});

describe('Enemy attack timing', () => {
  const mcdohl = new Character(CHARACTER_KEYS.MCDOHL);
  const eileen = new Character(CHARACTER_KEYS.EILEEN);

  it('FurFur timing: damage roll at 13, free at 44, reaction 45', () => {
    const e = new Enemy(ENEMY_KEYS.FURFUR);
    assert.strictEqual(e.attackTiming.damage, 13);
    assert.strictEqual(e.attackTiming.free, 44);
    assert.strictEqual(e.reactionFrames(mcdohl), 45);
  });

  it('Zombie Dragon (boss) timing: damage roll at 57, free at 108, reaction 45', () => {
    const e = new ZombieDragon();
    assert.strictEqual(e.attackTiming.damage, 57);
    assert.strictEqual(e.attackTiming.free, 108);
    assert.strictEqual(e.reactionFrames(mcdohl), 45);
  });

  it('Shadow Man uses per-character reaction exceptions (Eileen 222), else the default (235)', () => {
    const e = new Enemy(ENEMY_KEYS.SHADOW_MAN);
    assert.strictEqual(e.reactionFrames(eileen), 222);
    assert.strictEqual(e.reactionFrames(mcdohl), 235);
  });

  it('No reaction when the attack does not mark its target busy (Beast Commander)', () => {
    const e = new Enemy(ENEMY_KEYS.BEAST_COMMANDER);
    assert.strictEqual(e.reactionFrames(mcdohl), null);
  });
});
