import { describe, it } from 'node:test';
import assert from 'node:assert';
import RNG from '../../lib/rng.js';
import Character from '../../lib/Game/Battle/Character.js';
import Enemy from '../../lib/Game/Battle/Enemy.js';
import Battle from '../../lib/Game/Battle/Battle.js';
import { EnemyParty, PlayerParty } from '../../lib/Game/Battle/Party.js';
import { ACTION_TYPES } from '../../lib/Game/Battle/Actions.js';
import { CHARACTER_KEYS, ENEMY_KEYS } from '../../lib/Game/Keys.js';
import { RUNES } from '../../lib/Game/Magic/Runes.js';
import { SPELLS } from '../../lib/Game/Magic/Spells.js';
import { applySpell } from '../../lib/Game/Magic/Behavior.js';

// Clay Guardian, Guardian Earth and Fog of Deception are bugged in the game and do nothing: the cast plays
// out (MP spent, RNG burned for the animation) but no stat, status or HP changes, on either side.
// (Their decompiled effects are x1.5 on rec+0x42 for the two Guardians, x0.8 on rec+0x36 for Fog.)

const makeCleo = () =>
  new Character(CHARACTER_KEYS.CLEO)
    .setLVL(22)
    .setRune(RUNES.EARTH)
    .setStats({ PWR: 67, SKL: 82, DEF: 75, SPD: 74, MGC: 93, LUK: 53, HP: 217 })
    .rest();

const makeGremio = () =>
  new Character(CHARACTER_KEYS.GREMIO)
    .setLVL(22)
    .setStats({ PWR: 64, SKL: 68, DEF: 84, SPD: 49, MGC: 39, LUK: 66, HP: 201 })
    .rest();

/** @param {Character | Enemy} c */
const snapshot = (c) =>
  JSON.stringify({ stats: c.stats, status: c.status, HP: c.HP, pending: c.pendingDamage });

describe('Spells that do nothing', () => {
  for (const spell of [SPELLS.CLAY_GUARDIAN, SPELLS.GUARDIAN_EARTH, SPELLS.FOG_OF_DECEPTION]) {
    it(`${spell.name} applies and changes nothing`, () => {
      const cleo = makeCleo(),
        gremio = makeGremio();
      const kobold = new Enemy(ENEMY_KEYS.KOBOLD_SWORD);
      const party = new PlayerParty([cleo, gremio]);
      const enemies = new EnemyParty([kobold]);
      const before = [cleo, gremio, kobold].map(snapshot);
      const rng = new RNG(1);
      const applied = applySpell({ actor: cleo, spell, target: gremio, party, enemies, rng });
      assert.strictEqual(applied, true);
      assert.deepStrictEqual([cleo, gremio, kobold].map(snapshot), before);
      assert.strictEqual(rng.count, 0);
    });
  }

  it('Clay Guardian in a battle round spends MP and leaves the stats alone', () => {
    const cleo = makeCleo(),
      gremio = makeGremio();
    const mpBefore = cleo.MP[0];
    const defBefore = gremio.stats.DEF;
    const battle = new Battle({
      party: new PlayerParty([cleo, gremio]),
      enemies: new EnemyParty([new Enemy(ENEMY_KEYS.KOBOLD_SWORD)]),
      rng: new RNG(0x12345678),
      turns: [],
    });
    battle.playTurn([{ type: ACTION_TYPES.RUNE, slot: 0, target: 1 }]); // Clay Guardian
    assert.strictEqual(cleo.MP[0], mpBefore - 1);
    assert.strictEqual(gremio.stats.DEF, defBefore);
  });
});
