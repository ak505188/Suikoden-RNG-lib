// suikoden-rng-lib/heap: the VFX heap simulator's public API, for tools built on the battle simulator (e.g. Suikoden-Battle-Search). The five particle spells
// (Flaming Arrow, Explosion, Thor, Black Shadow, Hell) read stale words of the game's vfxPool, so their RNG call counts depend on it. Read the vfxPool dump of the
// battle's first Fight prompt, build a heap from it and hand it to `Battle`:
//   import { Battle, Enemy, EnemyParty, PlayerParty } from 'suikoden-rng-lib/battle';
//   import { VfxHeap, readHeapDump } from 'suikoden-rng-lib/heap';
//   const heap = new VfxHeap(await readHeapDump('dumps/my_battle_prompt'), { party: 'L-fire-slow', index: 1 });
//   const battle = new Battle({ party, enemies, rng, heap });
// `index` is the draw buffer index of the dump's first round (the recorded F1 index: 0 or 1); `party` selects the recorded images of Crystal Core's moves ('L-fire'
// or 'L-fire-slow', only used in that fight). Anything not exported here is internal; lib/Game/Heap/README.md has the model's state and what is still open.

export { default as VfxHeap } from './lib/Game/Heap/VfxHeap.js';
export { parseHeapDump, readHeapDump, ARENA_BYTES } from './lib/Game/Heap/HeapDump.js';
