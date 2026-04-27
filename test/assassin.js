import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';

describe("Damage Roll Calculation Tests", () => {
  const rng = new RNG(0x49e384c7);
  it('It should = 1 with 78 ARM', () => {
    assert.strictEqual(rng.calculateDamageRoll(120, 78), 1);
  })
  it('It should = 1 with 79 ARM', () => {
    assert.strictEqual(rng.calculateDamageRoll(120, 79), 1);
  })
  it('It should = -3 with 80 ARM', () => {
    assert.strictEqual(rng.calculateDamageRoll(120, 80), -3);
  })
});

describe("Determine move tests", () => {
  it('RNG 0xebc70acf should give Melee', () => {
    const rng = new RNG(0xebc70acf);
    const assassin_move = rng.determineAssassinMove();
    assert.strictEqual(assassin_move.move_name, 'Melee');
  });
  it('RNG 0x49e384c7 should give Shuriken', () => {
    const rng = new RNG(0x49e384c7);
    const assassin_move = rng.determineAssassinMove();
    assert.strictEqual(assassin_move.move_name, 'Shuriken');
  });
  it('RNG 0xbc09a663 should give Shuriken', () => {
    const rng = new RNG(0xbc09a663);
    const assassin_move = rng.determineAssassinMove();
    assert.strictEqual(assassin_move.move_name, 'Shuriken');
  });
});

describe("Damage Roll Calculation Tests", () => {
  const rng = new RNG(0xebc70acf);
  const arm = 81;

  const turn1 = RNG.simulateAssassinTurn(rng, arm);
  const rng_after_t1 = rng.getRNG();

  it('Move name should == Melee', () => {
    assert.strictEqual(turn1.move_name, 'Melee');
  })
  it('Damage should == 31', () => {
    assert.strictEqual(turn1.damage, 31);
  })
  it('RNG should now == 0x49e384c7', () => {
    assert.strictEqual(rng_after_t1, 0x49e384c7);
  });

  const turn2 = RNG.simulateAssassinTurn(rng, arm);

  it('Move name should == Shuriken', () => {
    assert.strictEqual(turn2.move_name, 'Shuriken');
  })
  it('Damage should == 19', () => {
    assert.strictEqual(turn2.damage, 19);
  })
  it('RNG should now == 0x852197d5', () => {
    assert.strictEqual(rng.getRNG(), 0x852197d5);
  });
});

describe("Damage Roll Calculation Test with same RNG different ARM", () => {
  const rng = new RNG(0xebc70acf);
  const arm = 78;

  const turn1 = RNG.simulateAssassinTurn(rng, arm);
  const rng_after_t1 = rng.getRNG();

  it('Move name should == Melee', () => {
    assert.strictEqual(turn1.move_name, 'Melee');
  })
  it('Damage should == 31', () => {
    assert.strictEqual(turn1.damage, 31);
  })
  it('RNG should now == 0x49e384c7', () => {
    assert.strictEqual(rng_after_t1, 0x49e384c7);
  });

  const turn2 = RNG.simulateAssassinTurn(rng, arm);

  it('Move name should == Shuriken', () => {
    assert.strictEqual(turn2.move_name, 'Shuriken');
  })
  it('Damage should == 22', () => {
    assert.strictEqual(turn2.damage, 22);
  })
  it('RNG should now == 0x852197d5', () => {
    assert.strictEqual(rng.getRNG(), 0x852197d5);
  });
});

describe("Damage Roll Calculation Test with different RNG different ARM", () => {
  const rng = new RNG(0xebaa0acf);
  const arm = 86;

  const turn1 = RNG.simulateAssassinTurn(rng, arm);
  const rng_after_t1 = rng.getRNG();

  it('Move name should == Shuriken', () => {
    assert.strictEqual(turn1.move_name, 'Shuriken');
  })
  it('Damage should == 16', () => {
    assert.strictEqual(turn1.damage, 16);
  })
  it('RNG should now == 0x032684c7', () => {
    assert.strictEqual(rng_after_t1, 0x032684c7);
  });

  const turn2 = RNG.simulateAssassinTurn(rng, arm);

  it('Move name should == Melee', () => {
    assert.strictEqual(turn2.move_name, 'Melee');
  })
  it('Damage should == 24', () => {
    assert.strictEqual(turn2.damage, 24);
  })
  it('RNG should now == 0x4b8945bf', () => {
    assert.strictEqual(rng.getRNG(), 0x4b8945bf);
  });
});

describe("Full fight sim test", () => {
  const rng = new RNG(0xebaa0acf);
  const arm = 86;

  const results = RNG.simulateAssassinFight(rng, arm);

  it('T1 should == Shuriken', () => {
    assert.strictEqual(results.turns[0].move_name, 'Shuriken');
  })
  it('T1 Damage should == 16', () => {
    assert.strictEqual(results.turns[0].damage, 16);
  })
  it('T2 Move name should == Melee', () => {
    assert.strictEqual(results.turns[1].move_name, 'Melee');
  })
  it('T2 Damage should == 24', () => {
    assert.strictEqual(results.turns[1].damage, 24);
  })
  it('Final RNG should now == 0x39fd9dc9', () => {
    assert.strictEqual(results.rng, 0x39fd9dc9);
  });
});
