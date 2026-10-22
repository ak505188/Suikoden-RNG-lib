import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ENEMY_KEYS as E } from '../lib/Game/Keys.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { formationName } from '../lib/Game/Bestiary/FormationNames.js';

describe('formationName', () => {
  it('counts enemies by name by default', () => {
    assert.strictEqual(formationName([E.CLAY_DOLL, E.CLAY_DOLL]), '2 Clay Doll');
  });

  it('uses an override, whatever the order or empty slots', () => {
    const expected = '3 Bandit';
    assert.strictEqual(formationName([E.BANDIT_RED, E.BANDIT_RED, E.BANDIT_YELLOW]), expected);
    assert.strictEqual(
      formationName([E.BANDIT_YELLOW, null, E.BANDIT_RED, E.BANDIT_RED]),
      expected,
    );
  });

  it('does not collapse similar formations', () => {
    assert.notStrictEqual(formationName([E.BANDIT_RED, E.BANDIT_RED]), '3 Bandit');
    assert.notStrictEqual(formationName([E.BANDIT_GREEN, E.BANDIT_GREEN]), '3 Bandit');
  });

  it("does not reorder the caller's formation", () => {
    const formation = [E.BANDIT_YELLOW, E.BANDIT_RED, E.BANDIT_RED];
    formationName(formation);
    assert.deepStrictEqual(formation, [E.BANDIT_YELLOW, E.BANDIT_RED, E.BANDIT_RED]);
  });
});

describe('formationName nicknames', () => {
  it('uses the nickname instead of the name when an enemy has one', () => {
    assert.strictEqual(formationName([E.NECLORD_L]), 'Neclord (Unwinnable)');
  });
});

describe('formationName defaults', () => {
  it('counts by nickname when the enemy has one', () => {
    assert.strictEqual(formationName([E.BANDIT_RED, E.BANDIT_RED]), '2 Red Bandit');
  });

  it('keeps different enemies apart, in first-seen order', () => {
    assert.strictEqual(
      formationName([E.CLAY_DOLL, E.BANDIT_GREEN, E.CLAY_DOLL]),
      '2 Clay Doll 1 Green Bandit',
    );
  });

  it('matches an override on the whole enemy set, not a subset', () => {
    const name = formationName([E.BANDIT_RED, E.BANDIT_RED, E.BANDIT_YELLOW, E.CLAY_DOLL]);
    assert.notStrictEqual(name, '3 Bandit');
    assert.ok(name.includes('Clay Doll'), name);
  });

  it('returns the same name on repeat calls', () => {
    const formation = [E.CLAY_DOLL, E.CLAY_DOLL];
    assert.strictEqual(formationName(formation), formationName(formation));
  });

  it('names every formation in AREAS', () => {
    for (const [areaKey, entry] of Object.entries(AREAS)) {
      const area = /** @type {import('../lib/Game/Bestiary/Areas.js').Area} */ (entry);
      for (const formation of [...area.encounters, ...(area.scripted ?? [])]) {
        const name = formationName(formation);
        assert.ok(name && !name.includes('undefined'), `${areaKey}: ${formation} -> ${name}`);
      }
    }
  });
});
