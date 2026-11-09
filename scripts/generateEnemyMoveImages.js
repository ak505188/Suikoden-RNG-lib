// Writes lib/Game/Heap/EnemyMoveImages.js from the Suikoden-Bizhawk-HUD block images.
// usage: node scripts/generateEnemyMoveImages.js [<Suikoden-Bizhawk-HUD>/enemy_profiles/enemies/crystal_core_lv60_hp5000/heap_block_images]
// then: npx prettier --write lib/Game/Heap/EnemyMoveImages.js lib/Game/Heap/HitKeyTables.js (the output is one line per table)
import fs from 'node:fs';
import { scanPrediction } from '../lib/Game/Heap/ScanPrediction.js';

const DIR =
  process.argv[2] ??
  '/home/alex/Projects/Suikoden-Bizhawk-HUD/enemy_profiles/enemies/crystal_core_lv60_hp5000/heap_block_images';

/**
 * @param {{ n: number, ptr: string, words: string, varyingIn20Seeds: number[] }[]} blocks
 * @returns {[number, number, string, number[]][]}
 */
const pack = (blocks) => blocks.map((b) => [b.n, Number(b.ptr), b.words, b.varyingIn20Seeds]);

/** @param {string} file */
function image(file) {
  const json = JSON.parse(fs.readFileSync(`${DIR}/${file}.json`, 'utf8'));
  return { blocks: pack(json.moveBlocks), menu: pack(json.menuBlocks) };
}

const DUMPS = process.argv[3] ?? '/home/alex/Projects/Suikoden-Bizhawk-HUD/scripts/heap/data/dumps';

/**
 * An in-round image built from castpre dumps of several seeds (the arena right before the cast): the blocks of `like` (pointers and
 * sizes), a word constant over the seeds is kept, a word that varies is listed as varying.
 * @param {{ blocks: [number, number, string, number[]][] }} like
 * @param {string[]} names - the dump names (without extension)
 * @param {[number, number, string, number[], number[]?][]} [menu] - Fight menu blocks whose `changed` words (addresses) the round rewrote:
 *   their values in the dumps are the image's `menu`, every other word of those blocks is kept as the heap has it
 * @param {number[]} [changed]
 */
function imageFromDumps(like, names, menu = [], changed = [], stale = []) {
  const arenas = names.map((n) => fs.readFileSync(`${DUMPS}/${n}.bin`));
  // the round's own prompt dumps: a word the Special left as it was (castpre equal to prompt0 in every seed) is the battle's history,
  // not the move's: it is kept as the heap has it (another kill method leaves other history there)
  const prompts = names.map((n) =>
    fs.readFileSync(`${DUMPS}/${n.replace(/castpre$/, 'prompt0')}.bin`),
  );
  const blocks = like.blocks.map(([n, ptr, hex]) => {
    let out = '';
    /** @type {number[]} */
    const varying = [];
    /** @type {number[]} */
    const keep = [];
    /** @type {number[]} */
    const topOnly = [];
    for (let i = 0; i < hex.length / 8; i++) {
      const offset = ptr + 4 * i - 0x80182000;
      const words = arenas.map((a) => a.readUInt32LE(offset));
      if (words.some((w) => w !== words[0])) {
        varying.push(i);
        // the round wrote the low three bytes (a constant) and left the top byte as it was
        if (
          words.every(
            (w, k) =>
              (w & 0xffffff) === (words[0] & 0xffffff) &&
              w >>> 24 === prompts[k].readUInt32LE(offset) >>> 24,
          )
        )
          topOnly.push(i);
      } else if (prompts.every((a, k) => a.readUInt32LE(offset) === words[k])) keep.push(i);
      out += words[0].toString(16).padStart(8, '0');
    }
    return [n, ptr, out, varying, keep, topOnly];
  });
  /** @param {number[]} addresses */
  const menuImage = (addresses) => {
    const wanted = new Set(addresses);
    return menu
      .filter(([, ptr, hex]) =>
        Array.from({ length: hex.length / 8 }, (_, i) => ptr + 4 * i).some((a) => wanted.has(a)),
      )
      .map(([n, ptr, hex]) => {
        let out = '';
        /** @type {number[]} */
        const varying = [];
        /** @type {number[]} */
        const keep = [];
        for (let i = 0; i < hex.length / 8; i++) {
          const offset = ptr + 4 * i - 0x80182000;
          const words = arenas.map((a) => a.readUInt32LE(offset));
          if (words.some((w) => w !== words[0])) varying.push(i);
          if (!wanted.has(ptr + 4 * i)) keep.push(i);
          out += words[0].toString(16).padStart(8, '0');
        }
        return [n, ptr, out, varying, keep];
      });
  };
  return { blocks, menu: menuImage(changed), menuModeled: menuImage([...changed, ...stale]) };
}

