import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character from '../lib/Game/Battle/Character.js';
import { PlayerParty } from '../lib/Game/Battle/Party.js';
import { CHARACTER_ATTACK_TIMINGS } from '../lib/Game/Battle/CharacterAttackTimings.js';
import { STATUS } from '../lib/Game/Constants.js';
import { CHARACTER_KEYS, UNITE_KEYS } from '../lib/Game/Keys.js';
import {
  UNITES,
  UNITES_BY_CHARACTER,
  UNITES_BY_SLOT,
  availableUnites,
  disjointUniteSets,
  isUniteAvailable,
  rosterUnites,
} from '../lib/Game/Unites.js';
import { UNITE_RETURN_FRAMES, UNITE_TIMINGS } from '../lib/Game/Battle/UniteTimings.js';

/** @typedef {import('../lib/Game/Unites.js').Unite} Unite */

// Required roster Ids per slot, from the Unite def table (Suikoden-Bizhawk-HUD's
// Scripted_Battle_Actions.md). Compared as sets: that list isn't in def order.
const REQUIRED_IDS = {
  1: [2, 6],
  2: [32, 38],
  3: [4, 9],
  4: [4, 75, 9],
  5: [11, 43, 41],
  6: [70, 72, 69, 71],
  7: [15, 21],
  8: [17, 48, 49],
  9: [3, 33, 23],
  10: [1, 0, 36],
  11: [7, 18, 91],
  12: [14, 80],
  13: [19, 29],
  14: [20, 67],
  15: [39, 76],
  16: [63, 33],
  17: [30, 0],
  18: [12, 31],
  19: [20, 95],
  20: [4, 51],
  21: [4, 75],
  22: [70, 72, 69, 5],
  23: [5, 72, 69, 71],
  24: [70, 5, 69, 71],
  25: [70, 72, 5, 71],
  26: [1, 0, 10],
  27: [65, 14, 80],
  28: [6, 13],
  29: [23, 55, 22],
  30: [66, 6, 52],
  31: [30, 0, 62],
  32: [8, 91],
};

const sorted = (/** @type {number[]} */ ids) => [...ids].sort((a, b) => a - b);

/** @param {import('../lib/Game/Keys.js').CharacterKey[]} keys */
const makeParty = (keys) => keys.map((key) => new Character(key));

describe('UNITES', () => {
  it('has one entry per slot 1-32', () => {
    assert.deepStrictEqual(
      sorted(Object.values(UNITES).map((u) => u.slot)),
      [...Array(32)].map((_, i) => i + 1),
    );
    assert.strictEqual(Object.keys(UNITES_BY_SLOT).length, 32);
  });

  it('participants match the def table roster Ids', () => {
    for (const u of Object.values(UNITES)) {
      const ids = u.participants.map((p) => CHARACTER_ATTACK_TIMINGS[p].id);
      assert.deepStrictEqual(sorted(ids), sorted(REQUIRED_IDS[u.slot]), u.name);
    }
  });

  it('Talisman rolls Pahn then Gremio (live-confirmed def order)', () => {
    assert.deepStrictEqual(UNITES[UNITE_KEYS.TALISMAN].participants, [
      CHARACTER_KEYS.PAHN,
      CHARACTER_KEYS.GREMIO,
    ]);
  });

  it('marks the Unites that leave participants Unbalanced', () => {
    const entries = /** @type {[string, Unite][]} */ (Object.entries(UNITES));
    const unbalancing = entries.filter(([, u]) => u.unbalances).map(([key]) => key);
    assert.deepStrictEqual(unbalancing, [
      UNITE_KEYS.FISHERMAN,
      UNITE_KEYS.WILD_ARROW_SYLVINA,
      UNITE_KEYS.PRETTY_GIRL,
      UNITE_KEYS.FLASH,
      UNITE_KEYS.WILD_ARROW_RUBI,
      UNITE_KEYS.WILD_ARROW_STALLION,
      UNITE_KEYS.BEAT_EM_UP,
    ]);
    for (const [, u] of entries) {
      for (const p of u.unbalances?.who ?? []) assert.ok(u.participants.includes(p), u.name);
    }
  });

  it('indexes every Unite a character is in', () => {
    assert.deepStrictEqual(UNITES_BY_CHARACTER[CHARACTER_KEYS.PAHN], [
      UNITE_KEYS.TALISMAN,
      UNITE_KEYS.BEAT_EM_UP,
      UNITE_KEYS.MARTIAL_ARTS,
    ]);
  });
});

describe('availableUnites', () => {
  it('needs every participant in the party', () => {
    assert.deepStrictEqual(
      availableUnites(makeParty([CHARACTER_KEYS.PAHN, CHARACTER_KEYS.MCDOHL])),
      [],
    );
    assert.deepStrictEqual(
      availableUnites(
        makeParty([
          CHARACTER_KEYS.MCDOHL,
          CHARACTER_KEYS.PAHN,
          CHARACTER_KEYS.GREMIO,
          CHARACTER_KEYS.RONNIE,
        ]),
      ),
      [UNITE_KEYS.TALISMAN, UNITE_KEYS.BEAT_EM_UP],
    );
  });

  it('excludes a participant who is knocked out, poisoned, asleep or unbalanced', () => {
    const disable = [
      (/** @type {Character} */ c) => {
        c.knockedOut = true;
      },
      (/** @type {Character} */ c) => {
        c.status[STATUS.POISON] = true;
      },
      (/** @type {Character} */ c) => {
        c.status[STATUS.SLEEP] = true;
      },
      (/** @type {Character} */ c) => {
        c.status[STATUS.UNBALANCED] = 1;
      },
    ];
    for (const fn of disable) {
      const party = makeParty([CHARACTER_KEYS.PAHN, CHARACTER_KEYS.GREMIO]);
      fn(party[1]);
      assert.deepStrictEqual(availableUnites(party), []);
    }
  });
});

