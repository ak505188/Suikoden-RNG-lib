import { STATUS, TARGET } from './Constants.js';
import { CHARACTER_KEYS, UNITE_KEYS } from './Keys.js';

/** @typedef {import('./Keys.js').CharacterKey} CharacterKey */
/** @typedef {import('./Keys.js').UniteKey} UniteKey */
/** @typedef {import('./Constants.js').Target} Target */
/** @typedef {import('./Battle/Character.js').default} Character */

/**
 * What fires a Unite's damage event (Suikoden-Bizhawk-HUD's Battle_Damage_Formula.md,
 * "Physical Unite attacks", "Fires on"). `who` is a def-order index into `participants`.
 *   initiatorImpact  the impact (0x2) of whoever won the turn roll, so its tick moves with them
 *   impact / cue     one fixed participant's impact (0x2) or cue (0x10)
 *   timer            a fixed tick count inside the handler
 *   targetImpact / targetCue  the target's own reaction script sets the bit
 *   sweep            Trick: each enemy as a sweep passes its screen X, so positional order
 *   eachImpact       Master Pupil: each participant, on its own impact, hits the next enemy
 *                    that was valid and idle at the start with the full sum
 */
/** @typedef {{ on: 'initiatorImpact' }
 *   | { on: 'impact' | 'cue', who: number }
 *   | { on: 'timer' | 'targetImpact' | 'targetCue' | 'sweep' | 'eachImpact' }} UniteTrigger
 */

/**
 * A physical Unite (the Unite menu command, ActionType 4). Magic Unites are spells, see SPELLS.
 * @typedef {Object} Unite
 * @property {string} name
 * @property {number} slot - AbilitySlot (1-32): the resolver groups participants by this.
 * @property {CharacterKey[]} participants - Def order (p0, p1, ...) = calc_damage roll order.
 *   Not initiator-first.
 * @property {number} mult - The def stores it x10 (4, 5, 10, 15, 20, 25, 30): damage =
 *   trunc(sum of participants' calc_damage * (mult * 10) / 10). Do the math on mult * 10, an
 *   integer, so e.g. 1.5 doesn't pick up float error.
 * @property {Target} target - ANY: one enemy, retargeted like a basic Attack. AOE: one damage
 *   event per living enemy, in enemy index order (Trick: sweep order).
 * @property {UniteTrigger} trigger
 * @property {UniteUnbalance} [unbalances] - Participants left Unbalanced after the Unite.
 * @property {string} description
 */

/**
 * roll: true = animation opcode 40 on that participant's own script: one rand() (100% chance),
 *   skipped with no roll and no status for a Turtle Rune (Rune.Id 25) wearer.
 * roll: false = always applied, with no rand()
 * @typedef {{ who: CharacterKey[], roll: boolean }} UniteUnbalance
 */