/**
 * The second Special (round 3, kill by Luc Fire, party L-fire-slow) ends its particles in the slow phase exactly when round 1's target
 * scan had an odd number of failed passes (23 of 23 slow seeds, 17 of 17 fast ones), the fast phase otherwise.
 * @param {string} seed
 */
const slowPhase = (seed) => scanPrediction(parseInt(seed, 16), 1, 23).passes % 2 === 1;
const SEEDS = /** @type {string[]} */ (
  fs
    .readdirSync(DUMPS)
    .map(
      (f) =>
        f.match(/^crystal_core_L-fire-slow_inround_later_special_([0-9a-f]{8})_castpre\.bin$/)?.[1],
    )
    .filter(Boolean)
);
const specialSlow = withKeep(
  image('special_blocks_castpre_L-fire-slow'),
  'crystal_core_L-fire-slow_special_9e3779b1_preconfirm',
);
const castpreNames = (/** @type {(seed: string) => boolean} */ pick) =>
  SEEDS.filter(pick).map((s) => `crystal_core_L-fire-slow_inround_later_special_${s}_castpre`);
const fastPhaseNames = castpreNames((s) => !slowPhase(s));
const slowPhaseNames = castpreNames(slowPhase);

/**
 * The in-round image's Fight menu blocks keep only the words the round changed: a word equal to the one in the round's own prompt dump
 * (`prompt`) is left as the heap has it (the battle's history, e.g. the kill spell's residue), listed as the 5th element.
 * @param {{ blocks: [number, number, string, number[]][], menu: [number, number, string, number[]][] }} set
 * @param {string} prompt - the dump name of the round's prompt in the recorded scenario
 * @returns {{ blocks: [number, number, string, number[]][], menu: [number, number, string, number[], number[]][] }}
 */
function withKeep(set, prompt) {
  const arena = fs.readFileSync(`${DUMPS}/${prompt}.bin`);
  return {
    blocks: set.blocks,
    menu: set.menu.map(([n, ptr, hex, varying]) => {
      /** @type {number[]} */
      const keep = [];
      for (let i = 0; i < hex.length / 8; i++) {
        if (varying.includes(i)) continue;
        const same =
          arena.readUInt32LE(ptr + 4 * i - 0x80182000) ===
          parseInt(hex.slice(i * 8, i * 8 + 8), 16);
        if (same) keep.push(i);
      }
      return [n, ptr, hex, varying, keep];
    }),
  };
}

const SEEDS_ATTACK = fs
  .readdirSync(DUMPS)
  .map(
    (f) =>
      f.match(/^crystal_core_L-fire-slow_inround_later_attack_([0-9a-f]{8})_castpre\.bin$/)?.[1],
  )
  .filter((s) => s);
const attackSlow = withKeep(
  image('attack_blocks_castpre_L-fire-slow'),
  'crystal_core_L-fire-slow_attack_9e3779b1_preconfirm',
);

