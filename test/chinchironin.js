import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import { Cursor, simulateOpponentRollsFromGameStart } from '../lib/chinchironin.js';
import TaiHoRolls_0x12 from './data/rolls_taiho_0x12.json' with { type: 'json' };
import GasparRolls_0x43 from './data/rolls_gaspar_0x43.json' with { type: 'json' };

// This is the current due to test data only having 20000 entries
const NUM_ROLLS_TO_TEST = 20000;

describe("Cursor.getValue should match old generated values", () => {
  const old_cursor = cursor => {
    let r18;
    if (cursor < 160) {
      r18 = 144 - cursor;
    } else {
      r18 = cursor - 176;
    }
    return r18;
  };

  const setup_cursor = wait => {
    const cursor = new Cursor();
    for (let i = 0; i < wait; i++) {
      cursor.next();
    }
    return cursor;
  }

  for (let i = 0; i < 100; i++) {
    const cursor = setup_cursor();
    const old_val = old_cursor(cursor.getPos());
    const new_val = cursor.getValue();
    it(`Wait ${i} old value should equal new value`, () => {
      assert.strictEqual(old_val, new_val)
    })
  }
});

describe("Rolls should match TaiHoRolls_0x12", () => {
  const rng = new RNG(0x12);

  const sim_results = [];

  for (let i = 0; i < NUM_ROLLS_TO_TEST; i++) {
    const sim_result = simulateOpponentRollsFromGameStart(rng.cloneKeepIndex(), true, 203, 0);
    const rolls = sim_result.rolls.map(res => res.roll);
    sim_results.push({ index: rng.count, rng: rng.getRNG(), wait: sim_result.wait, rolls });
    rng.next();
  }

  it('Should match speed 0 roll at RNG index 0', () => {
    assert.strictEqual(sim_results[0].rolls[0], TaiHoRolls_0x12[0].rolls[0]);
  })

  it('Should match speed 64 roll at RNG index 1', () => {
    assert.strictEqual(sim_results[1].rolls[16], TaiHoRolls_0x12[1].rolls[16]);
  })

  it('Should match all rolls at RNG index 2', () => {
    assert.deepStrictEqual(sim_results[2].rolls, TaiHoRolls_0x12[2].rolls);
  });

  it('All 5 of the first results should match my generated rolls', () => {
    assert.deepStrictEqual(sim_results.slice(0, 5), TaiHoRolls_0x12.slice(0, 5));
  });

  for (let i = 0; i < NUM_ROLLS_TO_TEST; i++) {
    it(`${i} should match.`, () => {
      assert.deepStrictEqual(
        sim_results[i],
        TaiHoRolls_0x12[i]
      );
    });
  }
});

describe("Rolls should match Gaspar 0x43", () => {
  const rng = new RNG(0x43);

  for (let i = 0; i < NUM_ROLLS_TO_TEST; i++) {
    const sim_result = simulateOpponentRollsFromGameStart(rng.cloneKeepIndex(), false, 441, 0);
    const rolls = sim_result.rolls.map(res => res.roll);
    const result = { index: rng.count, rng: rng.getRNG(), wait: sim_result.wait, rolls };
    it(`${i} should match.`, () => {
      assert.deepStrictEqual(
        result,
        GasparRolls_0x43[i]
      );
    });
    rng.next();
  }
});

// describe("Test specific Tai Ho index", () => {
//   const index = 107; // 177, 195
//   const rng = new RNG(0x12);
//   rng.next(index);
//
//   const sim_result = { index: rng.count, rng: rng.getRNG(), ...simulateOpponentRollsFromGameStart(rng.cloneKeepIndex(), true, 203, 0) };
//   it(`Index ${index} should match`, () => {
//     assert.deepStrictEqual(sim_result, TaiHoRolls_0x12[index]);
//
//   });
// });
