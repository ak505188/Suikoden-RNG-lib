import { ACTION_TYPES } from './Actions.js';
import { SIDE, TARGET } from '../Constants.js';
import { applySpell, isValidAllyTarget, spellRand } from '../Magic/Behavior.js';
import { magicUnite } from '../Magic/MagicUnites.js';
import { DISPATCH_STATUS } from './BattleConstants.js';
import { LOG_TYPES } from './ActionLog.js';
import { UNITES } from '../Unites.js';
import { ITEMS } from '../Items.js';
import { ITEM_EFFECTS } from '../ItemEffects.js';
import { ITEM_TIMING } from './ItemTimings.js';
import Combatant from './Combatant.js';
import { UNITE_RETURN_FRAMES, UNITE_TIMINGS } from './UniteTimings.js';
import { COMMAND_RUNE_TIMINGS } from './CommandRuneTimings.js';
import { RUNE_TYPES } from '../Magic/Runes.js';
import { applyAttackResult } from './AttackResolution.js';

/** @typedef {import('./Battle.js').Character} Character */
/** @typedef {import('./Battle.js').DispatchResult} DispatchResult */
/** @typedef {import('./Battle.js').Enemy} Enemy */
/** @typedef {import('./Battle.js').default} Battle */
/** @typedef {import('./Battle.js').EventFn} EventFn */

/**
 *
 * @param {Battle} battle
 * @param {Character} character @returns {DispatchResult}
 */
export function dispatchPlayer(battle, character) {
  switch (character.action.type) {
    case ACTION_TYPES.ATTACK:
      return resolvePartyAttack(battle, character);
    case ACTION_TYPES.RUNE:
      return resolvePartyRune(battle, character);
    case ACTION_TYPES.UNITE:
      return resolvePartyUnite(battle, character);
    case ACTION_TYPES.ITEM:
      return resolvePartyItem(battle, character);
    case ACTION_TYPES.DEFERRED:
      throw new Error(`${character.name}'s action is deferred: chooseAction before dispatching it`);
    default: // Defend, or an invalid action
      battle.record(LOG_TYPES.DEFEND, character);
      return { status: DISPATCH_STATUS.DONE, gate: 0 };
  }
}

/**
 * A party member's Rune spell. Party spell damage uses no RNG; spellRand makes the spell's own
 * rand() calls.
 * TODO: retargeting a dead single target.
 * @param {Battle} battle
 * @param {Character} character
 * @returns {DispatchResult}
 */
export function resolvePartyRune(battle, character) {
  if (character.rune.type === RUNE_TYPES.COMMAND) return resolvePartyCommandRune(battle, character);
  const level = character.action.slot ?? 0;
  let spell = character.rune.spells[level];
  if (!spell)
    throw new Error(`${character.name}: no spell in ${character.rune.name} slot ${level}`);
  const unite = level === 3 ? findMagicUnite(battle, character, spell) : null;
  if (unite) spell = unite.spell;
  /** @type {Character | Enemy | null} */
  let target = null;
  if (spell.side === SIDE.ALLY) {
    if (spell.target !== TARGET.AOE) {
      // An ally spell's target is a party index, omitted meaning the caster, like an item's. An invalid
      // target (already dead) makes the caster Defend with no MP spent, as for an item. UNVERIFIED for spells.
      target =
        battle.party.combatants[
          character.action.target ?? battle.party.combatants.indexOf(character)
        ];
      if (!target || !isValidAllyTarget(spell, /** @type {Character} */ (target))) {
        battle.record(LOG_TYPES.DEFEND, character, target ?? null, {
          detail: `${spell.name}: no target`,
        });
        return { status: DISPATCH_STATUS.DONE, gate: 0 };
      }
    }
  } else {
    target = battle.enemies.combatants[character.action.target ?? 0];
  }
  character.spendMP(level);
  if (unite) {
    unite.partner.spendMP(3);
    unite.partner.setActed(true);
  }
  battle.record(LOG_TYPES.CAST, character, spell.target === TARGET.AOE ? null : target, {
    detail: unite ? `${spell.name} (with ${unite.partner.name})` : spell.name,
  });
  const casterIdx = battle.indexOf(character),
    targetIdx = target ? battle.indexOf(target) : -1;
  return battle.castMagic(
    character,
    (b) => {
      spellRand({ spell, rng: b.rng, party: b.party, enemies: b.enemies });
      const downed = b.party.combatants.filter((c) => c.knockedOut);
      const applied = applySpell({
        actor: /** @type {Character} */ (b.combatants[casterIdx]),
        spell,
        target: targetIdx >= 0 ? b.combatants[targetIdx] : undefined,
        party: b.party,
        enemies: b.enemies,
        rng: b.rng,
      });
      if (!applied) throw new Error(`${spell.name}: effect not implemented`);
      downed
        .filter((c) => !c.knockedOut)
        .forEach((c) => b.record(LOG_TYPES.REVIVE, null, c, { detail: spell.name }));
    },
    spell.frames,
    spell.tail,
  );
}

