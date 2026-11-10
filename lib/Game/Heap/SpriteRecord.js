/**
 * The game's sprite records and ordering table, decoded as the code reads them (Suikoden-Bizhawk-HUD
 * enemy_profiles/vfx_effects/brief3a_sprite_ot_v10.json, main.exe v1.0, static unless marked). The hit effect's two sprite lists are the
 * 8-byte records below; the texture slot and the clut row are the effect table's `table[6]` and `table[7]` plus the record's own bytes,
 * and those two table bytes are runtime inputs (the loader's counters at the moment the effect table was set up).
 */

/** The ordering table of draw buffer b has entry d at `OT_BASE + 0x800 * b + 4 * d`: DAT_801819b0 = 0x801ba000, + 0x43c, - 4 [static] */
export const OT_BASE = 0x801ba000 + 0x43c - 4;

/**
 * table[6] and table[7] of an effect table (the texture slot and clut row counters at the moment the loader sets the table up, in battle
 * init order: each party member's table, then each enemy's, then battle.bin's) [static, FUN_800c36ec; observed for 6 members]. Party
 * members take 2 images and 1 row each (checked for six characters), the background 2 images, Crystal Core's table 2 images and 1 row,
 * battle.bin's 3 images and 3 rows. `members` is the party size.
 * @param {'crystalCore' | 'battle'} table
 * @param {number} [members]
 * @returns {{ slot: number, clut: number }}
 */
export function effectTable(table, members = 6) {
  return table === 'crystalCore'
    ? { slot: 2 * members + 2, clut: members }
    : { slot: 2 * members + 4, clut: members + 1 };
}

/**
 * A sprite list: header (origin x and y are bytes 4 and 5) and its record, as the 8 bytes in the effect's table [static].
 * Entry 0xe is the first resource of an object, 0xd the other five.
 * @typedef {{ origin: [number, number], record: number[] }} SpriteList
 */
/** @type {Record<number, SpriteList>} */
export const SPRITE_LISTS = {
  0xe: { origin: [13, 18], record: [0x00, 0x00, 0x00, 0x8c, 0x1f, 0x1f, 0x00, 0x00] },
  0xd: { origin: [14, 17], record: [0x00, 0x00, 0x00, 0x88, 0x1f, 0x1f, 0x00, 0x00] },
};

/**
 * What the draw writes into a packet from a record: size, texture coordinates, tpage and clut halves [static: formulas of the draw].
 * @param {number[]} record - the 8-byte sprite record
 * @param {{ slot: number, clut: number }} table - table[6] and table[7] of the record's effect table
 * @returns {{ width: number, height: number, u: number, v: number, tpage: number, clut: number }}
 */
export function decodeSprite(record, table) {
  const index = (table.slot + record[2]) & 0xff;
  const slotX = (Math.floor(index / 20) * 5 + (index % 5)) * 64 + 0x140;
  const k = Math.floor((index % 20) / 5);
  const slotY = (k >> 1) << 8;
  let u = (record[3] & 0xf) * 8;
  let v = (k & 1) * 128 + (record[3] >> 4) * 8;
  if (record[7] & 0x80) {
    u -= 0x80;
    v -= 0x80;
  }
  const clutRow = (table.clut + record[6]) & 0xff;
  return {
    width: record[4],
    height: record[5],
    u,
    v,
    tpage: 0x80 | ((slotY & 0x100) >> 4) | ((slotX & 0x3ff) >> 6),
    clut: ((0x1e0 + clutRow) << 6) | 0x10,
  };
}
