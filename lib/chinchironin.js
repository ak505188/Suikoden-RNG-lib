export const possibleCursors = [
  117,
  118,
  119,
  120,
  122,
  125,
  128,
  129,
  132,
  133,
  136,
  138,
  141,
  143,
  146,
  149,
  152,
  155,
  158,
  162,
  165,
  168,
  171,
  174,
  177,
  179,
  182,
  184,
  187,
  188,
  191,
  192,
  195,
  198,
  200,
  201,
  202,
  203
]

export const possibleR18s = [
  { r18: -14, cursor: 158 },
  { r18: -11, cursor: 155 },
  { r18: -8,  cursor: 152 },
  { r18: -5,  cursor: 149 },
  { r18: -2,  cursor: 146 },
  { r18: 1,   cursor: 143 },
  { r18: 3,   cursor: 141 },
  { r18: 6,   cursor: 138 },
  { r18: 8,   cursor: 136 },
  { r18: 11,  cursor: 133 },
  { r18: 12,  cursor: 132 },
  { r18: 15,  cursor: 129 },
  { r18: 16,  cursor: 128 },
  { r18: 19,  cursor: 125 },
  { r18: 22,  cursor: 122 },
  { r18: 24,  cursor: 120 },
  { r18: 25,  cursor: 119 },
  { r18: 26,  cursor: 118 },
  { r18: 27,  cursor: 117 },
]

export function isTripleWin(cursor, rng2, rngModifier = 0) {
  let r18;
  if (cursor < 160) {
    r18 = 144 - cursor;
  } else {
    r18 = cursor - 176;
  }

  let r2 = 0;
  let r3 = r18;
  let r4 = r18 >> 0x1f;
  r3 += r4;
  r3 = r3 >> 1;
  r3 = (r3 + 0xfffb) & 0xffff;
  if ((r3 & 0x8000) > 0) {
    r3 = r3 - 0x10000;
  }
  r2 = r2 - r3;
  if (r2 < 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 > r5;
}

// Triple Lose
export function isTripleLose(cursor, rng2, rngModifier = 0) {
  let r18;
  if (cursor < 160) {
    r18 = 144 - cursor;
  } else {
    r18 = cursor - 176;
  }

  let r2 = r18;
  let r3 = r2 >> 0x1f;
  r2 = r2 + r3;
  r2 = r2 >> 1;
  r2 = r2 + 5;

  if (r2 < 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 > r5;
}

export function isDoubleWin(cursor, rng2, rngModifier = 0) {
  let r18;
  if (cursor < 160) {
    r18 = 144 - cursor;
  } else {
    r18 = cursor - 176;
  }

  let r3 = r18 - 5;
  let r2 = -r3;

  if (r2 < 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 > r5;
}

export function isDoubleLose(cursor, rng2, rngModifier = 0) {
  let r18;
  if (cursor < 160) {
    r18 = 144 - cursor;
  } else {
    r18 = cursor - 176;
  }

  let r3 = r18 + 5;
  let r2 = r3;

  if (r2 < 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 > r5;
}

export function isPiss(cursor, rng2, rngModifier = 0) {
  let r18;
  if (cursor < 160) {
    r18 = 144 - cursor;
  } else {
    r18 = cursor - 176;
  }

  let r3 = rng2 + rngModifier;
  let r4 = r3 % 100;
  let r2 = cursor;
  r2 = r2 - 144;

  if (r2 >= 0 && r2 < 0x21) {
    return false;
  }

  r2 = r18 + 5;
  if (r2 < r4) {
    return false;
  }
  return true;
}

export function simulateRoll(cursor, rng, rngModifier = 0) {
  rng.next();
  if (isTripleWin(cursor, rng.getRNG2(), rngModifier)) {
    rng.next();
    const roll = getStandardRollDie(rng, 0, false);
    return `${roll}${roll}${roll}`
  }
  rng.next();
  if (isTripleLose(cursor, rng.getRNG2(), rngModifier)) {
    return '111';
  }
  rng.next();
  if (isDoubleWin(cursor, rng.getRNG2(), rngModifier)) {
    return '456';
  }
  rng.next();
  if (isDoubleLose(cursor, rng.getRNG2(), rngModifier)) {
    return '123';
  }
  rng.next();
  if (isPiss(cursor, rng.getRNG2(), rngModifier)) {
    return 'OUT';
  }
  rng.next()
  return getStandardRollFull(rng, rngModifier);
}

export function getStandardRollFull(rng, rngModifier = 0) {
  let counter = 0;
  let rolls = [];
  const changeCounter = count => counter = count;
  do {
    const roll = getStandardRoll(rng.getRNG2(), counter, changeCounter, rngModifier);
    if (roll !== null) {
      rolls.push(roll + 1);
      counter = 0;
    }
    rng.next();
  } while (rolls.length < 3);
  return rolls.join('');
}

export function getStandardRollDie(rng, rngModifier = 0, canBeOne = true) {
  let counter = 0;
  const changeCounter = count => counter = count;
  let roll = null;
  while (roll === null) {
    roll = getStandardRoll(rng.getRNG2(), counter, changeCounter, rngModifier);
    if (roll === 0 && !canBeOne) {
      roll = null;
    }
    rng.next();
  }
  return roll + 1;
}

export function getStandardRoll(rng2, counter, changeCounter, rngModifier = 0) {
  const r2 = (rng2 + rngModifier) % 100;
  counter = (counter + r2) & 0xff;
  changeCounter(counter);
  if (counter < 6) {
    return counter;
  }
  return null;
}
