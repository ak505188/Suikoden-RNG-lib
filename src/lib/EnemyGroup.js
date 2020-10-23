import { div32ulo } from './lib';

export default class EnemyGroup {
  constructor(name, enemies) {
    this.name = name;
    this.enemies = enemies;
    this.champVal = this.calcChampionVal(this.enemies);
  }

  calculateDrops(rng, iterations) {
    const drops = [];
    for (let i = 0; i < iterations; i++) {
      const drop = this.calculateDrop(rng.clone());
      drops.push({ rng: rng.getRNG(), drop });
      rng.next();
    }
    return drops;
  }

  // This function advances RNG
  calculateDrop(rng) {
    for (const enemy of this.enemies) {
      let r2 = rng.next().getRNG2();
      const dropIndex = r2 % 3;
      if (dropIndex < enemy.drops.length) {
        const dropRate = enemy.drops[dropIndex].rate;
        r2 = rng.next().getRNG2();
        if (r2 % 100 < dropRate) {
          return enemy.drops[dropIndex].item;
        }
      }
    }
    return '';
  }

  calcChampionVal(enemies) {
    let level = 0;
    for (const enemy of enemies) {
      level += enemy.stats.lvl;
    }
    level = (level << 4) - level;
    return div32ulo(level, 0xa);
  }
}
