import RNG from '../../rng.js';
import { WAR_UNIT_KEYS } from '../Keys.js';
import {
  MATCHUP,
  MATCHUPS,
  THIEF_RESULTS,
  WAR_OUTCOMES,
  WAR_RESOLVERS,
  WAR_TYPES,
} from './WarConstants.js';
import {
  WAR_CHARACTERS,
  WAR_CHARACTER_LIST,
  WAR_SCENARIOS,
  WAR_UNITS,
  WAR_UNIT_LIST,
  typeIndex,
} from './WarData.js';
import WarField, { SIDE_ENEMY, SIDE_PLAYER } from './WarField.js';

/** @typedef {import('../Keys.js').WarCharacterKey} WarCharacterKey */
/** @typedef {import('../Keys.js').WarUnitKey} WarUnitKey */
/** @typedef {import('../Keys.js').WarScenarioKey} WarScenarioKey */
/** @typedef {import('./WarConstants.js').WarType} WarType */
/** @typedef {import('./WarConstants.js').WarOutcome} WarOutcome */
/** @typedef {import('./WarConstants.js').ThiefResult} ThiefResult */
/** @typedef {import('./WarData.js').WarEnemyAction} WarEnemyAction */
/** @typedef {import('./WarField.js').RoundPlan} RoundPlan */

/**
 * What a command did.
 * @typedef {Object} WarCommandResult
 * @property {WarUnitKey} unit
 * @property {number} lossPlayer - Soldiers the player lost (negative: the army grew).
 * @property {number} lossEnemy
 * @property {number} frames - Sprite frames of the round animation (0 for a command with none).
 * @property {boolean} banter - Whether a banter event ran.
 * @property {number} gain - Merchants: the soldiers that changed hands.
 * @property {ThiefResult | null} thief - Thieves: what the roll did.
 * @property {WarOutcome | null} outcome - Set once the battle is over.
 */

/**
 * @typedef {Object} WarCommandOptions
 * @property {number | null} [gap] - Frames the player takes to confirm the next command after
 *   this one's round. null (the default): long enough for every sprite to arrive. A shorter
 *   confirm re-aims the sprites still walking, which changes the next round's rand() use.
 */

/** The command a unit is, apart from the Charge, Bow and Magic rounds */
const OTHERS = new Set(
  /** @type {WarUnitKey[]} */ ([
    WAR_UNIT_KEYS.STRATEGISTS,
    WAR_UNIT_KEYS.NINJAS,
    WAR_UNIT_KEYS.THIEVES,
    WAR_UNIT_KEYS.MERCHANTS,
    WAR_UNIT_KEYS.DRAGON_KNIGHTS,
  ]),
);

const UNIT_ID = {
  THIEVES: WAR_UNITS[WAR_UNIT_KEYS.THIEVES].id,
  NINJAS: WAR_UNITS[WAR_UNIT_KEYS.NINJAS].id,
};

const AVAILABLE = 0xff;
const NOT_RECRUITED = 0xfd;
/** Used up by a Thief or Ninja command */
const USED_UP = 0xfc;

/** The roll added to a loss: a value from -30 to +31 */
const roll = (/** @type {number} */ r) => Math.floor(r / 537) - 30;

/**
 * A war battle (the army-vs-army fights), reproducing the game's rand() stream exactly: the rules,
 * the enemy's actions and the soldier sprites' animation. It starts at the first command menu;
 * `use()` plays one command at a time.
 *
 *   const war = WarBattle.start(WAR_SCENARIO_KEYS.KUWA, { recruited: [CHARACTER_KEYS.PAHN, ...] });
 *   war.units(WAR_TYPES.CHARGE);        // the units that can be used as a Charge
 *   war.use(WAR_UNIT_KEYS.COMMANDERS_TEAM);
 *   war.rng.raw; war.playerSoldiers; war.enemyAction;
 */
export default class WarBattle {
  /**
   * @param {WarScenarioKey} scenarioKey
   * @param {Object} options
   * @param {WarCharacterKey[]} options.recruited - Who is recruited; every available character
   *   joins the army and their units are offered.
   * @param {number} [options.seed] - Defaults to the seed the war resets to.
   */
  static start(scenarioKey, { recruited, seed }) {
    const battle = new WarBattle(scenarioKey, recruited, seed);
    battle.field.init();
    battle.pickEnemyAction();
    return battle;
  }