/**
 * battle_check_magic_unite (0x800f5398), run as a caster resolves a Lv4 (slot 4) spell: the partner is
 * the first other party member, in index order, whose turn is still unused and who queued a Lv4 Rune
 * spell that pairs with battle one. UNVERIFIED: the game has no validity check on the partner; here
 * a dead one never matches (its turn is already used), nor one with no Lv4 charge left.
 * @param {Battle} battle
 * @param {Character} caster @param {import('../Magic/Spells.js').Spell} spell the caster's own Lv4 spell
 * @returns {{ partner: Character, spell: import('../Magic/Spells.js').Spell } | null}
 */
export function findMagicUnite(battle, caster, spell) {
  for (const partner of battle.party.combatants) {
    if (partner === caster || partner.acted) continue;
    const { action } = partner;
    if (
      action?.type !== ACTION_TYPES.RUNE ||
      action.slot !== 3 ||
      partner.rune.type !== RUNE_TYPES.MAGIC
    )
      continue;
    const partnerSpell = partner.rune.spells?.[3];
    if (!partnerSpell || !(partner.MP[3] > 0)) continue;
    const combo = magicUnite(spell, partnerSpell);
    if (combo) return { partner, spell: combo };
  }
  return null;
}

/**
 * battle_select_unite_attack (0x800f5790), on whichever participant's turn comes first. Polled
 * every tick until it succeeds or fails; neither path rolls RNG.
 *   - anyone busy, either side: wait
 *   - any participant invalid (dead, fled, HP - pending < 0): the Defend fallback. ActionType
 *     stays Unite, so no Defend halving battle round; each partner fails the same way on its own
 *     turn.
 *   - all enemies: none left -> fail. One enemy: an invalid target is retargeted to the first
 *     enemy still in the fight with HP - pending > 0, none -> fail.
 *   - otherwise the handler starts next tick (S), and holds the turn loop until it ends.
 * @param {Battle} battle
 * @param {Character} character
 * @returns {DispatchResult}
 */
