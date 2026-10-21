import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { Areas } from '../lib/lib.js';
import RNG from '../lib/rng.js';
import {
  battleFreeSteps,
  battleValue,
  championValue,
  encounterIndex,
  generateEncounters,
  isBattle,
  isChampionSkip,
} from '../lib/Game/Encounters.js';

/** The old Area for a AREAS entry: same area, names differ only by punctuation */
const norm = (/** @type {string} */ name) => name.replace(/[.']/g, '');
const oldAreas = Object.fromEntries(Object.entries(Areas).map(([name, a]) => [norm(name), a]));
const pairs = Object.values(AREAS)
  .filter((area) => oldAreas[norm(area.name)] && 'areaType' in area)
  .map((area) => ({ area, old: /** @type {any} */ (oldAreas[norm(area.name)]) }));

describe('Encounters parity with the old Area', () => {
  it('covers the random-encounter areas', () => {
    assert.ok(pairs.length >= 25, `only ${pairs.length} areas paired`);
  });

  it('battle check, battle value and formation index match', () => {
    for (const { area, old } of pairs) {
      const rng = new RNG(0x43);
      for (let i = 0; i < 3000; i++) {
        assert.strictEqual(isBattle(rng, area), old.isBattle(rng), area.name);
        assert.strictEqual(battleValue(rng, area), old.calcIsBattleValue(rng), area.name);
        assert.strictEqual(encounterIndex(rng, area), old.getEncounterIndex(rng), area.name);
        rng.next();
      }
    }
  });

  it('battleFreeSteps matches', () => {
    for (const { area, old } of pairs) {
      for (let start = 7000; start < 7300; start += 53) {
        const rng = new RNG(0x43).jump(start);
        assert.strictEqual(battleFreeSteps(rng, area, 2000), old.battleFreeSteps(rng, 2000));
      }
    }
  });

  it('champion values match', () => {
    for (const { area, old } of pairs) {
      area.encounters.forEach((formation, i) => {
        assert.strictEqual(championValue(formation), old.encounterTable[i].champVal, area.name);
      });
    }
  });

  it('generateEncounters matches, realistic and with a party level', () => {
    for (const { area, old } of pairs) {
      /** @type {[boolean, number][]} */
      const variants = [
        [false, 0],
        [true, 0],
        [false, 30],
      ];
      for (const [realistic, partyLevel] of variants) {
        const a = generateEncounters(new RNG(0x43), area, {
          iterations: 4000,
          partyLevel,
          realistic,
        });
        const b = old.generateEncounters(new RNG(0x43), 4000, partyLevel, realistic);
        assert.deepStrictEqual(
          a.map((f) => [f.startRNG, f.battleRNG, f.index, f.isBattleValue, f.run, f.wheel]),
          b.map((f) => [f.startRNG, f.battleRNG, f.index, f.isBattleValue, f.run, f.wheel]),
          area.name,
        );
      }
    }
  });
});

describe('isChampionSkip', () => {
  it('never skips at party level 0, skips above the champion value', () => {
    const formation = Object.values(AREAS)[0].encounters[0];
    const champ = championValue(formation);
    assert.strictEqual(isChampionSkip(formation, 0), false);
    assert.strictEqual(isChampionSkip(formation, champ), false);
    assert.strictEqual(isChampionSkip(formation, champ + 1), true);
  });
});