  /**
   * @param {WarScenarioKey} scenarioKey
   * @param {WarCharacterKey[]} recruited
   * @param {number} [seed]
   */
  constructor(scenarioKey, recruited, seed) {
    const scenario = WAR_SCENARIOS[scenarioKey];
    if (!scenario) throw new Error(`Unknown war scenario ${scenarioKey}`);
    this.scenarioKey = scenarioKey;
    this.scenario = scenario;
    this.rng = new RNG(seed ?? scenario.seed);

    /** Per war ID: AVAILABLE, NOT_RECRUITED or USED_UP */
    this.availability = new Uint8Array(WAR_CHARACTER_LIST.length).fill(NOT_RECRUITED);
    let soldiers = 0;
    for (const key of recruited) {
      const character = WAR_CHARACTERS[key];
      if (!character) throw new Error(`${key} is not a war character`);
      if (this.availability[character.id] === AVAILABLE) continue;
      this.availability[character.id] = AVAILABLE;
      soldiers += character.soldiers;
    }
    this.playerSoldiers = soldiers;
    this.enemySoldiers = scenario.enemySoldiers;
    /** The army size at the start: the most the Merchants can bring it back to */
    this.playerCap = soldiers;

    this.field = new WarField(
      this.rng,
      this.playerSoldiers,
      this.enemySoldiers,
      scenario.soldiersPerSprite,
      scenario.resolver === WAR_RESOLVERS.TEO2,
    );

    /** @type {boolean[]} per unit ID: used up this battle */
    this.unitUsed = new Array(WAR_UNIT_LIST.length).fill(false);
    /** Turns the Strategists' buff has left */
    this.strategistBuff = 0;
    /** A Thief or Ninja command was used this turn */
    this.thiefOrNinjaUsed = false;
    this.turn = 0;
    this.enemyUsed = new Array(8).fill(false);
    this.scriptPos = 0;
    /** Index into the scenario's actions: what the enemy does this turn */
    this.enemyActionIndex = 0;
    /** @type {WarOutcome | null} */
    this.outcome = null;
    /** Set by a round the player lost the matchup of: it arms the banter roll */
    this.playerLostMatchup = false;
  }

  /** @returns {WarBattle} an independent copy, to branch a search */
  clone() {
    const copy = Object.create(WarBattle.prototype);
    Object.assign(copy, this);
    copy.rng = this.rng.clone();
    copy.availability = this.availability.slice();
    copy.unitUsed = [...this.unitUsed];
    copy.enemyUsed = [...this.enemyUsed];
    copy.field = this.field.clone(copy.rng);
    return copy;
  }

  /**
   * How a Charge, Bow or Magic unit fares against the enemy's action this turn (MATCHUP.WIN,
   * LOSE or TIE). Meaningless for an Others unit, and for the scripted scenarios, whose resolvers
   * ignore the enemy's action.
   * @param {WarUnitKey} unit
   */
  matchup(unit) {
    return MATCHUPS[
      typeIndex(/** @type {WarType} */ (this.unitType(unit))) * 3 + typeIndex(this.enemyAction.type)
    ];
  }

  /** @returns {WarEnemyAction} what the enemy does this turn */
  get enemyAction() {
    return this.scenario.actions[this.enemyActionIndex];
  }

  /** Whether the battle's end is a game over (a defeat in a scripted story loss is not) */
  get isGameOver() {
    return (
      (this.outcome === WAR_OUTCOMES.DEFEAT || this.outcome === WAR_OUTCOMES.NO_UNITS_LEFT) &&
      this.scenario.gameOverOnLoss
    );
  }

  // ---------------------------------------------------------------- units

  /**
   * The members of a unit that can still fight, in power order.
   * @param {WarUnitKey} unit
   */
  availableMembers(unit) {
    return WAR_UNITS[unit].members.filter(
      (m) => this.availability[WAR_CHARACTERS[m].id] === AVAILABLE,
    );
  }

  /**
   * What a unit is, set by its first available member (null when none is left).
   * @param {WarUnitKey} unit
   * @returns {WarType | null}
   */
  unitType(unit) {
    const [first] = this.availableMembers(unit);
    return first ? WAR_CHARACTERS[first].type : null;
  }

  /**
   * A unit's power: the first member's base plus every later member's extra, times 1.5 for a Charge
   * unit while the Strategists' buff lasts.
   * @param {WarUnitKey} unit
   */
  unitPower(unit) {
    const [first, ...rest] = this.availableMembers(unit);
    if (!first) return 0;
    let power = WAR_CHARACTERS[first].base + rest.reduce((s, m) => s + WAR_CHARACTERS[m].extra, 0);
    if (WAR_CHARACTERS[first].type === WAR_TYPES.CHARGE && this.strategistBuff > 0) {
      power += Math.floor(power / 2);
    }
    return power & 0xff;
  }

