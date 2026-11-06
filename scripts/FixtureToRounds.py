#!/usr/bin/env python3
"""Converts a Suikoden-Bizhawk-HUD enemy fixture (enemy_profiles/enemies/<slug>/sim_fixture.json,
see that repo's enemy_profiles/SIMULATOR.md) into the rounds data the battle tests read
(test/fixtures/enemies/<slug>_rounds.json): every run, enemy slots mapped to simulator keys, one
seed entry per seed with its rounds in round order, 1-based combatant indices throughout.

Per round: rngAtConfirm / rngAtRoundEnd / hpAtConfirm / frames / ended,
turns = turn_clock as [actor, start, end, stored_target, move],
idleTimerT0 = [actor, start, idle_timer_t0] per turn that carries it (Holly Spirit's Command),
idleCycleWait = [actor, start, wait] per turn that carries idle_cycle_wait (Ghost Armor; the true wait, see ghost_wait),
turnOrderInputs = turn_order_inputs as [frame, combatant, action_tag, busy] (when recorded),
partyActions = party_actions as recorded (type.slot.target; 1.0.0 = Defend, 0.0.N = Attack combatant N),
hpChanges = hp_changes as [frame, combatant, hp_delta],
bucketAtRoundEnd / sleepAtRoundEnd = per party member, whether combatant_rec +0x4a bit 0x10 (Bucket) /
0x20 (Sleep) is set at the round end, balloonAtRoundEnd = its Balloon stage (byte 0x02: 1, 0x06: 2),
enemyTurns = [actor, start, rng0, randCalls, stored_target, move] for the decision replay.

A turn whose path was classified "Death (not a move)" (the enemy died mid-turn) is recorded with
the move it had committed to before dying (recorded move, i.e. its stored decision), since the
simulator models the attack and then the death.

Usage: FixtureToRounds.py <slug> <key-per-slot> [fixture-root]
  <key-per-slot> is the simulator ENEMY_KEYS value for each enemy slot, in slot order
  (e.g. BANDIT_RED,BANDIT_RED,BANDIT_YELLOW for bandit_lv7_hp55). For a fixture whose runs fight
  different groups, <HP>=<KEY> pairs instead (e.g. 80=HOLLY_BOY_2,350=HOLLY_SPIRIT): each run's slots
  are keyed by their HP at the first confirm.
  A fixture whose runs fight different groups can also name the keys by enemy name (NAME=KEY pairs, e.g.
  Nightmare=NIGHTMARE,"Red Slime"=RED_SLIME): each run's slots then follow its composition ("Red Slime Lv27 x3,
  Nightmare Lv32"; a run without one has the fixture's own).
  [fixture-root] defaults to ../Suikoden-Bizhawk-HUD/enemy_profiles/enemies next to this repo.
"""
import json
import re, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
FIXTURE_ROOT = (
    pathlib.Path(sys.argv[3])
    if len(sys.argv) > 3
    else ROOT.parent / "Suikoden-Bizhawk-HUD" / "enemy_profiles" / "enemies"
)

slug = sys.argv[1]
keys = sys.argv[2].split(",")
keys_by_hp = dict(k.split("=") for k in keys) if "=" in keys[0] and keys[0].split("=")[0].isdigit() else None
keys_by_name = dict(k.split("=") for k in keys) if "=" in keys[0] and keys_by_hp is None else None
fixture = json.load(open(FIXTURE_ROOT / slug / "sim_fixture.json"))


def normalise_move(move):
    """The simulator's names for moves the fixture labels with their script: a Flying Squirrel's own
    turn is the plain Attack; the Beast Commander's Command and its Sleep attack."""
    if move.startswith("Flying Squirrel"):
        return "Attack"
    if move.startswith("Skip"):
        return "Skip"
    if move.startswith("Roulette pick"):  # the Nightmare's three outcomes, told apart by the fixture (turn length, hit count)
        return {"0": "Heal", "1": "Long hit", "2": "Short hit"}[move[len("Roulette pick ")]]
    if move.startswith("Command"):
        return "Command"
    if move.startswith("Attack (custom script"):
        return "Sleep"
    if move.startswith(("Attack (throw", "Attack (punch")):  # the Strong Arm's two scripts; the sim picks one from the enemies' busy flags
        return "Attack"
    if move.startswith("Attack (generic"):
        return "Attack"
    if move.startswith("Counter-hit reaction"):  # the Oannes' Attack, whose own hit reaction ran after a counter
        return "Attack"
    if move.startswith("Sunshine"):  # the Sunshine King's only move: "Sunshine (hits all six members)"
        return "Sunshine"
    if move.startswith("Special"):
        return "Special"
    if move.startswith("Kobold Lv20"):  # the wm2 Kobolds' labels name the hp and the cut-short length; "special" is the hp50 mage's
        return "Special" if " special" in move else "Attack"
    if move.replace(" ", "").startswith("RobotSoldier"):  # "Robot Soldier hp160 Attack in group 3 ...": the plain generic Attack
        return "Attack"
    if move.startswith("Multi-hit"):  # the Devil Armor's three-member hit
        return "Multi-hit"
    if move.startswith("Ghost spirits"):
        return "Ghost Spirits"
    if move.startswith("Holly Boy "):  # "Holly Boy Flee (cut short ...)": the label names the script path
        return move.split(" ")[2]
    return move


