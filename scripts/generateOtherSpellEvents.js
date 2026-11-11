// Writes lib/Game/Heap/OtherSpellEvents.js: the ordered heap events of the twelve rune spells that are not one of the five particle spells,
// by spell name, from Suikoden-Bizhawk-HUD enemy_profiles/vfx_effects (party_action_event_lists_v1.json: the action's own allocations and frees
// in order; spell_Others_alloc_free_list_v10.json: which tags are the spell). The list is the same for every tag, target, seed and round of a
// spell (checked here). Event format of EnemyMoveEvents: a positive number is an allocation of that many bytes, -k the free of the k-th one.
// usage: node scripts/generateOtherSpellEvents.js [<vfx_effects dir>]    then: npx prettier --write lib/Game/Heap/OtherSpellEvents.js
import fs from 'node:fs';

const DIR =
  process.argv[2] ?? '/home/alex/Projects/Suikoden-Bizhawk-HUD/enemy_profiles/vfx_effects';
const lists = JSON.parse(fs.readFileSync(`${DIR}/party_action_event_lists_v1.json`, 'utf8'));
const spells = JSON.parse(fs.readFileSync(`${DIR}/spell_Others_alloc_free_list_v10.json`, 'utf8'));
const FIVE = ['Flaming Arrow', 'Explosion', 'Thor', 'Black Shadow', 'Hell'];
// the library's spell names where the recordings' differ
const NAME = /** @type {Record<string, string>} */ ({ Judgment: 'Judgement' });

/** @param {{ kind: string, size: number, frees_own_alloc?: number | null }[]} extra */
const toEvents = (extra) =>
  extra.map((e) => (e.kind === 'a' ? e.size : -(Number(e.frees_own_alloc) + 1)));

/**
 * The round-1 events of a tag's recording (spell_casts_others_castpre/act_<tag>_L-fire-slow_<seed>.txt: 'a size ptr ra' / 'f ptr ra').
 * @param {string} tag
 */
function round1(tag) {
  const lines = fs
    .readFileSync(`${DIR}/spell_casts_others_castpre/act_r1${tag}_L-fire-slow_9e3779b1.txt`, 'utf8')
    .split('\n');
  const at = lines.indexOf('round 1');
  const end = lines.indexOf('round 2');
  /** @type {{ kind: string, ptr: string, ra: string }[]} */
  const out = [];
  for (const line of lines.slice(at, end)) {
    const w = line.trim().split(' ');
    if (w[0] === 'a') out.push({ kind: 'a', ptr: w[2], ra: w[3] });
    else if (w[0] === 'f') out.push({ kind: 'f', ptr: w[1], ra: w[2] });
  }
  return out;
}

/**
 * The action's events with the frees its list lacks: the lists were taken as the events beyond an all-Defend round's, which cancelled a free
 * of the action's own block against one of the baseline's with the same caller. Each allocation the list never frees is freed in the recording:
 * the free goes after the last listed event that precedes it there.
 * @param {string} tag
 * @param {{ kind: string, size: number, frees_own_alloc?: number | null, ptr: string, ra: string }[]} extra
 * @returns {number[]}
 */
function withMissingFrees(tag, extra) {
  const trace = round1(tag);
  /** @type {Map<string, number>} */
  const where = new Map();
  let from = 0;
  // the position of every listed event in the recording (in order: the list is a subsequence of it)
  const position = extra.map((e) => {
    let i = from;
    while (i < trace.length && !(trace[i].kind === e.kind && trace[i].ptr === e.ptr)) i++;
    if (i === trace.length) throw new Error(`${tag}: ${e.kind} ${e.ptr} not in the recording`);
    from = i + 1;
    where.set(`${e.kind}${e.ptr}${e.ra}`, i);
    return i;
  });
  const freed = new Set(extra.map((e) => e.frees_own_alloc).filter((x) => x != null));
  /** @type {{ kind: string, size: number, frees_own_alloc?: number | null }[]} */
  const list = [...extra];
  let alloc = -1;
  /** @type {{ after: number, index: number }[]} */
  const adds = [];
  extra.forEach((e, k) => {
    if (e.kind !== 'a') return;
    alloc++;
    if (freed.has(alloc)) return;
    let i = position[k] + 1;
    while (i < trace.length && !(trace[i].kind === 'f' && trace[i].ptr === e.ptr)) i++;
    if (i === trace.length) throw new Error(`${tag}: allocation ${alloc} is never freed`);
    let before = k;
    while (before + 1 < extra.length && position[before + 1] < i) before++;
    adds.push({ after: before, index: alloc });
  });
  // insert from the back so the positions hold
  for (const { after, index } of adds.sort((a, b) => b.after - a.after))
    list.splice(after + 1, 0, { kind: 'f', size: 0, frees_own_alloc: index });
  return toEvents(list);
}

/** @type {Record<string, number[]>} */
const out = {};
for (const { spell, tags } of Object.values(
  /** @type {Record<string, { spell: string, tags: string[] }>} */ (spells.spells),
)) {
  if (FIVE.includes(spell)) continue;
  // Dancing Flames allocates and frees an 8-byte block at one address three times: the list (a difference against an all-Defend round)
  // lost some of them, so its replay leaves the free list different from the game's (r1m4R3t0: 0 of 6 castpre arenas); left out
  if (spell === 'Dancing Flames') continue;
  /** @type {Set<string>} */
  const variants = new Set();
  // (the recording's pointers are the slow party's round 1: only round-1 tags have its trace)
  for (const tag of tags.filter((t) => t.startsWith('r1')))
    for (const [seed, run] of Object.entries(
      /** @type {Record<string, any>} */ (
        lists[tag.slice(0, 2) === 'r1' ? tag : `r1${tag.slice(2)}`]
      ),
    ))
      if (seed === '9e3779b1')
        variants.add(JSON.stringify(withMissingFrees(tag.slice(2), run.extra)));
  if (variants.size !== 1) throw new Error(`${spell}: ${variants.size} distinct lists`);
  const events = JSON.parse([...variants][0]);
  if (events.some((e) => Number.isNaN(e)))
    throw new Error(`${spell}: a free without an allocation`);
  out[NAME[spell] ?? spell] = events;
}
fs.writeFileSync(
  new URL('../lib/Game/Heap/OtherSpellEvents.js', import.meta.url),
  `// Generated by scripts/generateOtherSpellEvents.js from Suikoden-Bizhawk-HUD enemy_profiles/vfx_effects (v1.0 disc). Do not edit.
/**
 * The ordered heap events of the rune spells that are not one of the five particle spells, by spell name (the HeapSpellEvents format: a
 * positive number is an allocation, -k the free of the k-th allocation; the first is the 16384-byte loader buffer). The same for every
 * target, round and seed. Recorded in the party L-fire-slow, rounds 1 and 3, the cast alone (not the post-cast blocks of the next action).
 * @type {Record<string, number[]>}
 */
export const OTHER_SPELL_EVENTS = ${JSON.stringify(out)};
`,
);
console.log(Object.keys(out).length, 'spells');
