# VFX heap simulator: goal, state and plan

Reference for whoever continues this work (a new agent or a new session). Written 2026-11-11 from the working sessions with the user.
Read it before touching `lib/Game/Heap`. It states what we are building, what exists, what is wrong with it, and how we get to the goal.

## 1. Why this exists

The battle search (`../Suikoden-Battle-Search`, uses this library) brute-forces action sequences and needs the exact RNG state after every
action. A few spells' RNG call counts depend on **stale words in the game's VFX heap**: Flaming Arrow, Explosion, Thor, Black Shadow and Hell
read words out of structs they allocate before initialising them, and use them in rolls. Which stale words they read depends on everything
that wrote to that heap earlier in the battle: menu draws, enemy moves, party actions, earlier casts. So the number of `rand()` calls a spell
makes (and so every later roll in the search) depends on the VFX heap's contents.

The heap is the arena at `0x80182000`, `0x18000` bytes ("vfxPool"), managed by `heap_alloc` / `heap_free` (next-fit, 8-byte headers).

## 2. The goal

**A simulator of the VFX heap for any battle**: any party, any characters, any enemies, any spell, any party action, any enemy move.

- **Input:** the vfxPool (the arena) as it is at the first prompt of the battle, plus the battle's own data (party, enemies, formation, the
  game's data tables). Nothing else.
- **Output:** the arena's real contents at any point, so that the five spells' stale words are _read from the simulated arena_, never
  predicted. RNG call counts then come out of running the spells' code on those words.
- **No recordings in the finished version.** Recorded images, hit tables, tick/parity tables, footprint/pair/kill taint tables are scaffolding.
  Recordings (BizHawk dumps of the real game) are only inputs while implementing and **test oracles** afterwards.
- **No guesswork, no "known/unknown" flags.** An unknown word is a gap to decode, not an acceptable end state. The user needs exact results.
- **Not tied to Crystal Core, Luc, or the recorded parties.** Crystal Core and the six recorded characters (McDohl, Viktor, Flik, Luc,
  Tengaar, Hellion) are only the first oracle set. If a rule mentions them, it is temporary.

