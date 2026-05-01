import { div32ulo } from '../lib.js';
import { DIRECTIONS } from './lib.js';

const EVENT_TYPES = {
  MOVED: 'Moved',
  TURNED: 'Turned',
  COLLIDED: 'Collided'
};

export class NPC {
  constructor({ x, y, name }) {
    this.name = name
    this.x = x;
    this.y = y;
    this.direction = 0;
    this.can_move = false;
  }

  getOccupiedCoordinates() {
    return [
      { x: this.x-1, y: this.y-1 },
      { x: this.x-1, y: this.y },
      { x: this.x, y: this.y-1 },
      { x: this.x, y: this.y },
      { x: this.x+1, y: this.y-1 },
      { x: this.x+1, y: this.y },
    ]
  }
}

export class MovingNPC extends NPC {
  constructor({ x, y, name, bounds }) {
    super({ x, y, name })
    this.can_move = true;
    this.bounds = bounds;
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

  getEventType(moved, previous_direction) {
    if (moved) return EVENT_TYPES.MOVED;
    if (this.direction !== previous_direction) return EVENT_TYPES.TURNED;
    return EVENT_TYPES.COLLIDED;
  }

  startMove(direction, checkCollision, index) {
    // console.log(`Start move direction: ${DIRECTIONS[direction]}`);
    this.direction = direction;

    // console.log(`${this.name} starting move from ${this.x},${this.y}. Direction: ${DIRECTIONS[this.direction]}`);
    let new_x = this.x;
    let new_y = this.y;

    switch(this.direction) {
      case 0:
        new_y = this.y + 2;
        break;
      case 1:
        new_y = this.y - 2;
        break;
      case 2:
        new_x = this.x - 2;
        break;
      case 3:
        new_x = this.x + 2;
        break;
    }

    if (!this.isPositionInBounds(new_x, new_y)) {
      // console.log('Movement out of bounds:', this.x, this.y, ' > ', new_x, new_y, DIRECTIONS[direction])
      // console.log(this.bounds);
      return this.startMove(this.reverseDirection(), checkCollision, index);
    }

    const collides = checkCollision({ x: this.x, y: this.y, direction, name: this.name });

    if (collides) {
      // console.log(`${this.name} Collision at index: ${index}`);
      // console.log(`${this.name} Current X: ${this.x}, Current Y: ${this.y}, Direction: ${DIRECTIONS[this.direction]}, Behavior: ${this.collision_behavior}`);
      return false;
    }

    this.x = new_x;
    this.y = new_y;
    this.is_moving = true;
    this.move_timer = this.move_duration;
    // console.log(`${this.name} New Pos: ${this.x},${this.y}. Direction: ${DIRECTIONS[this.direction]}`);
    return true;
  }

  isPositionInBounds(x, y) {
    if (x < this.bounds[2] || x > this.bounds[3]) {
      // console.log('Out of bounds x', x);
      return false;
    }
    if (y < this.bounds[1] || y > this.bounds[0]) {
      // console.log('Out of bounds y', y);
      return false;
    }
    // console.log('In bounds');
    return true;
  }

  reverseDirection(direction) {
    direction = direction || this.direction;
    const axis = Math.floor(direction / 2);
    const dir = (direction + 1) % 2;
    return axis * 2 + dir;
  }

  getDirection() {
    return DIRECTIONS[this.direction];
  }

  simulateMovement(rng, checkCollision) {
    if (!this.handleExistingMovement()) return null;

    const will_move = rng.next().getRNG2() < 0xcb;
    if (!will_move) return null;

    let direction_int = this.direction;
    // console.log(`Prev direction: ${DIRECTIONS[direction_int]}`);

    if (div32ulo(rng.next().getRNG2(), 0x1fff) > 0) {
      direction_int = div32ulo(rng.next().getRNG2(), 0x1999) % 4;
      // console.log(`RNG Call direction: ${DIRECTIONS[direction_int]}`);
    }

    // console.log(`Move direction: ${DIRECTIONS[direction_int]}`);
    const original_direction = this.direction;
    const moved = this.startMove(direction_int, checkCollision, rng.count);

    const event = {
      direction: DIRECTIONS[direction_int],
      event: this.getEventType(moved, original_direction),
      moved,
      rng_index: rng.count,
      x: this.x,
      y: this.y,
    };

    this.events.push(event);

    return { name: this.name, ...event };
  }
}

export class Mina extends MovingNPC {
  constructor({ x, y, bounds }) {
    super({ x, y, name: 'Mina' });
    this.bounds = bounds;
    this.move_duration = 16;
    this.timer = 0;
    this.sitting = false;
  }

  simulateMovement(rng, checkCollision) {
    if (!this.handleExistingMovement()) return null;

    // TODO: See how proximity affects Mina
    if (this.timer > 0) {
      this.timer = this.timer - 1;
      return null;
    }

    if (Math.floor(rng.next().getRNG2() / 127) % 150 !== 0) {
      if (this.sitting) {
        return null;
      }

      if (Math.floor(rng.next().getRNG2() / 127) % 3 !== 0) return null;

      if (Math.floor(rng.next().getRNG2() / 255) % 2 === 1) {
        this.timer = 120;
        const event = { name: this.name, index: rng.count, direction: DIRECTIONS[this.direction], moved: false, event: 'Start Mina Timer' }
        this.events.push(event);
        return event;
      } else {
        // Not pushing this as an event, since this is default behavior.
        this.sitting = true;
      }
    } else {
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
      }

      const original_direction = this.direction;
      const moved = this.startMove(direction, checkCollision, rng.count);

      const event = {
        direction: DIRECTIONS[direction],
        event: this.getEventType(moved, original_direction),
        moved,
        name: this.name,
        x: this.x,
        y: this.y,
        rng_index: rng.count,
      };

      this.events.push(event);
      return event;
    }
  }
}