/** @satisfies {Record<UniteKey, Unite>} */
export const UNITES = {
  [UNITE_KEYS.TALISMAN]: {
    name: 'Talisman Attack',
    slot: 1,
    participants: [CHARACTER_KEYS.PAHN, CHARACTER_KEYS.GREMIO],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.FISHERMAN]: {
    name: 'Fisherman Attack',
    slot: 2,
    participants: [CHARACTER_KEYS.TAI_HO, CHARACTER_KEYS.YAM_KOO],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    unbalances: { who: [CHARACTER_KEYS.TAI_HO, CHARACTER_KEYS.YAM_KOO], roll: false },
    description: '3.0x damage to one enemy. Participants Unbalanced',
  },
  [UNITE_KEYS.WILD_ARROW_SYLVINA]: {
    name: 'Wild Arrow Attack',
    slot: 3,
    participants: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.SYLVINA],
    mult: 1,
    target: TARGET.AOE,
    trigger: { on: 'impact', who: 1 },
    unbalances: { who: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.SYLVINA], roll: false },
    description: '1.0x damage to all enemies. Participants Unbalanced',
  },
  [UNITE_KEYS.ELF]: {
    name: 'Elf Attack',
    slot: 4,
    participants: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.STALLION, CHARACTER_KEYS.SYLVINA],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.PIRATE]: {
    name: 'Pirate Attack',
    slot: 5,
    participants: [CHARACTER_KEYS.ANJI, CHARACTER_KEYS.KANAK, CHARACTER_KEYS.LEONARDO],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 0 },
    description: '2.0x damage to one enemy',
  },
  // The smiths' def order (slots 6, 22-25) isn't in the damage table; these follow the menu
  // slot list, which is not def order for other Unites (e.g. Talisman). Verify before relying
  // on their roll order. The def's multiplier is 3 (decompile); the 3.5x in the description
  // is the in-game guide's figure.
  [UNITE_KEYS.BLACKSMITH_NO_MOSE]: {
    name: 'Blacksmith Attack',
    slot: 6,
    participants: [CHARACTER_KEYS.MAAS, CHARACTER_KEYS.MOOSE, CHARACTER_KEYS.MEESE, CHARACTER_KEYS.MACE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 3 },
    description: '3.5x damage to one enemy',
  },
  // The def's multiplier is 1.5 (decompile); the 2.0x in the description is the in-game guide's figure.
  [UNITE_KEYS.BUMPY]: {
    name: 'Bumpy Attack',
    slot: 7,
    participants: [CHARACTER_KEYS.KRIN, CHARACTER_KEYS.HUMPHREY],
    mult: 1.5,
    target: TARGET.ANY,
    trigger: { on: 'cue', who: 0 },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.PRETTY_BOY]: {
    name: 'Pretty Boy Attack',
    slot: 8,
    participants: [CHARACTER_KEYS.FLIK, CHARACTER_KEYS.ALEN, CHARACTER_KEYS.GRENSEAL],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 2 },
    description: '3.0x damage to one enemy',
  },
  [UNITE_KEYS.PRETTY_GIRL]: {
    name: 'Pretty Girl Attack',
    slot: 9,
    participants: [CHARACTER_KEYS.CAMILLE, CHARACTER_KEYS.TENGAAR, CHARACTER_KEYS.KASUMI],
    mult: 2.5,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    unbalances: { who: [CHARACTER_KEYS.KASUMI], roll: true },
    description: '2.5x damage to one enemy. Kasumi Unbalanced',
  },
  [UNITE_KEYS.BEAUTY_VALERIA]: {
    name: 'Beauty Attack',
    slot: 10,
    participants: [CHARACTER_KEYS.CLEO, CHARACTER_KEYS.EILEEN, CHARACTER_KEYS.VALERIA],
    mult: 0.4,
    target: TARGET.AOE,
    trigger: { on: 'timer' },
    description: '0.4x damage to all enemies. Chance of Sleep',
  },
  [UNITE_KEYS.FLASH]: {
    name: 'Flash Attack',
    slot: 11,
    participants: [CHARACTER_KEYS.LIUKAN, CHARACTER_KEYS.FUKIEN, CHARACTER_KEYS.KAI],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'timer' },
    unbalances: { who: [CHARACTER_KEYS.LIUKAN, CHARACTER_KEYS.FUKIEN, CHARACTER_KEYS.KAI], roll: false },
    description: '2.0x damage to one enemy. Participants Unbalanced',
  },
  [UNITE_KEYS.KOBOLD]: {
    name: 'Kobold Attack',
    slot: 12,
    participants: [CHARACTER_KEYS.KUROMIMI, CHARACTER_KEYS.GON],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.DRAGON_KNIGHT]: {
    name: 'Dragon Knight Attack',
    slot: 13,
    participants: [CHARACTER_KEYS.FUTCH, CHARACTER_KEYS.MILIA],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.FATAL]: {
    name: 'Fatal Attack',
    slot: 14,
    participants: [CHARACTER_KEYS.GEN, CHARACTER_KEYS.KAMANDOL],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.TRICKSTER]: {
    name: 'Trickster Attack',
    slot: 15,
    participants: [CHARACTER_KEYS.MEG, CHARACTER_KEYS.JUPPO],
    mult: 1,
    target: TARGET.AOE,
    trigger: { on: 'sweep' },
    description: '1.0x damage to all enemies',
  },
  [UNITE_KEYS.WARRIOR]: {
    name: 'Warrior Attack',
    slot: 16,
    participants: [CHARACTER_KEYS.TENGAAR, CHARACTER_KEYS.HIX],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'timer' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.COUPLE]: {
    name: 'Couple Attack',
    slot: 17,
    participants: [CHARACTER_KEYS.EILEEN, CHARACTER_KEYS.LEPANT],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.BANDIT]: {
    name: 'Bandit Attack',
    slot: 18,
    participants: [CHARACTER_KEYS.VARKAS, CHARACTER_KEYS.SYDONIA],
    mult: 2.5,
    target: TARGET.ANY,
    trigger: { on: 'targetImpact' },
    description: '2.5x damage to one enemy',
  },
  [UNITE_KEYS.CARPENTER]: {
    name: 'Carpenter Attack',
    slot: 19,
    participants: [CHARACTER_KEYS.GEN, CHARACTER_KEYS.SANSUKE],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'initiatorImpact' },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.WILD_ARROW_RUBI]: {
    name: 'Wild Arrow Attack',
    slot: 20,
    participants: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.RUBI],
    mult: 1,
    target: TARGET.AOE,
    trigger: { on: 'impact', who: 1 },
    unbalances: { who: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.RUBI], roll: false },
    description: '1.0x damage to all enemies. Participants Unbalanced',
  },
  [UNITE_KEYS.WILD_ARROW_STALLION]: {
    name: 'Wild Arrow Attack',
    slot: 21,
    participants: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.STALLION],
    mult: 1,
    target: TARGET.AOE,
    trigger: { on: 'impact', who: 1 },
    unbalances: { who: [CHARACTER_KEYS.KIRKIS, CHARACTER_KEYS.STALLION], roll: false },
    description: '1.0x damage to all enemies. Participants Unbalanced',
  },
  [UNITE_KEYS.BLACKSMITH_NO_MACE]: {
    name: 'Blacksmith Attack',
    slot: 22,
    participants: [CHARACTER_KEYS.MAAS, CHARACTER_KEYS.MOOSE, CHARACTER_KEYS.MEESE, CHARACTER_KEYS.MOSE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 3 },
    description: '3.5x damage to one enemy',
  },
  [UNITE_KEYS.BLACKSMITH_NO_MAAS]: {
    name: 'Blacksmith Attack',
    slot: 23,
    participants: [CHARACTER_KEYS.MOSE, CHARACTER_KEYS.MOOSE, CHARACTER_KEYS.MEESE, CHARACTER_KEYS.MACE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 3 },
    description: '3.5x damage to one enemy',
  },
  [UNITE_KEYS.BLACKSMITH_NO_MOOSE]: {
    name: 'Blacksmith Attack',
    slot: 24,
    participants: [CHARACTER_KEYS.MAAS, CHARACTER_KEYS.MOSE, CHARACTER_KEYS.MEESE, CHARACTER_KEYS.MACE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 3 },
    description: '3.5x damage to one enemy',
  },
  [UNITE_KEYS.BLACKSMITH_NO_MEESE]: {
    name: 'Blacksmith Attack',
    slot: 25,
    participants: [CHARACTER_KEYS.MAAS, CHARACTER_KEYS.MOOSE, CHARACTER_KEYS.MOSE, CHARACTER_KEYS.MACE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 3 },
    description: '3.5x damage to one enemy',
  },
  [UNITE_KEYS.BEAUTY_SONYA]: {
    name: 'Beauty Attack',
    slot: 26,
    participants: [CHARACTER_KEYS.CLEO, CHARACTER_KEYS.EILEEN, CHARACTER_KEYS.SONYA],
    mult: 0.4,
    target: TARGET.AOE,
    trigger: { on: 'timer' },
    description: '0.4x damage to all enemies. Chance of Sleep',
  },
  [UNITE_KEYS.KOBOLD_PLUS_1]: {
    name: 'Kobold +1 Attack',
    slot: 27,
    participants: [CHARACTER_KEYS.KUROMIMI, CHARACTER_KEYS.FU_SU_LU, CHARACTER_KEYS.GON],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    description: '3.0x damage to one enemy',
  },
  [UNITE_KEYS.BEAT_EM_UP]: {
    name: "Beat'Em'Up Attack",
    slot: 28,
    participants: [CHARACTER_KEYS.PAHN, CHARACTER_KEYS.RONNIE],
    mult: 3,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    unbalances: { who: [CHARACTER_KEYS.PAHN], roll: true },
    description: '3.0x damage to one enemy. Pahn Unbalanced',
  },
  [UNITE_KEYS.NINJA]: {
    name: 'Ninja Attack',
    slot: 29,
    participants: [CHARACTER_KEYS.KASUMI, CHARACTER_KEYS.FUMA, CHARACTER_KEYS.KAGE],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'impact', who: 1 },
    description: '2.0x damage to one enemy',
  },
  [UNITE_KEYS.MARTIAL_ARTS]: {
    name: 'Martial Arts Attack',
    slot: 30,
    participants: [CHARACTER_KEYS.EIKEI, CHARACTER_KEYS.PAHN, CHARACTER_KEYS.MORGAN],
    mult: 0.5,
    target: TARGET.AOE,
    trigger: { on: 'timer' },
    description: '0.5x damage to all enemies',
  },
  [UNITE_KEYS.LEPANT_FAMILY]: {
    name: 'Lepant Family Attack',
    slot: 31,
    participants: [CHARACTER_KEYS.LEPANT, CHARACTER_KEYS.EILEEN, CHARACTER_KEYS.SHEENA],
    mult: 2,
    target: TARGET.ANY,
    trigger: { on: 'targetCue' },
    description: '2.0x damage to one enemy',
  },
  // Each participant hits one enemy (so up to 2), with no target to pick: AOE for planning.
  // Its def target flag (+0x16) wasn't checked.
  [UNITE_KEYS.MASTER_PUPIL]: {
    name: 'Master Pupil Attack',
    slot: 32,
    participants: [CHARACTER_KEYS.MCDOHL, CHARACTER_KEYS.KAI],
    mult: 1,
    target: TARGET.AOE,
    trigger: { on: 'eachImpact' },
    description: '1.0x damage to all enemies',
  },
};