def busied_member(timeline):
    """1-based party member whose busy byte first reads 8 in a turn's party_state_timeline (the member
    a move that doesn't store its target, +0x49, picked)"""
    prev = None
    for entry in timeline.split(";"):
        members = [m.split(".")[2] for m in entry.split(":")[1].split(",")]
        if prev is not None:
            for i, (a, b) in enumerate(zip(prev, members)):
                if a != "8" and b == "8":
                    return i + 1
        prev = members
    return 0


def game_order(run):
    """party_characters in the order the game lists the party (combatants 1..n). The party JSON files are
    shared by every enemy and not always in that order (S-hit and L list Hellion before Tengaar; the game
    has Tengaar 5th, Hellion 6th). The recording gives the game's order twice: each turn's party_levels and
    hp_at_confirm (max HP - 1). Members are matched on both."""
    chars = list(run["party_characters"])
    first = run["rounds"][0]
    levels = next((t["party_levels"] for t in first["enemy_turns"] if t.get("party_levels")), None)
    hp = first["hp_at_confirm"][: len(chars)]
    ordered = []
    for i in range(len(chars)):
        match = [c for c in chars if (c["stats"]["HP"] - 1 == hp[i] or (hp[i] == 0 and c["HP"] == 0)) and (levels is None or c["LVL"] == levels[i])]
        if not match and levels is not None:
            # a run that sets the party's HP itself (Slot Man's hplevels: 100..998): the level alone
            match = [c for c in chars if c["LVL"] == levels[i]]
        assert match, (run["party"], i, hp[i], levels and levels[i])
        ordered.append(match[0])
        chars.remove(match[0])
    return ordered


# the Slot Man's outcome from its turn length (the fixture labels every turn "Slot F"): base length, name
SLOT_OUTCOMES = {"Slot B": 183, "Slot D": 303, "Slot C": 292, "Slot E": 346, "Slot A": 356, "Slot F": 430}


def slot_outcome(rd, t):
    """The Slot Man's real outcome and its recorded wait. The turn is base + wait long, wait 0-3 (C, E, F, A;
    D and B never wait), plus 1 when the first scan missed (the rolls then start a frame later, which the
    sim's AI tick reproduces)."""
    et = next(e for e in rd["enemy_turns"] if e["start"] == t["start"] and e["actor"] == t["actor"])
    shift = min(int(k.split(":")[0]) for k in et["rand_timeline"].split(";") if int(k.split(":")[0]) >= 30) - 36
    length = t["end"] - t["start"] - shift
    for name, base in SLOT_OUTCOMES.items():
        if base <= length <= base + 3 and not (name == "Slot A" and length > 358) and not (
            name == "Slot E" and length > 349
        ):
            return name, length - base
    raise AssertionError((rd["seed"], rd["round"], t, length))


def ghost_wait(rd, t):
    """The Ghost Armor's idle_cycle_wait as the simulator's input: the frames its first hit is delayed. The
    fixture value is turn frames - 93: exact with 2 or 3 targets, 2 low with one (the turn is 2 frames
    shorter), and meaningless in the busy run (the turn started after the Ghost Armor's own hit reaction),
    where it is read off the first hit instead: hits are at 44 + wait + {1, 47, 0} for list slots 1, 2, 3."""
    et = next(e for e in rd["enemy_turns"] if e["start"] == t["start"] and e["actor"] == t["actor"])
    if et["path"] != "ce08fa3d":
        return t["idle_cycle_wait"] + (2 if et["hits"] == 1 else 0)
    first = min(int(h.split(":")[0]) for h in et["damage_timeline"].split(";"))
    return first - (44 if et["hits"] == 3 else 45)


def is_shield_special(t):
    return t["path"] == "fe3d5dd5"