export function resolvePartyUnite(battle, character) {
  if (battle.areAnyCombatantsBusy())
    return { status: DISPATCH_STATUS.PENDING, until: battle.allIdleAt() };

  const { uniteKey } = character.action;
  /** @type {import('../Unites.js').Unite} */
  const def = UNITES[uniteKey];
  const participants = def.participants.map((key) =>
    battle.party.combatants.find((c) => c.key === key),
  );
  const fail = () => {
    battle.record(LOG_TYPES.DEFEND, character, null, { detail: `${def.name} failed` });
    return { status: DISPATCH_STATUS.DONE, gate: 0 };
  };
  if (participants.some((p) => !p?.isValidCombatant)) return fail();

  /** @type {Enemy | null} */
  let target = null;
  if (def.target === TARGET.AOE) {
    if (!battle.enemies.combatants.some((e) => e.isValidCombatant)) return fail();
  } else {
    target = battle.enemies.combatants[character.action.target ?? 0];
    if (!target?.isValidCombatant) {
      target = battle.enemies.combatants.find((e) => !e.outOfFight && e.HP - e.pendingDamage > 0);
      if (!target) return fail();
      battle.record(LOG_TYPES.RETARGET, character, target);
    }
  }

  const timing = UNITE_TIMINGS[uniteKey];
  if (!timing) throw new Error(`${def.name}: timing unknown`);
  if (def.trigger.on !== 'initiatorImpact' && def.trigger.on !== 'impact')
    throw new Error(`${def.name}: trigger ${def.trigger.on} not implemented`);
  if (def.unbalances?.roll) throw new Error(`${def.name}: Unbalanced roll timing unknown`);

  battle.record(LOG_TYPES.UNITE, character, target, { detail: def.name });
  battle.turn.unite = {
    def,
    timing,
    start: battle.turn.tick + 1,
    initiator: character,
    participants,
    target,
    hit: false,
  };
  return { status: DISPATCH_STATUS.PENDING };
}

/**
 * The Unite handler, from S until the tick after the last participant's done bit (0x4).
 *   S: unite_gather_participants uses up every participant's turn, copies the target and
 *     clears their effect flags; each starts its own Unite script, then its return script
 *     the tick after its done bit (busy until that ends).
 *   the gating participant's impact + 1: one calc_damage per participant, in def order, per
 *     target; target.pending += trunc(sum * mult). No hit, crit, counter or cover roll.
 *   the end: the gate is left unchanged. Participants may still be walking back.
 * @param {Battle} battle
 * @returns {DispatchResult}
 */
export function continueUnite(battle) {
  const u = battle.turn.unite;
  const t = battle.turn.tick - u.start;
  const { participants: timings, reaction } = u.timing;

  if (t === 0) {
    u.participants.forEach((p, k) => {
      p.setActed(true);
      p.fx = 0;
      p.busyUntil = u.start + timings[k].done + 1 + UNITE_RETURN_FRAMES[p.key];
    });
  }

  const gate =
    u.def.trigger.on === 'impact' ? u.def.trigger.who : u.participants.indexOf(u.initiator);
  if (!u.hit && t === timings[gate].impact + 1) {
    u.hit = true;
    const targets = u.target
      ? [u.target]
      : battle.enemies.combatants.filter((e) => e.isValidCombatant);
    const mult10 = Math.round(u.def.mult * 10);
    const participantIdx = u.participants.map((p) => battle.indexOf(p));
    for (const target of targets) {
      target.busyUntil = Math.max(target.busyUntil, battle.turn.tick + reaction.frames);
      const targetIdx = battle.indexOf(target);
      // Owned by the initiator: it runs in step 2 with any other damage due battle tick
      battle.queueEvent(battle.turn.tick, u.initiator, (b) => {
        const tgt = /** @type {Enemy} */ (b.combatants[targetIdx]);
        const sum = participantIdx.reduce(
          (sum, i) => sum + /** @type {Character} */ (b.combatants[i]).calcAttackDamage(tgt, b.rng),
          0,
        );
        tgt.takeDamage(Math.trunc((sum * mult10) / 10));
      });
    }
  }

  const end = Math.max(...timings.map((x) => x.done)) + 1;
  if (t === end) {
    // UNVERIFIED tick: an always-applied Unbalanced (Fisherman, Wild Arrow, Flash) lands at the end
    for (const key of u.def.unbalances?.who ?? [])
      u.participants[u.def.participants.indexOf(key)].unbalance();
    battle.turn.unite = null;
    return { status: DISPATCH_STATUS.DONE };
  }
  // Nothing happens between the start, the impact and the end
  const next = Math.min(
    ...[0, u.hit ? Infinity : timings[gate].impact + 1, end].filter((x) => x > t),
  );
  return { status: DISPATCH_STATUS.PENDING, until: u.start + next };
}

