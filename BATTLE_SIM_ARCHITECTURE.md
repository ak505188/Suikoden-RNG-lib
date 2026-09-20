# Battle Simulator: Brute-Force + Fixed-Plan Architecture

## Context

The goal is a 100%-accurate Suikoden 1 battle simulator that can either (a) exhaustively
search all permutations of party action choices across multiple turns to find outcomes
matching some criteria, or (b) execute one specific, user-supplied action plan. Turn 1
alone can have on the order of 100 legal action combinations, and combinatorics compound
multiplicatively across turns (`100^5` for a 5-turn fight), so the search strategy and
state-representation choices matter as much as the battle engine itself.

The battle engine (`lib/Game/Combat/Battle/`) is mid-implementation: `Character.js` is
solid, `Enemy.js` currently has a syntax error (`selectTarget` is unterminated), `Battle.js`
is a bare constructor with no `run()`, `Actions.js` is an empty stub, and `TurnOrder.js`
doesn't exist yet — but `test/zombieDragon.js` and `test/characters.js` already pin down
the exact expected algorithms (turn-order roll formula, damage formulas, `Battle.run()`
signature) as a binding spec. `scripts/zombieDragonBattleSearch.js` is an existing
prototype of exactly this kind of permutation search, currently broken (stale imports,
calls APIs that don't exist), but its shape (pluggable scorer, a turn-count cutoff for
which turns get varied) is worth evolving rather than discarding.

This document captures the architecture worked out in discussion, to guide the actual
implementation (not written yet — this is a design reference, not a diff).

## Core idea: one engine, two drivers

Both "run a fixed plan" and "brute-force search" should share the same underlying step
function. The only difference is where each turn's committed actions come from:

- **Fixed-plan mode**: a lookup that always returns exactly one concrete action per
  (character, turn).
- **Search mode**: a lookup that returns a *set* of candidate actions to branch over for
  that character/turn.

A single **strategy** function shape covers both:

```
strategy(character, turnIndex, state) -> Action | Action[]
```

