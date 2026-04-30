import KakuMap from './Map.js';
import { Mina, NPC } from './NPC.js';

export default class Kaku {
  constructor() {
    this.MAP = new KakuMap();
  }

  checkNPCMovementCollision({ x, y, direction }, NPCs) {
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

    // TODO: NPC Collision
    return false;
  }

  simulateMovement(rng, frames_to_sim) {
    const MovingNPCs = [
      new NPC({ x: 36, y: 20, name: 'Orange' }),
      new NPC({ x: 25, y: 35, name: 'Old Man' }),
      new NPC({ x: 17, y: 56, name: 'Stan' }),
      new Mina({ x: 63, y: 17 })
    ];
    const events = [];

    for (let i = 1; i <= frames_to_sim; i++) {
      MovingNPCs.forEach(npc => {
        const result = npc.simulateMovement(
          rng,
          ({ x, y, direction }) => this.checkNPCMovementCollision({ x, y, direction }),
          i
        );
        if (result) events.push({ frame: i, ...result });
      });
      const npc_str = MovingNPCs
        .map(npc => npc.is_moving)
        .map(is_moving => is_moving ? 'T' : 'F')
        .join(' ');
      console.log(`frame: ${i}, index: ${rng.count}, npcs: ${npc_str}`);
    }
    return events;
  }
}