def timing_events(t):
    """A Devil Shield / mage Kobold Special's recorded event ticks (the fixture's effect_burst and hit, turn clock
    with 1 = the turn's first tick), as the absolute round-clock frames [start + tick - 1]: [actor, start, burst
    (null for the Kobold), hit]. The sim schedules its events on them and derives nothing. The Nightmare's heal has
    only effect_start (its particle effect's first tick, the burst); the heal lands 128 ticks after it."""
    abs_ = lambda f: t["start"] + f - 1
    if "effect_start" in t:
        return [t["actor"], t["start"], abs_(t["effect_start"]), abs_(t["effect_start"]) + 128]
    return [t["actor"], t["start"], abs_(t["effect_burst"]) if "effect_burst" in t else None, abs_(t["hit"])]


def is_devil_multihit(t):
    return t["path"] == "c32c9edf"


def devil_wait(rd, t):
    """The Devil Armor's idle-cycle wait: its first landing hit (list slot 3) is at turn frame 44 + wait (damage_timeline is turn-relative)
    (0 in round 1, 13 in rounds 2-4 of the recording); read off the first hit as the Ghost Armor's is."""
    et = next(e for e in rd["enemy_turns"] if e["start"] == t["start"] and e["actor"] == t["actor"])
    assert et["hits"] == 3, (rd["seed"], rd["round"])
    return min(int(h.split(":")[0]) for h in et["damage_timeline"].split(";")) - 44


