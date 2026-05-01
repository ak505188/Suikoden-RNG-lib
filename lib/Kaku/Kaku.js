import KakuMap from './Map.js';
import { Mina, MovingNPC, NPC } from './NPC.js';

export default class Kaku {
  constructor() {
    this.MAP = new KakuMap();
    this.initNPCs();
    this.events = [];
  }

  initNPCs(meg_recruited = false) {
    this.npcs = [
      new MovingNPC({ x: 36, y: 20, name: 'Orange', bounds: [ 26, 14, 30, 42 ] }),
      new MovingNPC({ x: 25, y: 35, name: 'Old Man', bounds: [ 41, 29, 19, 31 ] }),
      new MovingNPC({ x: 17, y: 56, name: 'Stan', bounds: [ 62, 54, 11, 23 ] }),
      new Mina({ x: 54, y: 23, bounds: [ 57, 1, 8, 68 ]})
    ];

    if (!meg_recruited) {
      this.npcs.push(new NPC({ x: 63, y: 17, name: 'Meg' }));
    }
  }

  checkNPCMovementCollision({ x, y, direction, name }) {
    let collision = false;

    switch(direction) {
      case 0:
        collision = this.MAP.cellsHaveCollision(x, x, y, y+2);
        break;
      case 1:
        collision = this.MAP.cellsHaveCollision(x, x, y-2, y);
        break;
      case 2:
        collision = this.MAP.cellsHaveCollision(x-2, x, y, y);
        break;
      case 3:
        collision = this.MAP.cellsHaveCollision(x, x+2, y, y);
        break;
    }
    if (collision) return true;

    const npc = this.getNPC(name);

    collision = this.npcHasCollisionWithOtherNPCs(npc, direction);
    // console.log('NPC collision', collision);
    return collision;
  }

  getNPC(name) {
    return this.npcs.find(npc => npc.name === name)
  }

  npcHasCollisionWithOtherNPCs(npc, movement_direction) {
    const other_npcs = this.npcs.filter(other_npc => npc.name !== other_npc.name);
    let x_coords = [npc.x, npc.x];
    let y_coords = [npc.y, npc.y];
    switch (movement_direction) {
      case 0:
        y_coords[1] = npc.y + 2;
        break;
      case 1:
        y_coords[0] = npc.y - 2;
        break;
      case 2:
        x_coords[0] = npc.x - 2;
        break;
      case 3:
        x_coords[1] = npc.x + 2;
        break;
    }

    // console.log(x_coords, y_coords);
    for (let i = 0; i < other_npcs.length; i++) {
      const other_npc = other_npcs[i];
      // console.log(other_npc.name, other_npc.x, other_npc.y);
      for (let x = x_coords[0]; x <= x_coords[1]; x++) {
        for (let y = y_coords[0]; y <= y_coords[1]; y++) {
          // Collision check. Need to consider direction, since they're 2 wide.
          const x_distance = Math.abs(x - other_npc.x);
          if (x_distance <= 1 && (y === other_npc.y || y == (other_npc.y - 1))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  reset() {
    this.initNPCs();
  }

  simulateMovement(rng) {
    const events = [];
    this.npcs
      .filter(npc => npc.can_move)
      .forEach(npc =>
    {
      const result = npc.simulateMovement(
        rng, ({ x, y, direction, name }) => this.checkNPCMovementCollision({ x, y, direction, name })
      );
      if (result) events.push({ index: rng.count, ...result });
    });

    if (events.length > 0) {
      this.events = [...this.events, ...events]
    }
    // const npc_str = this.npcs
    //   .map(npc => npc.is_moving)
    //   .map(is_moving => is_moving ? 'T' : 'F')
    //   .join(' ');
    // console.log(`frame: ${i}, index: ${rng.count}, npcs: ${npc_str}`);
    return events;
  }
}
