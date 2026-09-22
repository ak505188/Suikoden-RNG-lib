// Raw bytes read directly from Ghidra at SquareRoot0's lookup table (0x8017242c), 192
// int16 entries. SquareRoot0 is a standard PSX SDK library routine (GTE-hardware
// leading-zero-count + table lookup), not part of the spell logic itself - reproduced
// here bit-for-bit because spell_flamingarrow_spawn_particle calls it directly.
const sqrt0TableHex = "00101f103f105e107e109c10bb10da10f8101611341152116f118c11a911c611e31100121c123812541270128c12a712c212de12f91214132e13491364137e139813b213cc13e6130014191432144c1465147e149714b014c814e114f91412152a1542155a1572158a15a215b915d115e815001617162e1645165c1673168916a016b716cd16e416fa16101726173c17521768177e179417aa17bf17d517ea17001815182a183f18541869187e189318a818bd18d118e618fa180f19231938194c196019741988199c19b019c419d819ec19001a131a271a3a1a4e1a611a751a881a9b1aae1ac21ad51ae81afb1a0e1b211b331b461b591b6c1b7e1b911ba31bb61bc81bdb1bed1b001c121c241c361c481c5a1c6c1c7e1c901ca21cb41cc61cd81ce91cfb1c0d1d1e1d301d411d531d641d761d871d981daa1dbb1dcc1ddd1dee1d001e111e221e331e431e541e651e761e871e981ea81eb91eca1eda1eeb1efb1e0c1f1c1f2d1f3d1f4e1f5e1f6e1f7e1f8f1f9f1faf1fbf1fcf1fdf1fef1f"

function loadSqrt0Table() {
  const bytes = hexToByteArray(sqrt0TableHex)
  const table16 = {};
  for (let i = 0; i < sqrt0TableHex.length / 4; i++) {
    let lo = bytes[i * 2];
    let hi = bytes[i * 2 + 1];
    let v = lo | (hi << 8);
    if (v >= 0x8000) {
      v = v - 0x10000
    }
    table16[i] = v
  }
  return table16
}

export const Sqrt0Table = loadSqrt0Table();


/** @param {string} hex
 * @returns {number[]}
 */
export function hexToByteArray(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i = i + 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}
