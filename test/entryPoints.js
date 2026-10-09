import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as entry from '../battle.js';
import Battle, { BATTLE_STATUS, PHASE_STATE } from '../lib/Game/Battle/Battle.js';
import Character, { exportCharacters, importCharacters } from '../lib/Game/Battle/Character.js';
import Enemy from '../lib/Game/Battle/Enemy.js';
import QueenAntScript from '../lib/Game/Battle/Scripts/QueenAnt.js';
import { EnemyParty, PlayerParty } from '../lib/Game/Battle/Party.js';
import ActionLog, { LOG_TYPES, formatRoll, rollMargin } from '../lib/Game/Battle/ActionLog.js';
import * as Actions from '../lib/Game/Battle/Actions.js';
import * as ActionPlans from '../lib/Game/Battle/ActionPlans.js';
import { AREAS } from '../lib/Game/Bestiary/Areas.js';
import * as Keys from '../lib/Game/Keys.js';
import { ITEMS } from '../lib/Game/Items.js';
import { RUNES, RUNE_TYPES } from '../lib/Game/Magic/Runes.js';
import { STATUS } from '../lib/Game/Constants.js';
import RNG from '../lib/rng.js';
import { Areas } from '../lib/lib.js';

describe('battle.js exports', () => {
  it("re-exports the library's own objects (not copies)", () => {
    const expected = {
      Battle,
      BATTLE_STATUS,
      PHASE_STATE,
      Character,
      exportCharacters,
      importCharacters,
      Enemy,
      QueenAntScript,
      EnemyParty,
      PlayerParty,
      ActionLog,
      LOG_TYPES,
      formatRoll,
      rollMargin,
      ACTION_TYPES: Actions.ACTION_TYPES,
      DEFAULT_ACTION: Actions.DEFAULT_ACTION,
      ROUND_COMMANDS: Actions.ROUND_COMMANDS,
      ROLL_KINDS: Actions.ROLL_KINDS,
      UNBALANCED_ACTION_TYPES: Actions.UNBALANCED_ACTION_TYPES,
      DEFAULT_COMMANDS: ActionPlans.DEFAULT_COMMANDS,
      characterActions: ActionPlans.characterActions,
      fightPlans: ActionPlans.fightPlans,
      fightStarts: ActionPlans.fightStarts,
      roundPlans: ActionPlans.roundPlans,
      roundStarts: ActionPlans.roundStarts,
      AREAS,
      ENCOUNTER_AREAS: Areas,
      CHARACTER_KEYS: Keys.CHARACTER_KEYS,
      ENEMY_KEYS: Keys.ENEMY_KEYS,
      ITEM_KEYS: Keys.ITEM_KEYS,
      RUNE_KEYS: Keys.RUNE_KEYS,
      UNITE_KEYS: Keys.UNITE_KEYS,
      ITEMS,
      RUNES,
      RUNE_TYPES,
      STATUS,
      RNG,
    };
    assert.deepStrictEqual(Object.keys(entry).sort(), Object.keys(expected).sort());
    for (const [name, value] of Object.entries(expected)) {
      assert.ok(value !== undefined, name);
      assert.strictEqual(entry[name], value, name);
    }
  });
});

describe('Package entry points (exports)', () => {
  it('suikoden-rng-lib and suikoden-rng-lib/battle resolve to index.js and battle.js', async () => {
    const battle = await import('suikoden-rng-lib/battle');
    assert.strictEqual(battle.Battle, Battle);
    const index = await import('suikoden-rng-lib');
    assert.strictEqual(index.RNG, RNG);
  });

  it('the main entry has what consumers used to deep-import', async () => {
    const index = await import('suikoden-rng-lib');
    const internal = {
      Area: (await import('../lib/Area/Area.js')).default,
      Kaku: (await import('../lib/Kaku/Kaku.js')).default,
      simulateAssassinFight: (await import('../lib/Assassin.js')).simulateAssassinFight,
      Cursor: (await import('../lib/chinchironin.js')).Cursor,
      simulateRoll: (await import('../lib/chinchironin.js')).simulateRoll,
      Characters: (await import('../stats/characters.js')).Characters,
      characterLevelUps: (await import('../stats/growths.js')).characterLevelUps,
      generateCharacterMultipleLevelup: (await import('../stats/growths.js'))
        .generateCharacterMultipleLevelup,
      Duel: (await import('../lib/Game/Duel.js')).default,
      DUELS: (await import('../lib/Game/Duel.js')).DUELS,
    };
    for (const [name, value] of Object.entries(internal)) {
      assert.ok(value !== undefined, name);
      assert.strictEqual(index[name], value, name);
    }
  });

  it('keeps everything else internal', async () => {
    // Passed as variables: they don't exist for consumers, so the type checker can't resolve them either
    for (const internal of ['suikoden-rng-lib/lib/rng.js', 'suikoden-rng-lib/battle.js']) {
      await assert.rejects(import(internal), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, internal);
    }
  });
});
