import RNG from '../lib/rng.js';
import { Areas } from '../lib/lib.js';
import { characterLevelUps } from '../stats/growths.js'

const STARTING_RNG = 0x12;
const ELVES_VILLAGE_DISTANCE = 41;
const KOBOLD_VILLAGE_DISTANCE = 42;
const ELVES_VILLAGE_LOAD = 1;
const KOBOLD_VILLAGE_LOAD = 5;

const base_rng = new RNG(STARTING_RNG);

const dwarves_trail_battles = Areas['Dwarves Trail'].generateEncounters(base_rng.clone(), 50000).map(battle => ({ enemy_group: battle.enemyGroup.name, index: battle.index, battle_index: battle.index + 1, battle_rng: battle.battleRNG }));
const wm_battles = Areas['Pannu Yakuta Area'].generateEncounters(base_rng.clone(), 60000).map(battle => ({ enemy_group: battle.enemyGroup.name, index: battle.index, battle_index: battle.index + 1, battle_rng: battle.battleRNG }));

const newRNGFromBattle = battle => {
  const rng = new RNG(0x12);
  rng.rng = battle.battle_rng;
  rng.rng2 = rng.calcRNG2(rng.rng);
  rng.count = battle.battle_index;
  return rng;
}

const getUsableSetups = (rng, iterations) => {
  const results = [];
  for (let i = 0; i <= iterations; i++) {
    const rng_to_use = rng.cloneKeepIndex();
    const stats_gained = characterLevelUps('Kuromimi', 1, 23, rng_to_use)
    // if (RNG.isRun(rng_to_use.clone().next().rng2)) {
    //   successes.push(`[${i},${rng_to_use.count},${stats_gained.SPD + 9}]`);
    // }
    results.push(
      RNG.isRun(rng_to_use.next().rng2) ?
      stats_gained.SPD + 9 :
      ''
    );
    rng.next();
  }
  return results;
}

const walkToTown = (rng, battle_pool, distance, load, load_increase_if_battle) => {
  // 1st 4 steps in grace period
  const battles = [];
  distance = distance - load;
  let step_count = 0;
  let grace_period = 4;
  do {
    distance--;
    step_count++;
    if (grace_period <= 0) {
      rng.next();
      const found_battle = battle_pool.find(battle => battle.index == rng.count);
      if (found_battle) {
        battles.push({ step_count, ...found_battle });
        rng.next();
        grace_period = 4;
        // Running to Village of the elves, the load is 1 longer if you get a battle;
        if (load_increase_if_battle && battles.length === 1) {
          distance--;
        }
      }
    } else {
      grace_period--;
    }
  } while (distance > 0)

  return battles;
}

const walks = dwarves_trail_battles
  .map(trail_battle => {
  const rng = newRNGFromBattle(trail_battle);
  const start_index = rng.count;
  const start_rng = `0x${rng.getRNG().toString(16)}`;
  const battle_pool = wm_battles.filter(battle => battle.index > rng.count && battle.index < rng.count + ELVES_VILLAGE_DISTANCE + KOBOLD_VILLAGE_DISTANCE);

  const battles_from_elves_walk = walkToTown(rng, battle_pool, ELVES_VILLAGE_DISTANCE, ELVES_VILLAGE_LOAD, true);
  const elves_walk_index = rng.count;
  const battles_from_kobolds_walk = walkToTown(rng, battle_pool, KOBOLD_VILLAGE_DISTANCE, KOBOLD_VILLAGE_LOAD);
  const end_index = rng.count;
  const end_rng = `0x${rng.getRNG().toString(16)}`;
  const next_battle = wm_battles.find(battle => battle.index > rng.count);
  const steps_until_next_battle = next_battle.index - rng.count;

  const usable_setups = getUsableSetups(rng, 5);

  return {
    group: trail_battle.enemy_group,
    start_index,
    start_rng,
    end_index,
    end_rng,
    usable_setups,
    elves_walk_index,
    next_battle: next_battle.index,
    steps_until_next_battle,
    battles: {
      elves: battles_from_elves_walk,
      kobolds: battles_from_kobolds_walk,
    }
  }
});

// console.log(JSON.stringify(walks, null, 2));

console.log('Group,Index,NB,+0,+1,+2,+3,+4,+5,Battles,End Index,Start RNG,End RNG');
walks.forEach(walk => {
  console.log([
    walk.group,
    walk.start_index,
    walk.next_battle-walk.end_index,
    walk.usable_setups.join(','),
    walk.battles.elves.length + walk.battles.kobolds.length,
    walk.end_index,
    walk.start_rng,
    walk.end_rng
  ].join(','));
});
