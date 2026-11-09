import fs from 'node:fs';

/** @typedef {import('../../lib/Game/Heap/HeapPrediction.js').HeapDump} HeapDump */

const DIR = new URL('../fixtures/heap/', import.meta.url);

/**
 * A heap dump from test/fixtures/heap (copied from Suikoden-Bizhawk-HUD scripts/heap/data/dumps: `<name>.bin` the arena image,
 * `<name>.json` the sidecar).
 * @param {string} name
 * @returns {HeapDump & { sidecar: any }}
 */
export function loadHeapDump(name) {
  const sidecar = JSON.parse(fs.readFileSync(new URL(`${name}.json`, DIR), 'utf8'));
  const arena = new Uint8Array(fs.readFileSync(new URL(`${name}.bin`, DIR)));
  // an in-round dump has no menu state: it lists the pointers the round start frees
  if (sidecar.menuState === undefined) {
    return {
      arena,
      rover: Number(sidecar.rover),
      menuState: 0,
      battleBlocks: [0, 0],
      menuFrees: sidecar.menuBlocks.map(Number),
      sidecar,
    };
  }
  return {
    arena,
    rover: Number(sidecar.rover),
    menuState: Number(sidecar.menuState),
    battleBlocks: [Number(sidecar.battleBlocks[0]), Number(sidecar.battleBlocks[1])],
    sidecar,
  };
}

/**
 * A dump's arena and sidecar only (the in-round dumps have no menu state: their Fight menu is already freed).
 * @param {string} name
 */
export function loadArena(name) {
  return {
    arena: new Uint8Array(fs.readFileSync(new URL(`${name}.bin`, DIR))),
    sidecar: JSON.parse(fs.readFileSync(new URL(`${name}.json`, DIR), 'utf8')),
  };
}
