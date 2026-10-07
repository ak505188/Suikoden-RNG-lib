import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import { dropsOfKindnessRand, waterOfKindnessOrMotherOceanRand, rainOfKindnessRand } from '../../lib/Game/Magic/SpellRNG/Water.js';

describe("Drops of Kindness Rand tests", () => {
  it("Should always be 18", () => {
    assert.strictEqual(dropsOfKindnessRand(new RNG(0x12345678)).calls, 18);
  });
});

describe("Water of Kindness / Mother Ocean Rand tests", () => {
  it("Should be 72 for a party of 6", () => {
    assert.strictEqual(waterOfKindnessOrMotherOceanRand(new RNG(0x12345678), 6).calls, 72);
  });

  it("Should be 60 for a party of 5", () => {
    assert.strictEqual(waterOfKindnessOrMotherOceanRand(new RNG(0x12345678), 5).calls, 60);
  });
});

// McDohl's Water Lv4 on SpellDuration.State, party of 6. Start seeds are the RNG value on the frame
// the spell's VFX setup ran; counts are the live LCG-step distance to the end handler.
const rainOfKindnessPartyOfSixCases = [
  { rng: 0x58dbd149, calls: 1562 },
  { rng: 0xb4a56396, calls: 1562 },
  { rng: 0xf0289ce7, calls: 1527 },
  { rng: 0x9cfbae39, calls: 1547 },
  { rng: 0x7d3feff7, calls: 1562 },
  { rng: 0x3101a6f1, calls: 1552 },
  { rng: 0x6ac77c90, calls: 1562 },
  { rng: 0xdd33e45d, calls: 1572 },
  { rng: 0x67651ec6, calls: 1567 },
  { rng: 0x3a8d3d5a, calls: 1547 },
  { rng: 0x70289ce7, calls: 1527 },
  { rng: 0x10de13c5, calls: 1562 },
  { rng: 0x0d1a95a6, calls: 1542 },
  { rng: 0x4c3e8ca5, calls: 1552 },
  { rng: 0xc47f8042, calls: 1537 },
  { rng: 0xa34f3f18, calls: 1527 },
  { rng: 0xa059d79a, calls: 1547 },
  { rng: 0x87d3da0d, calls: 1547 },
  { rng: 0x4289e502, calls: 1532 },
  { rng: 0x2d6210d6, calls: 1552 },
];

// Same spell with a party of 5 (RainOfKindness.State)
const rainOfKindnessPartyOfFiveCases = [
  { rng: 0xf0103b50, calls: 1520 },
  { rng: 0x7f88a2b1, calls: 1545 },
  { rng: 0x29749aa6, calls: 1535 },
  { rng: 0xd9e2b600, calls: 1515 },
  { rng: 0x23780ff6, calls: 1535 },
  { rng: 0x8886be98, calls: 1530 },
  { rng: 0x2093fb53, calls: 1570 },
  { rng: 0x61c71e34, calls: 1545 },
  { rng: 0xebb28ca1, calls: 1545 },
  { rng: 0xbf8c7905, calls: 1565 },
  { rng: 0xa9749aa6, calls: 1535 },
  { rng: 0xef984a3c, calls: 1545 },
  { rng: 0x084a1301, calls: 1550 },
  { rng: 0x857d9a9c, calls: 1550 },
  { rng: 0x9933d68d, calls: 1535 },
  { rng: 0x11fe92fb, calls: 1550 },
  { rng: 0xb31e1445, calls: 1540 },
  { rng: 0xb59b9ca4, calls: 1540 },
  { rng: 0x2c89d64d, calls: 1540 },
  { rng: 0x0842bcf1, calls: 1535 },
];

describe("Rain of Kindness Rand tests", () => {
  for (const { rng, calls } of rainOfKindnessPartyOfSixCases) {
    it(`Should be ${calls} for ${rng.toString(16)} with a party of 6`, () => {
      assert.strictEqual(rainOfKindnessRand(new RNG(rng), 6).calls, calls);
    });
  }

  for (const { rng, calls } of rainOfKindnessPartyOfFiveCases) {
    it(`Should be ${calls} for ${rng.toString(16)} with a party of 5`, () => {
      assert.strictEqual(rainOfKindnessRand(new RNG(rng), 5).calls, calls);
    });
  }
});
