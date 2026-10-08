import { RUNES } from '../Magic/Runes.js';

/** @typedef {import('./Character.js').default} Character */

/**
 * find_cover_target's pair table (0x8016c814): (self, partner) roster Ids, checked in this order.
 * As chains: Hero -> Gremio, Pahn, Cleo, Kasumi; Cleo -> Pahn; Gremio -> Camille; Tai Ho -> Yam
 * Koo, Kimberly; Yam Koo -> Tai Ho; Tengaar -> Hix; Sylvina -> Kirkis; Eileen -> Lepant; Lepant ->
 * Eileen; Sheena -> Eileen; Kuromimi -> Gon.
 * @type {readonly (readonly [number, number])[]}
 */
export const COVER_PAIRS = Object.freeze([
  [8, 2],
  [8, 6],
  [8, 1],
  [1, 6],
  [2, 3],
  [32, 38],
  [38, 32],
  [33, 63],
  [9, 4],
  [0, 30],
  [30, 0],
  [62, 0],
  [8, 23],
  [32, 45],
  [14, 80],
]);

/**
 * find_cover_target (0x800f79e0): who takes an enemy basic attack's hit for `target`, if anyone.
 * No RNG. Only when the target's committed HP (pending damage ignored) is strictly below
 * floor(HPMax / 4). Then, for each pair in COVER_PAIRS whose self is the target, the first other
 * party member (in index order) with the partner's roster Id who passes check_combatant_alive (not
 * busy, in the fight, HP - pending > 0); a partner who's absent or not ready moves it on to the next
 * pair. No row check, and nothing about Sleep, Unbalanced, Poison, Defend or queued actions.
 * Failing that, a Phero Rune wearer is covered by the next party member (from the target's slot,
 * wrapping) who's in the fight, not busy and of a different gender (pending damage not checked).
 * Live-confirmed (3Mosquito1Ant.State, 85 enemy attacks). Not modelled, decompile only: with the
 * target in the last party slot, the game's Phero scan reads index partyCount + 1 (an enemy) first.
 * @param {Character[]} party - in index order
 * @param {Character} target
 * @param {number} tick
 * @returns {Character | null}
 */
export function findCoverTarget(party, target, tick) {
  if (!(target.HP < Math.floor(target.stats.HP / 4))) return null;
  for (const [self, partner] of COVER_PAIRS) {
    if (self !== target.rosterId) continue;
    const ally = party.find((c) => c !== target && c.rosterId === partner && c.isReadyTarget(tick));
    if (ally) return ally;
  }
  if (target.rune?.id === RUNES.PHERO.id) {
    const t = party.indexOf(target);
    for (let k = 1; k < party.length; k++) {
      const c = party[(t + k) % party.length];
      if (!c.outOfFight && !c.isBusy(tick) && c.gender !== target.gender) return c;
    }
  }
  return null;
}
