/** @typedef {import('../Battle.js').default} Battle */

/**
 * A scripted fight's callback: the hooks Battle calls on its `script`, if it has one. Every hook
 * does nothing by default; a script overrides the ones its fight needs (Scripts/QueenAnt.js). A
 * script has to be cloneable, since Battle.clone copies it with the battle.
 */
export default class BattleScript {
  constructor() {
    /** The script has ended the fight: Battle plays the victory wait, with no results */
    this.fightEnding = false;
  }

  /** Ticks between the fight-ending flag and the battle exit, added to `Battle.frames` */
  get exitDelay() {
    return 0;
  }

  /** @returns {BattleScript} an independent copy, for Battle.clone */
  clone() {
    return new BattleScript();
  }

  /** A round starts (Battle.roundStart). */
  onRoundStart() {}

  /**
   * An actor's dispatch starts; called every tick it waits, so it must be idempotent.
   * @param {Battle} _battle @param {number} _idx - the actor's combatant index
   */
  onSelected(_battle, _idx) {}

  /**
   * The callback itself: once per tick with the roll gate at or below 0, before that tick's turn roll.
   * @param {Battle} _battle
   */
  poll(_battle) {}

  /**
   * Whether the round end has to wait (the turn roll waits instead of finishing).
   * @param {Battle} _battle
   * @returns {boolean}
   */
  blocksRoundEnd(_battle) {
    return false;
  }

  /**
   * @param {Battle} _battle
   * @returns {number} the first tick the script could do anything, Infinity if never (a wake for
   *   Battle's idle-tick skipping)
   */
  nextDue(_battle) {
    return Infinity;
  }
}
