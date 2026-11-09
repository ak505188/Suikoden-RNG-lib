import fs from 'node:fs';
import RNG from '../../lib/rng.js';
import VfxHeap from '../../lib/Game/Heap/VfxHeap.js';
import { flamingArrowRand, explosionRand } from '../../lib/Game/Magic/SpellRNG/Fire.js';
import { thorRand } from '../../lib/Game/Magic/SpellRNG/Unites.js';
import { hellRand, blackShadowRand } from '../../lib/Game/Magic/SpellRNG/SoulEater.js';
import { loadHeapDump, loadArena } from './heapDumps.js';

/**
 * The Crystal Core "heap after an enemy move" recordings (Suikoden-Bizhawk-HUD enemy_profiles/enemies/crystal_core_lv60_hp5000/
 * heap_after_move_words_{attack,special}.txt, scripts/CrystalCoreAfterMoveCasts.lua): the live stale words of the five stale-word
 * spells at the cast that follows each move, 20 seeds each, and the real RNG call counts.
 *   attack:  round 1 everyone Defends (the phase-1 Attack), the cast is round 2 (RNG seed + 2)
 *   special: round 1 kill_spell (Luc's Flaming Arrow, kill and revive), round 2 everyone Defends (the phase-2 Special), cast in round 3
 * Casters: Flaming Arrow = Luc (19 rolls before it: camera, polls of 7, 6 and 5); the others = McDohl, first to act (8: camera and a poll of 7).
 */

const DIR = new URL('../fixtures/heap/', import.meta.url);

export const SPELLS = /** @type {const} */ ([
  'FlamingArrow',
  'Explosion',
  'Thor',
  'BlackShadow',
  'Hell',
]);
/** @typedef {typeof SPELLS[number]} SpellName */
/** @typedef {'attack' | 'special'} Move */

/** Rolls the round has made before the cast's own: the camera roll and the turn-order polls up to the caster */
export const PRE_CAST_ROLLS = { FlamingArrow: 19, Explosion: 8, Thor: 8, BlackShadow: 8, Hell: 8 };
export const CAST_ROUND = { attack: 2, special: 3 };

/** @param {string} list */
const hex = (list) => list.split(',').map((x) => parseInt(x, 16) >>> 0);

/**
 * @param {Move} move
 * @param {'after_move' | 'enemy_first'} [kind] - the cast is the round after the move, or in the same round after it (a slow party)
 * @param {string} [suffix] - '_L-fire-slow': the slow party's table of the round-after cast (Crystal Core moves first in that round too)
 * @returns {Record<string, Record<string, { calls: number, words?: number[], posX?: number[], scale?: number[] }>>} spell -> seed -> live data
 */
export function liveWords(move, kind = 'after_move', suffix = '') {
  /** @type {Record<string, Record<string, string[]>>} */
  const rows = {};
  const text = fs.readFileSync(new URL(`heap_${kind}_words_${move}${suffix}.txt`, DIR), 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^(\w+) seed (\w+) \| (.*)$/);
    if (m) ((rows[m[1]] ??= {})[m[2]] ??= []).push(m[3]);
  }
  /** @type {Record<string, Record<string, any>>} */
  const out = {};
  for (const [spell, bySeed] of Object.entries(rows)) {
    for (const [seed, lines] of Object.entries(bySeed)) {
      const calls = Number(lines[0].match(/rand calls real (\d+)/)?.[1]);
      const stale = lines.find((l) => l.startsWith('live stale'));
      (out[spell] ??= {})[seed] = stale
        ? {
            calls,
            posX: hex(/** @type {string} */ (stale.match(/posX low12 ([0-9a-f,]+)/)?.[1])),
            scale: hex(/** @type {string} */ (stale.match(/live stale scale ([0-9a-f,]+)/)?.[1])),
          }
        : {
            calls,
            words: hex(/** @type {string} */ (lines[0].match(/live ([0-9a-f,]+) \|/)?.[1])),
          };
    }
  }
  return out;
}

/**
 * The heap at the cast that follows the move, carried forward from the dump of the first prompt: the move's footprint events and block
 * images, then the round's end (the Fight menu rebuilt, with its image).
 * @param {Move} move
 * @param {number} seed
 */
export function carriedHeap(move, seed) {
  if (move === 'attack') {
    const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_prompt'));
    heap.roundStart();
    heap.enemyMove('CRYSTAL_CORE', 'Attack');
    heap.roundEnd();
    heap.roundStart();
    return heap;
  }
  const heap = new VfxHeap(loadHeapDump('crystal_core_L-fire_r1_preconfirm'));
  heap.roundStart();
  heap.castFlamingArrow(new RNG((seed + 1) >>> 0).jump(PRE_CAST_ROLLS.FlamingArrow));
  heap.roundEnd();
  heap.roundStart();
  heap.enemyMove('CRYSTAL_CORE', 'Special');
  heap.roundEnd();
  heap.roundStart();
  return heap;
}

/**
 * What a spell's words and RNG count are, predicted from a heap at the moment of the cast.
 * @param {VfxHeap} source
 * @param {SpellName} spell
 * @param {Move} move
 * @param {number} seed
 * @param {{ round?: number, rolls?: number }} [where] - the cast's round (default: the round after the move) and the rolls made before it
 */
export function predictCast(source, spell, move, seed, where = {}) {
  const start = new RNG((seed + (where.round ?? CAST_ROUND[move])) >>> 0).jump(
    where.rolls ?? PRE_CAST_ROLLS[spell],
  ).raw;
  /** @param {(rng: RNG) => unknown} fn */
  const calls = (fn) => {
    const rng = new RNG(start);
    const before = rng.count;
    fn(rng);
    return rng.count - before;
  };
  if (spell === 'BlackShadow' || spell === 'Hell') {
    const p = source.predictSoulEater(spell);
    return {
      words: [...p.staleResidual, ...p.staleScale],
      unknown: [...p.staleResidualUnknown, ...p.staleScaleUnknown],
      complete: p.complete,
      calls: calls((r) =>
        spell === 'Hell'
          ? hellRand(r, p)
          : blackShadowRand(r, p.scale, p.residual, p.scaleAccumInit),
      ),
    };
  }
  const p = source.predictParticles(spell);
  const fn = { FlamingArrow: flamingArrowRand, Explosion: explosionRand, Thor: thorRand }[spell];
  return {
    words: p.residual,
    unknown: p.unknown,
    complete: p.complete,
    calls: calls((r) => fn(r, p.residual)),
  };
}

/** @param {{ words?: number[], posX?: number[], scale?: number[] }} live */
export const liveList = (live) => live.words ?? [...(live.posX ?? []), ...(live.scale ?? [])];

export { loadHeapDump, loadArena };
