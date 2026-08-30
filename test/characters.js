import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Combat/Characters/Character.js';
import { CHARACTERS } from '../lib/Game/Combat/Characters/Characters.js';

describe('Character ATK', () => {
  it('McDohl ATK = 18 (Wolf Fang Staff lvl 1 + PWR 13)', () => {
    const c = new Character(CHARACTERS.MCDOHL);
    assert.strictEqual(c.ATK, 18);
  });

  it('Alen ATK = 50 (Fire Sword lvl 7 + PWR 17)', () => {
    const c = new Character(CHARACTERS.ALEN);
    assert.strictEqual(c.ATK, 50);
  });

  it('Anji ATK = 58 (Demon Spear lvl 7 + PWR 18)', () => {
    const c = new Character(CHARACTERS.ANJI);
    assert.strictEqual(c.ATK, 58);
  });

  it('Gremio ATK = 26(Axe lvl 1 + PWR 17)', () => {
    const c = new Character(CHARACTERS.GREMIO);
    assert.strictEqual(c.ATK, 26);
  });
});

describe('Character ARM', () => {
  it('McDohl ARM = 22 (DEF 18 + Bandanna 1 + Tunic 2 + Gloves 2 + Boots 3)', () => {
    const c = new Character(CHARACTERS.MCDOHL);
    assert.strictEqual(c.ARM, 26);
  });

  it('Alen ARM = 43 (DEF 16 + Leather Armor 14 + Steel Shield 13, no head/accessories)', () => {
    const c = new Character(CHARACTERS.ALEN);
    assert.strictEqual(c.ARM, 43);
  });

  it('Anji ARM = 14 (DEF 9 + Bandanna 1 + Leather Coat 4, no shield/accessories)', () => {
    const c = new Character(CHARACTERS.ANJI);
    assert.strictEqual(c.ARM, 14);
  });

  it('Gremio ARM = 22 (DEF 16 + Leather Coat 4 + Cape 2, only first accessory slot filled)', () => {
    const c = new Character(CHARACTERS.GREMIO);
    assert.strictEqual(c.ARM, 22);
  });
});