def convert(run):
    party_len = len(run["party_characters"])
    if keys_by_name:
        keys = []
        for part in (run.get("composition") or fixture["fight"]["composition"]).split(", "):
            m = re.fullmatch(r"(.+?) Lv\d+(?: x(\d+))?", part)
            keys += [keys_by_name[m.group(1)]] * int(m.group(2) or 1)
    else:
        keys = (
            [keys_by_hp[str(hp)] for hp in run["rounds"][0]["hp_at_confirm"][party_len:]]
            if keys_by_hp
            else globals()["keys"]
        )

    # every enemy slot, in combatant order (hp_at_confirm lists the party first)
    slots = list(range(party_len + 1, len(run["rounds"][0]["hp_at_confirm"]) + 1))
    assert len(slots) == len(keys), f"{len(slots)} enemy slots, {len(keys)} keys"

    seeds = {}
    last_actor = {}  # seed -> the last enemy to act in its previous round
    for rd in run["rounds"]:
        rounds = seeds.setdefault(rd["seed"], [])
        # A turn_clock entry starting at frame 1 isn't a turn: when the previous round's last actor was an
        # enemy it is still the current actor until the first turn roll (frame 59), and the recorder logs
        # it (rng0 = confirm + 2, its rolls are the round's first poll). Dropped, after checking whose it is.
        for t in [t for t in rd["turn_clock"] if t["start"] == 1]:
            assert t["actor"] == last_actor.get(rd["seed"]), (rd["seed"], rd["round"], t)
        rd["turn_clock"] = [t for t in rd["turn_clock"] if t["start"] != 1]
        rd["enemy_turns"] = [t for t in rd["enemy_turns"] if t["start"] != 1]
        if rd["turn_clock"]:
            last_actor[rd["seed"]] = rd["turn_clock"][-1]["actor"]
        # a turn whose path is a death is recorded with the move the AI committed to before dying
        # (an actor can take several turns in a round once the Beast Commander's attacks are split from their own turns)
        def move_name(t):
            if t["move"].startswith("Slot "):
                return slot_outcome(rd, t)[0]
            return "Attack" if t["move"] == "Death (not a move)" else normalise_move(t["move"])

        def target_of(t):
            # the Sleep attack doesn't store its target, and a Squirrel's full-script turn (6cd4170d) reads 0
            # in this fight though it hits someone: the member it busied is the one it picked
            if move_name(t) == "Sleep" or (t["path"] == "6cd4170d" and t["stored_target"] == 0):
                et = next(e for e in rd["enemy_turns"] if e["start"] == t["start"] and e["actor"] == t["actor"])
                return busied_member(et["party_state_timeline"])
            # a Holly Spirit's scan with no acceptor stores -1 (255) and takes no target
            return 0 if t["stored_target"] == 255 else t["stored_target"]

        turns = [[t["actor"], t["start"], t["end"], target_of(t), move_name(t)] for t in rd["turn_clock"]]
        enemy_turns = [
            [
                et["actor"],
                et["start"],
                et["rng0"],
                et["rand_calls"],
                target_of(et),
                move_name(et),
                et["frames"],
            ]
            for et in rd["enemy_turns"]
        ]
        rounds.append(
            {
                "round": rd["round"],
                "rngAtConfirm": rd["rng_at_confirm"],
                "rngAtRoundEnd": rd["rng_at_round_end"],
                "hpAtConfirm": rd["hp_at_confirm"],
                "ended": rd["ended_battle"] is not None,
                # party members carrying Bucket (combatant_rec +0x4a bit 0x10) at the round end, 1-based
                "bucketAtRoundEnd": [
                    bool(int(m.split(".")[1], 16) & 0x10) for m in rd["party_status_at_round_end"].split(",")
                ],
                "sleepAtRoundEnd": [
                    bool(int(m.split(".")[1], 16) & 0x20) for m in rd["party_status_at_round_end"].split(",")
                ],
                # Balloon stage per member: combatant_rec +0x4a bits 0x02 (stage 1) and 0x04 (stage 2, byte 0x06)
                "balloonAtRoundEnd": [
                    [0, 1, 1, 2][(int(m.split(".")[1], 16) >> 1) & 3] for m in rd["party_status_at_round_end"].split(",")
                ],
                "partyActions": rd["party_actions"],
                **(
                    {"turnOrderInputs": [[i["frame"], i["combatant"], i["action_tag"], i["busy"]] for i in rd["turn_order_inputs"]]}
                    if rd.get("turn_order_inputs")
                    else {}
                ),
                "turns": turns,
                # the Ghost Armor's idle_cycle_wait, as the sim's input (see ghost_wait): [actor, start, value]
                **(
                    {
                        "idleCycleWait": [
                            [t["actor"], t["start"], ghost_wait(rd, t)]
                            for t in rd["turn_clock"]
                            if "idle_cycle_wait" in t
                        ]
                    }
                    if any("idle_cycle_wait" in t for t in rd["turn_clock"])
                    else {}
                ),
                # the Slot Man's recorded wait (see slot_outcome): [actor, start, value]
                **(
                    {
                        "idleCycleWait": [
                            [t["actor"], t["start"], slot_outcome(rd, t)[1]]
                            for t in rd["turn_clock"]
                            if t["move"].startswith("Slot ")
                        ]
                    }
                    if any(t["move"].startswith("Slot ") for t in rd["turn_clock"])
                    else {}
                ),
                # the Devil Shield's and the mage Kobold's recorded Special event ticks (turn_clock hit / effect_burst) (see timing_events)
                **(
                    {"timingEvents": [timing_events(t) for t in rd["turn_clock"] if "hit" in t or "effect_start" in t]}
                    if any("hit" in t or "effect_start" in t for t in rd["turn_clock"])
                    else {}
                ),
                # the Devil Armor's Multi-hit wait (see devil_wait): [actor, start, value]
                **(
                    {
                        "idleCycleWait": [
                            [t["actor"], t["start"], devil_wait(rd, t)]
                            for t in rd["turn_clock"]
                            if is_devil_multihit(t)
                        ]
                    }
                    if any(is_devil_multihit(t) for t in rd["turn_clock"])
                    else {}
                ),
                # a recorded timing input the sim doesn't model (the Holly Spirit's idle_timer_t0): [actor, start, value]
                **(
                    {
                        "idleTimerT0": [
                            [t["actor"], t["start"], t["idle_timer_t0"]]
                            for t in rd["turn_clock"]
                            if "idle_timer_t0" in t
                        ]
                    }
                    if any("idle_timer_t0" in t for t in rd["turn_clock"])
                    else {}
                ),
                "hpChanges": [[h["frame"], h["combatant"], h["hp_delta"]] for h in rd["hp_changes"]],
                "frames": rd["frames"],
                "randTimeline": re.sub(r":>64(?=;|$)", ":90", rd["rand_timeline"]),  # recorder caps a frame at ">64"; the Slot Man A effect rolls 30 x 3 = 90 there (ai.json)
                "enemyTurns": enemy_turns,
                "counters": [[c["frame"], c["attacker"], c["countered_by"], c["damage"]] for c in rd["counters"] or []],
            }
        )
    for rounds in seeds.values():
        rounds.sort(key=lambda r: r["round"])
    return {
        "party": run["party"],
        "scenario": run.get("scenario") or (f"group {run['group']}" if run.get("group") else None),
        "characters": game_order(run),
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
# the committed fixtures are prettier-formatted (npm run format): do the same, so a re-conversion diffs by content only
prettier = ROOT / "node_modules" / ".bin" / "prettier"
if prettier.exists():
    subprocess.run([str(prettier), "--write", str(path)], check=True, capture_output=True)
print(path, sum(len(s["rounds"]) for r in runs for s in r["seeds"]), "rounds")