/**
 * The words of the in-round Fight menu image that a second Attack (round 2) leaves different from the first one's: the same blocks hold
 * other words there (two menu blocks swap contents), in 17 of 20 seeds, so a repeat flags them unknown.
 * @param {{ menu: [number, number, string, number[], number[]?][] }} set
 * @returns {number[]} addresses
 */
function repeatUnknown(set) {
  const arenas = SEEDS_ATTACK.map((s) =>
    fs.readFileSync(`${DUMPS}/crystal_core_L-fire-slow_inround_later_attack_${s}_castpre.bin`),
  );
  /** @type {number[]} */
  const out = [];
  for (const [, ptr, hex, varying, keep = []] of set.menu)
    for (let i = 0; i < hex.length / 8; i++) {
      if (varying.includes(i) || keep.includes(i)) continue;
      const want = parseInt(hex.slice(i * 8, i * 8 + 8), 16);
      if (arenas.some((a) => a.readUInt32LE(ptr + 4 * i - 0x80182000) !== want))
        out.push(ptr + 4 * i);
    }
  return out;
}

/**
 * The words of the Fight menu (the next-prompt image of the Special, which the heap holds after a round with the first Special) that
 * a later Special round leaves different at the cast, over every recorded scenario (luc1 and the five kill scenarios, castpre dumps):
 * - `changed`: the round itself rewrites them (castpre differs from the round's own prompt0: two menu blocks swap contents, as after a
 *   second Attack). The phase images carry their values (`menu`).
 * - `stale`: the round leaves them alone, but the image's value is not what a later battle holds there (castpre equals prompt0, which
 *   differs from the image: history the first Special wrote differently, per phase). The phase image's `menuModeled` carries them for
 *   a heap that built that history itself; a heap started from a prompt dump holds the real words.
 * @param {{ menu: [number, number, string, number[], number[]?][] }} next
 * @returns {{ changed: number[], stale: number[] }} addresses
 */
function repeatUnknownSpecial(next) {
  const names = fs
    .readdirSync(DUMPS)
    .map(
      (f) =>
        f.match(
          /^(crystal_core_L-fire-slow_inround_later_(?:kill(?:vf|luc)_kr\d_)?special_[0-9a-f]{8})_castpre\.bin$/,
        )?.[1],
    )
    .filter((n) => n);
  const arenas = names.map((n) => ({
    cast: fs.readFileSync(`${DUMPS}/${n}_castpre.bin`),
    prompt: fs.readFileSync(`${DUMPS}/${n}_prompt0.bin`),
  }));
  /** @type {number[]} */
  const changed = [];
  /** @type {number[]} */
  const stale = [];
  for (const [, ptr, hex] of next.menu)
    for (let i = 0; i < hex.length / 8; i++) {
      const offset = ptr + 4 * i - 0x80182000;
      const want = parseInt(hex.slice(i * 8, i * 8 + 8), 16);
      if (arenas.some((a) => a.cast.readUInt32LE(offset) !== a.prompt.readUInt32LE(offset)))
        changed.push(ptr + 4 * i);
      else if (arenas.some((a) => a.cast.readUInt32LE(offset) !== want)) stale.push(ptr + 4 * i);
    }
  return { changed, stale };
}

const specialNext = image('special_blocks_preconfirm_L-fire-slow');
const specialRepeat = repeatUnknownSpecial(specialNext);

/**
 * The per-round recordings (heap_rounds/rounds_<scenario>_d0.tsv and the dumps crystal_core_L-fire-slow_<scenario>_<seed>_r<r>_preconfirm):
 * the arena at the next prompt after a round, for the 4 recorded seeds of the 10 scenarios (luc1-5, vf1-5: kill in round k, first
 * Special k + 1, cast round k + 2). Returns the dump names of the rounds that match `pick(scenario, round, idx0)`.
 * @param {(kill: string, k: number, round: number, idx0: number) => boolean} pick
 * @returns {string[]}
 */
