import { describe, it } from 'node:test';
import assert from 'node:assert';
import Character, { exportCharacters, importCharacters } from '../lib/Game/Battle/Character.js';
import { PlayerParty } from '../lib/Game/Battle/Party.js';
import { CHARACTER_KEYS, ITEM_KEYS, RUNE_KEYS } from '../lib/Game/Keys.js';
import { RUNES } from '../lib/Game/Magic/Runes.js';
import { ARMOR_SLOT, STATUS, WEAPON_ELEMENTS } from '../lib/Game/Constants.js';

// The example from Suikoden-Bizhawk-HUD docs/Character_JSON_Format.md. Loosely typed, as the
// tests also feed it bad values.
/** @type {any} */
const SPEC_EXAMPLE = [
  {
    key: 'CLEO',
    id: 1,
    LVL: 22,
    EXP: 340,
    stats: { HP: 210, PWR: 60, SKL: 55, DEF: 50, SPD: 48, MGC: 70, LUK: 40 },
    HP: 180,
    MP: [4, 3, 2, 0],
    rune: { id: 6 },
    weapon: { lvl: 5, runePiece: { element: 'EARTH', amount: 3 } },
    status: { poison: true, balloon: 2 },
    inventory: [
      { id: 12, quantity: 2 },
      { id: 140, slot: 'ACCESSORY_1', locked: true },
      { id: 170, appraised: true },
    ],
  },
];

/** The export, less the readability-only rune and item keys the spec example leaves out */
const withoutOptionalKeys = (/** @type {any[]} */ characters) => characters.map(c => ({
  ...c,
  rune: { id: c.rune.id },
  inventory: c.inventory.map(({ key: _key, ...item }) => item),
}));

const cleoJSON = (/** @type {any} */ overrides = {}) => ({ ...structuredClone(SPEC_EXAMPLE[0]), ...overrides });

describe('Character JSON', () => {
  it("round-trips the spec's example", () => {
    const exported = exportCharacters(importCharacters(structuredClone(SPEC_EXAMPLE)));
    assert.deepStrictEqual(withoutOptionalKeys(exported), SPEC_EXAMPLE);
  });

  it('adds rune and item keys on export', () => {
    const [json] = exportCharacters(importCharacters(structuredClone(SPEC_EXAMPLE)));
    assert.strictEqual(json.rune.key, RUNE_KEYS.EARTH);
    assert.deepStrictEqual(json.inventory.map(item => item.key), [ITEM_KEYS.BRASS_ARMOR, ITEM_KEYS.CLONE_CRYSTAL, ITEM_KEYS.JUNK]);
  });

  it('imports every field', () => {
    const cleo = Character.fromCharacterJSON(cleoJSON());
    assert.strictEqual(cleo.key, CHARACTER_KEYS.CLEO);
    assert.strictEqual(cleo.LVL, 22);
    assert.strictEqual(cleo.EXP, 340);
    assert.strictEqual(cleo.stats.HP, 210);
    assert.strictEqual(cleo.stats.MGC, 70);
    assert.strictEqual(cleo.HP, 180); // not refilled to max by setStats
    assert.deepStrictEqual(cleo.MP, [4, 3, 2, 0]);
    assert.strictEqual(cleo.rune, RUNES.EARTH);
    assert.strictEqual(cleo.weapon.lvl, 5);
    assert.deepStrictEqual(cleo.weapon.runePiece, { element: WEAPON_ELEMENTS.EARTH, amount: 3 });
    assert.strictEqual(cleo.status[STATUS.POISON], true);
    assert.strictEqual(cleo.status[STATUS.BALLOON], 2);
    assert.deepStrictEqual(cleo.inventory.entries, [
      { key: ITEM_KEYS.BRASS_ARMOR, quantity: 2 },
      { key: ITEM_KEYS.CLONE_CRYSTAL, quantity: 1, slot: ARMOR_SLOT.ACCESSORY_1, locked: true },
      { key: ITEM_KEYS.JUNK, quantity: 1, appraised: true },
    ]);
  });

  it('treats an antique without appraised as appraised, and exports unappraised ones explicitly', () => {
    const cleo = Character.fromCharacterJSON(cleoJSON({ inventory: [{ id: 170 }] }));
    assert.strictEqual(cleo.inventory.entries[0].appraised, true);

    cleo.inventory.entries[0].appraised = false;
    assert.strictEqual(cleo.toCharacterJSON().inventory[0].appraised, false);
  });

  it('throws on a key that disagrees with the id', () => {
    assert.throws(() => Character.fromCharacterJSON(cleoJSON({ key: 'MCDOHL' })), /doesn't match id 1/);
  });

  it('throws on an unknown rune piece element', () => {
    const json = cleoJSON({ weapon: { lvl: 5, runePiece: { element: 'THUNDER', amount: 3 } } });
    assert.throws(() => Character.fromCharacterJSON(json), /unknown rune piece element THUNDER/);
  });

  it('throws on unknown ids', () => {
    assert.throws(() => Character.fromCharacterJSON(cleoJSON({ id: 9999 })), /unknown character id/);
    assert.throws(() => Character.fromCharacterJSON(cleoJSON({ rune: { id: 9999 } })), /unknown rune id/);
    assert.throws(() => Character.fromCharacterJSON(cleoJSON({ inventory: [{ id: 9999 }] })), /unknown item id/);
  });
});

describe('PlayerParty JSON', () => {
  const doc = () => [cleoJSON(), new Character(CHARACTER_KEYS.MCDOHL).setLVL(5).toCharacterJSON()];

  it('imports members in the file order, in slots from 1', () => {
    const party = PlayerParty.fromCharacterJSON(doc());
    assert.deepStrictEqual(party.combatants.map(c => [c.key, c.slot]), [[CHARACTER_KEYS.CLEO, 1], [CHARACTER_KEYS.MCDOHL, 2]]);
  });

  it('round-trips', () => {
    const exported = PlayerParty.fromCharacterJSON(doc()).toCharacterJSON();
    assert.deepStrictEqual(PlayerParty.fromCharacterJSON(structuredClone(exported)).toCharacterJSON(), exported);
    assert.deepStrictEqual(withoutOptionalKeys(exported)[0], SPEC_EXAMPLE[0]);
  });

  it('throws on more than 6 members', () => {
    const seven = Array.from({ length: 7 }, () => cleoJSON());
    assert.throws(() => PlayerParty.fromCharacterJSON(seven), /Party size > 6/);
  });
});
