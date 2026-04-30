import Kaku from './KakuSimulator/Kaku.js';
import RNG from '../lib/rng.js';

const kaku = new Kaku();
// Loses accuracy 263 > 264
const events = kaku.simulateMovement(new RNG(0xbff1cc1a), 1200);