function roundDumps(pick) {
  const ROUNDS = `${DIR}/../heap_rounds`;
  /** @type {string[]} */
  const names = [];
  for (const file of fs.readdirSync(ROUNDS).filter((f) => /_d0\.tsv$/.test(f))) {
    const [, kill, k] = /** @type {RegExpMatchArray} */ (file.match(/rounds_(luc|vf)(\d)_d0/));
    for (const line of fs.readFileSync(`${ROUNDS}/${file}`, 'utf8').split('\n').filter(Boolean)) {
      const cells = line.split('\t');
      const seed = cells[0];
      const name = (/** @type {number} */ r) =>
        `crystal_core_L-fire-slow_${kill}${k}_${seed}_r${r}_preconfirm`;
      cells.slice(2).forEach((cell, i) => {
        const idx0 = Number(/idx0=(\d)/.exec(cell)?.[1]);
        // (HOLD_SEED: leave one seed out, to check the images against a seed they were not built from)
        if (
          seed !== process.env.HOLD_SEED &&
          pick(kill, Number(k), i + 1, idx0) &&
          fs.existsSync(`${DUMPS}/${name(i + 2)}.bin`)
        )
          names.push(name(i + 2));
      });
    }
  }
  return names;
}

/**
 * The arena right after a round (the next prompt), as an image of the move's blocks and the Fight menu: a word constant over the dumps
 * is known, a varying one unknown.
 * @param {{ blocks: [number, number, string, number[]][], menu: [number, number, string, number[]][] }} like
 * @param {string[]} names
 */
function imageAtPrompt(like, names) {
  const arenas = names.map((n) => fs.readFileSync(`${DUMPS}/${n}.bin`));
  /** @param {[number, number, string, number[]][]} blocks */
  const from = (blocks) =>
    blocks.map(([n, ptr, hex]) => {
      let out = '';
      /** @type {number[]} */
      const varying = [];
      for (let i = 0; i < hex.length / 8; i++) {
        const words = arenas.map((a) => a.readUInt32LE(ptr + 4 * i - 0x80182000));
        if (words.some((w) => w !== words[0])) varying.push(i);
        out += words[0].toString(16).padStart(8, '0');
      }
      return /** @type {[number, number, string, number[]]} */ ([n, ptr, out, varying]);
    });
  return { blocks: from(like.blocks), menu: from(like.menu) };
}

// the arena after the round of Luc's kill (Crystal Core's Attack, then Luc's Flaming Arrow kills it: the cast allocates over the
// Attack's blocks and the menu), and after the first Special by the draw buffer index of its round (the phase: 0 fast, 1 slow)
const attackNext = image('attack_blocks_preconfirm_L-fire-slow');
const afterKill = imageAtPrompt(
  attackNext,
  roundDumps((kill, k, round) => kill === 'luc' && round === k),
);
const specialNextByPhase = [0, 1].map((phase) =>
  imageAtPrompt(
    specialNext,
    roundDumps((kill, k, round, idx0) => round === k + 1 && idx0 === phase),
  ),
);

const images = {
  CRYSTAL_CORE: {
    Attack: {
      'L-fire': { next: image('attack_blocks_preconfirm') },
      'L-fire-slow': {
        inRound: attackSlow,
        // by 'camera % 3/target slot/draw parity'
        next: attackNext,
        // the round in which Luc's Flaming Arrow kills Crystal Core after its Attack
        nextKill: afterKill,
        // the words are the same when the Attack runs a second time (a cast in a later round: 0 known words wrong, 20 seeds)
        repeatable: true,
        repeatUnknown: repeatUnknown(attackSlow),
      },
    },
    Special: {
      'L-fire': { next: image('special_blocks_preconfirm') },
      'L-fire-slow': {
        inRound: specialSlow,
        // the second Special, particles ending in the fast phase (17 of 20 seeds, from their castpre dumps)
        inRoundFast: imageFromDumps(
          specialSlow,
          fastPhaseNames,
          specialNext.menu,
          specialRepeat.changed,
          specialRepeat.stale,
        ),
        // and in the slow phase (23 of 40 seeds: round 1's scan had an odd number of failed passes)
        inRoundSlow: imageFromDumps(
          specialSlow,
          slowPhaseNames,
          specialNext.menu,
          specialRepeat.changed,
          specialRepeat.stale,
        ),
        next: specialNext,
        // the first Special's next-prompt image by the phase of its round (the draw buffer index at its confirm)
        nextFast: specialNextByPhase[0],
        nextSlow: specialNextByPhase[1],
      },
    },
  },
};

