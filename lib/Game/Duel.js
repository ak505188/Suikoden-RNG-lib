import RNG from '../rng.js';
import { cDiv } from '../util/math.js';
import { CHARACTER_KEYS } from './Keys.js';

// Duels (the game's "ikki", one-on-one): the rock-paper-scissors fights McDohl vs Kwanda, McDohl
// vs Teo and Pahn vs Teo. Ported from Suikoden-Bizhawk-HUD's lib/Duel.lua; the derivation is its
// docs/game_mechanics/Duels.md. Each duel is its own overlay in data/12_ikki/ (shu_kwa.bin,
// shu_teo.bin, pan_teo.bin), with byte-identical code; only the data (enemy stats, dialogue)
// differs.
//
// The overlay calls rand() from exactly two places:
//   1. duel_pick_enemy_move (0x80087898), once at every round start, before the enemy's line shows
//      and before the player picks a command. So the player always knows the enemy's move.
//   2. duel_apply_hit (0x80084634), once per hit landed, on either side.
// A round costs 1 call for the move plus 1 per hit: 1 for Defend vs Defend, up to 3 for a trade.

/** @typedef {typeof DUEL_MOVES[keyof typeof DUEL_MOVES]} DuelMove */
export const DUEL_MOVES = /** @type {const} */ ({ ATTACK: 0, DEFEND: 1, DESPERATE: 2 });
export const DUEL_MOVE_NAMES = ['Attack', 'Defend', 'Desperate Attack'];

/** @typedef {typeof DUEL_SIDES[keyof typeof DUEL_SIDES]} DuelSide */
export const DUEL_SIDES = /** @type {const} */ ({ PLAYER: 0, ENEMY: 1 });

/** Hit flags (side +0x18), set by the outcome animation scripts' opcode 14. */
/** @typedef {typeof DUEL_HITS[keyof typeof DUEL_HITS]} DuelHitFlag */
export const DUEL_HITS = /** @type {const} */ ({ NORMAL: 1, HALF: 2, DOUBLE: 4, COUNTER: 8 });

/** @typedef {typeof DUEL_RESULTS[keyof typeof DUEL_RESULTS]} DuelResult */
export const DUEL_RESULTS = /** @type {const} */ ({ WIN: 'win', LOSE: 'lose' });

/** The move that beats each enemy move: Attack -> Desperate, Defend -> Attack, Desperate -> Defend. */
export const DUEL_COUNTER = [DUEL_MOVES.DESPERATE, DUEL_MOVES.ATTACK, DUEL_MOVES.DEFEND];

const { PLAYER, ENEMY } = DUEL_SIDES;
const { NORMAL, HALF, DOUBLE, COUNTER } = DUEL_HITS;

/**
 * outcome = playerMove * 3 + enemyMove + 1. Each entry lists the hits in the order they land, by
 * the side taking the hit. The per-outcome scripts (0x8008989c player, 0x800898c4 enemy) hand off
 * through signal/waitsig pairs, so the order is fixed. Desperate "beating" Attack is a trade: the
 * player takes a normal hit first. Only 2, 4, 6 and 8 are one-sided.
 * @type {ReadonlyArray<ReadonlyArray<{ side: DuelSide, flag: DuelHitFlag }>>}
 */
export const DUEL_OUTCOME_HITS = [
  [], // 0: no round yet
  [
    { side: ENEMY, flag: NORMAL },
    { side: PLAYER, flag: NORMAL },
  ], // 1: Atk  vs Atk
  [{ side: ENEMY, flag: HALF }], // 2: Atk  vs Def
  [
    { side: ENEMY, flag: NORMAL },
    { side: PLAYER, flag: DOUBLE },
  ], // 3: Atk  vs Desp
  [{ side: PLAYER, flag: HALF }], // 4: Def  vs Atk
  [], // 5: Def  vs Def
  [{ side: ENEMY, flag: COUNTER }], // 6: Def  vs Desp
  [
    { side: PLAYER, flag: NORMAL },
    { side: ENEMY, flag: DOUBLE },
  ], // 7: Desp vs Atk
  [{ side: PLAYER, flag: COUNTER }], // 8: Desp vs Def
  [
    { side: ENEMY, flag: DOUBLE },
    { side: PLAYER, flag: DOUBLE },
  ], // 9: Desp vs Desp
];

/**
 * One side of a duel. For the player, duel_init_sides fills this through
 * battle_compute_ally_derived_stats (0x800d4ec0), so ATK/DEF are the character's normal battle
 * ATK and armored DEF (see duelistFromCharacter), and HP carries over from the party.
 * @typedef {Object} Duelist
 * @property {number} HP
 * @property {number} maxHP
 * @property {number} ATK - the record's stat [6] ("STR")
 * @property {number} DEF - the record's stat [7]
 */

