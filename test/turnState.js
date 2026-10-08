import { describe, it } from 'node:test';
import assert from 'node:assert';
import TurnState from '../lib/Game/Battle/TurnState.js';

describe('TurnState.clone', () => {
  it('copies every field (add new ones to clone() too)', () => {
    const turn = new TurnState();
    // A value no field defaults to, so a field clone() skips shows up as a difference
    for (const key of Object.keys(turn)) turn[key] = `sentinel ${key}`;
    // magic / unite / hold are re-built by clone() from their own shapes: leave them null
    turn.magic = turn.unite = turn.hold = null;
    const copy = turn.clone((c) => c);
    assert.notStrictEqual(copy, turn);
    assert.ok(copy instanceof TurnState);
    assert.deepStrictEqual({ ...copy }, { ...turn });
  });

  it('points magic, unite and hold at its own objects', () => {
    const turn = new TurnState();
    const caster = /** @type {any} */ ({ id: 'caster' });
    const copyCaster = /** @type {any} */ ({ id: 'copy of caster' });
    turn.magic = {
      caster,
      resolve: () => {},
      frames: 1,
      tail: 0,
      readyTick: null,
      resolved: false,
    };
    turn.hold = { end: 5 };
    const copy = turn.clone(/** @type {any} */ ((c) => (c === caster ? copyCaster : c)));
    assert.strictEqual(copy.magic.caster, copyCaster);
    assert.notStrictEqual(copy.magic, turn.magic);
    assert.notStrictEqual(copy.hold, turn.hold);
    assert.deepStrictEqual(copy.hold, turn.hold);
  });
});