const header = `/**
 * What an enemy move writes into the blocks it allocates and into the Fight menu's blocks (Suikoden-Bizhawk-HUD
 * enemy_profiles/enemies/<slug>/heap_block_images, scripts/heap/BlockImages.py; seed 9e3779b1; generated by
 * scripts/generateEnemyMoveImages.js). Per block: [allocation number in the move's footprint, pointer, payload words as hex (8 digits
 * each, the little-endian u32), the word indices that vary between the recorded 20 seeds (their values are not constants: unknown)].
 * \`blocks\` are the move's own allocations in allocation order, \`menu\` the 44 Fight menu blocks (allocation numbers continue after
 * the move's own).
 *
 * The words depend on the party (its timing: the Special's particles animate until its last frame), so images are per party
 * recording ('L-fire': fast party, Crystal Core moves after the cast; 'L-fire-slow': Crystal Core moves first), and per moment:
 * - \`next\`: the arena at the NEXT Fight prompt, after the Fight menu was rebuilt (for a cast in a later round);
 * - \`inRound\`: the arena right before a cast in the SAME round as the move, the Fight menu freed and not rebuilt yet (its 44 blocks
 *   still hold the stale words the cast sees).
 * @typedef {[number, number, string, number[]] | [number, number, string, number[], number[]] | [number, number, string, number[], number[], number[]]} BlockImage
 * @typedef {{ blocks: BlockImage[], menu: BlockImage[], menuModeled?: BlockImage[] }} BlockSet
 * @typedef {{ next?: BlockSet, inRound?: BlockSet, inRoundFast?: BlockSet, inRoundSlow?: BlockSet, nextKill?: BlockSet, nextFast?: BlockSet, nextSlow?: BlockSet, repeatable?: boolean, repeatUnknown?: number[] }} MoveImage
 */

/** @type {Record<string, Record<string, Record<string, MoveImage>>>} enemy key -> move -> party recording -> image */
export const ENEMY_MOVE_IMAGES = `;
const SPAWN = `${DIR}/../heap_attack_spawn`;
/** the 13- and 20-word blocks (15 of them) of each round-1 key, as one hex string */
function blockTable() {
  // slots 1-3, then slots 4-6 (hit_key_table_slots456.json, formation bytes swapped to make them hittable)
  return Object.fromEntries(
    ['hit_block_table_round1.json', 'hit_key_table_slots456.json'].flatMap((file) =>
      JSON.parse(fs.readFileSync(`${SPAWN}/${file}`, 'utf8')).entries.map(
        (
          /** @type {{ cam: string, slot: string, idx: string, blocks: { words: string[] }[] }} */ e,
        ) => [`${e.cam}/${e.slot}/${e.idx}`, e.blocks.flatMap((b) => b.words).join('')],
      ),
    ),
  );
}
/** @param {string} file @param {string[]} fields @param {string[]} [more] - further files with the same keys */
function keyTable(file, fields, more = []) {
  return Object.fromEntries(
    [file, ...more].flatMap((name) =>
      JSON.parse(fs.readFileSync(`${SPAWN}/${name}`, 'utf8')).entries.map(
        (/** @type {Record<string, any>} */ e) => [
          fields.map((f) => e[f]).join('/'),
          e.words.join(''),
        ],
      ),
    ),
  );
}
/**
 * The other party order (McDohl, Flik, Viktor, Luc: the words at slot 2 depend on whether it is Viktor) has its own round-1 images:
 * packets and the other blocks per (camera, slot, index), as for the recorded order. Rounds >= 2 take them at round 1's index.
 * @param {string[]} files the round-1 recordings of the order
 */
