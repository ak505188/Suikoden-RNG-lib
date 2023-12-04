const should_log = process.env.SHOULD_LOG

export const OPPONENTS = {
  Gaspar: 'Gaspar',
  Tai_Ho: 'Tai Ho',
}

export const PLAYERS = {
  ...OPPONENTS,
  Player: 'Player',
}

export const possibleCursorsOrderedAfterWaitTime = [
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
]

export class Cursor {
  constructor() {
    this.index = 0;
  }

  next() {
    this.index = this.index + 1;
    if (this.index >= possibleCursorsOrderedAfterWaitTime.length) {
      this.index = 0;
    }
  }

  get pos() {
    return possibleCursorsOrderedAfterWaitTime[this.index];
  }

  get value() {
    return this.pos < 160 ? 144 - this.pos : this.pos - 176;
  }
}

export function isTripleWin(cursor, rng_short, rng_modifier = 0) {
  let r2 = 0;
  let r3 = cursor.value;
  let r4 = cursor.value >>> 0x1f;
  r3 += r4;
  r3 = r3 >> 1;
  r3 = (r3 + 0xfffb) & 0xffff;
  if ((r3 & 0x8000) > 0) {
    r3 = r3 - 0x10000;
  }
  r2 = r2 - r3;

  let r5 = (rng_short + rng_modifier) % 100;
  should_log && console.log(`3W r2:${r2} r5:${r5}`);

  if (r2 <= 0) {
    return false;
  }

  return r2 >= r5;
}

export function isTripleLose(cursor, rng_short, rng_modifier = 0) {
  let r2 = cursor.value;
  let r3 = r2 >>> 0x1f;

  r2 = r2 + r3;
  r2 = r2 >> 1;
  r2 = r2 + 5;

  let r5 = (rng_short + rng_modifier) % 100;
  should_log && console.log(`3L r2:${r2} r5:${r5}`);
  if (r2 <= 0) {
    return false;
  }


  return r2 >= r5;
}

export function isDoubleWin(cursor, rng_short, rng_modifier = 0) {
  let r3 = cursor.value - 5;
  let r2 = -r3;
  let r5 = (rng_short + rng_modifier) % 100;

  should_log && console.log(`2W r2:${r2} r5:${r5}`);

  if (r2 <= 0) {
    return false;
  }

  return r2 >= r5;
}

export function isDoubleLose(cursor, rng_short, rng_modifier = 0) {
  let r3 = cursor.value + 5;
  let r2 = r3;
  let r5 = (rng_short + rng_modifier) % 100;

  should_log && console.log(`2L r2:${r2} r5:${r5}`);

  if (r2 <= 0) {
    return false;
  }


  return r2 >= r5;
}

export function isPiss(cursor, rng_short, rng_modifier = 0) {
  let r3 = rng_short + rng_modifier;
  let r4 = r3 % 100;
  let r2 = cursor.pos;
  r2 = r2 - 144;

  if (r2 >= 0 && r2 < 0x21) {
    return false;
  }

  r2 = cursor.value + 5;

  if (r2 < r4) {
    return false;
  }
  return true;
}