  /**
   * The units the command menu offers under a category.
   * @param {WarType} type
   * @returns {WarUnitKey[]}
   */
  units(type) {
    return WAR_UNIT_LIST.filter((unit) => this.isOffered(unit) && this.unitType(unit) === type);
  }

  /** @param {WarUnitKey} unit */
  isOffered(unit) {
    const { id } = WAR_UNITS[unit];
    if (this.unitUsed[id]) return false;
    if ((id === UNIT_ID.THIEVES || id === UNIT_ID.NINJAS) && this.thiefOrNinjaUsed) return false;
    return this.availableMembers(unit).length > 0;
  }

  /** @param {WarUnitKey} unit */
  speakingMembers(unit) {
    return this.availableMembers(unit).filter((m) => WAR_CHARACTERS[m].speaking);
  }

  // ---------------------------------------------------------------- enemy action pick (phase 1)

  /** Picks the enemy's action for the turn: from the script's range, without replacement */
  pickEnemyAction() {
    const [lo, hi] = this.scenario.turns[this.scriptPos];
    const k = Math.floor(0x7fff / (hi - lo + 1));
    let index;
    do {
      index = Math.floor(this.field.rand() / k) + lo;
    } while (this.enemyUsed[index]);
    this.enemyActionIndex = index;
    this.enemyUsed[index] = true;
    this.scriptPos++;
    if (this.scriptPos > this.scenario.turns.length - 1) {
      this.enemyUsed.fill(false);
      this.scriptPos = 0;
    }
  }

  // Commands

  /**
   * Uses a unit: a Charge, Bow or Magic round, or an Others command. The RNG advances exactly as
   * in the game.
   * @param {WarUnitKey} unit
   * @param {WarCommandOptions} [options]
   * @returns {WarCommandResult}
   */
  use(unit, { gap = null } = {}) {
    if (this.outcome) throw new Error('The battle is over');
    if (!WAR_UNITS[unit]) throw new Error(`Unknown war unit ${unit}`);
    if (!this.isOffered(unit)) throw new Error(`${unit} is not offered`);
    this.field.gap = gap;
    /** @type {WarCommandResult} */
    const result = {
      unit,
      lossPlayer: 0,
      lossEnemy: 0,
      frames: 0,
      banter: false,
      gain: 0,
      thief: null,
      outcome: null,
    };
    // a unit's type is its first available member's: the Strategists without Mathiu are a Charge
    if (this.unitType(unit) === WAR_TYPES.OTHER) {
      if (!OTHERS.has(unit)) throw new Error(`${unit} has no Others command`);
      switch (unit) {
        case WAR_UNIT_KEYS.STRATEGISTS:
          this.useStrategists(unit);
          break;
        case WAR_UNIT_KEYS.NINJAS:
          this.useNinjas(unit);
          break;
        case WAR_UNIT_KEYS.THIEVES:
          result.thief = this.useThieves(unit);
          break;
        case WAR_UNIT_KEYS.MERCHANTS:
          result.gain = this.useMerchants(unit);
          break;
        default:
          this.useDragonKnights(unit, result);
      }
    } else {
      this.playRound(unit, result);
    }
    result.outcome = this.outcome;
    return result;
  }

  // Charge, Bow and Magic