/**
 * A Command rune (the Rune command, AbilitySlot 0; no MP or charge cost). Starts on the tick it
 * resolves (t0, the ActionTag flip) and holds the turn until timing.end, leaving the gate
 * unchanged. Damage: calc_damage * mult on the target's own +0x50 step, so the target owns the
 * event. No hit or crit roll.
 * @param {Battle} battle
 * @param {Character} character
 * @returns {DispatchResult}
 */
export function resolvePartyCommandRune(battle, character) {
  const { rune } = character;
  const def = rune.command;
  const timing = COMMAND_RUNE_TIMINGS[rune.id];
  if (!def || !timing) throw new Error(`${character.name}: ${rune.name} Rune not implemented`);
  if (def.target !== TARGET.ANY)
    throw new Error(`${rune.name}: targeting ${def.target} not implemented`);
  if (def.unbalances && timing.unbalanceRoll == null)
    throw new Error(`${rune.name}: Unbalanced roll timing unknown`);

  if (battle.areAnyCombatantsBusy())
    return { status: DISPATCH_STATUS.PENDING, until: battle.allIdleAt() };

  let target = battle.enemies.combatants[character.action.target ?? 0];
  if (!target?.isValidCombatant) {
    target = battle.enemies.combatants.find((e) => !e.outOfFight && e.HP - e.pendingDamage > 0); // battle_find_first_ready_enemy
    if (!target) {
      battle.record(LOG_TYPES.DEFEND, character, null, { detail: `${rune.name} Rune: no target` });
      return { status: DISPATCH_STATUS.DONE, gate: 0 };
    }
    battle.record(LOG_TYPES.RETARGET, character, target);
  }

  battle.record(LOG_TYPES.CAST, character, target, { detail: `${rune.name} Rune` });
  const S = battle.turn.tick + (timing.start ?? 0);
  const userIdx = battle.indexOf(character),
    targetIdx = battle.indexOf(target);
  /** @type {EventFn} */
  const goBusy = (b) => {
    const tgt = b.combatants[targetIdx];
    b.combatants[userIdx].busyUntil = S + timing.free;
    tgt.busyUntil = Math.max(tgt.busyUntil, S + timing.targetFree);
  };
  // Going busy after t0 happens in the cast entry on S; nothing else runs on battle side before then
  if (S === battle.turn.tick) goBusy(battle);
  else battle.queueEvent(S, character, goBusy);

  const mult = { mul: Math.round(def.mult * 10), div: 10 };
  battle.queueEvent(
    S + timing.damage,
    target,
    (b) => {
      const tgt = /** @type {Enemy} */ (b.combatants[targetIdx]);
      const user = /** @type {Character} */ (b.combatants[userIdx]);
      tgt.takeDamage(user.calcAttackDamage(tgt, b.rng, mult));
    },
    character,
  );
  if (def.unbalances) {
    battle.queueAnimationEvent(S + timing.unbalanceRoll, character, (b) => {
      b.rng.next(); // chance 100: always lands
      b.combatants[userIdx].unbalance();
    });
  }
  battle.turn.hold = { end: S + timing.end };
  return { status: DISPATCH_STATUS.PENDING };
}

/**
 * battle_execute_enemy_attack (named backwards in Ghidra): a party member's basic Attack.
 * Runs every tick until it returns DONE.
 * @param {Battle} battle
 * @param {Character} character
 * @returns {DispatchResult}
 */
