import { diffArena, summary } from '../lib/Game/Heap/ArenaDiff.js';
import { play } from '../test/helpers/heapScenarios.js';
import { loadArena } from '../test/helpers/heapDumps.js';
const [sc, rd] = [process.argv[2], Number(process.argv[3])];
play(sc, '9e3779b1', { after: (round, heap) => {
  if (round !== rd) return;
  const real = loadArena(`rounds/crystal_core_L-fire-slow_${sc}_9e3779b1_r${round + 1}_preconfirm`);
  const r = diffArena(heap, real);
  console.log(summary(r));
  const kindOf = (a) => { const b = r.blocks.find((x) => a >= x.addr && a < x.addr + x.bytes); return b ? `${b.kind}@${b.addr.toString(16)}:${b.bytes}` : '?'; };
  const v = new DataView(real.arena.buffer, real.arena.byteOffset);
  for (const a of r.wrongWords.slice(0, +process.argv[4] || 30)) { const m = heap.state.known.get(a) ?? heap.state.heap.u32(a); console.log((a >>> 0).toString(16), (m >>> 0).toString(16).padStart(8, '0'), v.getUint32(a - 0x80182000, true).toString(16).padStart(8, '0'), kindOf(a)); }
}});