  /**
   * The round resolver (FUN_8001b610): rolls the losses and picks the animation.
   * @param {number} category - 0 Charge, 1 Bow, 2 Magic
   * @param {WarUnitKey} unit
   * @returns {{lossPlayer: number, lossEnemy: number, plan: RoundPlan}}
   */
  resolve(category, unit) {
    const rand = () => this.field.rand();
    const raw = this.unitPower(unit);
    const playerPower = raw + Math.floor(this.playerSoldiers / 3000);
    const { type: enemyType, power: enemyRaw } = this.enemyAction;
    const enemyPower = enemyRaw + Math.floor(this.enemySoldiers / 3000);
    const matchup = MATCHUPS[category * 3 + typeIndex(enemyType)];
    this.playerLostMatchup = false;

    /** @param {number} lossPlayer @param {number} lossEnemy @param {RoundPlan} plan */
    const rolled = (lossPlayer, lossEnemy, plan) => ({ lossPlayer, lossEnemy, plan });
    /**
     * FUN_8001b4e8: each loss is clamped to the army; when both armies would be wiped out, one
     * more roll leaves the player a few soldiers (it can come out negative: the army grows)
     * @param {number} lossPlayer @param {number} lossEnemy @param {RoundPlan} plan
     */
    const clamped = (lossPlayer, lossEnemy, plan) => {
      lossPlayer = Math.min(lossPlayer, this.playerSoldiers);
      lossEnemy = Math.min(lossEnemy, this.enemySoldiers);
      if (lossEnemy === this.enemySoldiers && lossPlayer === this.playerSoldiers) {
        lossPlayer =
          this.playerSoldiers -
          Math.floor(rand() / Math.floor(0x7fff / (this.playerSoldiers + 1))) -
          1;
      }
      return rolled(lossPlayer, lossEnemy, plan);
    };

    switch (this.scenario.resolver) {
      case WAR_RESOLVERS.TEO1: {
        // the player always loses; the enemy never does
        const lossPlayer = Math.min(130 * playerPower + roll(rand()), this.playerSoldiers);
        return rolled(lossPlayer, 0, { kind: 'charge', drift: 100 });
      }
      case WAR_RESOLVERS.SCA1:
        // 80% of the army, no roll, no casting
        return rolled(
          Math.min(Math.floor((this.playerSoldiers * 8) / 10), this.playerSoldiers),
          0,
          {
            kind: 'magic',
            side: null,
          },
        );
      case WAR_RESOLVERS.TEO2: {
        // the enemy's action doesn't matter
        if (category === 0) {
          const r1 = rand();
          const r2 = rand();
          return clamped(40 * playerPower + roll(r2), 130 * playerPower + roll(r1), {
            kind: 'charge',
            drift: -100,
          });
        }
        return clamped(130 * playerPower + roll(rand()), 0, { kind: 'charge', drift: 100 });
      }
    }

    if (matchup === MATCHUP.LOSE) {
      this.playerLostMatchup = true;
      if (enemyType === WAR_TYPES.BOW) {
        return clamped(120 * enemyPower + roll(rand()), 0, { kind: 'bow', sides: [SIDE_ENEMY] });
      }
      if (enemyType === WAR_TYPES.CHARGE) {
        const r1 = rand();
        const r2 = rand();
        return clamped(130 * playerPower + roll(r2), 80 * playerPower + roll(r1), {
          kind: 'charge',
          drift: 100,
        });
      }
      return clamped(200 * enemyRaw, 0, { kind: 'magic', side: SIDE_ENEMY });
    }
    if (matchup === MATCHUP.WIN) {
      if (category === 1) {
        return clamped(0, 120 * playerPower + roll(rand()), { kind: 'bow', sides: [SIDE_PLAYER] });
      }
      if (category === 0) {
        const r1 = rand();
        const r2 = rand();
        return clamped(80 * playerPower + roll(r2), 130 * playerPower + roll(r1), {
          kind: 'charge',
          drift: -100,
        });
      }
      return clamped(0, 200 * raw, { kind: 'magic', side: SIDE_PLAYER });
    }
    // tie
    if (category === 1) {
      const r1 = rand();
      const r2 = rand();
      return clamped(90 * enemyPower + roll(r2), 90 * playerPower + roll(r1), {
        kind: 'bow',
        sides: [SIDE_PLAYER, SIDE_ENEMY],
      });
    }
    if (category === 0) {
      const r1 = rand();
      const r2 = rand();
      return clamped(100 * enemyPower + roll(r2), 100 * playerPower + roll(r1), {
        kind: 'charge',
        drift: 0,
      });
    }
    // Magic against Magic: a roll decides who is hit. It never arms the banter.
    if (Math.floor(rand() / Math.floor(0x7fff / (raw + enemyRaw + 1))) < raw) {
      return clamped(0, 200 * raw, { kind: 'magic', side: SIDE_PLAYER });
    }
    return clamped(200 * enemyRaw, 0, { kind: 'magic', side: SIDE_ENEMY });
  }

  /**
   * @param {WarUnitKey} unit
   * @param {WarCommandResult} result
   */
  playRound(unit, result) {
    const category = typeIndex(/** @type {WarType} */ (this.unitType(unit)));
    const { lossPlayer, lossEnemy, plan } = this.resolve(category, unit);
    result.frames = this.field.playRound(
      plan,
      this.playerSoldiers - lossPlayer,
      this.enemySoldiers - lossEnemy,
    );
    // the sprites keep walking to their spots while the results panel is up (no rand() there)
    this.field.settle();
    // the results panel (state 8): applies the losses and marks the unit
    this.playerSoldiers -= lossPlayer;
    this.enemySoldiers -= lossEnemy;
    this.unitUsed[WAR_UNITS[unit].id] = true;
    result.lossPlayer = lossPlayer;
    result.lossEnemy = lossEnemy;
    result.banter = this.rollBanter(unit);
    this.endRound();
  }

