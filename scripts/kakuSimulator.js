import RNG from '../lib/rng.js';
import { div32ulo } from '../lib/lib.js';

const DIRECTIONS = [
  'Down',
  'Up',
  'Left',
  'Right',
]

class NPC {
  constructor({ x, y, name }) {
    this.name = name
    this.x = x;
    this.y = y;
    this.direction = 0;
    this.is_moving = false;
    this.move_timer = 0;
    this.move_duration = 16;
    this.events = [];
  }

  // Returns boolean if we should simulate movement
  handleExistingMovement() {
    if (!this.is_moving) return true;

    this.move_timer = this.move_timer - 1;

    if (this.move_timer === 0) {
      this.is_moving = false;
    }

    return !this.is_moving;
  }

  startMove(direction_int) {
    direction_int = direction_int || this.direction;
    this.is_moving = true;
    this.move_timer = this.move_duration;
    this.direction = direction_int;

    switch(this.direction) {
      case 0:
        this.y = this.y + 2;
      case 1:
        this.y = this.y - 2;
      case 2:
        this.x = this.x - 2;
      case 3:
        this.x = this.x + 2;
    }
  }

  getDirection() {
    return DIRECTIONS[this.direction];
  }

  simulateMovement(rng) {
    if (!this.handleExistingMovement()) return null;

    const will_move = rng.next().getRNG2() < 0xcb;
    if (!will_move) return null;

    let direction_set_by = 'Previous Movement';
    let direction_int = this.direction;

    if (div32ulo(rng.next().getRNG2(), 0x1fff) > 0) {
      direction_set_by = 'RNG Call';
      direction_int = div32ulo(rng.next().getRNG2(), 0x1999) % 4;
    }

    this.startMove(direction_int);

    const event = {
      direction_set_by,
      direction: DIRECTIONS[direction_int],
      event: 'Move',
      rng_index: rng.count,
    };

    this.events.push(event);

    return { name: this.name, ...event };
  }
}

class Mina extends NPC {
  constructor({ x, y }) {
    super({ x, y, name: 'Mina' });
    this.move_duration = 16;
    this.timer = 0;
    this.sitting = false // Need to check how Mina starts
  }

  simulateMovement(rng, frame) {
    const debug_frame = 194;

    const debug_msg = msg => {
      if (frame == debug_frame) console.log(msg)
    };

    debug_msg('Is this working?')

    if (!this.handleExistingMovement()) return null;

    // TODO: See how proximity affects Mina
    if (this.timer > 0) {
      this.timer = this.timer - 1;
      return null;
    }

    if (Math.floor(rng.next().getRNG2() / 127) % 150 !== 0) {
      if (this.sitting) {
        debug_msg('sitting');
        return null;
      }

      if (Math.floor(rng.next().getRNG2() / 127) % 3 !== 0) {
        debug_msg('%3 == 0');
        return null;
      }

      if (Math.floor(rng.next().getRNG2() / 255) % 2 === 1) {
        debug_msg('start mina timer');
        this.timer = 120;
        const event = { name: this.name, index: rng.count, event: 'Start Mina Timer' }
        this.events.push(event);
        return event;
      } else {
        // Not pushing this as an event, since this is default behavior.
        debug_msg('sit down');
        this.sitting = true;
      }
    } else {
      let direction_set_by = 'Previous Movement';
      let direction = this.direction;
      this.sitting = false;

      if (Math.floor(rng.next().getRNG2() / 127) % 3 !== 0) {
        let r2 = Math.floor(rng.next().getRNG2() / 127);
        // This block should be close to equivalent to r2 % 4;
        let r3 = r2;
        if (r2 === 0) r2 = 3;
        r2 = r2 >> 2;
        r2 = r2 << 2;
        direction = r3 - r2;
        direction_set_by = 'RNG Call';
        this.startMove(direction);
      } else {
        this.startMove(direction);
      }

      debug_msg(`handle movement ${direction_set_by}`);

      const event = {
        direction_set_by,
        direction: DIRECTIONS[direction],
        event: 'Move',
        name: this.name,
        rng_index: rng.count,
      };

      this.events.push(event);
      return event;
    }
    debug_msg('Should never get here');
  }
}

const MovingNPCs = [
  new NPC({ x: 36, y: 20, name: 'Orange' }),
  new NPC({ x: 25, y: 35, name: 'Old Man' }),
  new NPC({ x: 17, y: 56, name: 'Stan' }),
  new Mina({ x: 63, y: 17 })
];

const frames_to_sim = 300;
const rng = new RNG(0xbff1cc1a);
const events = [];

for (let i = 1; i <= frames_to_sim; i++) {
  MovingNPCs.forEach(npc => {
    const result = npc.simulateMovement(rng, i);
    if (result) events.push({ frame: i, ...result });
  });
  const npc_str = MovingNPCs
    .map(npc => npc.is_moving)
    .map(is_moving => is_moving ? 'T' : 'F')
    .join(' ');
  console.log(`frame: ${i}, index: ${rng.count}, npcs: ${npc_str}`);
}

console.log(events);
// MovingNPCs.forEach(npc => console.log(npc));
