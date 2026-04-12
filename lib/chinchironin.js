export const CURSOR_POSITIONS = [
  118,
  120,
  122,
  125,
  128,
  132,
  136,
  141,
  146,
  152,
  158,
  165,
  171,
  177,
  182,
  187,
  191,
  195,
  198,
  201,
  203,
  202,
  200,
  198,
  195,
  192,
  188,
  184,
  179,
  174,
  168,
  162,
  155,
  149,
  143,
  138,
  133,
  129,
  125,
  122,
  119,
  117,
];

export class Cursor {
  constructor() {
    this.index = 0;
    return this;
  }

  clone() {
    const cur = new Cursor();
    cur.index = this.index
    return cur;
  }

  getInitialPosIndex() {
    return 20
  }

  goToInitialPos() {
    this.index = this.getInitialPosIndex();
    return this;
  }

  next(amount = 1) {
    this.index = (this.index + amount) % CURSOR_POSITIONS.length;
    return this;
  }

  getValue() {
    const pos = this.getPos();
    return pos < 160 ? 144 - pos : pos - 176;
  }

  getPos() {
    return CURSOR_POSITIONS[this.index];
  }
}

export function calculateWait(rng) {
  const wait = rng.getRNG2() % 100;
  return wait == 0 ? 255 : wait - 1;
}

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

// Cursor value is generally stored in r18
export function isTripleWin(cursor, rng2, speed = 0, rngModifier = 0) {
  let r2 = Math.floor(speed / 8);
  let r3 = cursor.getValue();
  let r4 = Math.abs(r3 >> 0x1f);
  r3 += r4;
  r3 = r3 >> 1;
  r3 = (r3 + 0xfffb) & 0xffff;
  if ((r3 & 0x8000) > 0) {
    r3 = r3 - 0x10000;
  }
  r2 = r2 - r3;
  if (r2 <= 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 >= r5;
}

export function isTripleLose(cursor, rng2, speed = 0, rngModifier = 0) {
  let r2 = cursor.getValue();
  let r3 = Math.abs(r2 >> 0x1f);

  const cursor_value = r2 + r3;
  r2 = 5 - Math.floor(speed / 8) + Math.floor(cursor_value / 2)


  if (r2 <= 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 >= r5;
}

export function isDoubleWin(cursor, rng2, speed = 0, rngModifier = 0) {
  let r2 = 5 + Math.floor(speed / 4) - cursor.getValue();

  if (r2 <= 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 >= r5;
}

export function isDoubleLose(cursor, rng2, speed = 0, rngModifier = 0) {
  let r2 = 5 - Math.floor(speed / 4) + cursor.getValue();

  if (r2 <= 0) {
    return false;
  }

  let r5 = (rng2 + rngModifier) % 100;
  return r2 >= r5;
}

export function isPiss(cursor, rng2, speed = 0, rngModifier = 0) {
  let r3 = rng2 + rngModifier;
  let r4 = r3 % 100;
  let r2 = cursor.getPos();
  r2 = r2 - 144;

  if (r2 >= 0 && r2 < 0x21) {
    return false;
  }

  r2 = 5 + speed + cursor.getValue();
  if (r2 < r4) {
    return false;
  }
  return true;
}

export function simulateRoll(cursor, rng, speed = 0, rng_modifier = 0) {
  rng.next();
  if (isTripleWin(cursor, rng.getRNG2(), speed, rng_modifier)) {
    rng.next();
    const roll = getStandardRollDie(rng, 0, false);
    return `${roll}${roll}${roll}`
  }
  rng.next();
  if (isTripleLose(cursor, rng.getRNG2(), speed, rng_modifier)) {
    return '111';
  }
  rng.next();
  if (isDoubleWin(cursor, rng.getRNG2(), speed, rng_modifier)) {
    return '456';
  }
  rng.next();
  if (isDoubleLose(cursor, rng.getRNG2(), speed, rng_modifier)) {
    return '123';
  }
  rng.next();
  if (isPiss(cursor, rng.getRNG2(), speed, rng_modifier)) {
    // Rolls are still calculated, so need to simulate
    rng.next();
    getStandardRollFull(rng, rng_modifier);
    return 'OUT';
  }
  rng.next()
  return getStandardRollFull(rng, rng_modifier);
}

export function isValidTaiHoRoll(roll_str) {
  return !(
    roll_str == '111' ||
    roll_str == '222' ||
    roll_str == '333' ||
    roll_str == '444' ||
    roll_str == '555' ||
    roll_str == '666' ||
    roll_str == '123' ||
    roll_str == '456' ||
    roll_str == 'OUT')
}

// Assumes start is right away, if wait is needed advance RNG outside this function
export function simulateOpponentRollsFromGameStart(rng, is_tai_ho, frames_to_wait, rng_modifier = 0) {
  is_tai_ho = is_tai_ho == undefined ? true : is_tai_ho;
  frames_to_wait = frames_to_wait || 203;

  rng.next(frames_to_wait);
  const wait = calculateWait(rng);
  const cursor = new Cursor();

  // Move cursor to starting position, and forward based on wait
  cursor.goToInitialPos().next(wait);
  // Push RNG based off time to cursor starting position, and forward based on wait
  rng.next(cursor.getInitialPosIndex() + wait);

  const rolls = Array.from({ length: 17 }).map((_, index) => simulateOpponentRoll(rng.cloneKeepIndex(), cursor.clone(), index * 4, is_tai_ho, rng_modifier));
  return {
    wait,
    rolls,
  };
}

export function simulateOpponentRoll(rng, cursor, speed, is_tai_ho, rng_modifier = 0) {
  while (true) {
    let roll = simulateRoll(cursor, rng, speed, rng_modifier);
    if (!is_tai_ho) return roll;
    if (isValidTaiHoRoll(roll)) return roll;
  }
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
    if (rolls.length < 3) rng.next();
  } while (rolls.length < 3);
  return rolls.sort().join('');
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
    if (roll === null) rng.next();
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
