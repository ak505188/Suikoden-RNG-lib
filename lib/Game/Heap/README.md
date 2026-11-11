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

- Census (step 1), pending.
- Rune spells: 3 of 12 families have byte-exact word models (Healing Wind, Clay Guardian, Earthquake); the other 9 need decoding and ports.
  The agent's pre-cast arenas for all rune tags (2550 files, `spell_casts_others_castpre/`) are the oracle.
- Not decoded: physical Unites, deaths, formation moves, most enemy moves other than Crystal Core's, other parties / enemies / formations.
- `MenuStream` is not wired into the heap: the stream end and words assume the first prompt's text, so an HP change that alters the digit
  count (or a name with other glyphs) gives wrong words without a flag. This is a silent-error risk.
- Hellion in the fast parties (round 3 casts) does not match the plain-cast constants (agent's guess: draw buffer / OT state after the
  Special).
- Flaming Arrow after a Flaming Arrow, Explosion pair, turn-order parties are exact only for the recorded orders.

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