function ordTable(files) {
  /** @type {{ packets: Record<string, string>, blocks: Record<string, string> }} */
  const out = { packets: {}, blocks: {} };
  for (const file of files)
    for (const line of fs.readFileSync(`${SPAWN}/${file}`, 'utf8').split('\n')) {
      const p = line.split('\t');
      if (p.length < 15 || Number(p[4]) === 0) continue;
      const key = `${scanPrediction(parseInt(p[0], 16) >>> 0, 1).camera}/${p[4]}/${p[9].split('/')[0]}`;
      out.packets[key] = p[12];
      out.blocks[key] = p[14]
        .split(',')
        .filter((b) => b.includes(':'))
        .map((b) => b.split(':')[1])
        .join('');
    }
  return out;
}
fs.writeFileSync(
  new URL('../lib/Game/Heap/HitKeyTables.js', import.meta.url),
  `/**
 * Crystal Core's Attack hit effect: the 24 forty-byte GPU packets (12 sprite resources x 2 draw buffers, 10 words each, allocation
 * order) at the next prompt, per key (Suikoden-Bizhawk-HUD heap_attack_spawn/hit_key_table_round{1,2}.json; generated by
 * scripts/generateEnemyMoveImages.js). Words as hex, 8 digits each.
 * - round 1: 'camera/slot/index', the camera roll % 3, the party ARRAY slot hit (1..3, and 4..6 from hit_key_table_slots456.json), the
 * draw-buffer index at the last draw (36 keys)
 * - round 2, the second Attack: 'camera/slot/index/index of round 1' (36 keys)
 * - blocks: the 15 other blocks of the Attack (13 of 13 words, 2 of 20), per round-1 key (slots 1-3: they follow round 1's index in round 2 too;
 * slots 4-6 are recorded in round 1 only)
 * - ord: the other party order's round-1 packets and blocks, per party (slow / fast), key 'camera/slot/index'
 */
export const HIT_KEY_TABLES = ${JSON.stringify({
    round1: keyTable(
      'hit_key_table_round1.json',
      ['cam', 'slot', 'idx'],
      ['hit_key_table_slots456.json'],
    ),
    round2: keyTable('hit_key_table_round2.json', ['cam', 'slot', 'idx2', 'idx1']),
    blocks: blockTable(),
    ord: {
      slow: ordTable([
        'keys_variants/keys_L-fire-slow-ord_r1_d0.tsv',
        'keys_variants/keys_L-fire-slow-ord_r1_d1.tsv',
      ]),
      fast: ordTable([
        'keys_fast/ord_keys_L-fire-ord_r1_d0_D0.tsv',
        'keys_fast/ord_keys_L-fire-ord_r1_d0_D1.tsv',
      ]),
    },
  })};
`,
);
fs.writeFileSync(
  new URL('../lib/Game/Heap/EnemyMoveImages.js', import.meta.url),
  `${header}${JSON.stringify(images)};\n`,
);

