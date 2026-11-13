import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { Battle, Enemy, EnemyParty, PlayerParty, ACTION_TYPES, RNG } from '../../battle.js';
import { VfxHeap, parseHeapDump, readHeapDump, ARENA_BYTES } from '../../heap.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import Rounds from '../fixtures/enemies/crystal_core_lv60_hp5000_rounds.json' with { type: 'json' };

/**
 * The entry a battle search uses (suikoden-rng-lib/heap): a first-prompt vfxPool dump read from its `.bin` / `.json`, a `VfxHeap` from it, the heap handed to `Battle`.
 * The Kobold oracle's dump (two Kobolds (bow), party L-fire-slow, seed 9e3779b1).
 */
const STEM = new URL(
  '../fixtures/heap/oracle_kobold2/kobold2_L-fire-slow_9e3779b1_r1_prompt',
  import.meta.url,
).pathname;
const run = /** @type {any} */ (Rounds).runs.find(
  (/** @type {any} */ r) => r.scenario === 'kill_spell',
);

/** @param {VfxHeap} heap */
function battleWith(heap) {
  const characters = structuredClone(run.characters);
  characters[0].stats.SPD = 1;
  characters[3].stats.SPD = 1;
  const rng = new RNG(0);
  const battle = new Battle({
    party: PlayerParty.fromCharacterJSON(characters),
    enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_BOW), new Enemy(ENEMY_KEYS.KOBOLD_BOW)]),
    rng,
    freeWillGate: 10,
    heap,
  });
  return { battle, rng };
}

describe('the heap model as a battle search takes it', () => {
  it('reads a dump, builds a heap, plays a round with it and clones with the battle', async () => {
    const dump = await readHeapDump(STEM);
    assert.strictEqual(dump.arena.byteLength, ARENA_BYTES);
    const heap = new VfxHeap(dump, { party: 'L-fire-slow', index: 0 });
    const { battle, rng } = battleWith(heap);
    const before = battle.stateKey();
    rng.raw = 0x9e3779b2;
    battle.playTurn(Array(6).fill({ type: ACTION_TYPES.DEFEND }));
    assert.notStrictEqual(
      battle.stateKey(),
      before,
      'the round changes the state, the heap included',
    );
    // a clone carries its own heap: playing it leaves the original alone
    const copy = battle.clone();
    assert.notStrictEqual(copy.heap, battle.heap);
    const key = battle.stateKey();
    copy.rng.raw = 0x9e3779b3;
    copy.playTurn(Array(6).fill({ type: ACTION_TYPES.DEFEND }));
    assert.strictEqual(battle.stateKey(), key);
  });

  it('refuses what is not a first-prompt dump', () => {
    const arena = new Uint8Array(fs.readFileSync(`${STEM}.bin`));
    const sidecar = JSON.parse(fs.readFileSync(`${STEM}.json`, 'utf8'));
    assert.throws(() => parseHeapDump({ arena: arena.subarray(0, 100), sidecar }), /bytes/);
    assert.throws(
      () => parseHeapDump({ arena, sidecar: { ...sidecar, menuState: undefined } }),
      /menuState/,
    );
    assert.throws(
      () => parseHeapDump({ arena, sidecar: { ...sidecar, battleBlocks: [1] } }),
      /battleBlocks/,
    );
  });
});