/**
 * @typedef {Object} DuelData
 * @property {import('./Keys.js').CharacterKey} player
 * @property {string} enemyName
 * @property {Duelist} enemy - the overlay's hardcoded record
 * @property {string[][]} dialogue - [previousOutcome][enemyMove]: previousOutcome is 0 on round 1
 */

/** @typedef {typeof DUEL_KEYS[keyof typeof DUEL_KEYS]} DuelKey */
export const DUEL_KEYS = /** @type {const} */ ({
  KWANDA: 'KWANDA',
  TEO_VS_MCDOHL: 'TEO_VS_MCDOHL',
  TEO_VS_PAHN: 'TEO_VS_PAHN',
});

/**
 * The dialogue costs no roll: the line is table[previousOutcome][enemyMove], so every line names
 * the enemy's move exactly.
 * @type {Readonly<Record<DuelKey, DuelData>>}
 */
export const DUELS = {
  [DUEL_KEYS.KWANDA]: {
    player: CHARACTER_KEYS.MCDOHL,
    enemyName: 'Kwanda',
    enemy: { HP: 280, maxHP: 280, ATK: 150, DEF: 75 },
    dialogue: [
      [
        'Taste the sharpness of my blade!',
        'Can you break my invulnerable defenses?',
        'Victory is near! I strike with all my might!',
      ],
      [
        'Well done. But can you take this?',
        'Pretty good. How about another one?',
        "The next one won't be so easy.",
      ],
      ["Heh, now it's my turn.", 'Damn! My turn!', "I'll get you!"],
      [
        "Ha ha! You'll have to do better than that!",
        "Now it's your turn. Come on!",
        'Here we go again!',
      ],
      [
        "At a loss, are you? But I'll show no mercy!",
        "Don't bore me. Show me what you can do.",
        'Take that!',
      ],
      [
        "What's the matter? If you don't attack, I will!",
        "Cautious, aren't you. Just like a leader.",
        "We're getting nowhere. Here I come!",
      ],
      ['Damn! I underestimated you.', 'Carefully...', "Impossible! You can't avoid my blows!"],
      [
        "Whoa! Pretty good, Teo's little boy. Now it's my turn!",
        'Arghhh! I underestimated you.',
        "Well done. You're a worthy opponent. Now it's my turn!",
      ],
      ["That's nothing!", "Forget it. You're methods are obvious.", "I'll show you how it's done."],
      [
        "You're better than I thought. But how about this?",
        'What now?',
        'Interesting. How about another round?',
      ],
    ],
  },
  [DUEL_KEYS.TEO_VS_MCDOHL]: {
    player: CHARACTER_KEYS.MCDOHL,
    enemyName: 'Teo',
    enemy: { HP: 180, maxHP: 360, ATK: 240, DEF: 105 },
    dialogue: [
      [
        'Here I come, my son.',
        "Show me what you've learned.",
        "My sword is the Emperor's sword. I'll show no mercy!",
      ],
      ['Well done!', 'Good, try it again!', 'Can you avoid my sword?'],
      [
        "That was nothing. Now it's my turn.",
        "I'll see you coming next time!",
        'My deadly sword...',
      ],
      ['Do you see how much better I am?', "Is that all you've got?", 'Hmmm. Here I come again!'],
      [
        "Is defending yourself all you can do? You'll never win that way.",
        "Come on! Show me what a man you've become.",
        'The next one will be more painful.',
      ],
      [
        "We're getting nowhere. Here I come!",
        "Leader of the Liberation Army! No wonder you're careful.",
        "If you don't attack, I will!",
      ],
      [
        'Did you see that coming?',
        'Well done! I must be more careful too.',
        'Are you trying to surpass me?',
      ],
      [
        "That was pretty good. Now it's my turn.",
        "I'm losing my cool. I must be more cautious!",
        "Now that I've seen what you've got, I'll show you what I can do.",
      ],
      [
        "You're soft...soft! This is how you attack!",
        "I underestimated you! What's wrong? Another round?",
        "That's...no good.",
      ],
      [
        "The numbness in my hands, it's real!",
        "I mustn't underestimate you.",
        "I'm delighted, my son. You're quite a warrior. But here's another!",
      ],
    ],
  },
  [DUEL_KEYS.TEO_VS_PAHN]: {
    player: CHARACTER_KEYS.PAHN,
    enemyName: 'Teo',
    enemy: { HP: 370, maxHP: 370, ATK: 290, DEF: 150 },
    dialogue: [
      ["My sword's not rusty yet.", 'Strike me, Pahn!', 'Finish me with a single blow!'],
      ['Pretty good, Pahn.', 'All right, do it again!', 'Can you dodge my blade, Pahn?'],
      [
        "Is that all you've got? Now it's my turn!",
        "I'll see that coming next time!",
        'My killer blade...',
      ],
      ["Do you see how we're mismatched?", 'Do you give up?', 'Hmmm. Here I come again!'],
      [
        'All you can do is defend yourself, Pahn? No mercy!',
        'Come on, Pahn. See if you can kill me.',
        'The next one will be more painful.',
      ],
      [
        "We're getting nowhere. Here I come!",
        "You're a smart one, Pahn.",
        "If you don't attack, I will!",
      ],
      [
        'Did you see me coming?',
        "Good work, Pahn. I'll have to be more careful.",
        'Impossible! Take that!',
      ],
      [
        "That was a good one, Pahn. Now it's my turn.",
        "I'm losing my cool. Better be careful.",
        "Now that I've seen what you've got, I'll show you what I can do.",
      ],
      [
        "Get serious, Pahn. This is how it's done.",
        "What's the matter, Pahn? How about another round?",
        "That's...no good.",
      ],
      [
        "The numbness in my hands, it's real.",
        "You're better than I thought.",
        "Excellent, Pahn. You're a real fighter. Here's another!",
      ],
    ],
  },
};

