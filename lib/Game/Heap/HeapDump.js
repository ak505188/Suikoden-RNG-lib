/**
 * A vfxPool dump as the battle simulator takes it: the arena at the first Fight prompt of a battle (0x18000 bytes from 0x80182000) and the few
 * words that describe it (Suikoden-Bizhawk-HUD's dump sidecar). The tools that search a battle read a dump with this, make a `VfxHeap` from it and
 * pass the heap to `Battle`.
 */

/** @typedef {import('./HeapPrediction.js').HeapDump} HeapDump */

export const ARENA_BYTES = 0x18000;

/**
 * @param {{ arena: Uint8Array, sidecar: { rover: string | number, menuState: string | number, battleBlocks: (string | number)[] } }} input - the dump's `.bin` and its `.json`
 * @returns {HeapDump}
 * @throws {Error} when the arena is not 0x18000 bytes or the sidecar lacks the allocator's rover, the menu state or the two packet blocks
 */
export function parseHeapDump({ arena, sidecar }) {
  if (arena.byteLength !== ARENA_BYTES)
    throw new Error(`a heap dump's arena is ${ARENA_BYTES} bytes, got ${arena.byteLength}`);
  if (sidecar.rover === undefined || sidecar.menuState === undefined)
    throw new Error("the dump's sidecar has no rover or menuState: it is not a first-prompt dump");
  const blocks = sidecar.battleBlocks;
  if (!Array.isArray(blocks) || blocks.length !== 2)
    throw new Error("the dump's sidecar has no battleBlocks (the two packet blocks)");
  return {
    arena,
    rover: Number(sidecar.rover),
    menuState: Number(sidecar.menuState),
    battleBlocks: [Number(blocks[0]), Number(blocks[1])],
  };
}

/**
 * Reads a dump from `<stem>.bin` and `<stem>.json` (Node only).
 * @param {string} stem - the path without the extension
 * @returns {Promise<HeapDump>}
 */
export async function readHeapDump(stem) {
  const { readFile } = await import('node:fs/promises');
  const [bin, json] = await Promise.all([
    readFile(`${stem}.bin`),
    readFile(`${stem}.json`, 'utf8'),
  ]);
  return parseHeapDump({ arena: new Uint8Array(bin), sidecar: JSON.parse(json) });
}
