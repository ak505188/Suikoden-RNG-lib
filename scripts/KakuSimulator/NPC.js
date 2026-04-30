import RNG from '../../lib/rng.js';
import { div32ulo } from '../../lib/lib.js';
import { DIRECTIONS } from './lib.js';

export class NPC {
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

  startMove(direction_int, checkCollision, index) {
    console.log(`Start move direction: ${DIRECTIONS[direction_int]}`);
    this.direction = direction_int;

    console.log(`${this.name} starting move from ${this.x},${this.y}. Direction: ${DIRECTIONS[this.direction]}`);

    if (!checkCollision({ x: this.x, y: this.y, direction: this.direction })) {
      this.is_moving = true;
      this.move_timer = this.move_duration;
      switch(this.direction) {
        case 0:
          this.y = this.y + 2;
          break;
        case 1:
          this.y = this.y - 2;
          break;
        case 2:
          this.x = this.x - 2;
          break;
        case 3:
          this.x = this.x + 2;
          break;
      }
      console.log(`${this.name} New Pos: ${this.x},${this.y}. Direction: ${DIRECTIONS[this.direction]}`);
    } else {
      console.log(`${this.name} Collision at index: ${index}`);
      console.log(`${this.name} Current X: ${this.x}, Current Y: ${this.y}, Direction: ${DIRECTIONS[this.direction]}`);
    }
  }

  getDirection() {
    return DIRECTIONS[this.direction];
  }

  simulateMovement(rng, checkCollision) {
    if (!this.handleExistingMovement()) return null;

    const will_move = rng.next().getRNG2() < 0xcb;
    if (!will_move) return null;

    let direction_set_by = 'Previous Movement';
    let direction_int = this.direction;
    console.log(`Prev direction: ${DIRECTIONS[direction_int]}`);

    if (div32ulo(rng.next().getRNG2(), 0x1fff) > 0) {
      direction_set_by = 'RNG Call';
      rng.next();
      console.log(rng);
      direction_int = div32ulo(rng.getRNG2(), 0x1999) % 4;
      console.log(`RNG Call direction: ${DIRECTIONS[direction_int]}`);
    }

    console.log(`Move direction: ${DIRECTIONS[direction_int]}`);
    this.startMove(direction_int, checkCollision, rng.count);

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

export class Mina extends NPC {
  constructor({ x, y }) {
    super({ x, y, name: 'Mina' });
    this.move_duration = 16;
    this.timer = 0;
    this.sitting = false // Need to check how Mina starts
  }

  simulateMovement(rng, _checkCollision, frame) {
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
        let r2 = div32ulo(rng.next().getRNG2(), 127);
        // This block should be close to equivalent to r2 % 4;
        let r3 = r2;
        if (r2 === 0) r2 = 3;
        r2 = r2 >> 2;
        r2 = r2 << 2;
        direction = r3 - r2;
        direction_set_by = 'RNG Call';
      }
      this.startMove(direction, () => false);

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