/** @param {number} rand @returns {DuelMove} */
export function duelEnemyMove(rand) {
  return /** @type {DuelMove} */ (cDiv(rand * 3, 0x7fff) % 3);
}

/**
 * @param {number} attackerATK
 * @param {number} defenderDEF
 * @param {number} defenderHP - current HP, for the x2 floor
 * @param {DuelHitFlag} flag
 * @param {number} rand
 */
export function duelHitDamage(attackerATK, defenderDEF, defenderHP, flag, rand) {
  const base = Math.max(attackerATK - defenderDEF, 1);
  const dmg = base + ((cDiv(base, 100) * rand) % 10);
  if (flag === HALF) return cDiv(dmg, 2);
  if (flag === DOUBLE || flag === COUNTER) return Math.max(dmg * 2, cDiv(defenderHP, 4));
  return dmg;
}

/**
 * Gets the same ATK and DEF a normal battle uses, and current HP carries over
 * @param {import('./Battle/Character.js').default} character
 * @returns {Duelist}
 */
export function duelistFromCharacter(character) {
  return { HP: character.HP, maxHP: character.stats.HP, ATK: character.ATK, DEF: character.ARM };
}

/** A literal rather than a spread: clone() runs once per search branch. @param {Duelist} d @returns {Duelist} */
function copyDuelist(d) {
  return { HP: d.HP, maxHP: d.maxHP, ATK: d.ATK, DEF: d.DEF };
}

/**
 * One hit as it landed.
 * @typedef {Object} DuelHit
 * @property {DuelSide} side - who took it
 * @property {DuelHitFlag} flag
 * @property {number} rand - the roll it used
 * @property {number} damage
 * @property {number} HP - the side's HP after it
 */

/**
 * One finished round.
 * @typedef {Object} DuelRound
 * @property {number} round - 1-based
 * @property {number} rngStart - the raw RNG state before the move roll
 * @property {DuelMove} enemyMove
 * @property {string} line - the enemy's line for this round
 * @property {DuelMove} playerMove
 * @property {number} outcome - 1-9: playerMove * 3 + enemyMove + 1
 * @property {DuelHit[]} hits - in the order they landed
 * @property {DuelResult | null} result
 */

/** @typedef {{ round: DuelRound, prev: RoundLog | null }} RoundLog */

/**
 * A duel in progress. Mutable, like Battle: clone() to branch. A round is two steps, matching the
 * game: startRound() rolls the enemy's move (shown to the player through its line), then
 * resolveRound(playerMove) lands the hits (and starts the round itself if it wasn't).
 */
export default class Duel {
  /**
   * @param {DuelData} duel
   * @param {Duelist} player - see duelistFromCharacter
   * @param {RNG | number} rng - the RNG at the first round start (the duel owns an RNG instance it's given)
   */
  constructor(duel, player, rng) {
    this.data = duel;
    this.rng = rng instanceof RNG ? rng : new RNG(rng);
    /** @type {[Duelist, Duelist]} indexed by DuelSide */
    this.sides = [copyDuelist(player), copyDuelist(duel.enemy)];
    /** The last finished round's outcome: the dialogue row, 0 before round 1 */
    this.lastOutcome = 0;
    /** The rolled enemy move, between startRound and resolveRound. @type {DuelMove | null} */
    this.enemyMove = null;
    /** @type {number} the raw RNG state before the pending round's move roll */
    this.rngStart = 0;
    /** @type {DuelResult | null} */
    this.result = null;
    /** Finished rounds, newest first: clones share it, so cloning doesn't copy the log. @type {RoundLog | null} */
    this.log = null;
    this.roundCount = 0;
  }

