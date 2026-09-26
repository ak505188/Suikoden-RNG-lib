import Enemy from '../Enemy.js';
import { ENEMY_KEYS } from '../../Keys.js';
import { ACTION_TYPES } from '../Actions.js';
import { cDiv } from '../../../lib.js';
import { ELEMENTS } from '../../Constants.js';

/** @typedef {import('../Combatant.js').CombatantTurnParams} CombatantTurnParams */
/** @typedef {import('../Actions.js').EnemyAction} EnemyAction */
/** @typedef {import('../Party.js').PlayerParty} PlayerParty */
/** @typedef {import('../../../rng.js').default} RNG */

// zombie_dragon_ai_select_target_and_move (vb5g.bin 0x80012968)
class ZombieDragon extends Enemy {
  static ATTACK_THRESHOLD = 0x47; // ~71% Attack, ~29% Fire Breath
  // calc_rune_element_attack_damage's element argument is 6: the Resurrection Rune's category,
  // so Resurrection resists it and Fire doesn't.
  static FIRE_BREATH = { name: 'Fire Breath', element: ELEMENTS.RESURRECTION, frames: 392 };

  constructor() {
    super(ENEMY_KEYS.ZOMBIE_DRAGON);
  }

  /** @param {CombatantTurnParams} params @returns {EnemyAction} */
  selectAction(params) {
    // The target pass runs first, even on round 1 where Fire Breath ignores it
    const choice = super.selectAction(params);
    if (choice.action !== ACTION_TYPES.ATTACK) return choice;

    if (params.turn_count === 1) return this.fireBreath(); // no move roll
    if (cDiv(params.rng.next().rand * 100, 0x7fff) < ZombieDragon.ATTACK_THRESHOLD) return choice;
    return this.fireBreath();
  }

  /** @returns {EnemyAction} */
  fireBreath() {
    const { name, frames } = ZombieDragon.FIRE_BREATH;
    return { action: ACTION_TYPES.ABILITY, name, frames };
  }

  /** @param {string} name @param {{ party: PlayerParty, rng: RNG }} params */
  useAbility(name, { party, rng }) {
    if (name !== ZombieDragon.FIRE_BREATH.name) return super.useAbility(name, { party, rng });
    // Every living party member, in actor order. The loop counter sits in $s1, which an unlisted
    // rune's category reads (the register-reuse bug), so party member 6 matches element 6 and
    // takes half damage. Live-confirmed.
    party.combatants.forEach((character, i) => {
      if (character.outOfFight) return;
      character.takeDamage(this.calcMagicDamage(ZombieDragon.FIRE_BREATH, character, rng, i + 1 === 6));
    });
  }
}

export default ZombieDragon;
