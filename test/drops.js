import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../lib/rng.js';
import { initAreas } from '../lib/lib.js';
import { enemies } from '../lib/enemies.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty } from '../lib/Game/Battle/Party.js';
import AllGroups from './data/drops_0x12.json' with { type: 'json' };
import LorimarWhipWolf from './data/drops_lorimar_0x12.json' with { type: 'json' };

// Recorded from EnemyGroup.calculateDrops (known accurate) after syncing lib/enemies.js to
// slot order. Each group lists only the iterations that drop, as [iteration, ITEMS name, old
// item name]. AllGroups covers every random encounter for 100 iterations, except Gregminster
// Palace's split Imperial Guards group and Mt. Seifu's split Bandit group, which the old data
// can't express. LorimarWhipWolf runs one low-drop group (only Whip Wolf drops) for 3000.

/**
 * @param {number} seed
 * @param {number} iterations
 * @returns {number[]} the RNG state each iteration starts from: the seed, then one advance per iteration
 */
const expectedRNGs = (seed, iterations) => {
  const rng = new RNG(seed);
  return Array.from({ length: iterations }, () => {
    const value = rng.getRNG();
    rng.next();
    return value;
  });
};

/**
 * @param {(number | string)[][]} drops - [iteration, ITEMS name, old item name] (JSON imports as arrays)
 * @param {number} iterations
 * @param {1 | 2} column - 1 for the ITEMS name, 2 for the old item name
 * @param {string | null} none - what an iteration without a drop returns
 */
const expectedDrops = (drops, iterations, column, none) => {
  const byIteration = new Map(drops.map(d => [d[0], d[column]]));
  return Array.from({ length: iterations }, (_, i) => byIteration.get(i) ?? none);
};

for (const [label, { seed, iterations, groups }] of Object.entries({ AllGroups, LorimarWhipWolf })) {
  const rngs = expectedRNGs(seed, iterations);

  describe(`EnemyParty.calculateDrops (${label})`, () => {
    for (const group of groups) {
      const area = AREAS[group.area];
      it(`${area.name} #${group.encounter}: ${group.name}`, () => {
        const party = EnemyParty.fromFormation(area.encounters[group.encounter]);
        const rng = new RNG(seed);
        const results = party.calculateDrops(rng, iterations);
        assert.deepStrictEqual(results.map(r => r.rng), rngs);
        assert.deepStrictEqual(results.map(r => r.drop?.name ?? null), expectedDrops(group.drops, iterations, 1, null));
        assert.strictEqual(rng.getCount(), iterations);
      });
    }
  });

  describe(`EnemyGroup.calculateDrops (${label})`, () => {
    const oldAreas = initAreas(enemies);
    for (const group of groups) {
      it(`${group.oldArea} #${group.oldGroup}: ${group.name}`, () => {
        const enemyGroup = oldAreas[group.oldArea].getEnemyGroupByIndex(group.oldGroup);
        const rng = new RNG(seed);
        const results = enemyGroup.calculateDrops(rng, iterations);
        assert.deepStrictEqual(results.map(r => r.rng), rngs);
        assert.deepStrictEqual(results.map(r => r.drop), expectedDrops(group.drops, iterations, 2, ''));
        assert.strictEqual(rng.getCount(), iterations);
      });
    }
  });
}
