import { div32ulo } from './lib.js';

export function CliveAppearance(rng) {
  const a = div32ulo(0x7fff, 3);
  const b = div32ulo(rng.getRNG2(), a);
  return b === 0 ? 'Clive Appears' : 'No Clive';
}


export function MarieDialogue(rng) {
  const a = div32ulo(0x7fff, 9);
  const b = div32ulo(rng.getRNG2(), a);
  return b === 0 ? 'Antonio Dialogue' : 'No Dialogue';
}

