import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import { ROUND_COMMANDS } from '../lib/Game/Battle/Actions.js';
import Battle from '../lib/Game/Battle/Battle.js';
import RNG from '../lib/rng.js';
import QueenAntScript from '../lib/Game/Battle/Scripts/QueenAnt.js';
import QueenAntParty from './data/queen_ant_party.json' with { type: 'json' };

/** @typedef {import('../lib/Game/Battle/Actions.js').Action} Action */
/** @typedef {import('../lib/Game/Battle/Actions.js').Round} Round */
/** @typedef {import('../lib/Game/Battle/Character.js').CharacterJSON[]} CharacterJSON */

describe('3 round Queen Ant Free Wills match in-game values', () => {
  /** @type {CharacterJSON} */
  const members = structuredClone(/** @type {any} */ (QueenAntParty));
  const party = PlayerParty.fromCharacterJSON(members);
  const enemies = EnemyParty.fromFormation(AREAS.MT_SEIFU.scripted[0]);
  const rng = new RNG(0x19).next(6910);
  const battle = new Battle({ party, enemies, rng, script: new QueenAntScript() });

  /** What the game showed at the end of each Free Will round */
  const ROUNDS = [
    { count: 6973, partyHPs: [26, 28, 71, 56, 56], enemyHPs: [28, 28, 2, 7000] },
    { count: 7034, partyHPs: [0, 0, 21, 38, 27], enemyHPs: [8, 28, 2, 7000] },
    { count: 7074, partyHPs: [0, 0, 0, 19, 0], enemyHPs: [8, 9, 2, 7000] },
  ];

  /** @type {Round} */
  const FREE_WILL = { command: ROUND_COMMANDS.FREE_WILL };
  const snapshots = ROUNDS.map(() => {
    battle.playTurn(FREE_WILL);
    return Battle.snapshot(battle);
  });

  ROUNDS.forEach(({ count, partyHPs, enemyHPs }, round) => {
    const snap = snapshots[round];
    describe(`Turn ${round + 1}`, () => {
      it(`RNG index should be ${count}`, () => {
        assert.strictEqual(snap.count, count);
      });
      battle.party.combatants.forEach((c, index) => {
        it(`${c.name} HP == ${partyHPs[index]}`, () => {
          assert.strictEqual(snap.partyHPBySlot[index], partyHPs[index]);
        });
      });
      snap.enemyHPBySlot.forEach((hp, index) => {
        it(`Enemy ${index + 1} HP == ${enemyHPs[index]}`, () => {
          assert.strictEqual(hp, enemyHPs[index]);
        });
      });
    });
  });
});

describe('3 round Queen Ant Runs match in-game values', () => {
  /** @type {CharacterJSON} */
  const members = structuredClone(/** @type {any} */ (QueenAntParty));
  const party = PlayerParty.fromCharacterJSON(members);
  const enemies = EnemyParty.fromFormation(AREAS.MT_SEIFU.scripted[0]);
  const rng = new RNG(0x19).next(6910);
  const battle = new Battle({
    party,
    enemies,
    rng,
    escapable: false,
    script: new QueenAntScript(),
  });

  /** What the game showed at the end of each Free Will round */
  const ROUNDS = [
    { count: 6969, partyHPs: [0, 0, 22, 36, 26], enemyHPs: [28, 28, 28, 7000] },
    { count: 7007, partyHPs: [0, 0, 22, 28, 26], enemyHPs: [28, 28, 28, 7000] },
    { count: 7047, partyHPs: [0, 0, 12, 21, 0], enemyHPs: [28, 28, 28, 7000] },
  ];

  /** @type {Round} */
  const RUN = { command: ROUND_COMMANDS.RUN };
  const snapshots = ROUNDS.map(() => {
    battle.playTurn(RUN);
    return Battle.snapshot(battle);
  });

  ROUNDS.forEach(({ count, partyHPs, enemyHPs }, round) => {
    const snap = snapshots[round];
    describe(`Turn ${round + 1}`, () => {
      it(`RNG index should be ${count}`, () => {
        assert.strictEqual(snap.count, count);
      });
      battle.party.combatants.forEach((c, index) => {
        it(`${c.name} HP == ${partyHPs[index]}`, () => {
          assert.strictEqual(snap.partyHPBySlot[index], partyHPs[index]);
        });
      });
      snap.enemyHPBySlot.forEach((hp, index) => {
        it(`Enemy ${index + 1} HP == ${enemyHPs[index]}`, () => {
          assert.strictEqual(hp, enemyHPs[index]);
        });
      });
    });
  });
});

describe('3 round Queen Ant with swapped formation match in-game values', () => {
  /** @type {CharacterJSON} */
  const members = structuredClone(/** @type {any} */ (QueenAntParty));
  // McDohl, Ted, Cleo, Pahn, Gremio
  const membersCorrectFormation = [members[0], members[4], members[3], members[2], members[1]];
  const party = PlayerParty.fromCharacterJSON(membersCorrectFormation);
  const enemies = EnemyParty.fromFormation(AREAS.MT_SEIFU.scripted[0]);
  const rng = new RNG(0x19).next(6910);
  const battle = new Battle({
    party,
    enemies,
    rng,
    escapable: false,
    script: new QueenAntScript(),
  });

  /** What the game showed at the end of each Free Will round */
  const ROUNDS = [
    { count: 6969, partyHPs: [36, 41, 40, 71, 40], enemyHPs: [28, 8, 28, 7000] },
    { count: 7028, partyHPs: [36, 26, 32, 71, 40], enemyHPs: [28, 8, 28, 7000] },
    { count: 7084, partyHPs: [26, 26, 18, 71, 40], enemyHPs: [28, 8, 28, 7000] },
  ];

  /** @type {Round} */
  const RUN = { command: ROUND_COMMANDS.RUN };
  const snapshots = ROUNDS.map(() => {
    battle.playTurn(RUN);
    return Battle.snapshot(battle);
  });

  ROUNDS.forEach(({ count, partyHPs, enemyHPs }, round) => {
    const snap = snapshots[round];
    describe(`Turn ${round + 1}`, () => {
      it(`RNG index should be ${count}`, () => {
        assert.strictEqual(snap.count, count);
      });
      battle.party.combatants.forEach((c, index) => {
        it(`${c.name} HP == ${partyHPs[index]}`, () => {
          assert.strictEqual(snap.partyHPBySlot[index], partyHPs[index]);
        });
      });
      snap.enemyHPBySlot.forEach((hp, index) => {
        it(`Enemy ${index + 1} HP == ${enemyHPs[index]}`, () => {
          assert.strictEqual(hp, enemyHPs[index]);
        });
      });
    });
  });
});
