import { describe, it } from 'node:test';
import assert from 'node:assert';
import RAW from '../assets/enemyImages.js';
import { ENEMY_KEYS } from '../lib/Game/Keys.js';
import { ENEMY_IMAGE_FILES, ENEMY_IMAGES } from '../lib/Game/Bestiary/EnemyImages.js';

// Keys that deliberately have no picture
const NO_IMAGE = [];

describe('enemy images', () => {
  it('every enemy key has an image, or is listed in NO_IMAGE', () => {
    for (const key of Object.values(ENEMY_KEYS)) {
      if (NO_IMAGE.includes(key)) continue;
      assert.ok(ENEMY_IMAGES[key], key);
    }
  });

  it('every file in the key -> file table exists in the raw map', () => {
    for (const [key, file] of Object.entries(ENEMY_IMAGE_FILES)) {
      assert.ok(RAW[file], `${key} -> ${file}`);
    }
  });

  it('has no key outside ENEMY_KEYS', () => {
    const keys = new Set(/** @type {string[]} */ (Object.values(ENEMY_KEYS)));
    for (const key of [...Object.keys(ENEMY_IMAGES), ...Object.keys(ENEMY_IMAGE_FILES)]) {
      assert.ok(keys.has(key), key);
    }
  });

  it('every value is a PNG data URL', () => {
    for (const [key, url] of Object.entries(ENEMY_IMAGES)) {
      assert.ok(url.startsWith('data:image/png;base64,'), key);
      assert.ok(url.length > 'data:image/png;base64,'.length, key);
    }
  });

  it('the suikoden-rng-lib/enemy-images entry exports ENEMY_IMAGES', async () => {
    const entry = await import('suikoden-rng-lib/enemy-images');
    assert.deepStrictEqual(Object.keys(entry), ['ENEMY_IMAGES']);
    assert.strictEqual(entry.ENEMY_IMAGES, ENEMY_IMAGES);
  });
});
