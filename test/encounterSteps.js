import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Areas } from '../lib/lib.js';
import RNG from '../lib/rng.js';

/** The first RNG count after `start` whose value starts a battle in `area` */
const nextBattleAt = (/** @type {any} */ area, /** @type {number} */ start) => {
  const probe = new RNG(0x43).jump(start);
  do probe.next();
  while (!area.isBattle(probe));
  return probe.count;
};

describe('Area.battleFreeSteps', () => {
  it('counts the battle-free checks after the current value, up to the next battle', () => {
    for (const name of ['Pannu Yakuta', 'Pannu Yakuta Area', 'Gregminster Area 1']) {
      const area = Areas[name];
      for (let start = 7000; start < 7400; start += 37) {
        const rng = new RNG(0x43).jump(start);
        assert.strictEqual(
          area.battleFreeSteps(rng, 2000),
          nextBattleAt(area, start) - start - 1,
          `${name} from ${start}`,
        );
        assert.strictEqual(rng.count, start); // not moved
      }
    }
  });

  it("ignores a battle on the current value: ending on it doesn't start it", () => {
    const area = Areas['Pannu Yakuta'];
    const battleAt = nextBattleAt(area, 7750);
    const onIt = /** @type {number} */ (area.battleFreeSteps(new RNG(0x43).jump(battleAt), 2000));
    assert.strictEqual(onIt, nextBattleAt(area, battleAt) - battleAt - 1);
    assert.strictEqual(area.battleFreeSteps(new RNG(0x43).jump(battleAt - 1), 2000), 0);
  });

  it('is null past the limit, or in a town', () => {
    const area = Areas['Pannu Yakuta'];
    const rng = new RNG(0x43).jump(7750);
    const free = /** @type {number} */ (area.battleFreeSteps(rng, 2000));
    assert.strictEqual(area.battleFreeSteps(rng, free), free);
    assert.strictEqual(area.battleFreeSteps(rng, free - 1), null);
    const town = Object.values(Areas).find((a) => a.areaType === 'Town');
    assert.strictEqual(town.battleFreeSteps(rng, 2000), null);
  });
});
