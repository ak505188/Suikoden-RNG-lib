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
  { rng: 0x1b65fc6a, calls: 512 },
  { rng: 0x11111111, calls: 524 },
  { rng: 0xcafebabe, calls: 540 },
  { rng: 0xdeadbeef, calls: 536 },
  { rng: 0x00000001, calls: 504 },
  { rng: 0x7fffffff, calls: 504 },
  { rng: 0x9e3779b9, calls: 516 },
  { rng: 0x12345678, calls: 528 },
  { rng: 0xa5a5a5a5, calls: 520 },
  { rng: 0x00c0ffee, calls: 524 },
  { rng: 0x1badb002, calls: 540 },
  { rng: 0x5eadbeef, calls: 536 },
  { rng: 0x8badf00d, calls: 512 },
  { rng: 0xfeedface, calls: 524 },
  { rng: 0x0defaced, calls: 496 },
  { rng: 0xabad1dea, calls: 532 },
  { rng: 0x31337000, calls: 508 },
  { rng: 0x42424242, calls: 476 },
  { rng: 0x55555555, calls: 524 },
  { rng: 0xaaaaaaaa, calls: 536 },
  { rng: 0xfffffffe, calls: 472 },
];

describe('Flaming Arrow Rand tests', () => {
  for (const { rng, calls } of flamingArrowCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
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
  { rng: 0x1b65fc6a, calls: 1220 },
  { rng: 0x11111111, calls: 1271 },
  { rng: 0xcafebabe, calls: 1280 },
  { rng: 0xdeadbeef, calls: 1259 },
  { rng: 0x00000001, calls: 1284 },
  { rng: 0x7fffffff, calls: 1233 },
  { rng: 0x9e3779b9, calls: 1220 },
  { rng: 0x12345678, calls: 1223 },
  { rng: 0xa5a5a5a5, calls: 1238 },
  { rng: 0x00c0ffee, calls: 1216 },
  { rng: 0x1badb002, calls: 1220 },
  { rng: 0x5eadbeef, calls: 1259 },
  { rng: 0x8badf00d, calls: 1202 },
  { rng: 0xfeedface, calls: 1260 },
  { rng: 0x0defaced, calls: 1257 },
  { rng: 0xabad1dea, calls: 1179 },
  { rng: 0x31337000, calls: 1200 },
  { rng: 0x42424242, calls: 1239 },
  { rng: 0x55555555, calls: 1226 },
  { rng: 0xaaaaaaaa, calls: 1258 },
  { rng: 0xfffffffe, calls: 1252 },
];

describe('Explosion Rand tests', () => {
  for (const { rng, calls } of explosionCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(explosionRand(r).calls, calls);
    });
  }
});

// Cleo (Rage Rune) casting Final Flame on Zombie Dragon, seeds read the frame before the VFX setup ran
const finalFlameCases = [
  { rng: 0x799c61f8, calls: 538 },
  { rng: 0xadad7f18, calls: 536 },
  { rng: 0xe8ffa639, calls: 534 },
  { rng: 0x2451cd5a, calls: 536 },
  { rng: 0x5fa3f47b, calls: 538 },
  { rng: 0x9af61b9c, calls: 540 },
  { rng: 0xd64842bd, calls: 530 },
  { rng: 0x119a69de, calls: 530 },
  { rng: 0x4cec90ff, calls: 528 },
  { rng: 0x883eb820, calls: 532 },
  { rng: 0xc390df41, calls: 526 },
  { rng: 0xfee30662, calls: 530 },
  { rng: 0x3a352d83, calls: 534 },
  { rng: 0x758754a4, calls: 538 },
  { rng: 0xb0d97bc5, calls: 530 },
  { rng: 0xec2ba2e6, calls: 530 },
  { rng: 0x277dca07, calls: 534 },
  { rng: 0x62cff128, calls: 540 },
  { rng: 0x9e221849, calls: 532 },
  { rng: 0xd9743f6a, calls: 532 },
  { rng: 0x14c6668b, calls: 530 },
];

describe('Final Flame Rand tests', () => {
  for (const { rng, calls } of finalFlameCases) {
    const r = new RNG(rng);
    it(`Should be ${calls} for ${rng.toString(16)}`, () => {
      assert.strictEqual(finalFlameRand(r).calls, calls);
    });
  }
});