export function simulateRoll(cursor, rng, rng_modifier = 0, should_log = false) {
  rng.next();
  should_log && console.error(`Simulate start ${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const is_triple_win = isTripleWin(cursor, rng.getRNG2(), rng_modifier);
  if (is_triple_win) {
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} is triple win`);
    rng.next();
    const roll = getStandardRollDie(rng, rng_modifier, false);
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} triple win value: ${roll}`);
    return `${roll}${roll}${roll}`
  }
  rng.next();
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const is_triple_lose = isTripleLose(cursor, rng.getRNG2(), rng_modifier);
  if (is_triple_lose) {
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} triple lose`);
    return '111';
  }
  rng.next();
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const is_double_win = isDoubleWin(cursor, rng.getRNG2(), rng_modifier);
  if (is_double_win) {
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} double win`);
    return '456';
  }
  rng.next();
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const is_double_lose = isDoubleLose(cursor, rng.getRNG2(), rng_modifier);
  if (is_double_lose) {
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} double lose`);
    return '123';
  }
  rng.next();
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const is_piss = isPiss(cursor, rng.getRNG2(), rng_modifier);
  if (is_piss) {
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} is_piss`);
    rng.next();
    const rolls = getStandardRollFull(rng, rng_modifier);
    should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} Piss Rolls ${rolls}`);
    return 'OUT';
  }
  rng.next()
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()}`);
  const roll = getStandardRollFull(rng, rng_modifier);
  should_log && console.error(`${rng.getRNG().toString(16)} I:${rng.getCount()} is normal roll ${roll}`);
  return roll
}

export function getStandardRollFull(rng, rng_modifier = 0, roll_count = 3) {
  let counter = 0;
  let rolls = [];
  const changeCounter = count => counter = count;
  while (true) {
    const roll = getStandardRoll(rng.getRNG2(), counter, changeCounter, rng_modifier, true);

    if (roll !== null) {
      rolls.push(roll + 1);
      counter = 0;
    }
    if (rolls.length >= roll_count) {
      return rolls.sort().join('');
    }
    rng.next();
  }
}

export function getStandardRollDie(rng, rng_modifier = 0, can_be_one = true) {
  let counter = 0;
  const changeCounter = count => counter = count;
  let roll = null;
  while (roll === null) {
    roll = getStandardRoll(rng.getRNG2(), counter, changeCounter, rng_modifier);
    if (roll === 0 && !can_be_one) {
      roll = null;
    }
    if (roll === null) {
      rng.next();
    }
  }
  return roll + 1;
}

export function getStandardRoll(rng_short, counter, changeCounter, rng_modifier = 0) {
  const r2 = (rng_short + rng_modifier) % 100;
  counter = (counter + r2) & 0xff;
  changeCounter(counter);
  if (counter < 6) {

    return counter;
  }
  return null;
}

export function isValidTaiHoRoll(roll_str) {
  if (roll_str == '111' || roll_str == '222' || roll_str == '333' || roll_str == '444' || roll_str == '555' || roll_str == '666') return false;
  if (roll_str == '123' || roll_str == '456' || roll_str == 'OUT') return false;
  return true;
}

export function calculateWait(rng_short) {
  const wait = rng_short % 100;
  return wait == 0 ? 255 : wait - 1;
}

export function calculateOpponentRoll(rng, wait, is_tai_ho = false, rng_modifier = 0) {
  let cursor = new Cursor()
  do {
    cursor.next()
    rng.next()
  } while (cursor.pos != 203);
  for (let i = wait; i > 0; i--) {
    cursor.next()
    rng.next();
  }
  while (true) {
    const roll = simulateRoll(cursor, rng, rng_modifier, should_log);
    if (!is_tai_ho) return roll;
    if (isValidTaiHoRoll(roll)) return roll;
  }
}

export function simulateRollFromGameStart(rng, frames_before_wait_calculation = 203, is_tai_ho = false, rng_modifier = 0) {
  const initial_rng_str = rng.toString();
  rng.next(frames_before_wait_calculation);
  const wait = calculateWait(rng.getShort());
  should_log && console.error('Wait:', wait);
  const roll_rng_str = rng.toString();
  const roll_rng_index = rng.getCount();
  const roll = calculateOpponentRoll(rng, wait, is_tai_ho, rng_modifier);
  return { initial_rng: initial_rng_str, roll_rng: roll_rng_str, roll_rng_index, roll, wait };
}

export function simulateRollsFromGameStart(rng, frames_before_wait_calculation = 203, is_tai_ho, iterations = 1, rng_modifier = 0) {
  const rolls_data = [];
  for (let i = 0; i < iterations; i++) {
    const roll_data = simulateRollFromGameStart(rng.clone(), frames_before_wait_calculation, is_tai_ho, rng_modifier);
    rolls_data.push({ ...roll_data, roll_rng_index: roll_data.roll_rng_index + i, initial_rng_index: i });
    rng.next();
  }
  return rolls_data;
}
