import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import {
  flamingArrowRand,
  dancingFlamesRand,
  explosionRand,
  finalFlameRand,
} from '../../lib/Game/Magic/SpellRNG/Fire.js';

const flamingArrowCases = [
  { seed: 0x1b65fc6a, calls: 512 },
  { seed: 0x11111111, calls: 524 },
  { seed: 0xcafebabe, calls: 540 },
  { seed: 0xdeadbeef, calls: 536 },
  { seed: 0x00000001, calls: 504 },
  { seed: 0x7fffffff, calls: 504 },
  { seed: 0x9e3779b9, calls: 516 },
  { seed: 0x12345678, calls: 528 },
  { seed: 0xa5a5a5a5, calls: 520 },
  { seed: 0x00c0ffee, calls: 524 },
  { seed: 0x1badb002, calls: 540 },
  { seed: 0x5eadbeef, calls: 536 },
  { seed: 0x8badf00d, calls: 512 },
  { seed: 0xfeedface, calls: 524 },
  { seed: 0x0defaced, calls: 496 },
  { seed: 0xabad1dea, calls: 532 },
  { seed: 0x31337000, calls: 508 },
  { seed: 0x42424242, calls: 476 },
  { seed: 0x55555555, calls: 524 },
  { seed: 0xaaaaaaaa, calls: 536 },
  { seed: 0xfffffffe, calls: 472 },
];

describe('Flaming Arrow Rand tests', () => {
  for (const { seed, calls } of flamingArrowCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(flamingArrowRand(r).calls, calls);
    });
  }
});

describe('Dancing Flames Rand tests', () => {
  it('Should always be 150', () => {
    const r = new RNG(0x11111111);
    assert.strictEqual(dancingFlamesRand(r).calls, 150);
  });
});

const explosionCases = [
  { seed: 0x1b65fc6a, calls: 1220 },
  { seed: 0x11111111, calls: 1271 },
  { seed: 0xcafebabe, calls: 1280 },
  { seed: 0xdeadbeef, calls: 1259 },
  { seed: 0x00000001, calls: 1284 },
  { seed: 0x7fffffff, calls: 1233 },
  { seed: 0x9e3779b9, calls: 1220 },
  { seed: 0x12345678, calls: 1223 },
  { seed: 0xa5a5a5a5, calls: 1238 },
  { seed: 0x00c0ffee, calls: 1216 },
  { seed: 0x1badb002, calls: 1220 },
  { seed: 0x5eadbeef, calls: 1259 },
  { seed: 0x8badf00d, calls: 1202 },
  { seed: 0xfeedface, calls: 1260 },
  { seed: 0x0defaced, calls: 1257 },
  { seed: 0xabad1dea, calls: 1179 },
  { seed: 0x31337000, calls: 1200 },
  { seed: 0x42424242, calls: 1239 },
  { seed: 0x55555555, calls: 1226 },
  { seed: 0xaaaaaaaa, calls: 1258 },
  { seed: 0xfffffffe, calls: 1252 },
];

describe('Explosion Rand tests', () => {
  for (const { seed, calls } of explosionCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(explosionRand(r).calls, calls);
    });
  }
});

// Cleo (Rage Rune) casting Final Flame on Zombie Dragon, seeds read the frame before the VFX setup ran
const finalFlameCases = [
  { seed: 0x799c61f8, calls: 538 },
  { seed: 0xadad7f18, calls: 536 },
  { seed: 0xe8ffa639, calls: 534 },
  { seed: 0x2451cd5a, calls: 536 },
  { seed: 0x5fa3f47b, calls: 538 },
  { seed: 0x9af61b9c, calls: 540 },
  { seed: 0xd64842bd, calls: 530 },
  { seed: 0x119a69de, calls: 530 },
  { seed: 0x4cec90ff, calls: 528 },
  { seed: 0x883eb820, calls: 532 },
  { seed: 0xc390df41, calls: 526 },
  { seed: 0xfee30662, calls: 530 },
  { seed: 0x3a352d83, calls: 534 },
  { seed: 0x758754a4, calls: 538 },
  { seed: 0xb0d97bc5, calls: 530 },
  { seed: 0xec2ba2e6, calls: 530 },
  { seed: 0x277dca07, calls: 534 },
  { seed: 0x62cff128, calls: 540 },
  { seed: 0x9e221849, calls: 532 },
  { seed: 0xd9743f6a, calls: 532 },
  { seed: 0x14c6668b, calls: 530 },
];

describe('Final Flame Rand tests', () => {
  for (const { seed, calls } of finalFlameCases) {
    const r = new RNG(seed);
    it(`Should be ${calls} for ${seed.toString(16)}`, () => {
      assert.strictEqual(finalFlameRand(r).calls, calls);
    });
  }
});