  /**
   * State 8's banter roll and, when it hits, the two rolls inside the banter (states 9 and 0xd).
   * @param {WarUnitKey} unit
   */
  rollBanter(unit) {
    if (!this.playerLostMatchup) return false;
    const speaking = this.speakingMembers(unit);
    if (Math.floor(this.field.rand() / 324) < 90 && speaking.length > 0) {
      this.field.rand(); // who speaks
      this.field.rand(); // which line
      return true;
    }
    return false;
  }

  /** State 0x14: the end of the round, and the next turn's enemy action */
  endRound() {
    if (this.enemySoldiers <= 0) {
      this.outcome = WAR_OUTCOMES.VICTORY;
      this.field.victoryFormUp();
    } else if (this.playerSoldiers <= 0) {
      this.outcome = WAR_OUTCOMES.DEFEAT;
    } else {
      if (this.strategistBuff > 0) this.strategistBuff--;
      this.thiefOrNinjaUsed = false;
      this.pickEnemyAction();
      if (![WAR_TYPES.CHARGE, WAR_TYPES.BOW, WAR_TYPES.MAGIC].some((t) => this.units(t).length)) {
        this.outcome = WAR_OUTCOMES.NO_UNITS_LEFT;
      }
      // the command menu ends the battle when it opens on the turn limit
      if (this.scenario.turnLimit !== null && this.turn + 1 === this.scenario.turnLimit) {
        this.outcome = WAR_OUTCOMES.NO_UNITS_LEFT;
      }
    }
    this.turn++;
  }

  // Others

  /** The buff is the unit's power: it multiplies Charge units for that many turns. No rand(). */
  /** @param {WarUnitKey} unit */
  useStrategists(unit) {
    this.strategistBuff = this.unitPower(unit);
    this.unitUsed[WAR_UNITS[unit].id] = true;
  }

  /** Reveals the enemy's action and uses up the first available member. No rand(). */
  /** @param {WarUnitKey} unit */
  useNinjas(unit) {
    this.thiefOrNinjaUsed = true;
    this.useUpFirstMember(unit);
  }

  /**
   * One roll: reveals the enemy's action, fails, or steals 2000 bits. The first available member
   * is used up either way.
   * @param {WarUnitKey} unit
   * @returns {ThiefResult}
   */
  useThieves(unit) {
    const q = Math.floor(this.field.rand() / 0x1fff);
    this.thiefOrNinjaUsed = true;
    this.useUpFirstMember(unit);
    if (q < 2) return THIEF_RESULTS.REVEAL;
    return q === 2 ? THIEF_RESULTS.FAIL : THIEF_RESULTS.STEAL;
  }

  /** @param {WarUnitKey} unit */
  useUpFirstMember(unit) {
    const [first] = this.availableMembers(unit);
    this.availability[WAR_CHARACTERS[first].id] = USED_UP;
  }

  /**
   * One roll for the bucket; then, if soldiers change hands (an eighth or a quarter of the enemy's,
   * at most what the player has lost), the sprites move across.
   * @param {WarUnitKey} unit
   * @returns {number} the soldiers that changed hands
   */
  useMerchants(unit) {
    const q = Math.floor(this.field.rand() / 0x1fff);
    const deficit = this.playerCap - this.playerSoldiers;
    let gain = 0;
    if (q !== 0 && deficit !== 0) {
      gain = Math.min(deficit, this.enemySoldiers >> (q === 1 ? 3 : 2));
    }
    if (gain) {
      this.field.transfer(this.playerSoldiers + gain, this.enemySoldiers - gain);
      this.playerSoldiers += gain;
      this.enemySoldiers -= gain;
    }
    this.unitUsed[WAR_UNITS[unit].id] = true;
    return gain;
  }

  /**
   * Uses up the turn. Against a Bow attack the Knights are countered and nobody takes damage;
   * otherwise the enemy loses a quarter of its soldiers and doesn't get to attack.
   * @param {WarUnitKey} unit
   * @param {WarCommandResult} result
   */
  useDragonKnights(unit, result) {
    const countered = this.enemyAction.type === WAR_TYPES.BOW;
    const damage = countered ? 0 : this.enemySoldiers >> 2;
    this.field.playDragonKnights(countered, damage, this.playerSoldiers, this.enemySoldiers);
    if (!countered) this.enemySoldiers -= damage;
    this.unitUsed[WAR_UNITS[unit].id] = true;
    result.lossEnemy = damage;
    this.playerLostMatchup = countered;
    if (countered) result.banter = this.rollBanter(unit);
    this.endRound();
  }
}