"Filters" fall out of this for free — a filter is just a strategy that narrows the
candidate set (e.g. "only vary Cleo's action," "default to attack after turn 3," "exclude
casting a spell with 0 charges remaining"). Targeting is not a special case either: an
`Action` already encodes its target (e.g. `{type: 'attack', targetId}`), so "attack enemy
1" vs "attack enemy 2" are just two different candidates from the same strategy — the
search algorithm itself stays agnostic to what's inside an `Action`.

## Search structure: turn-by-turn DFS with mutate + undo

Reject the existing prototype's approach of pre-generating the full multi-turn choice
vector up front (`ACTIONS^slotCount`) — legal actions depend on state that's only known
after simulating earlier turns (who's died, remaining MP, remaining valid targets), so
candidates must be generated turn-by-turn, not materialized in advance.

Recursive shape:

```
search(state, turnIndex, path):
  if terminal(state):
    if allEnemiesDead(state):
      record({ score: score(path), path })
    return   # party wiped or max-rounds reached: discard, no recording

  for each committed-action-combination across this turn's eligible characters
      (per-character candidates from strategy(character, turnIndex, state);
       an already-dead character contributes no candidates):
    apply the turn in place (mutate HP/MP/status, advance RNG per the README's
      per-turn/per-action rules, push a TurnRecord onto `path`)
    search(state, turnIndex + 1, path)
    undo the turn (restore HP/MP/status, restore RNG index, pop the TurnRecord)
```

State is mutated and restored in place rather than cloned per branch — cheap compared to
deep-copying full battle state at every node, and matches the RNG class's existing
`clone()`/`cloneKeepIndex()` fork/restore idiom. The turn log (`path`) rides along on the
same push/pop rhythm as the state undo, so there's no separate bookkeeping to keep it in
sync.

Terminal handling is deliberately narrow for v1: a win records `{score, path}`, anything
else (party wipe, max-rounds cutoff) is discarded. This matches "we're only recording
successful wins" — could become a pluggable outcome-classifier later if other outcome
types ever need recording, but not needed now.

## Scoring

`score(turns: TurnRecord[]) -> number | object` is supplied per battle, evaluated once per
completed win against the *entire* turn history — not memoized, not evaluated
incrementally — because win criteria may only be checkable once the whole battle is known
(e.g. "did anyone drop below 10% HP at any point," not just the final state). This is a
deliberate departure from a purely state-based/Markovian scorer, and is the reason
deduplication is out of scope for v1 (see below).

## Explicitly out of scope for v1 (design notes for later)

**State deduplication / transposition table.** Two branches can converge on identical
(RNG state, all HP, all MP) — most commonly when a character dies before their turn comes
up, making their committed action moot regardless of what it was. This is a real
optimization opportunity, but it interacts badly with "record every win" + path-dependent
scoring: naively collapsing to one "representative" predecessor (e.g. picking whichever
path took the fewest/fastest actions) would silently drop every win only reachable through
the discarded predecessor, each of which could legitimately score differently since
scoring depends on full history. When this gets built, the design needs to be "cache the
set of win-outcomes reachable from a given state, expressed relative to that point
forward, then splice every distinct incoming history onto that cached set" — this still
avoids redundant re-simulation of a shared future, it just doesn't collapse the count of
recorded wins. A plain "keep the cheapest predecessor" tie-break is *not* correct here and
should not be the eventual design.

**Branch-and-bound pruning / worker-thread parallelism.** Deferred until the base engine
and DFS enumeration are proven correct; the strategy/scorer interfaces above don't need to
change to add either later (pruning is a predicate checked during branch generation;
parallelism is partitioning the top-level turn-1 candidates across workers, each with its
own forked RNG).

**Streaming/incremental persistence of results.** A single write at the end of a full
search run is sufficient for now. Lightweight progress logging (e.g. periodic
nodes-visited / wins-found / current-depth output) is wanted to confirm a long search
isn't stuck, but doesn't need to be a full observability system.

## Existing specs that any implementation must honor

- `TurnOrder.selectNextActor(fighters, rng)` (currently missing, pinned by
  `test/zombieDragon.js`): each not-yet-acted, not-busy fighter rolls
  `SPD*10 + (rng2 % 10 - 5)`; highest wins; one RNG roll consumed per eligible fighter per
  pick.
- `Actions.resolveAttack`/`resolveMagicAttack`/`applyDefend` (currently stubbed): damage
  formulas already pinned by tests (`ATK - ARM + rng.next().calculateDamageRoll(...)`,
  the MGC-vs-MGC magic variant, and defend halving/truncating toward zero).
- `Battle.run(maxRounds)` needs to exist, taking a strategy/`actionPlan` and returning
  `{rounds, winner, log, rng}`.
- README.md's RNG-advancement rules (turn start advances RNG by 1; each action advances it
  by the count of fighters not yet acted, before that fighter's action resolves; spell
  casts consume separate, sometimes large and non-fixed amounts of RNG) are a hard
  constraint on both the engine and the mutate/undo RNG restore logic — any discrepancy
  here breaks determinism for every downstream permutation.
- `lib/Game/Combat/Battle/Enemy.js` has a syntax error (`selectTarget` method body is
  unterminated) that blocks importing the file at all; needs fixing before any of the
  above can be exercised.

## Verification approach

- Reproduce the existing `test/zombieDragon.js` fixture exactly (turn order, HP, and final
  RNG state after 3 rounds) once `Battle.run`, `TurnOrder`, and `Actions` are implemented —
  this is the existing regression oracle for engine correctness.
- Exercise fixed-plan mode by running one explicit action plan through `Battle.run` and
  confirming the returned log matches manual expectations for a small, hand-checked
  scenario.
- Exercise search mode on a small, fully-enumerable case (e.g. 2 turns, 2-3 actions per
  character) and manually verify every recorded win's score against the full turn log, to
  confirm the DFS mutate/undo restores state correctly between branches (a common bug
  class: a branch "leaking" un-restored state into a sibling branch).