describe('isUniteAvailable', () => {
  it('agrees with availableUnites for every Unite', () => {
    const party = makeParty([
      CHARACTER_KEYS.MCDOHL,
      CHARACTER_KEYS.PAHN,
      CHARACTER_KEYS.GREMIO,
      CHARACTER_KEYS.RONNIE,
    ]);
    party[2].status[STATUS.POISON] = true; // Gremio: Talisman out, Beat 'em Up still in
    const available = availableUnites(party);
    for (const key of Object.values(UNITE_KEYS)) {
      assert.strictEqual(isUniteAvailable(key, party), available.includes(key), key);
    }
    assert.strictEqual(isUniteAvailable(UNITE_KEYS.TALISMAN, party), false);
    assert.strictEqual(isUniteAvailable(UNITE_KEYS.BEAT_EM_UP, party), true); // Pahn + Ronnie
  });

  it('needs every participant in the party', () => {
    assert.strictEqual(
      isUniteAvailable(UNITE_KEYS.TALISMAN, makeParty([CHARACTER_KEYS.PAHN])),
      false,
    );
    assert.strictEqual(
      isUniteAvailable(
        UNITE_KEYS.TALISMAN,
        makeParty([CHARACTER_KEYS.PAHN, CHARACTER_KEYS.GREMIO]),
      ),
      true,
    );
  });
});

describe('disjointUniteSets', () => {
  it('never uses a character twice', () => {
    const sets = disjointUniteSets([UNITE_KEYS.TALISMAN, UNITE_KEYS.BEAT_EM_UP, UNITE_KEYS.KOBOLD]);
    assert.deepStrictEqual(sets, [
      [],
      [UNITE_KEYS.TALISMAN],
      [UNITE_KEYS.TALISMAN, UNITE_KEYS.KOBOLD],
      [UNITE_KEYS.BEAT_EM_UP],
      [UNITE_KEYS.BEAT_EM_UP, UNITE_KEYS.KOBOLD],
      [UNITE_KEYS.KOBOLD],
    ]);
  });
});

describe('UNITE_TIMINGS', () => {
  it('has one timing per participant, and a valid reaction owner', () => {
    for (const [key, t] of Object.entries(UNITE_TIMINGS)) {
      const u = UNITES[/** @type {keyof typeof UNITES} */ (key)];
      assert.strictEqual(t.participants.length, u.participants.length, u.name);
      assert.ok(t.reaction.by >= 0 && t.reaction.by < u.participants.length, u.name);
    }
  });

  it('has return frames for every Unite participant', () => {
    for (const u of Object.values(UNITES)) {
      for (const p of u.participants) assert.ok(p in UNITE_RETURN_FRAMES, `${u.name}: ${p}`);
    }
  });

  // Live, on the Varkas and Sydonia boss (TickBasedAlgorithm.md, PARTY_UNITE), all from S
  it('reproduces the live Talisman timeline', () => {
    const t = UNITE_TIMINGS[UNITE_KEYS.TALISMAN];
    const [pahn, gremio] = t.participants;
    assert.strictEqual(pahn.impact + 1, 67); // damage tick when Pahn starts
    assert.strictEqual(gremio.impact + 1, 75); // ... when Gremio starts
    assert.strictEqual(pahn.impact + 1 + t.reaction.frames, 104); // target busy clears
    assert.strictEqual(Math.max(pahn.done, gremio.done) + 1, 136); // handler done
    assert.strictEqual(gremio.done + 1 + UNITE_RETURN_FRAMES[CHARACTER_KEYS.GREMIO], 176);
    assert.strictEqual(pahn.done + 1 + UNITE_RETURN_FRAMES[CHARACTER_KEYS.PAHN], 188);
  });
});

describe('rosterUnites', () => {
  it('lists the Unites whose participants are all in the party, whatever their state', () => {
    const party = makeParty([
      CHARACTER_KEYS.MCDOHL,
      CHARACTER_KEYS.PAHN,
      CHARACTER_KEYS.GREMIO,
      CHARACTER_KEYS.RONNIE,
    ]);
    party[2].status[STATUS.POISON] = true;
    assert.deepStrictEqual(rosterUnites(party), [UNITE_KEYS.TALISMAN, UNITE_KEYS.BEAT_EM_UP]);
    assert.deepStrictEqual(availableUnites(party), [UNITE_KEYS.BEAT_EM_UP]);
  });

  it('is cached on the PlayerParty, shared by clones, and gives the same answer', () => {
    const party = new PlayerParty(
      makeParty([CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.GREMIO]),
    );
    assert.deepStrictEqual(party.rosterUnites, [UNITE_KEYS.TALISMAN]);
    assert.strictEqual(party.clone().rosterUnites, party.rosterUnites);
    assert.deepStrictEqual(party.availableUnites(), availableUnites(party.combatants));
    party.combatants[1].status[STATUS.SLEEP] = true; // state changes still count
    assert.deepStrictEqual(party.availableUnites(), []);
  });
});
