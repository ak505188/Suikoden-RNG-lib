import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import Kaku from '../lib/Kaku/Kaku.js';
import KakuSim_0xbff1cc1a from './data/Kaku_sim_10000_0xbff1cc1a.json' with { type: 'json' };
import KakuSim_0x12 from './data/Kaku_sim_10000_0x12.json' with { type: 'json' };
import KakuSim_0x1e79af9f from './data/Kaku_sim_10000_0x1e79af9f.json' with { type: 'json' };
import KakuSim_0x3fb703c0 from './data/Kaku_sim_10000_0x3fb703c0.json' with { type: 'json' };
import KakuSim_0x26a4f8d4 from './data/Kaku_sim_10000_0x26a4f8d4.json' with { type: 'json' };
import KakuSim_0x56c35961 from './data/Kaku_sim_10000_0x56c35961.json' with { type: 'json' };
import KakuSim_0x76a2e768 from './data/Kaku_sim_10000_0x76a2e768.json' with { type: 'json' };
import KakuSim_0x163ed46a from './data/Kaku_sim_10000_0x163ed46a.json' with { type: 'json' };
import KakuSim_0x176df5de from './data/Kaku_sim_10000_0x176df5de.json' with { type: 'json' };
import KakuSim_0x874c7841 from './data/Kaku_sim_10000_0x874c7841.json' with { type: 'json' };
import KakuSim_0x27959cc0 from './data/Kaku_sim_10000_0x27959cc0.json' with { type: 'json' };

describe('Confirmed Working Sim Test', () => {
  const rng = new RNG(0xbff1cc1a);
  const kaku = new Kaku();
  const tracker = [];
  for (let i = 1; i <= 10000; i++) {
    kaku.simulateMovement(rng);
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= 10000; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0xbff1cc1a[i-1].rng_index)
      });
    }
  }
});

describe('0x12 Sim Test', () => {
  const rng = new RNG(0x12);
  const kaku = new Kaku();
  const tracker = [];
  for (let i = 1; i <= 10000; i++) {
    kaku.simulateMovement(rng);
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= 10000; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x12[i-1].rng_index)
      });
    }
  }
});

describe('0x1e79af9f Sim Test', () => {
  const rng = new RNG(0x1e79af9f);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    kaku.simulateMovement(rng);
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x1e79af9f[i-1].rng_index)
      });
    }
  }
});

describe('0x1e79af9f Sim Test', () => {
  const rng = new RNG(0x1e79af9f);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    kaku.simulateMovement(rng);
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x1e79af9f[i-1].rng_index)
      });
    }
  }
});

describe('0x3fb703c0 Sim Test', () => {
  const rng = new RNG(0x3fb703c0);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x3fb703c0[i-1].rng_index)
      });
    }
  }
});

describe('0x26a4f8d4 Sim Test', () => {
  const rng = new RNG(0x26a4f8d4);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    kaku.simulateMovement(rng);
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x26a4f8d4[i-1].rng_index)
      });
    }
  }
});

describe('0x56c35961 Sim Test', () => {
  const rng = new RNG(0x56c35961);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x56c35961[i-1].rng_index)
      });
    }
  }
});

describe('0x76a2e768 Sim Test', () => {
  const rng = new RNG(0x76a2e768);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x76a2e768[i-1].rng_index)
      });
    }
  }
});

describe('0x163ed46a Sim Test', () => {
  const rng = new RNG(0x163ed46a);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x163ed46a[i-1].rng_index)
      });
    }
  }
});

describe('0x176df5de Sim Test', () => {
  const rng = new RNG(0x176df5de);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x176df5de[i-1].rng_index)
      });
    }
  }
});

describe('0x874c7841 Sim Test', () => {
  const rng = new RNG(0x874c7841);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x874c7841[i-1].rng_index)
      });
    }
  }
});

describe('0x27959cc0 Sim Test', () => {
  const rng = new RNG(0x27959cc0);
  const kaku = new Kaku();
  const tracker = [];
  const sim_length = 10000;
  for (let i = 1; i <= sim_length; i++) {
    const events = kaku.simulateMovement(rng);
    console.log(`Frame ${i}, index: ${rng.count}:`);
    if (events.length > 0) {
      console.log(events);
    }
    tracker.push({ rng: rng.getRNG2(), rng_index: rng.count });
  }

  for (let i = 100; i <= sim_length; i = i + 100) {
    if (i % 100 === 0) {
      it(`RNG Index at frame ${i} should match sim RNG Index`, () => {
        assert.strictEqual(tracker[i-1].rng_index, KakuSim_0x27959cc0[i-1].rng_index)
      });
    }
  }
});
