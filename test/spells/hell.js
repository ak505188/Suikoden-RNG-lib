import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { LOG_TYPES } from '../../lib/Game/Battle/ActionLog.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import { ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { AREAS } from '../../battle.js';
import NeclordParty from '../data/neclord_party.json' with { type: 'json' };
import AinGideParty from '../data/ain_gide_party.json' with { type: 'json' };

// Hell (Soul Eater slot 2). Cast time findings, from live round logs (hero casts at tick 31, next turn after):
//   nothing dies (Ain Gide, immune) or one Larvae dies: 891, i.e. Spells.js's 858 frames
//   one Demon Sorcerer 892, one Hell Unicorn 894, three Larvae + a Demon Sorcerer 898, three Larvae + Hell
//   Unicorn + Demon Sorcerer 914, three Hell Hounds + two Elite Soldiers + a Whip Master 933
// More dying enemies push the next turn later (+7, +23, +42), which looks like hardware lag or death
// animations piling up rather than game logic. Spell duration doesn't need to be exact, so none of this is
// asserted: these tests check the cast and the kills only. Deadly Fingertips on one Larvae gave 625 (592 frames).
/**
 * The hero (McDohl) casts Hell, so give them the Soul Eater Rune
 * @param {unknown} json
 */
const makeParty = json => {
  /** @type {import('../../lib/Game/Battle/Character.js').CharacterJSON[]} */
  const members = structuredClone(/** @type {any} */ (json));
  members[0].rune = { id: RUNES.SOUL_EATER.id };
  members[0].MP = [7, 5, 3, 1];
  return PlayerParty.fromCharacterJSON(members);
};

describe('Hell kills a whole formation', () => {
  const party = makeParty(NeclordParty);
  const enemies = EnemyParty.fromFormation(AREAS.NECLORDS_CASTLE.encounters[8]);
  const rng = new RNG(0xdc0e0008).next(35);
  const battle = new Battle({ party, enemies, rng });
  battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 2 }]);
  it('casts at tick 31', () => {
    const cast = battle.log.entries.find(e => e.type === LOG_TYPES.CAST);
    assert.strictEqual(cast?.tick, 31);
  });

  it('kills every enemy', () => {
    assert.ok(enemies.combatants.every(e => e.knockedOut));
  });

  it('RNG ends on 10986', () => {
    assert.strictEqual(rng.count, 10986)
  });
});

describe('Hell doesn\'t kill Ain Gide', () => {
  const party = makeParty(AinGideParty);
  const enemies = EnemyParty.fromFormation(AREAS.OTHER.scripted[3]);
  const battle = new Battle({ party, enemies, rng: new RNG(0x323ab8b1).next(9069) });
  battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 2 }]);

  it('casts at tick 31', () => {
    const cast = battle.log.entries.find(e => e.type === LOG_TYPES.CAST);
    assert.strictEqual(cast?.tick, 31);
  });

  it('leaves Ain Gide alive and at full HP', () => {
    const [ainGide] = enemies.combatants;
    assert.strictEqual(ainGide.knockedOut, false);
    assert.strictEqual(ainGide.HP, ainGide.stats.HP);
  });
});

// Hell on a lone Larvae (6 allies vs 1 enemy)
describe('Hell kills one Larvae', () => {
  const enemies = new EnemyParty([new Enemy(ENEMY_KEYS.LARVAE)]);
  const battle = new Battle({ party: makeParty(NeclordParty), enemies, rng: new RNG(0xdc0e0008).next(35) });
  battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 2, target: 0 }]);

  it('kills it', () => {
    assert.strictEqual(enemies.combatants[0].knockedOut, true);
  });
});
