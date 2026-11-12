#!/usr/bin/env python3
"""Generates test/fixtures/heap/tables/effect_engine_parity.json: what the RE agent's verified reference engine
(Suikoden-Bizhawk-HUD/enemy_profiles/vfx_effects/effect_script_engine_v10.py) does for the party Attack hit of each of the 78 characters
(their slot-2 script run on the target slot 7 from the first prompt's arena) at two draw-buffer parities: the heap events and every
arena word that changed.  The JS port (lib/Game/Heap/Engine/EffectEngine.js) must give the same.
usage: HUD=/path/to/Suikoden-Bizhawk-HUD python3 -I scripts/generateEffectEngineParity.py"""
import os, sys, json, struct
HUD = os.environ.get('HUD', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'Suikoden-Bizhawk-HUD'))
sys.path.insert(0, os.path.join(HUD, 'enemy_profiles', 'vfx_effects'))
import effect_script_engine_v10 as E
import attack_hit_reference_v10 as R

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, '..', 'test', 'fixtures', 'heap')
img = open(os.path.join(FIX, 'crystal_core_L-fire-slow_r1_prompt.bin'), 'rb').read()
rover = int(json.load(open(os.path.join(FIX, 'crystal_core_L-fire-slow_r1_prompt.json')))['rover'], 16)
codes = sorted(f[:-4] for f in os.listdir(os.path.join(E.DISC, 'data/04_play')) if f.endswith('.bin'))
out = {'arena': 'crystal_core_L-fire-slow_r1_prompt', 'attacker_slot': 1, 'target_slot': 7, 'cases': []}
for code in codes:
    party = [code] + R.PARTY[1:]
    sp, info = R.make_space(party)
    for parity in (0, 1):
        t0 = 100 + parity
        heap = E.Heap(img, rover)
        try:
            R.run_hit(heap, sp, info, 1, 7, t0)
        except Exception as ex:  # the reference raises for ops it does not port
            out['cases'].append({'code': code, 'parity': parity, 'error': repr(ex)[:80]})
            continue
        words = []
        for i in range(0, E.ARENA_SIZE, 4):
            a, b = struct.unpack_from('<I', img, i)[0], struct.unpack_from('<I', heap.mem, i)[0]
            if a != b: words.append([E.ARENA + i, b])
        out['cases'].append({'code': code, 'parity': parity, 't0': t0, 'events': [list(e) for e in heap.events], 'words': words, 'rover': heap.rover})
# the whole Attack (slot-1 walk and lunge, then the hit script) of the 6 members of the recorded party, at two parities
out['attacks'] = []
sp, info = R.make_space()
for m in range(1, 7):
    for parity in (0, 1):
        t0 = 1000 + parity
        heap = E.Heap(img, rover)
        try:
            eng, ctl = R.run_attack(heap, sp, info, m, 7, t0)
        except Exception as ex:
            out['attacks'].append({'member': m, 'parity': parity, 'error': repr(ex)[:80]}); continue
        words = []
        for i in range(0, E.ARENA_SIZE, 4):
            a, b = struct.unpack_from('<I', img, i)[0], struct.unpack_from('<I', heap.mem, i)[0]
            if a != b: words.append([E.ARENA + i, b])
        out['attacks'].append({'member': m, 'parity': parity, 't0': t0, 'started': ctl.started, 'events': [list(e) for e in heap.events], 'words': words, 'rover': heap.rover})
os.makedirs(os.path.join(FIX, 'tables'), exist_ok=True)
json.dump(out, open(os.path.join(FIX, 'tables', 'effect_engine_parity.json'), 'w'), separators=(',', ':'))
print(len(out['cases']), 'cases', sum(1 for c in out['cases'] if 'error' in c), 'errors')