// The ticks a party action adds to its round (heap_rounds/action_ticks_luc2.txt, 3 seeds, menu delay 0): the parity of the added ticks
// per action tag (member, type, slot, target), kept only where the 3 seeds agree; a round-1 action is in an Attack round, a round-3
// action in the first Special round
{
  const text = fs.readFileSync(
    new URL('../heap_rounds/action_ticks_luc2.txt', `file://${DIR}/`),
    'utf8',
  );
  /** @type {Record<string, Record<string, 0 | 1 | null>>} */
  const ticks = { attack: {}, special: {} };
  for (const line of text.split('\n')) {
    const m = line.match(/^r(\d)(m\d[ARI]\d+t\d): \[([\d, ]+)\]/);
    if (!m) continue;
    const parities = new Set(m[3].split(',').map((x) => Number(x) % 2));
    ticks[m[1] === '1' ? 'attack' : 'special'][m[2]] =
      parities.size === 1 ? /** @type {0 | 1} */ ([...parities][0]) : null;
  }
  fs.writeFileSync(
    new URL('../lib/Game/Heap/ActionTicks.js', import.meta.url),
    `/**
 * The parity of the game ticks a party action adds to its round, per action tag \`m<member><A|R|I><slot>t<target>\` (member 1-based in
 * the recorded party order, Rune slot 1-based, Attack slot 0 and target 7 = the enemy, an item's slot = its inventory slot, a party
 * target 1-6): 'attack' for an action in a round of Crystal Core's Attack, 'special' in the first Special round. null where the
 * recorded seeds disagree on the parity (the ticks depend on the RNG). Suikoden-Bizhawk-HUD heap_rounds/action_ticks_luc2.txt, generated by
 * scripts/generateEnemyMoveImages.js.
 */
export const ACTION_TICKS = ${JSON.stringify(ticks)};
`,
  );
}

// Which of the five spells' stale words and RNG counts an action changes, against the all-Defend baseline (heap_actions/acm_r<1|3>*.txt,
// 104 jobs, seeds 9e3779b1 and 3c6ef362, live casts after the second Special of luc2): per action tag, the spells that differ in either
// seed; round 1 is an Attack round, round 3 the first Special round
{
  const ACTIONS = new URL('../heap_actions/', `file://${DIR}/`);
  const BASELINE = new URL(
    '../heap_after_move_words_special_L-fire-slow_kill_luc2.txt',
    `file://${DIR}/`,
  );
  /** @param {URL | string} file @returns {Map<string, { w?: string, c?: number }>} */
  const parse = (file) => {
    /** @type {Map<string, { w?: string, c?: number }>} */
    const out = new Map();
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^(\w+) seed (\w+) \| (.*)$/);
      if (!m) continue;
      const key = `${m[1]}/${m[2]}`;
      const entry = out.get(key) ?? {};
      out.set(key, entry);
      if (m[3].startsWith('live stale posX')) {
        entry.w = `${m[3].match(/posX low12 ([0-9a-f,]+)/)?.[1]}|${m[3].match(/live stale scale ([0-9a-f,]+)/)?.[1]}`;
        continue;
      }
      const calls = m[3].match(/rand calls real (\d+)/);
      if (!calls) continue;
      entry.c = Number(calls[1]);
      if (m[3].startsWith('live ')) entry.w = m[3].match(/^live ([0-9a-f,]+) \|/)?.[1];
    }
    return out;
  };
  const base = parse(BASELINE);
  /** @type {Record<string, Record<string, string[]>>} */
  const table = { attack: {}, special: {} };
  for (const name of fs.readdirSync(ACTIONS).filter((f) => /^acm_r[13]/.test(f))) {
    const tag = name.slice(4, -4);
    const changed = new Set();
    for (const [key, entry] of parse(new URL(name, ACTIONS))) {
      const b = base.get(key);
      if (b && (entry.w !== b.w || entry.c !== b.c)) changed.add(key.split('/')[0]);
    }
    table[tag[1] === '1' ? 'attack' : 'special'][tag.slice(2)] = [...changed].sort();
  }
  fs.writeFileSync(
    new URL('../lib/Game/Heap/ActionFootprints.js', import.meta.url),
    `/**
 * The spells whose stale words or RNG counts a party action changes, per action tag (see ActionTicks.js for the tag), against an
 * all-Defend round: 'attack' for an action in a round of Crystal Core's Attack, 'special' in the first Special round (the casts are
 * after the second Special; luc2, party L-fire-slow, 2 seeds). An empty list leaves all five spells as they were. The Explosion word
 * never changes in any of the 104 jobs. Suikoden-Bizhawk-HUD heap_actions/acm_r*.txt, generated by scripts/generateEnemyMoveImages.js.
 */
export const ACTION_FOOTPRINTS = ${JSON.stringify(table)};
`,
  );
}
