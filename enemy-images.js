// suikoden-rng-lib/enemy-images: enemy pictures for tools that show them:
//   import { ENEMY_IMAGES } from 'suikoden-rng-lib/enemy-images';  // <img src={ENEMY_IMAGES[key]}>
// Keyed by ENEMY_KEYS value; each value is a full 'data:image/png;base64,...' URL.
// A separate entry from encounters.js: the images are ~280 kB, which that entry stays free of.

export { ENEMY_IMAGES } from './lib/Game/Bestiary/EnemyImages.js';
