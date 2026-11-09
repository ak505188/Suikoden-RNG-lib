# Heap dumps (scripts/HeapDumpExport.lua, 2026-11-07)

`<name>.bin` is the raw 0x18000-byte arena image (RAM 0x80182000 ..) exactly as `scripts/heap/HeapDump.capture` returns it; `<name>.json` is the sidecar:
`build` (v10 / v11), `rover`, `menuState`, `battleBlocks` (the three roots `HeapPrediction.fightMenuFrees` needs), `fightMenuFrees` (the 44 payload pointers freed when the round starts, in
order), `freeListRaw` (the dump as it stands) and `freeListAfterMenuFrees` (after those frees, before any loader allocation) as `[address, units of 8 bytes]` in `HeapModel:freeList()` order,
`moment`, `fight`, `party`, `round`; Neclord dumps also `round1HeapAllocs` / `round1HeapFrees`.

Two moments per fight and round: `_prompt` (the Fight prompt, as soon as the menu is ready) and `_preconfirm` (after Free Will and the actions are set, before confirmRound: where
`scripts/CrystalCoreFlamingArrowWords.lua` and `scripts/TestHeapParticles.lua` take the dump their predictions were validated on). The free lists are identical for both moments.

| Dump | Build | Free list after the menu frees |
|---|---|---|
| `crystal_core_L-fire_r1_*` | v1.0 | 0x80182000 x 6930 units, 0x8018fe30 x 673 (two blocks; the rover is 0x8018fe30) |
| `crystal_core_L-fire_r2_*` | v1.0 | same two blocks (after kill_spell round 1: kill + revive, seed 0x9e3779b1 + 1) |
| `magicians_island_g1..g4_*` | v1.0 | one block at 0x80182000: 5951 / 5879 / 5915 / 6023 units |
| `spellduration_*` | v1.1 | one block at 0x80182000: 7363 units |
| `neclord_open12345678_r1_<seed>_*` | v1.1 | 0x80182000 x 6889 + 0x8018f7e8 x 646; seed cc623a9b (129 allocs, 126 frees in round 1: the single-target move that splits the heap): 6869 + 646 |

Words predicted from these dumps with `HeapPrediction.predictParticles(dump, "FlamingArrow")`: crystal_core_L-fire_r1_preconfirm { d56, 8a0, 8a0, 0, 0, 7e, 0 x14 } (live: identical in all 20 seeds),
crystal_core_L-fire_r2_preconfirm { 2e9, 2e4, 443, 370, 4c1, c7c, 0 x14 } (seed 0x9e3779b1; live round-2 words are per seed, see enemy_profiles/enemies/crystal_core_lv60_hp5000/heap_flaming_arrow_words_round2.txt),
magicians_island_g1_preconfirm { 0 x17, 4e, b34, 63 }.
