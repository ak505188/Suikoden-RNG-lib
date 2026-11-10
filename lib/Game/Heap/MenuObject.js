/**
 * The Fight menu's 12776-byte object as the menu build writes it (Suikoden-Bizhawk-HUD notes/2026-11-09_vfx_menu_rebuild.md section 1-2, v1.0,
 * static; 24960 + 24960 + 224640 gradient bytes and the header words equal in 60 prompt dumps): the 13 gradient sub-structs' primitives and
 * headers and the table of ones. Everything else in it (the member and enemy lists, the window pointers' neighbours, the unwritten bytes
 * of every primitive) is the previous owner's, so a word is returned with the mask of the bytes the build sets.
 */

/** The gradient sub-structs: 13 at +0x100, 0x3bc bytes apart (FUN_800efad0) */
const GRADIENT_AT = 0x100;
const GRADIENT_STRIDE = 0x3bc;
const GRADIENTS = 13;

/**
 * The bytes the build writes into the object, by word: `[offset, value, mask]` for every written word (mask = the bytes set).
 * @param {{ windows: number[], cursor: number }} pointers - the eight window objects' addresses and the 36-byte cursor object's
 * @returns {[number, number, number][]}
 */
export function menuObjectWrites({ windows, cursor }) {
  /** @type {[number, number, number][]} */
  const out = [];
  const set = (/** @type {number} */ offset, /** @type {number} */ value, mask = 0xffffffff) =>
    out.push([offset, value >>> 0, mask >>> 0]);
  // the state word (+4) is 0 at the build and 2 once the menu is up; the ones table at +0xcc
  for (let i = 0; i < GRADIENTS; i++) set(0xcc + 4 * i, 1);
  windows.forEach((w, k) => set(0x31c4 + 4 * k, w));
  set(0x31e4, cursor);
  for (let i = 0; i < GRADIENTS; i++) {
    const s = GRADIENT_AT + GRADIENT_STRIDE * i;
    // two buffers (+4 and +0x1c4) of 16 prims of 28 bytes: the length byte 6 and code 0x30 and the three colours' bytes
    for (const buffer of [4, 0x1c4])
      for (let t = 0; t < 16; t++) {
        const p = s + buffer + 0x1c * t;
        const [c01, c2] = t < 8 ? [16 * t, 16 + 16 * t] : [(16 - t) * 16, (15 - t) * 16];
        const rgb = (/** @type {number} */ v) => (v << 16) | (v << 8) | v;
        set(p, 0x06000000, 0xff000000);
        set(p + 4, (0x30 << 24) | rgb(c01 & 0xff));
        set(p + 0xc, rgb(c01 & 0xff), 0x00ffffff);
        set(p + 0x14, rgb(c2 & 0xff), 0x00ffffff);
      }
    // the sub-struct's header: halfwords at +0 (0), +0x384 (0x10), +0x386, +0x388, +0x38a (0), words at +0x38c.. (0), +0x398 (the upper 20 bits)
    set(s + 0, 0, 0x0000ffff);
    set(s + 0x384, 0x10, 0x0000ffff);
    set(s + 0x384, 0, 0xffff0000);
    set(s + 0x388, 0);
    for (const o of [0x38c, 0x390, 0x394, 0x39c, 0x3a0]) set(s + o, 0);
    set(s + 0x398, 0x10000, 0xfffff000);
  }
  return out;
}