export function resolvePartyAttack(battle, character) {
  const tick = battle.turn.tick;
  const target = battle.enemies.combatants[character.action.target ?? 0];

  // Queued target gone: retarget to the first valid enemy in combatant order (no range or
  // row check, no RNG). The attack runs against it on the next tick.
  if (!target?.isValidCombatant) {
    const retarget = battle.enemies.combatants.findIndex((enemy) => enemy.isValidCombatant);
    if (retarget === -1) return { status: DISPATCH_STATUS.DONE, gate: battle.freeWillGate }; // UNVERIFIED: no enemy left
    character.action = { ...character.action, target: retarget };
    battle.record(LOG_TYPES.RETARGET, character, battle.enemies.combatants[retarget]);
    return { status: DISPATCH_STATUS.PENDING };
  }

  // Busy, or about to die from pending damage: wait (no RNG). The attacker keeps waiting on a
  // dying target until it's out of the fight, then retargets.
  if (!target.isReadyTarget(tick))
    return { status: DISPATCH_STATUS.PENDING, until: battle.readyAt(target) };

  // t0: hit and crit rolls now, everything else later
  const rolls = battle.logging ? [] : null;
  applyAttackResult(
    battle,
    character,
    target,
    character.calcAttackResult(target, battle.rng, rolls),
    null,
    rolls,
  );
  return { status: DISPATCH_STATUS.DONE, gate: battle.freeWillGate };
}

/**
 * battle_try_special_attack: a party member uses an item from their own inventory. The menu
 * only offers items they hold, so a plan naming one they don't have (e.g. already used up on
 * an earlier turn) is invalid. `action.target` is a party index; omitted means the user.
 * Polled each tick until it resolves (R), then the turn is held until R + ITEM_TIMING.done and
 * ends with the gate unchanged. No RNG.
 * @param {Battle} battle
 * @param {Character} character
 * @returns {DispatchResult}
 */
export function resolvePartyItem(battle, character) {
  const { itemKey } = character.action;
  if (!itemKey || !character.inventory.canUseInBattle(itemKey)) {
    throw new Error(`${character.name} can't use ${itemKey ?? 'no item'} in battle`);
  }
  const effect = ITEM_EFFECTS[itemKey];
  if (!effect) throw new Error(`${itemKey}: item effect not implemented`);
  const name = ITEMS[itemKey].name;
  const tick = battle.turn.tick;

  // battle_check_all_combatants_idle: wait, no RNG
  if (battle.areAnyCombatantsBusy())
    return { status: DISPATCH_STATUS.PENDING, until: battle.allIdleAt() };

  /** @type {Character[]} */
  let targets;
  /** @type {Character | null} */
  let target = null;
  if (effect.target === TARGET.AOE) {
    targets = battle.party.combatants.filter((c) => c.isValidCombatant);
  } else {
    target =
      battle.party.combatants[
        character.action.target ?? battle.party.combatants.indexOf(character)
      ];
    // Not a valid combatant (e.g. already dead): Defend, nothing used up
    if (!target?.isValidCombatant) {
      battle.record(LOG_TYPES.DEFEND, character, target ?? null, { detail: `${name}: no target` });
      return { status: DISPATCH_STATUS.DONE, gate: 0 };
    }
    // check_combatant_alive fails (at 0 HP, death routine not run yet): wait
    if (!target.isReadyTarget(tick))
      return { status: DISPATCH_STATUS.PENDING, until: battle.readyAt(target) };
    targets = [target];
  }

  // R: used up, the user's item-use script starts
  character.inventory.use(itemKey);
  battle.record(LOG_TYPES.ITEM, character, target, { detail: name });
  character.busyUntil =
    tick + (target && target !== character ? ITEM_TIMING.userFreeAlly : ITEM_TIMING.userFreeSelf);

  // R + done: the handler starts each target's script. UNVERIFIED: the heal / cure lands on
  // battle tick too.
  const done = tick + ITEM_TIMING.done;
  for (const t of targets) {
    const targetIdx = battle.indexOf(t);
    battle.queueEvent(
      done,
      t,
      (b) => {
        const tgt = b.combatants[targetIdx];
        tgt.busyUntil = Math.max(tgt.busyUntil, tick + ITEM_TIMING.targetFree);
        if (effect.heal) tgt.takeDamage(-effect.heal);
        if (effect.cure) tgt.status[effect.cure] = Combatant.createStatus()[effect.cure];
      },
      character,
    );
  }
  battle.turn.hold = { end: done };
  return { status: DISPATCH_STATUS.PENDING };
}
