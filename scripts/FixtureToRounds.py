#!/usr/bin/env python3
"""Converts a Suikoden-Bizhawk-HUD enemy fixture (enemy_profiles/enemies/<slug>/sim_fixture.json,
see that repo's enemy_profiles/SIMULATOR.md) into the rounds data the battle tests read
(test/fixtures/enemies/<slug>_rounds.json): every run, enemy slots mapped to simulator keys, one
seed entry per seed with its rounds in round order, 1-based combatant indices throughout.

Per round: rngAtConfirm / rngAtRoundEnd / hpAtConfirm / frames / ended,
turns = turn_clock as [actor, start, end, stored_target, move],
hpChanges = hp_changes as [frame, combatant, hp_delta],
enemyTurns = [actor, start, rng0, randCalls, stored_target, move] for the decision replay.

A turn whose path was classified "Death (not a move)" (the enemy died mid-turn) is recorded with
the move it had committed to before dying (recorded move, i.e. its stored decision), since the
simulator models the attack and then the death.

Usage: FixtureToRounds.py <slug> <key-per-slot> [fixture-root]
  <key-per-slot> is the simulator ENEMY_KEYS value for each enemy slot, in slot order
  (e.g. BANDIT_RED,BANDIT_RED,BANDIT_YELLOW for bandit_lv7_hp55).
  [fixture-root] defaults to ../Suikoden-Bizhawk-HUD/enemy_profiles/enemies next to this repo.
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
FIXTURE_ROOT = (
    pathlib.Path(sys.argv[3])
    if len(sys.argv) > 3
    else ROOT.parent / "Suikoden-Bizhawk-HUD" / "enemy_profiles" / "enemies"
)

slug = sys.argv[1]
keys = sys.argv[2].split(",")
fixture = json.load(open(FIXTURE_ROOT / slug / "sim_fixture.json"))


def convert(run):
    party_len = len(run["party_characters"])

    # slot -> simulator key, from the slot order recorded in the fixture
    names = {}
    for rd in run["rounds"]:
        for t in rd["enemy_turns"]:
            names[t["actor"]] = t["enemy_name"]
    slots = sorted(names)
    assert len(slots) == len(keys), f"{len(slots)} enemy slots, {len(keys)} keys"

    seeds = {}
    for rd in run["rounds"]:
        rounds = seeds.setdefault(rd["seed"], [])
        # a turn whose path is a death is recorded with the move the AI committed to before dying
        move_of = {t["actor"]: ("Attack" if t["move"] == "Death (not a move)" else t["move"]) for t in rd["enemy_turns"]}
        turns = [[t["actor"], t["start"], t["end"], t["stored_target"], move_of[t["actor"]]] for t in rd["turn_clock"]]
        enemy_turns = [
            [et["actor"], et["start"], et["rng0"], et["rand_calls"], et["stored_target"], move_of[et["actor"]], et["frames"]]
            for et in rd["enemy_turns"]
        ]
        rounds.append(
            {
                "round": rd["round"],
                "rngAtConfirm": rd["rng_at_confirm"],
                "rngAtRoundEnd": rd["rng_at_round_end"],
                "hpAtConfirm": rd["hp_at_confirm"],
                "ended": rd["ended_battle"] is not None,
                "turns": turns,
                "hpChanges": [[h["frame"], h["combatant"], h["hp_delta"]] for h in rd["hp_changes"]],
                "frames": rd["frames"],
                "randTimeline": rd["rand_timeline"],
                "enemyTurns": enemy_turns,
                "counters": [[c["frame"], c["attacker"], c["countered_by"], c["damage"]] for c in rd["counters"]],
            }
        )
    for rounds in seeds.values():
        rounds.sort(key=lambda r: r["round"])
    return {
        "party": run["party"],
        "characters": run["party_characters"],
        "enemies": [keys[i - party_len - 1] for i in slots],
        "seeds": [{"seed": s, "rounds": seeds[s]} for s in run["seeds"]],
    }


runs = [convert(run) for run in fixture["runs"]]
seed_count = sum(len(r["seeds"]) for r in runs)
out = {
    "source": f"Suikoden-Bizhawk-HUD enemy_profiles/enemies/{slug}/sim_fixture.json "
    f"(v1.0, {seed_count} seeds across {len(runs)} party: {fixture['fight']['composition']})",
    "runs": runs,
}
path = ROOT / "test" / "fixtures" / "enemies" / f"{slug}_rounds.json"
path.write_text(json.dumps(out, indent=1) + "\n")
print(path, sum(len(s["rounds"]) for r in runs for s in r["seeds"]), "rounds")