It is a _simulator_ (it executes the game's effect code on the arena), not a _predictor_ (a model that guesses which words it can vouch for).
The user corrected this explicitly: "we need a simulator, not a predictor."

## 3. What we have now, honestly

Layers in `lib/Game/Heap` (26 files, ~39k lines; 32k of them are one recorded data file):

| layer                                                                 | state                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HeapModel.js` allocator (alloc / free / headers / free list / rover) | **real simulation**, exact                                                                                                                                                                                                                                                                                                                                                                                  |
| `HeapEvents.js`, `HeapPrediction.js` `applyEvents`                    | replays an alloc/free list on the allocator                                                                                                                                                                                                                                                                                                                                                                 |
| which blocks each action allocates and frees                          | **recorded lists** per action (`PartyActionEvents.js`, `OtherSpellEvents.js`, `SpellEvents.js`, `EnemyMoveEvents.js`), not derived; timing recorded too                                                                                                                                                                                                                                                     |
| what is _in_ the blocks                                               | a mix: **derived from code** for the Special's particle systems (`ParticleSystems.js`, `SpecialEffect.js`, `SpecialObjects.js`), the menu object (`MenuObject.js`), the menu's packet stream (`MenuStream.js`, not wired), the Flaming Arrow cast, the Explosion's pool, the spell RNG (`../Magic/SpellRNG`); **replayed from recorded images** for the rest (`EnemyMoveImages.js`, `HitKeyTables.js`, ...) |
| words nothing models                                                  | a per-word `known` / `unknown` / `partial` flag in `VfxHeap.state`, plus per-spell **taint tables** (`ActionFootprints.js`, `PAIR_TAINT`, `KILL_TAINT`, `TURN_ORDER_TAINT`) that mark a spell's prediction unusable                                                                                                                                                                                         |

`VfxHeap.js` is the orchestrator the `Battle` engine calls (`enemyMove`, `partyAction`, `castOtherSpell`, `castSpell`, `castFlamingArrow`,
`roundStart` / `roundEnd`, `predictParticles` / `predictSoulEater`). `lib/Game/Magic/Behavior.js` `spellRand` calls it for spell casts.

### What is tied to Crystal Core / one party / one recording (the audit)

Full inventory: `Suikoden-Bizhawk-HUD/notes/2026-11-11_vfx_simulator_generality_audit.md`. Summary:

- Crystal Core: `EnemyMoveImages.js`, `EnemyMoveEvents.js`, `HitKeyTables.js`, `HitEffect.js` (its Attack hit effect, `CRYSTAL_POSITION`),
  the Special files, `ScanPrediction.js`, `KILL_PAD_BYTES` (Luc's Flaming Arrow kill), `enemyKey === 'CRYSTAL_CORE'`, special cases on
  `moveName === 'Special' | 'Attack'`.
- One party: `RECORDED_ORDER`, action tags `m<member>...` in that order, `this.party === 'L-fire'` used as a proxy for "enemy acts after the
  party", `FIRST_DRAW`, the turn-order speed tables.
- One recording shape: all action lists / tick parities / footprints were recorded in the party `L-fire-slow`, rounds 1 and 3.
- All tests use one enemy, six characters, two party shapes and ten turn-order parties built from the same six. **Nothing proves generality.**

### What I got wrong (do not repeat)

1. I built a predictor with escape hatches (flags, taint tables, images) because they pass recordings. They hide gaps instead of closing them.
2. Recorded images cannot say, per word, whether the game writes the whole word or only some bytes and keeps the old top byte (a word whose
   history byte happened to be constant looks fully written). That produced wrong claims once the history changed (a rune cast earlier in the
   round). Derive writes from code; never infer them from a snapshot.
3. I read the agent's `frees_own_alloc` (index of the _event_) as an allocation ordinal. The lists were complete; my "missing frees" patch was
   a bug. The v2 lists (`party_action_event_lists_v2.json`, `signed_r1_9e3779b1`) are correct and are what the generator uses now.
4. Framing: "baseline scenario", "Crystal Core's Attack", "Luc's kill" are the oracle, not the product.
5. I wrongly said every spell's loader buffer holds a per-spell disc file. The 16384-byte loader image is **constant for every spell and
   fight** (`LoaderImage.js`). Some effects (the Special) read their own files.

## 4. How the game works (what the simulator must reproduce)

Facts established so far (v1.0 disc). Sources are in the notes (section 8).

- **Allocator:** next-fit over the arena; each block has an 8-byte header `{next, size in units}` just below the payload; `heap_alloc` /
  `heap_free` / merges write header words (they are the last write to some bytes). `HeapModel.js` reproduces them.
- **Spell cast:** each party spell first allocates a 16384-byte loader buffer, fills it with the constant loader image, frees it, then
  allocates its setup blocks (`PoolRecipes.js` for the five particle spells). Allocations land over whatever was there, so the first words a
  struct reads are the previous owner's.
- **Round shape:** at the confirm the game frees the Fight menu's 44 blocks (`roundStart`); the round's actions and the enemy's move run; at
  the round's end the menu is rebuilt (44 allocations incl. a 12776-byte object, `roundEnd`). Two 6000-byte packet buffers are re-allocated
  at the same addresses and rewritten from offset 0 by the menu draw every frame (`MenuStream.js`).
- **Draw buffer index** (`idx`, 0/1): the game double-buffers packets; its parity at a tick selects which buffer's words an effect writes.
  It follows the tick count, so action timing (ticks added by an action, lag frames) matters.
- **Turn order and timing:** actions run in speed order, one at a time; the enemy's move starts when the faster members are done. Round
  length is a function of the members' speeds (`speedClass`, `fastFillers` in `VfxHeap.js` are the recorded cases only).
- **Writes are byte-level.** Many effects write a word's low 24 bits and keep the old top byte, or write only a halfword. The kept byte is
  whatever the heap held one frame before: a block's payload, an allocator header word, the initial arena. (Poison test by the agent:
  `special_pad_write_width_v10.json`.)
- **Effects are partly data-driven.** The agent's catalogue (`2026-11-09_vfx_effect_catalogue.md`): 12 effect tables, 155 direct build call
  sites in main.exe, 32 indirect sites in 17 overlays, 230 script start sites, 177 decoded effect scripts, 43 spawn50 effect functions; the
  12 rune spells' tick functions are hard-coded handlers. **How much is script and how much is handler is the question the census
  (section 6, step 1) answers.**

## 5. How we work

Three repos:

- `Suikoden-RNG-lib` (this one): the simulator, written in JS. Branch `agentic-simulator-additions`.
- `Suikoden-Bizhawk-HUD`: reverse engineering (Ghidra, v1.0 disc), BizHawk recordings, Lua tools, and the notes. `notes/` and
  `enemy_profiles/vfx_effects/` hold everything the simulator is built from. `scripts/heap/` has the original heap tools.
- `Suikoden-Battle-Search`: the consumer.

**Division of labour.** A separate **RE agent** works in the HUD repo: decodes code, records the real game, writes notes and fixtures. The
**simulator agent** (this side) implements and tests. The **human only decides** and pastes prompts between the two; neither agent talks to
the other directly. Protocol: `Suikoden-Bizhawk-HUD/notes/2026-11-09_vfx_working_protocol.md`. Files:

- `2026-11-09_vfx_findings_index.md` (RE agent owns): reading order, data, gaps.
- `2026-11-09_vfx_simulator_status.md` (simulator side owns): what is ported / derived / tabled, what blocks it. Both sides append answers
  there. **Read its last sections first** to see the current asks and answers.
- `2026-11-09_vfx_corrections.md` (both append): one line per correction of an earlier claim.
- Prompts for the RE agent are written as complete, self-contained text (the human pastes them). Give goals, evidence needed, the files to
  read, the format of the answer ("append to ... status.md"). Never ask the RE agent for permission to record; recordings are allowed.
- Watching for the agent's reply: a polling loop on `stat` of `notes/*vfx_*` (no `inotifywait` here). Only the notes folder: watching the
  recordings folder floods the session with events.

**Rules from the user** (follow exactly):

- **Commit only when asked.** Then end the message with the attribution line from the session's system reminder.
- **Let tests fail and report semantic changes.** Never rewrite a failing test to match; if an expectation changed on purpose, say so.
- Before reporting done: `npx prettier --write lib test scripts`, `npx tsc --noEmit`, `npx eslint lib test`, and the full suite
  (`node --test`, about 60k tests, ~2 min; run `node --test test/heap` for the heap's 780). `test/minigames/war.test.js` has an unrelated
  type error from a merged branch.
- Do not duplicate RNG mechanics already in `lib/Game/Magic/SpellRNG/*.js` or `lib/Game/Heap/SpellEvents.js`.
- Mark Crystal-Core-specific rules as temporary; prefer deriving to adding tables; treat an unknown word as a gap to decode.
- Report plainly: what was verified and how, what was not.

## 6. The plan

**Principle:** one engine of primitives, per-effect handlers on top, game data loaded from the disc. No per-battle recordings, no flags.
Recordings are used to _verify_ each piece exactly (every word equal), not to supply values.

1. **Census (the RE agent; prompt given, answer pending in `2026-11-11_vfx_effect_census.md`).** Every `heap_alloc` caller in battle by
   subsystem; per effect: script-driven or hard-coded handler; the shared build / update / draw primitives and how many effects use each;
   the enemy side (how many distinct handlers across all enemies); the data each effect reads and how to extract it from the disc; which
   parts of the first-prompt arena depend on the battle. The answer sizes the job and orders the ports by reuse.
2. **Whole-arena diff harness (simulator side).** After each round (and at each effect's free frame) compare the _entire_ simulated arena with
   a recorded one, attribute every differing word to the effect that last wrote it. "Done" for an effect means zero differing words. This
   replaces the known / unknown flags with a number that has to reach zero.
3. **Engine and data extraction.** The primitives (sprite-object family, rings, prim sets, strips, fx blocks, particle systems, camera + GTE
   projection, OT link writes), the tick scheduler inside `Battle`'s clock (real draw-buffer index, OT state, camera), the generated data
   tables (from the disc, via the HUD repo's extraction, not from recordings).
4. **Port handlers by reuse, not by what is recorded.** The agent's byte-exact models are the templates: Healing Wind (2524 of 2524 words),
   Clay Guardian, Earthquake (`spell_*_model.py`), the Special, the five spells, the menu. Each port is accepted only when the arena at its
   free frame equals the recording on every seed and target.
5. **Generality oracle.** Record two or three other battles (another enemy, another character set, other spells and formations) so nothing
   stays keyed to Crystal Core by accident. Test the simulator against them _before_ retiring the old code.
6. **Retire the scaffolding** (images, tables, taint, `KILL_PAD_BYTES`, `party === 'L-fire'`) as each part reaches an exact arena match.

## 7. Where things stand (2026-11-11)

Done and committed (latest first): `5b5daa6` rune-spell allocations / frees replayed (generator + menu-rebuild fix + Flaming Arrow
propagation), `7893e83` Flaming Arrow after Flaming Arrow and the camera-class kill byte `0x80190edf` (= 11 + 5 x the round's first
`rand() % 3`), `7395cf9` the fast party's first Special at bulk index 1 (185 swapped G4 word pairs), `161e851` Explosion after Explosion
(trail words survive the menu redraw for the first 12 structs, the menu stream rewrites the rest), `1832123` the turn-order parties
(Luc's kill pad bytes by draw index), `87b9a79` `MenuStream.js`.

**Uncommitted** (suite passes, 60514 tests): `scripts/generateOtherSpellEvents.js` now reads the agent's v2 lists (Dancing Flames included),
`OtherSpellEvents.js` regenerated, and `castFlamingArrow` leaves _every_ trail word unknown when any of the six cells it reads is unknown (the
rolls depend on all six).

Exact today, for the recorded scenarios only: the five spells after the all-Defend rounds, Attack and item rounds of the recorded party,
Luc's kill (slow, fast and the ten turn-order parties), pairs of the five spells. Everything else is flagged by taint tables.

**An attempt that failed (so nobody repeats it):** dropping the flat taint after a rune cast and trusting per-word flags made 8, then 28,
tests fail. Cause: the second Special after Luc's kill is not derived from its code (the kill cast's blocks lie under it), so it takes a
recorded image, and the image cannot tell written words from kept ones. The agent has since delivered the exact write map of the Special
(`special_pad_write_width_v10.json`: the 864-byte G4 buffers keep the top byte of words +0xc, +0x14, +0x1c of every record), but applying
it to the image path regressed the baseline because the model cannot tell a trusted dump word from one a fresh allocation marked unknown.
The right fix is the plan above (derive the Special from code), not another patch to the image path.

Open asks / known gaps:

- Census (step 1): done (see the HUD notes `2026-11-11_vfx_effect_census.md`); an effect with no port must be a hard "unsupported" error, never a per-word guess. The whole-arena diff harness (`scripts/heapArenaDiff.js`, `ArenaDiff.js`, ratchet `test/heap/heapArenaDiff.test.js`) is in place.
- Rune spells: 3 of 12 families have byte-exact word models (Healing Wind, Clay Guardian, Earthquake); the other 9 need decoding and ports.
  The agent's pre-cast arenas for all rune tags (2550 files, `spell_casts_others_castpre/`) are the oracle.
- Not decoded: physical Unites, deaths, formation moves, most enemy moves other than Crystal Core's, other parties / enemies / formations.
- `MenuStream` is not wired into the heap: the stream end and words assume the first prompt's text, so an HP change that alters the digit
  count (or a name with other glyphs) gives wrong words without a flag. This is a silent-error risk.
- Hellion in the fast parties (round 3 casts) does not match the plain-cast constants (agent's guess: draw buffer / OT state after the
  Special).
- Flaming Arrow after a Flaming Arrow, Explosion pair, turn-order parties are exact only for the recorded orders.

## 7b. Hidden inputs (2026-11-12, agent's perturbation test, `hidden_inputs_v10.json`)

Besides the first-prompt arena (0x80182000, 0x18000 bytes) and the battle's own data (party, enemies, background grid), the simulator
takes exactly two scalars:

- the draw index at 0x8018023c at the first prompt (history dependent); within a round it is `idx0 xor (frame mod 2)`;
- the RNG state at 0x80009010 (an input in all 15 round kinds tested).

Everything else outside the arena is a constant (599 of 603 words in Crystal Core are identical in 3 builds; the other 4 are the tick and
the parity family). The vblank counter matters only relatively. The menu dwell is not in RAM: it follows from the actions (CC: Defend 259,
Attack 357, rune 567 frames).

Constants the simulator must carry, never derive from a recording: 0x8017c48c = 4 (display setup; another value moves the Soul Eater spells'
rand counts by +1148 / +1896), and the heap-node words after the arena (0x801b8c60, 0x801b8c68, 0x801b9478: object lists every spell walks,
+-500 rand when changed). Not covered: the per-kind scans for the rune, Explosion, Flaming Arrow, Thor, Black Shadow, Hell and Luc-kill rounds.

## 7c. Derived since the diff harness (2026-11-12)

- The Special's sobj x / y words come from the battle's own RNG: `specialRolls(rng)` in `SpecialObjects.js` (rand calls 23 + a after the round
  start, xi = rand % 198 - 99, r = SquareRoot0(10000 - xi^2), yr = rand % (2r) - r; 200 of 200 recorded pairs). A later party action in the
  round (`rollsInterleaved`) makes them unknown. The Special's other roll words (header / packet projected xy, OT links) are gaps, no longer
  claimed from the recorded Luc run; the camera model (`special_camera.md`, verified for the G4 systems only) is the way to derive them.
- The menu rebuild's gradient initialiser (FUN_800efad0) is derived (`gradientWord` in `VfxHeap.js`): RGB, the 0x30 code byte, and the kept top
  byte of the cast's trail words.
- The kill round at draw index 1 swaps the Fight menu's two packet buffers (`swapPacketBuffers`): the buffers hold neighbouring frames; links into
  the own buffer follow, other links stay. The cursor rectangle (4 LINE_F2 over window 2, row 3 for Free Will) is written into the buffer of the
  index at the rebuild: an assumption about the chosen command.
- The Flaming Arrow particle model (words 0..8 of the 20 structs) is exact when it starts from the real stale words (179 of 180 are what the
  simulator already has; the agent's `fa_particle_stale_words_v10.json` is the oracle). Not derived yet: the particle structs' LINE_F2 / DR_MODE
  packets (about 84 words), the 30 spark-child sprite groups (about 1000 payload words; the agent gave a recorded table, not a formula, for
  the xy words of groups 14..29 and the one-off top halfwords of w7 / w9), the Special's projected words.
- Whole-arena diff after this: wrong partial words in the menu 1315 -> 29, free 90 (the sprite packets), wrong claims 0.

## 7d. The effect-script engine (2026-11-12)

`lib/Game/Heap/Engine/EffectEngine.js` is a JS port of the battle's effect-script engine (start, interpreter, sprite builder, the decoded ops, the effect
actors' flag countdown and buffer copy) from the RE agent's verified reference (`effect_script_engine_v10.py`). It equals the reference on the party
Attack hit of all 78 characters at two parities, events and every changed word (`test/heap/effectEngine.test.js`, fixture from
`scripts/generateEffectEngineParity.py`). It runs on the simulator's heap state with byte-level knowledge (`EngineMemory`): an unwritten byte keeps its
knowledge, the placement / draw words are written unknown, a read of an unknown byte throws (`UnknownInput`), never a guess.

Not wired into the party Attack yet: the hit script's start frame is the missing input (the simulator's tick at the Attack's rolls and the real frame differ
by 73 / 47 / 71 / 76 / 71 for McDohl / Viktor / Flik / Luc / Hellion; ASK 9 asks the agent for the slot-1 walk and lunge of every attacker and the constant).
Then: drop `forgetMoveBlocks` and the Attack footprints' taint for an engine-run Attack, and check with the arena diff (vf scenarios). Enemy attacks need the
enemies' overlay data (only Crystal Core's is extracted).

**The game data is generated into the repo on purpose, for now** (`lib/Game/Heap/Engine/EffectData.js` by `scripts/generateEffectData.js`, about 200 KB of
character files up to their resource tables, main.exe / battle.bin script tables, Crystal Core's overlay). The user decided to keep it in this repo until the
heap work is done and to move it somewhere more appropriate then.

### 7d.1 What blocks running every party Attack on the engine: ordering (ASK 11 answer, 2026-11-12)

The engine runs a party Attack only when it ends the fight (no enemy move in the round). In other rounds the hit child's allocation (frame R + 48..77, R = the
simulator's tick at the Attack's roll + 2) lies amid the allocations of Crystal Core's move, but the model applies a whole enemy move at its start. The agent's
frame tables for Crystal Core's moves (`ask11_cc_move_frames_v10.json`, HUD repo), in ticks from A (the move's first allocation):

- Attack: A = H + 8 (H = the hit roll frame = the simulator's dispatch tick + 2, so A = tick + 10): +0 the 12 launch groups (36 allocs), +34 its hit child (52/80/80),
  +55 child freed, +98 the 12 groups freed. No lag frames in Attack rounds.
- Special (first and repeated are identical, 974 events): A = last turn-order poll + 3 = the simulator's tick + 3: +0 the 8-byte container, +2 the 148 B struct and the
  16384 B loader, +13 loader freed, +14 the whole bulk (466 allocs), +100 / +136 / +172 six 8-byte hit objects each (freed +132 / +168 / +204), +254 the bulk freed,
  +257 the container freed. In frames: 0..3 lag frames before the bulk, about 93..98 more from about A + 98 (not computable).
- A party hit child (alloc R + D, D = 74 / 48 / 72 / 77 / 73 for McDohl / Viktor / Flik / Luc / Hellion, freed 19-21 frames later) therefore falls after the Special's bulk
  (+14) and before its 8-byte hit objects (+100 plus lag) for Viktor and Flik, and near that boundary for the others; in an Attack round Viktor's child falls between the
  launch groups and Crystal Core's child.

What the fix needs (not done): the enemy move's events with their ticks (expand the agent's table onto `EnemyMoveEvents.js`, which has the same 78 / 974 events in
order), a scheduler that applies party and enemy events in frame order (engine attacks as steppable runs: `Engine.tick()` already is; commit the engine's words after
each step), the enemy move applied lazily (at the round's end or when a cast needs the state) so a party action that comes after it in call order can still interleave,
and the recorded images (`EnemyMoveImages.js`) applied after the merged events. Until then Attacks that do not end the fight keep the recorded footprint and its taint.

### 7d.2 The Special round with a party Attack (ASK 12 answer, 2026-11-12)

The agent recorded luc2 round 3 twice (`enemy_profiles/vfx_effects/luc2r3_trace/`: Viktor attacks vs everyone Defends; whole arenas at the round start, just before the
round-end menu rebuild, and at the prompt). Findings: Viktor's Attack (child at frame 87) moves the Special's start (container at frame 152 against 43 without it; the simulator's
A is 125) and, through the rover, its whole block layout (loader 0x8018b7e0 against 0x8018b890; the simulator reproduces that layout). So different Special blocks lie under the freed
menu object, and the menu rebuild keeps the top byte of every gradient word it writes (RGB 404040): the byte is the Special's last write there (atk 0x8018c814 80061720, c8f4 2e7f7f7f,
c9d4 7f7f0000, cbe4 66bb0020 ...; def 00). The simulator takes those words from the recorded image (the no-attack layout) because `objectDerived` is false once `partyAttackHistory` is
set (any kill or Attack): it gives 0x404040 where the game holds 80/2e/7f/00/66... Using the model's words instead (objectDerived = derived) fixes 0x8018c8f4 and cbe4 but regresses
luc1/3/5 and the vf rounds, so the guard needs its own derivation: which earlier events make the model's words not the dump's. The cast then reads those words through the loader pass
(e1 / fe / 02 / ff / fe are loader image bytes, ASK 12). A scratch script that diffs the simulator's round 3 against the agent's arenas is kept out of the repo; the recipe: luc2 flow with
Crystal Core at 5000 HP (1 HP in round 2), Luc's Flaming Arrow in round 2, Viktor Attacks in round 3, `diffArena(heap, { arena: atk_r3_prompt.bin, sidecar: { rover } })`; compare the menu
object's gradient words (0x8018c814, c8f4, c9d4, cac8, cbe4, ccc4, cf8c, cfa0, d51c). The prompt arenas include the menu dwell, so the menu packet buffers differ from the preconfirm fixtures.
Until then a party Attack in a Special round keeps the footprint and its taint. D (slot-1 start to child) is unchanged in Special rounds (McDohl 74, Viktor 48, Luc 77, Hellion 73) and Hellion's
K = 1 was a round-1 artefact (K = 2 with a visible poll); a child never falls inside the Special's lag window (slow members' children come after the whole Special, at frames 500 to 507).

Done after that (same day): the menu object's stale words come from the Special model whenever the Special's blocks are not where the recorded image had them (`sameLayout`
in `roundEnd`; before, only when nothing unmodelled had used the heap), and a word of the Special's loader buffer that the table of its own loader words does not hold is
unknown (the loader file's data, not the arena's word from before the decode). On the agent's atk round-3 prompt arena that gives the right top byte at 0x8018c8f4, c9d4 and
cbe4, and an honest unknown at c814, cf8c and d51c (it was 0x404040 claimed). Not done: the luc2 round 3 oracle's LIVE cast words (Black Shadow, 7 words, top bytes e1 / fe / 02 / ff / fe)
still disagree when the Attack is merged, so a party Attack in a Special round keeps the footprint and its taint (`_mergeAttacks` has the `beforeOnly` guard ready). Open question for
the agent: how the cast's loader decode leaves the low 24 bits of the menu object's gradient words (404040) and sets the top byte from the image.

ASK 13 answer (agent, same day): the cast's loader decode (FUN_800c3330, an LZ decoder) writes whole words: after it the menu words equal the loader image at (address - 0x8018b890)
(the loader buffer is at 0x8018b890 in round 4 with or without Viktor's Attack). The tops bytes e1 / 02 / ff / 3b / 80 / 08 of the words Black Shadow reads come from two later steps:
the Black Shadow particle blocks (432 B, ra 0x80120b14, and 1296 B, ra 0x80120b00) are allocated over the freed loader area at frame 451 and their init writes whole words, the low 3
bytes or the top byte only, per word (0x8018c814 e1eef101 -> e1000040, c8f4 80068012 -> 02068012, c9d4 800b800e -> 80000000, cac8 / d51c -> 3b000000, cbe4 b8 -> 08); then the round-end
rebuild writes 0x404040 into the low 3 bytes and keeps the top byte. So predicting those words means porting the Soul Eater block builders (around 0x80120a50) as the Special's were:
image at the buffer, the blocks' byte writes, their tick writes, then the rebuild (ASK 14 asks the agent for the field-by-field init).

Resolved the same day (ASK 13 / 14 and a comparison with the real castpre arena of the luc2 round 3 oracle): (1) a repeated Special's recorded image holds the words the recorded first Special
left, so when an earlier Special's blocks were not where its image was recorded (`specialShifted`, set when a party Attack moved them) the repeated Special comes from the model (with the
history's top bytes kept), (2) the kill-pad byte is not applied to a word a shifted Special has written whole, (3) a party Attack in a Special round whose whole run ends before the Special starts
is merged with it like in an Attack round (`_mergeAttacks(..., beforeOnly)`). Black Shadow's 40 scale words are now 0 wrong against the real castpre arena and the oracle passes untainted. Not
yet ported: the Soul Eater ring builder's word rules (ASK 14: `ask14_word_rules_v10.json`, FUN_80120a50: 36-byte G4 packets, 12-byte link records, an 84-byte header; params BS = Hell:
group rgb 0 / 0 abr 2, ring(10) rgb 0x20 / 0x50 abr 2, ring(36) rgb 0 / 0x7f abr 1; stale words = the loader image at (address - 0x8018b890)): needed to derive what a Black Shadow or Hell cast leaves
for the spells after it.

## 7e. The Soul Eater particle rings (ASK 14 answer, 2026-11-12)

`SoulEaterRings.js` ports the ring builder (FUN_80120a50): each of a Black Shadow / Hell cast's eight rings (the group's six latitude
segments, ring(10), ring(36)) is an 84-byte header plus, per draw buffer, n 36-byte POLY_G4 packets and n 12-byte link records. The
builder's bytes are exact (packet code byte, rgb copies, link `0xe1000000 | abr << 5`, header counts / pointers / constants); every
other word of a block keeps what it held, so those blocks are allocated with `applyEvents(..., { keep })` instead of being made unknown.
Verified against the agent's setup-frame arenas (`test/fixtures/heap/soul_eater_rings`, `soulEaterRings.test.js`): every word the model
knows in the blocks under the loader buffer is the game's, BS and Hell (3973 of 3973 each; the blocks below the loader buffer keep what
the arena held, which no recording reaches). Hell's group headers carry a different `+0x1c` (-178 for segments 1-5), observed, not derived.
After a cast the per-tick words (projected points, ordering-table links, group colours) are unknown (`ticked`).

### Slots left for the next cast (`SoulEaterSlots.js`)

A second Black Shadow / Hell reads its 80 stale words from the FIRST cast's 2804-byte struct (same pointer, 0x80190840): the 40 particle
slots' position, scale, velocity and life words (the agent's "rng" class). `blackShadowRand` / `hellRand` now simulate the whole slot state
(y and z with `sqrt0`, the spawn keeping the low 12 bits of the old words) and, with a `final` argument, run the handler's remaining
calls (BS: 10 calls down by the increment, 64 up, 59 plain; Hell: 271 plain) and hand back the slots and the accumulator;
`applySlotWords` writes them into the struct. Hell's wind-up is 96 calls (it was 95: the RNG count does not see the difference, the
final posX low 12 bits do). Checked against the agent's pair recordings (`soul_eater_pairs.json`, `soulEaterPairs.test.js`): the same
spell in the next round is complete and exact (80 of 80 words, RNG count, 3 seeds, both spells); across the two spells and after an
everyone-Defends round the words that are known are right (0 wrong in 24 cases), but 5-41 of 80 are known, so those predictions are
incomplete. `PAIR_TAINT` keeps the other spells (and Flaming Arrow, Explosion and Thor after either).

The words a cast writes into its struct are remembered (`slotWords`): a recorded menu-rebuild image over one of them is another run's cast
history (the Hell kill scenarios showed 5 of 80 known words wrong, the image's `0x05195f5f` against the live `0xfff45f5f`), so
such a word stays unknown after an image touches it, for good.

**The Attack in a round between (ASK 15 answer).** Crystal Core's Attack allocates 12 launch resources (52-byte header + two 40-byte packets,
the engine's own sprite builder through the Core overlay) and a child (52 / 80 / 80) over the struct's slots 9..39. `AttackLaunch.js` applies the
agent's per-word rules for the launch (E: the builder's exact words by party size; T: links, projected points and the header's placement words,
unknown; S: the pad halves, which keep what was there, and the unbuilt packet copies the built one whole) to an Attack that has no recorded
image. Known words of the second cast's 80 after a Defend round: BS->BS 23 -> 45, BS->Hell 13 -> 33, Hell->BS 5 -> 27, Hell->Hell 21 -> 41
(heap-only run: the draw buffer parity at the burst is not known there; 0 wrong in all 12 cases; the Battle path knows it). The child's blocks are
still wholly unknown (its S words are four pad halves), and the rest of the unknown words are the draws' xy / link words, which need the orb
controller's placement (slot-1 script 0x8006b14c, handler FUN_80017b04, controller FUN_8001874c; not in the engine).

**The particle spells after a Soul Eater cast.** Flaming Arrow, Explosion and Thor read the Soul Eater's ring blocks (the ring words the cast wrote, past
the menu stream: the rebuild's recorded image must not replace them, `slotWords` / the packet-block restore in `roundEnd`). Known words of the
residual lists (heap-only runs, 36 recorded pairs, 0 wrong): Flaming Arrow 17-19 of 20, Explosion 25-27 of 30, Thor 9-12 of 20, so they are no longer
tainted after either cast (the predictions stay incomplete: the unknown words are the draws' xy / links in the struct and rings). The cross pairs Black
Shadow -> Hell and Hell -> Black Shadow stay tainted: a Hell kill followed by a Black Shadow had two known words wrong (a scale word's top byte,
`0x05195f60` against `0x02195f60`, and an xy word).

**Why Black Shadow <-> Hell stay tainted (ASK 16 answer).** The two wrong words of a Hell kill then a Black Shadow are words of Crystal Core's Attack
launch groups, not of the Hell struct: a packet's pad half in the other buffer is a whole COPY of the built buffer's block (the builder's
`copy`), and a header's `+0x12` keeps the last draw's record xy of the slot under it. The recorded Attack image holds another run's pads, so when the
Attack comes from the image they are wrong (`AttackLaunch.js` has the copy rule for the no-image path). Restoring them after the image (a guard
over the pad words, the pre-move words and the draw buffer parity at the burst) fixed those two words and broke 13 other scenarios, so it is not
done; the taint stays until the images are replaced by the rules (ASK 15's launch rules need the first Attack's image gone too).

**Special words whose top byte is stale (ASK 18 classification).** 288 of the 293 tail-block gap words after a Special are the ring builder's colour words
(w3 / w5 / w7: rgb in the low 24 bits, the top byte the arena's before the Special). The Special model already computed them, but a word that
depends on an unknown never-written word was simply made unknown, with the arena's old value as the estimate. `specialEffectFrom` now keeps the
words whose flipped run differs only in the top byte as partial (low 24 bits the model's, the top byte the best estimate): the whole-arena diff's
gap in the free and menu kinds drops from 23,051 to 21,526 words (vf2 / vf3 tail block 293 -> 83, vf1 292 -> 4), 0 wrong. The rest of the gap
are the wrapper objects' header w2 / packet xy / links (1067 words) and the G4 systems' xy / links, which need the Special's per-object state at
its last draw (ASK 18: position, rotation, scale, last draw call, the camera of ASK 17, bucket heads) and a port of the Spr drawing code.

**Impact objects' header w2 (ASK 19).** FUN_801238d0 projects the object's position plus (120, 0, 0) through the Special's last camera
(ASK 17 constants), so an impact's header w2 is `(Y << 19) | (2 << 16) | ((X & 0x1fff) << 3) | 4` (checked on the 3 intact impacts of vf3 round 4;
`SpecialEffect.js`, given the rolls). The ring objects are redrawn from a trail (last draw L(g) = 184 for g = 0, 164 + 2g otherwise; the head at
L - 1, trail j at L + j) with a draw-time z, scale and shake per call that are not derived, and the packet xy words need the GTE corner path
(scale 3840 * res+0x14 >> 12, rotation z 1, width + 1): not ported. The agent also found that 48 of the 78 header-w2 and 269 of the 610 xy gap words
lie in blocks that were overwritten after the Special (the menu rebuild), so no Special rule can produce them.

## 7f. The generality oracle: Clay Doll (ASK 20, 2026-11-12)

A second battle (Clay Doll Lv44, screen 4/1/10, party L-fire-slow, 3 seeds; `test/fixtures/heap/oracle_clay_doll`, `oracleClayDoll.test.js`).
The simulator gets the first-prompt arena and nothing about the enemy (no image, no heap events of its Attack or Special, no taint). Its five spells
at the casts of rounds 2 and 3 (30 recorded casts, six contexts: Attack hit / no hit / Special): Flaming Arrow, Explosion and Thor 20 / 30 / 20 words known
and right, Black Shadow and Hell all 80 words right, with the struct pointer and the accumulator, complete. The recorded words are the same in
all six contexts: against this enemy the stale words come from the fight's own earlier heap (menu, loader), not from its moves.
What it took: one rule, taken from the real arenas, not from a Clay Doll image. The Fight menu freed at a round's start is allocated again at the same
pointers at its end and draws the same menu: the rebuilt blocks keep the words the menu held (`menuSnapshot`), in a round in which nothing modelled drew
scene primitives (the packet buffers' stream holds those); in another, only the words past the stream are restored (arena diff 0 wrong). Without it
Explosion's 30 words were unknown (the rebuild marked the blocks unknown). The RNG counts were not run (the start state's pre-cast rolls need
Clay Doll's AI), the words are what they follow from.
Clay Doll's Attack is in too (`ENEMY_MOVE_EVENTS.CLAY_DOLL`: Attack = the 52 / 40 / 40 resource and its 24 / 40 / 40 shadow, AttackHit adds the
52 / 80 / 80 spark; 14 of 14 recorded Attack rounds follow it): the hit result now reaches the heap (`resolveEnemyAttack` calls the move's start
once the result is known, `enemyMove(..., { landed })`), and played through `Battle` the arena after round 1 and 2 has 0 differing blocks, free memory
all right (7260 words) and no wrong word in the menu kind, for the seeds whose round is an Attack (`oracleClayDoll.test.js`; a round that is a Special is
not modelled: 20 wrong block-header words in the menu kind, the Special's payload over the allocator's links). `Battle` reproduces the recorded
move sequence for 2 of 3 seeds (the third, daa66d13, picks an Attack where the recording has the Special in round 2: not heap related).
A move without recorded events marks its round `unmodelled`, so the rebuilt menu's stream is not restored whole in it.
ASK 21 (more parties; `oracleClayDollFast.test.js`, 90 casts): Clay Doll against the fast L-fire party (the cast runs before its round's move) and the 4-member party
E-mcd-vik-luc-flik, casts in rounds 2-4 after the recorded moves (Attack hit / miss from the events, Special unmodelled): Flaming Arrow, Thor, Black Shadow and
Hell are complete and right in every cast; Explosion has all 30 words right and 24 of 30 known with moves replayed (all 30 with none): its words lie in the
menu's stream, whose words the rebuild restores only in a round without a move or a cast and only where both packet buffers hold the same word (a first-prompt
stream differs from the later ones in animated scene primitives: 147 wrong words in the Attack round's arena when restored whole). The recording found the
words do not depend on the move in any of the 9 move contexts per party, so these oracles do not yet exercise the moves; an enemy with a pool-sized Attack or a
multi-enemy group (Clay Doll group 9: 3 Red Elementals + Clay Doll) would. Rock Buster's casts are recorded without arenas, so not run.
ASK 22 (a four-enemy group; `oracleGroup9.test.js`, 90 casts): Clay Doll group 9 = three Red Elementals (slots 7-9) + the Clay Doll, both parties, every enemy
attacks every round. `ENEMY_MOVE_EVENTS.RED_ELEMENTAL` is Clay Doll's list (the spark is freed 21 ticks after, not 18: ticks not modelled here). Replaying each
round's four moves in the recorded order, one after the other, gives the arena at every round's end with 0 differing blocks and no wrong word in the free and menu
kinds, in every round whose four moves are Attacks (18 of 18 rounds without a Special; the Special rounds have 19 wrong block-header words, as before). The casts:
Flaming Arrow, Thor, Black Shadow and Hell complete and right in all 90; Explosion right, 17-30 words known. Only Explosion depends on the moves (one word of the
eleven that lie in the menu's stream differs between the move contexts; the other ten are static but not claimed in a round with moves). The moves overlap in time
in the game (an enemy's spark and the next enemy's launch fall in the same frame); one after the other gives the same layout at the round's end because every block
is freed by then, but an in-round cast would need the interleaving (ticks), as the Crystal Core path has it.
ASK 23 (Siren Lv53 x2, `oracleSiren.test.js`): `ENEMY_MOVE_EVENTS` / `ENEMY_MOVE_EVENT_TICKS` for SIREN_1 / SIREN_2 (Attack: five 52-40-40 + 24-40-40 pairs, four freed at +11, one at +21, a hit
builds the spark at +23, freed at +44; Special: 20 bytes, the bulk of 84 blocks at +22, freed at +221 and the 20 bytes at +224). Two monsters' moves overlap, so an enemy
move whose table has no anchor and a given `tick` (the frame of its first allocation) is held in `pendingMoves` and applied with the round's other moves, group by group in
tick order (`flushEnemyMoves`: at the round's end, before a cast, before a prediction). Check: round 1 of L-fire-slow seed 3c6ef362 allocates and frees exactly the 118 + 118
recorded pointers. What breaks the rest: status icons (ASK 24: op 40 of the hit script rolls a 10% status per member in a frame after the six damage rolls, and an
(52, 40, 40) icon is built, never freed, for each member that gains it; also an Attack hit once at the spark frame): they change the layout, so the next cast's loader and
every spell's words move. ASK 24's rule is in (`enemyMove(..., { statusRolls })`, `ENEMY_STATUS_ICON`, `statusHeld`): after the six damage rolls a second frame of six rolls
(`((rand * 100) / 0x7fff) % 100`, party order); a roll below 10 on a member without the status builds a never-freed (52, 40, 40) icon, before the bulk's frees of the same frame.
Round 1 of L-fire-slow 3c6ef362 then allocates and frees the recorded 121 + 118 pointers. The 90 Siren casts (single round from the real arena, harness not kept as a test: the
move subset of a slow cast comes from `allocsBeforeCtx`): Flaming Arrow, Thor, Black Shadow, Hell 0 wrong words in all 90 (known 28-44 of 180 per spell: the Special's ring
and object words are unknown), Explosion 3 wrong of 475 known (three cells, probably the Attack hit's 10% status icon, not modelled). The Attack hit's own status roll at the spark frame is not built.
ASK 25 (the Siren Special's rings, `applySirenRings` in `SoulEaterRings.js`, hooked at the bulk's group of the Special's pending move): all four rings are the builder with the same
parameters (24 segments, rgb0 (0x64, 0x90, 0), rgb1 black, abr 1; a segment's colours do not depend on its index), so after the Special the packets' init words, the link
records (w0 = their own packet's address, w1 `0xe1000020`, w2 0) and the headers' owner words are known (2384 words written; against the recorded first-Special timeline at frame
320: 825 exact, 576 partial with the stale top byte exact, 0 wrong); the packets' links and projected points (T) and the headers' activity and scale words stay unknown (the GTE
quad xy and the bucket heads are not ported). With it the 90 Siren casts: Flaming Arrow 108 / 180 (slow) and 84 / 180 (fast) known, Thor 116 / 88, Black Shadow and Hell 312 / 276 of 720,
0 wrong words in the four, Explosion 3 wrong of 475 known (the same three cells). ASK 26 (`RingUpdate.js`, the ring update FUN_80120d08 as the agent ported it): `ringTick` gives a ring's per-segment screen points and bucket depth; the agent's check value
(ring segment 0 at its last tick, scale 0xfc1: xy `00c50061 00b80091 005d0041 0056005f`, depth 251) is a test. `applySirenRings(..., { bufferLast })` writes the last two ticks' packets
(xy and the links to a previous record of the same ring; the first packet of a bucket links to the empty marker or another system's primitive: unknown) and matches the recorded first
Special at frame 320 exactly (1656 exact words, 576 exact but the top byte, 0 wrong). ASK 27: the rings' headers are the same in every Special except w8 (position y) = the CASTER's actor y (slot 7: +0x32, slot 8: -0x32; the 16 bulk rolls do not set them; the agent
reproduces 4 of 4 Specials' xy words exactly this way), so the quads are on: `enemyMove` for SIREN_1 (slot 7) / SIREN_2 (slot 8) passes `casterY` and the draw buffer of the rings' last tick
(`idx0 + the bulk's frame + 127`). The 90 Siren casts: 0 wrong words in Flaming Arrow, Thor, Black Shadow and Hell (known: Flaming Arrow 169 / 113 of 180, Thor 180 / 120 of 180, i.e.
Thor complete against the slow party, Black Shadow 526 / 382 and Hell 521 / 381 of 720, slow / fast); Explosion 3 wrong of 475 known as before. (Before the caster: 35 wrong, ring 2's y
was the other caster's.) The header's w0 = 0 and scale 0x1000 after the last draw are in (checked in the same timeline).
ASK 28 (the closing menu, `closeMenuStream` / `castState`): the two 6000-byte packet blocks are not drawn again during a round, so a cast reads three overlaid draws: the prompt's stream, the draw after
Free Will is chosen (window 2's 21 text cells replaced by four LINE_F2 packets at stream offset 24 K + 0, 16, 32, 48, K = the prompt's text cells - 21; nothing after them, the old cells and
the cursor stay where they were) and the F1 draw (four LINE_F2 at offsets 0..63). The packets' second words are 0x40808080, their tag and points are not known: the words a cast reads are
the prompt's, with those overlaid (the prompt's cell count from the cursor TILE packet's place in the block). That was the three Explosion words (0x20f in the stream vs the real 0x80).
With it the 90 Siren casts have 0 wrong words in all five spells (`oracleSiren.test.js` has the daa66d13 round-3 cast of the slow party: Explosion and Thor complete). The words are given to
the predictions on a copy of the state (`castState`), not written into the heap, since the next prompt's draw rewrites the stream.
A guard against a bug this exposed: the rebuild's restore of the casts' words (`slotWords`) must not write over
the allocator's header words of the rebuilt blocks (it overwrote a block's size word with a ring link record and broke the next round's free walk).
Siren through `Battle` (2026-11-13). Compared with the recording (two Lv53 Sirens = two `SIREN_2`, the slow party's McDohl and Luc at SPD 1, every living member topped up to max HP - 1 before each round as the
recording script does): the battle's roll groups equal the recorded ones (frame = tick + 2) and the party's HP after the round is the recorded one in 35 and 36 of 36 rounds (the one difference: a missed
Attack that waits behind the other Siren's Special has its last two roll groups a tick late in the battle, which the heap does not see). So `Battle` drives the heap: `enemyMove(..., { dispatchTick, slot })` for an Attack
(the first allocation's frame = the dispatch tick + `ENEMY_START_OFFSET`: Siren 31, Clay Doll and Red Elemental about 40), and the Siren's Special (`heapAtApply`) tells the heap when its damage lands: it started
219 ticks before that tick, and the members that gained Silence in the battle's own status rolls get an icon (`statusGained`; `slot` 0 / 1 puts the rings at the caster's y +0x32 / -0x32, so two Sirens of the same key
work). Played by `Battle` the 18 recorded rounds of rounds 1-3 start every move on the recorded frame, have the recorded layout (0 blocks differ, 0 wrong word in free memory) and round 1 of 3c6ef362 (slow)
allocates and frees the recorded 121 + 118 pointers (`oracleSiren.test.js`).
The next prompt's menu from the party's HP (`drawMenu`, 2026-11-13). `Battle` gives the round's end the party's HP and the living enemies; the heap reads the names from the old prompt's text cells (`readMenuNames`) and writes
the next prompt's three windows' text and attributes and the 2D stream into the rebuilt blocks with `MenuStream` (a text cell with a blank has no packet, so the stream's length follows the HP digits); past the
stream's new end the words are the old ones with the closing menu's LINE_F2 packets over them. The closing draws are also in the heap from the round's start (`streamOverlay`: they stay in a block that the rebuild does not
reuse), the packet blocks' pointers follow the rebuild, and the words of an old packet block that was freed are not known (the game's draws keep writing them). Played by `Battle` the Siren rounds 1-3 (L-fire-slow 3c6ef362,
`oracleSiren.test.js`) and the other five oracle runs have the recorded arena at every prompt: 0 differing blocks, 0 wrong word in free memory, 0 wrong in the menu (before: up to 158 wrong menu words). Not used for a round with a
recorded Crystal Core move or a party action (an Attack's or a cast's sprites own the stream's start, and the Crystal Core recordings compare against the `preconfirm` dumps, which hold several frames of the closing menu over the stream's
start: the whole-arena ratchet there moved by one menu gap word, +1 in five Special rounds, -2 in the first rounds: the closing lines are in the heap now, the old known word was right by luck).
The agent's best next oracle: Siren Lv53 x2 (9/49/2, group 4), where all five spells' words and the Soul Eater struct depend on the moves (5 distinct sets in 6 contexts).
Still not generic: the Clay Doll moves themselves (Attack events with ticks, the shadow resource builder, the child's handler 0x8001409c: ASK 20).

Still open here: the other-spell reads (a Hell struct read at a Black Shadow's slot offsets lands on the packets' words: links and
projected points, which need the camera), the Defend round in between (its Attack overwrites part of the struct; the known part is
right but conservative), and Flaming Arrow / Explosion / Thor after a Soul Eater cast.

## 8. Where to read

In `Suikoden-Bizhawk-HUD/notes/` (all `2026-11-0x_vfx_*.md`; the index lists them): `working_protocol`, `findings_index`,
`simulator_status` (newest sections last), `corrections`, `effect_catalogue`, `move_to_effect`, `generic_effects`, `spells_decode` and the
per-spell notes (`spell_thor`, `spell_explosion`, `spell_soul_eater`, `spell_others`), `kill_round`, `menu_draw`, `menu_rebuild`,
`special_*`, `party_actions_code`, `party_actions_events`, `VFX_Pool_Investigation.md`, `simulator_generality_audit`. Data and models in
`enemy_profiles/vfx_effects/` (`*_v10.json`, `spell_*_model.py`), tools in `scripts/heap/` and the Lua recorders (`SpellCastTrace.lua`,
`SpellCastPoison.lua`).

In this repo: `lib/Game/Heap/*.js`, `lib/Game/Magic/SpellRNG/*.js`, `lib/Game/Battle/` (`PartyActions.js`, `EnemyActions.js`, `Battle.js`
call into `VfxHeap`), `scripts/generate*.js` (code that regenerates the data files from the HUD repo), `test/heap/` and `test/fixtures/heap/`
(recorded oracles). Generated data files start with "Generated by scripts/... Do not edit"; change the generator.
