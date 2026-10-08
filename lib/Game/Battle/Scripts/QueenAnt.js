import { ENEMY_KEYS } from '../../Keys.js';
import { LOG_TYPES } from '../ActionLog.js';

/** @typedef {import('../Battle.js').default} Battle */
/** @typedef {import('../Enemy.js').default} Enemy */

/**
 * The Mt. Seifu Queen Ant fight's scripted callback (queen_ant_end_of_round_callback, va7.bin
 * 0x8001139c, Queen_Ant_Ant_Respawn.md): the only fight that spawns enemies and the only one that
 * ends by itself, with no results screen. It runs on every tick where the roll gate (+0x1264) is
 * at or below 0 (Battle.advanceTurnTick calls poll), and does nothing until the gate is open:
 * every actor but the Queen (the last combatant) has its turn tag. A tag is set when the actor is
 * selected, or when a combatant dies. Once open it:
 *   - revives every ant that's dead and not busy: full HP, statuses kept, the turn tag stays set
 *     (so it can't act this round), busy for SPAWN_BUSY more ticks. No RNG.
 *   - in round 3 or later, ends the fight: Battle then plays the victory wait (about 65 ticks
 *     from the poll, with no results). An ant still dying or dead holds the round end until it
 *     revives, so the fight ends after that.
 * How long an ant takes to die is Battle's own (K + D, then the 93-tick death script): this only
 * adds the revive.
 */

/** Spawn animation: the revive tick -> the tick the ant's busy clears */
export const SPAWN_BUSY = 61;

/**
 * The tick the round-over countdown goes below 0 -> the battle exits (Queen_Ant_Ant_Respawn.md:
 * the countdown reads -1 at 654, the exit is at 657; 65-66 after the flag in every clean sample)
 */
export const FIGHT_EXIT_DELAY = 3;

/** The first round that ends the fight (dwRoundNumber > 2) */
export const FIGHT_END_ROUND = 3;

/** Last actions whose poll latency L was measured (Queen_Ant_Ant_Respawn.md); others are flagged */
const MEASURED_LAST_ACTIONS = ['Attack', 'Defend'];

export default class QueenAntScript {
  constructor() {
    /** @type {boolean[]} combatant index -> its turn tag was set by a selection this round */
    this.selected = [];
    /** The last actor selected this round: a combatant index, and what it did (for L) */
    this.lastSelected = 0;
    /** The fight-end flag (BattleState+0x34): set by the first poll with the gate open in round 3+ */
    this.fightEnding = false;
    /** @type {{ round: number, tick: number, text: string }[]} things the sim can't know, see flag */
    this.warnings = [];
  }

  /** @returns {QueenAntScript} an independent copy, for Battle.clone */
  clone() {
    const copy = new QueenAntScript();
    copy.selected = [...this.selected];
    copy.lastSelected = this.lastSelected;
    copy.fightEnding = this.fightEnding;
    copy.warnings = [...this.warnings];
    return copy;
  }

  /** @param {Battle} battle @param {string} text */
  flag(battle, text) {
    if (this.warnings.some(w => w.round === battle.turn_count && w.text === text)) return;
    this.warnings.push({ round: battle.turn_count, tick: battle.turn.tick, text });
  }

  /** The Queen's combatant index: she isn't covered by the gate. @param {Battle} battle */
  queenIdx(battle) {
    return battle.combatants.findIndex(c => c?.key === ENEMY_KEYS.QUEEN_ANT_BOSS);
  }

  /** @param {Battle} battle @returns {Enemy[]} every enemy but the Queen: the ants */
  ants(battle) {
    return /** @type {Enemy[]} */ (battle.enemies.combatants.filter(c => c.key !== ENEMY_KEYS.QUEEN_ANT_BOSS));
  }

  onRoundStart() {
    this.selected = [];
    this.lastSelected = 0;
  }

  /**
   * An actor's dispatch starts: its turn tag is set now, before its action runs (the doc's
   * "selected"; a Defend's poll latency L = 1 and an Attack's L = 10 both count from here).
   * Idempotent: a dispatch that waits calls it every tick.
   * @param {Battle} battle @param {number} idx
   */
  onSelected(battle, idx) {
    if (this.selected[idx]) return;
    this.selected[idx] = true;
    this.lastSelected = idx;
    // Her HP is reset to max every turn in the game; nothing here can kill her, so it isn't modelled
    if (idx === this.queenIdx(battle) && this.gateOpen(battle)) {
      this.flag(battle, 'Queen Ant selected after the gate opened: whether the callback ends the round first is unverified');
    }
  }

  /** Every actor but the Queen has a turn tag. @param {Battle} battle */
  gateOpen(battle) {
    const queen = this.queenIdx(battle);
    for (let i = 1; i < battle.combatants.length; i++) {
      if (i !== queen && !this.selected[i] && !battle.combatants[i].acted) return false;
    }
    return true;
  }

  /**
   * The callback: one call per tick with the roll gate at or below 0, before that tick's turn roll.
   * @param {Battle} battle
   */
  poll(battle) {
    if (!this.gateOpen(battle)) return;
    const tick = battle.turn.tick;

    // Everything eligible revives in this one call
    for (const ant of this.ants(battle)) {
      if (!ant.knockedOut || ant.isBusy(tick)) continue;
      ant.knockedOut = false;
      ant.HP = ant.stats.HP;
      ant.pendingDamage = 0;
      ant.busyUntil = tick + SPAWN_BUSY;
      battle.record(LOG_TYPES.REVIVE, null, ant, { detail: 'Queen Ant respawn' });
      this.checkLatency(battle);
    }

    if (!this.fightEnding && battle.turn_count >= FIGHT_END_ROUND) {
      this.fightEnding = true;
      this.checkLatency(battle);
      const queen = battle.combatants[this.queenIdx(battle)];
      if (!queen.acted && !this.selected[this.queenIdx(battle)]) {
        this.flag(battle, 'Fight ended before the Queen acted this round: unverified');
      }
    }
  }

  /** Flags a poll whose latency depends on a last action nobody measured. @param {Battle} battle */
  checkLatency(battle) {
    const last = battle.combatants[this.lastSelected];
    const action = last && 'action' in last ? /** @type {{ action?: { type: string } }} */ (last).action?.type : 'Attack';
    if (action && !MEASURED_LAST_ACTIONS.includes(action)) {
      this.flag(battle, `Poll latency after a last action of ${action} isn't measured (Item 17, Talisman Unite 137, Fire L1 310, Fire L2 449 are single samples)`);
    }
  }

  /**
   * A dead or dying ant holds the round end: the turn roll waits instead of finishing, and the
   * round-end path starts again once the callback has revived it.
   * @param {Battle} battle
   */
  blocksRoundEnd(battle) {
    return this.ants(battle).some(ant => ant.knockedOut || ant.HP < 1);
  }

  /**
   * @param {Battle} battle
   * @returns {number} the first tick a revive could happen: the soonest busy clear of a dead ant,
   *   Infinity if none is dead yet (a dying ant is caught by the death check's own wake)
   */
  nextDue(battle) {
    let next = Infinity;
    for (const ant of this.ants(battle)) if (ant.knockedOut) next = Math.min(next, ant.busyUntil + 1);
    return Math.max(next, battle.turn.tick + 1);
  }
}