/** @type {Record<number, UniteKey>} AbilitySlot -> Unite */
export const UNITES_BY_SLOT = Object.fromEntries(
  Object.entries(UNITES).map(([key, u]) => [u.slot, /** @type {UniteKey} */ (key)])
);

/** @type {Partial<Record<CharacterKey, UniteKey[]>>} Every Unite a character takes part in, by slot */
export const UNITES_BY_CHARACTER = {};
for (const [key, u] of Object.entries(UNITES)) {
  for (const p of u.participants) (UNITES_BY_CHARACTER[p] ??= []).push(/** @type {UniteKey} */ (key));
}

/**
 * The menu's Unite eligibility (compute_unite_eligible_slots, 0x800ef104), checked when commands
 * are chosen: every participant is in the active party, a valid combatant, and has none of
 * wStatusFlags & 0x61 (Poison, Sleep, Unbalanced). Picking a Unite uses up every partner's
 * command selection, so it's one action for the whole group.
 * @param {Character[]} party - the active party
 * @returns {UniteKey[]} in slot order
 */
export function availableUnites(party) {
  const ready = new Set(
    party
      .filter(c => c.isValidCombatant
        && !c.status[STATUS.POISON] && !c.status[STATUS.SLEEP] && !c.isUnbalanced)
      .map(c => c.key)
  );
  return /** @type {UniteKey[]} */ (Object.keys(UNITES))
    .filter(key => UNITES[key].participants.every(p => ready.has(p)));
}

/**
 * Every set of Unites that can be picked together in one round: no character in two of them.
 * Includes the empty set (first). Each set lists its Unites in the order given.
 * @param {UniteKey[]} keys - usually availableUnites(party)
 * @returns {UniteKey[][]}
 */
export function disjointUniteSets(keys) {
  /** @type {UniteKey[][]} */
  const sets = [];
  /** @param {number} from @param {UniteKey[]} chosen @param {Set<CharacterKey>} used */
  const walk = (from, chosen, used) => {
    sets.push(chosen);
    for (let i = from; i < keys.length; i++) {
      const ps = UNITES[keys[i]].participants;
      if (ps.some(p => used.has(p))) continue;
      walk(i + 1, [...chosen, keys[i]], new Set([...used, ...ps]));
    }
  };
  walk(0, [], new Set());
  return sets;
}