  get player() {
    return this.sides[PLAYER];
  }

  get enemy() {
    return this.sides[ENEMY];
  }

  /** Finished rounds, oldest first. @returns {DuelRound[]} */
  get rounds() {
    const rounds = new Array(this.roundCount);
    for (let node = this.log, i = this.roundCount - 1; node; node = node.prev, i--)
      rounds[i] = node.round;
    return rounds;
  }

  /** @returns {DuelRound | null} */
  get lastRound() {
    return this.log && this.log.round;
  }

  get isOver() {
    return this.result !== null;
  }

  clone() {
    const copy = new Duel(this.data, this.sides[PLAYER], this.rng.clone());
    copy.sides[ENEMY] = copyDuelist(this.sides[ENEMY]);
    copy.lastOutcome = this.lastOutcome;
    copy.enemyMove = this.enemyMove;
    copy.rngStart = this.rngStart;
    copy.result = this.result;
    copy.log = this.log;
    copy.roundCount = this.roundCount;
    return copy;
  }

  /** @returns {number} */
  rand() {
    return this.rng.next().rand;
  }

  /**
   * The next round's enemy move and line, without using the RNG.
   * @returns {{ enemyMove: DuelMove, line: string }}
   */
  peekRound() {
    if (this.enemyMove !== null) return { enemyMove: this.enemyMove, line: this.line };
    const enemyMove = duelEnemyMove(this.rng.peek().rand);
    return { enemyMove, line: this.data.dialogue[this.lastOutcome][enemyMove] };
  }

  /** The pending round's line. @returns {string | null} */
  get line() {
    return this.enemyMove === null ? null : this.data.dialogue[this.lastOutcome][this.enemyMove];
  }

  /**
   * Round start: one rand() for the enemy's move. Does nothing if the round already started.
   * @returns {{ enemyMove: DuelMove, line: string }}
   */
  startRound() {
    if (this.result !== null) throw new Error('The duel is over');
    if (this.enemyMove === null) {
      this.rngStart = this.rng.raw;
      this.enemyMove = duelEnemyMove(this.rand());
    }
    return { enemyMove: this.enemyMove, line: this.line };
  }

  /**
   * Lands the round's hits for the player's move, starting the round first if needed. Both hits
   * always land and roll; the KO check runs after the whole round, player first, so a double KO
   * is a loss. HP has no floor at 0 mid-round.
   * @param {DuelMove} playerMove
   * @returns {DuelRound}
   */
  resolveRound(playerMove) {
    this.startRound();
    const enemyMove = this.enemyMove;
    const line = this.line;
    const outcome = playerMove * 3 + enemyMove + 1;
    /** @type {DuelHit[]} */
    const hits = [];
    for (const { side, flag } of DUEL_OUTCOME_HITS[outcome]) {
      const defender = this.sides[side];
      const attacker = this.sides[1 - side];
      const rand = this.rand();
      const damage = duelHitDamage(attacker.ATK, defender.DEF, defender.HP, flag, rand);
      defender.HP = Math.min(defender.HP - damage, defender.maxHP);
      hits.push({ side, flag, rand, damage, HP: defender.HP });
    }
    if (this.player.HP < 1) this.result = DUEL_RESULTS.LOSE;
    else if (this.enemy.HP < 1) this.result = DUEL_RESULTS.WIN;

    this.lastOutcome = outcome;
    this.enemyMove = null;
    /** @type {DuelRound} */
    const round = {
      round: this.roundCount + 1,
      rngStart: this.rngStart,
      enemyMove,
      line,
      playerMove,
      outcome,
      hits,
      result: this.result,
    };
    this.log = { round, prev: this.log };
    this.roundCount++;
    return round;
  }

  /**
   * Plays rounds until the duel ends or maxRounds more have been played.
   * @param {(duel: Duel, enemyMove: DuelMove) => DuelMove} choose - picks the player's move once
   *   the enemy's is known
   * @param {number} [maxRounds]
   */
  play(choose, maxRounds = 100) {
    for (let i = 0; i < maxRounds && this.result === null; i++) {
      const { enemyMove } = this.startRound();
      this.resolveRound(choose(this, enemyMove));
    }
    return this;
  }
}
