import { cDiv } from '../../util/math.js';

/** @typedef {import('../../rng.js').default} RNG */

// The soldier sprites of a war battle: every army is drawn as `soldiers / soldiersPerSprite + 1`
// sprites, and the way they run, fight, die and form up draws most of the battle's rand() calls.
// This is a port of the game's per-frame loop (see WarBattle.js for the rules around it). Every
// division is C's (truncating) and every position is a wrapping 16-bit value.

/** Frames the round state machine waits (state 0x13) after the resolver and after the animation */
const UI_WAIT = 13;

const SIDE_PLAYER = 0;
const SIDE_ENEMY = 1;

/** Sprite states */
const IDLE = 0,
  WALKING = 2,
  RUNNING = 3,
  FIGHTING = 4,
  FAST_RUN = 5,
  STUMBLED = 6,
  CORPSE = 7,
  DYING = 8,
  ARCHER = 9;

const ARROW_POOL = 30;
const FX_POOL = 30;

/** @param {number} v */
const s16 = (v) => (v << 16) >> 16;

// The quarter-wave sine table at main.exe 0x801765bc is round(4096 * sin(i * pi / 2 / 1024)),
// i = 0..1024; rsin/rcos are the BIOS-style functions on it (4096 = a full turn).
const SIN_TABLE = Array.from({ length: 0x401 }, (_, i) =>
  Math.round(4096 * Math.sin((i * Math.PI) / 2 / 0x400)),
);

/** @param {number} x */
function sinPositive(x) {
  x &= 0xfff;
  if (x <= 0x400) return SIN_TABLE[x];
  if (x <= 0x800) return SIN_TABLE[0x800 - x];
  if (x <= 0xc00) return -SIN_TABLE[x - 0x800];
  return -SIN_TABLE[0x1000 - x];
}

/** @param {number} a */
export const rsin = (a) => (a >= 0 ? sinPositive(a) : -sinPositive(-a));

/** @param {number} a */
export function rcos(a) {
  if (a < 0) a = -a;
  const u = a & 0xfff;
  if (u < 0x801) return u < 0x401 ? SIN_TABLE[0x400 - u] : -SIN_TABLE[u - 0x400];
  if (u > 0xc00) return SIN_TABLE[u - 0xc00];
  return -SIN_TABLE[0xc00 - u];
}

/** One soldier sprite. Positions and velocities are fixed point (pixels * 16). */
class Sprite {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.tx = 0;
    this.ty = 0;
    this.state = IDLE;
    this.timer = 0;
  }
}

class Arrow {
  constructor() {
    this.state = 0;
    this.timer = 0;
    this.tside = 0xff;
    this.tidx = 0;
  }
}

/**
 * How a round looks, decided by the resolver.
 * @typedef {{kind: 'charge', drift: number} | {kind: 'bow', sides: number[]} |
 *   {kind: 'magic', side: number | null}} RoundPlan
 */

export default class WarField {
  /**
   * @param {RNG} rng
   * @param {number} playerSoldiers @param {number} enemySoldiers
   * @param {number} soldiersPerSprite
   * @param {boolean} playerSoundRolls - Teo 2: two extra rolls per player sprite whose run ends.
   */
  constructor(rng, playerSoldiers, enemySoldiers, soldiersPerSprite, playerSoundRolls) {
    this.rng = rng;
    this.perSprite = soldiersPerSprite;
    this.playerSoundRolls = playerSoundRolls;
    /** Sprites per side, fixed at the start of the battle */
    this.cap = [
      Math.floor(playerSoldiers / soldiersPerSprite) + 1,
      Math.floor(enemySoldiers / soldiersPerSprite) + 1,
    ];
    /** @type {Sprite[][]} */
    this.sprites = [[], []];
    /** Sprites not dead yet, per side */
    this.alive = [...this.cap];
    /** Sprites each side still has to lose (negative: to win back) */
    this.kill = [0, 0];
    this.drift = 0;
    /** @type {Arrow[]} */
    this.arrows = [];
    this.fx = Array.from({ length: FX_POOL }, () => ({
      state: 0,
      timer: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ground: 0,
    }));
    /** Frames between a round's end and the next command's resolver; null: everyone arrives */
    this.gap = null;
    /** Sprite frames simulated so far */
    this.frames = 0;
    this.stillToKill = 0;
  }

  /**
   * An independent copy that draws from `rng` (the copy's own RNG: pass the cloned battle's).
   * @param {RNG} rng
   */
  clone(rng) {
    const copy = Object.create(WarField.prototype);
    Object.assign(copy, this);
    copy.rng = rng;
    copy.cap = [...this.cap];
    copy.alive = [...this.alive];
    copy.kill = [...this.kill];
    copy.sprites = this.sprites.map((list) => list.map((s) => Object.assign(new Sprite(), s)));
    copy.arrows = this.arrows.map((a) => Object.assign(new Arrow(), a));
    copy.fx = this.fx.map((f) => ({ ...f }));
    return copy;
  }

  rand() {
    return this.rng.next().rand;
  }

  // ---------------------------------------------------------------- aiming and moving

  /** FUN_80018098: sets the velocity and the timer from the sprite's position and target */
  /** @param {Sprite} s @param {number} speed */
  setCourse(s, speed) {
    const dx = s.tx - (s.x >> 4);
    const dy = s.ty - (s.y >> 4);
    if (Math.abs(dy) < Math.abs(dx)) {
      s.vx = s16(dx > 0 ? speed : -speed);
      s.timer = s16(cDiv(s.tx * 16 - s.x, s.vx));
      if (s.timer === 0) s.state = IDLE;
      else s.vy = s16(cDiv(s.ty * 16 - s.y, s.timer));
    } else {
      s.vy = s16(dy > 0 ? speed : -speed);
      s.timer = s16(cDiv(s.ty * 16 - s.y, s.vy));
      if (s.timer === 0) s.state = WALKING;
      else s.vx = s16(cDiv(s.tx * 16 - s.x, s.timer));
    }
  }

  /** The (lo, hi) range of x a running sprite picks its target from */
  /** @param {number} side */
  runRange(side) {
    return side === SIDE_PLAYER ? [this.drift, 0x96] : [-150, this.drift];
  }

  /** FUN_800156b0: a sprite starts (or restarts) a run, 4 rand() calls */
  /** @param {number} side @param {number} idx */
  startRun(side, idx) {
    const s = this.sprites[side][idx];
    if (s.state === CORPSE || s.state === DYING) return;
    if (Math.floor(this.rand() / 324) < 20) {
      s.tx = s16(this.drift + Math.floor(this.rand() / 799) - 20);
      s.ty = s16(Math.floor(this.rand() / 537) + 50);
      s.state = FAST_RUN;
      this.setCourse(s, Math.floor(this.rand() / 0x1fff) + 0xf);
    } else {
      const [lo, hi] = this.runRange(side);
      s.tx = s16(lo + Math.floor(this.rand() / Math.floor(0x7fff / (hi - lo + 1))));
      s.ty = s16(Math.floor(this.rand() / 537) + 50);
      s.state = RUNNING;
      this.setCourse(s, Math.floor(this.rand() / 0x1fff) + 0xd);
    }
  }

  /** FUN_80015a34: every sprite of both sides starts a run */
  allCharge() {
    for (const side of [SIDE_PLAYER, SIDE_ENEMY]) {
      for (let i = 0; i < this.cap[side]; i++) this.startRun(side, i);
    }
  }

  /** FUN_80017148 (the visual part is skipped) */
  /** @param {Sprite} s */
  die(s) {
    s.state = DYING;
    s.timer = 0;
    s.ty = -128;
  }

  /** FUN_800174a0: a sprite picks a spot in lo..hi and walks to it, 3 rand() calls */
  /** @param {number} side @param {number} idx @param {number} lo @param {number} hi */
  formUpOne(side, idx, lo, hi) {
    const s = this.sprites[side][idx];
    if (s.state === CORPSE || s.state === DYING) return;
    s.tx = s16(lo + Math.floor(this.rand() / Math.floor(0x7fff / (hi - lo + 1))));
    s.ty = s16(Math.floor(this.rand() / 537) + 50);
    this.setCourse(s, Math.floor(this.rand() / 0x1249) + 0xc);
    s.state = WALKING;
  }

  /** FUN_800176a8: every living sprite picks a new spot, player side first */
  formUp() {
    for (const [side, lo, hi] of [
      [SIDE_PLAYER, 50, 135],
      [SIDE_ENEMY, -155, -70],
    ]) {
      for (let idx = 0; idx < this.cap[side]; idx++) this.formUpOne(side, idx, lo, hi);
    }
  }

  /** FUN_80017770: after a victory every player sprite picks a spot, then sprite 0 once more */
  victoryFormUp() {
    for (let idx = 0; idx < this.cap[SIDE_PLAYER]; idx++) this.formUpOne(SIDE_PLAYER, idx, -60, 60);
    this.formUpOne(SIDE_PLAYER, 0, -10, 0);
  }

  /** FUN_8001839c: how many sprites each side has to lose to match its new army */
  /** @param {number} newPlayer @param {number} newEnemy */
  setKills(newPlayer, newEnemy) {
    /** @param {number} side @param {number} soldiers */
    const kills = (side, soldiers) =>
      (soldiers & 0xffff) === 0
        ? this.alive[side]
        : this.alive[side] - (Math.floor((soldiers & 0xffff) / this.perSprite) + 1);
    this.kill = [kills(SIDE_PLAYER, newPlayer), kills(SIDE_ENEMY, newEnemy)];
  }

  // ---------------------------------------------------------------- fx pool
  // Sparks and flying bits. Only a full pool matters: it changes how many rand() calls are made.

  /** FUN_8001f20c */
  spawnSpark() {
    for (const f of this.fx) {
      if (f.state === 0) {
        f.state = 1;
        f.timer = 0xf;
        return;
      }
    }
  }

  /** FUN_8001f320: a flying bit; takes one rand() when a slot is free */
  /** @param {number} x @param {number} y */
  spawnArc(x, y) {
    for (const f of this.fx) {
      if (f.state === 0) {
        f.state = 2;
        f.vx = -30;
        f.vy = 0;
        // only bits 4..15 are written: the old fraction nibble of the slot survives
        f.x = s16(((x & 0xfff) << 4) | (f.x & 0xf));
        f.y = s16(((y & 0xfff) << 4) | (f.y & 0xf));
        f.ground = Math.floor(this.rand() / 0x421) + 0x4b;
        return;
      }
    }
  }

  /** FUN_8001f48c */
  updateFx() {
    for (const f of this.fx) {
      if (f.state === 1) {
        const old = f.timer;
        f.timer = s16(old - 1);
        if (old < 0) f.state = 0;
      } else if (f.state === 2) {
        f.x = s16(f.x + f.vx);
        f.y = s16(f.y + f.vy);
        f.vy += 1;
        if (f.ground < f.y >> 4) f.state = 0;
      }
    }
  }

  // ---------------------------------------------------------------- sprite state handlers

  /** @param {Sprite} s */
  move(s) {
    s.x = s16(s.x + s.vx);
    s.y = s16(s.y + s.vy);
  }

  /** @param {number} side @param {number} idx @param {Sprite} s */
  updateSprite(side, idx, s) {
    switch (s.state) {
      case IDLE:
        s.vx = 0;
        s.vy = 0;
        break;
      case WALKING: {
        this.move(s);
        const old = s.timer;
        s.timer = s16(old - 1);
        if (old <= 0) {
          s.state = IDLE;
          s.vx = 0;
          s.vy = 0;
        }
        break;
      }
      case RUNNING:
        this.move(s);
        if (this.rand() >> 4 === 1) {
          s.state = STUMBLED;
          s.timer = 0x3d;
        } else {
          const old = s.timer;
          s.timer = s16(old - 1);
          if (old <= 0) this.startRun(side, idx);
        }
        break;
      case FIGHTING: {
        const n = Math.min(2, Math.floor(this.alive[side] / 5));
        const old = s.timer;
        s.timer = s16(old - 1);
        if (old <= 0) {
          if (this.kill[side] > 0) {
            const r = this.rand();
            if (
              Math.floor(r / Math.floor(0x7fff / (n + 1))) === 0 &&
              (this.alive[0] === 1 || side !== 0 || idx !== 0)
            ) {
              this.die(s);
              this.spawnSpark();
              this.rand(); // sound pick
              this.kill[side]--;
              this.alive[side]--;
              return;
            }
          }
          this.startRun(side, idx);
        }
        break;
      }
      case FAST_RUN: {
        this.move(s);
        const old = s.timer;
        s.timer = s16(old - 1);
        if (old <= 0) {
          if (side === SIDE_PLAYER && this.playerSoundRolls) {
            this.rand();
            this.rand();
          }
          s.state = FIGHTING;
          s.timer = s16(Math.floor(this.rand() / 0x421) + 0x3c);
          s.vx = 0;
          s.vy = 0;
        }
        break;
      }
      case STUMBLED: {
        const old = s.timer;
        s.timer = s16(old - 1);
        if (old <= 0) this.startRun(side, idx);
        break;
      }
      case DYING: {
        const old = s.timer;
        s.timer = s16(old + 1);
        if (old > 300) s.state = CORPSE;
        break;
      }
      case ARCHER:
        this.updateArcher(side, s);
        break;
    }
  }

  /** @param {number} side @param {Sprite} s */
  updateArcher(side, s) {
    if (s.timer === 0) {
      if (Math.floor(this.rand() / 324) === 1) s.timer = 0x57;
      return;
    }
    s.timer = s16(s.timer - 1);
    if (s.timer !== 0x1c) return;
    if (Math.floor(this.rand() / 0x3fff) === 1) {
      const tside = 1 - side;
      if (this.alive[tside] === 0) {
        this.groundShot();
      } else {
        const cap = this.cap[tside];
        let t;
        let state;
        do {
          t = Math.floor(this.rand() / Math.floor(0x7fff / cap));
          // t can equal cap, which reads past the array in the game: that arrow is ignored
          state = t < cap ? this.sprites[tside][t].state : IDLE;
        } while (state === CORPSE || state === DYING);
        this.fire(tside, t);
      }
    } else {
      this.groundShot();
    }
  }

  groundShot() {
    this.rand();
    this.rand();
    this.fire(0xff, 0);
  }

  /** @param {number} tside @param {number} tidx */
  fire(tside, tidx) {
    for (const a of this.arrows) {
      if (a.state === 0) {
        a.state = 1;
        a.timer = 100;
        a.tside = tside;
        a.tidx = tidx;
        return;
      }
    }
  }

  /** FUN_80016af4 */
  /** @param {number} side @param {number} idx */
  arrowHit(side, idx) {
    if (idx >= this.cap[side]) return; // the game reads past the array here (not modelled)
    const s = this.sprites[side][idx];
    if (
      s.state !== CORPSE &&
      s.state !== DYING &&
      this.kill[side] > 0 &&
      (this.alive[0] === 1 || side !== 0 || idx !== 0)
    ) {
      this.die(s);
      this.kill[side]--;
      this.alive[side]--;
    }
  }

  /** FUN_8001dcf4 */
  updateArrows() {
    for (const a of this.arrows) {
      if (a.state === 1) {
        const old = a.timer;
        a.timer = s16(old - 1);
        if (old <= 0) {
          if (a.tside !== 0xff) this.arrowHit(a.tside, a.tidx);
          this.spawnSpark();
          a.state = 0;
        }
      }
    }
  }

  /** FUN_80018530's sprite part: each side in index order, then the fx pool */
  updateSprites() {
    for (const side of [SIDE_PLAYER, SIDE_ENEMY]) {
      const list = this.sprites[side];
      for (let idx = 0; idx < this.cap[side]; idx++) this.updateSprite(side, idx, list[idx]);
    }
    this.stillToKill = this.kill[0] === 0 && this.kill[1] === 0 ? 0 : 1;
    this.updateFx();
  }

  /** FUN_8001613c, once per side per frame of a Charge round: sometimes a sprite breaks into a run */
  /** @param {number} side */
  spawnRunner(side) {
    const n = Math.min(this.alive[side] * 3, 0x3c);
    if (Math.floor(this.rand() / Math.floor(0x7fff / (n + 1))) !== 0) return;
    for (let idx = this.cap[side] - 1; idx >= 0; idx--) {
      const s = this.sprites[side][idx];
      if (s.state !== CORPSE && s.state !== DYING && s.state !== FIGHTING && s.state !== FAST_RUN) {
        s.tx = s16(this.drift + Math.floor(this.rand() / 799) - 20);
        s.ty = s16(Math.floor(this.rand() / 537) + 50);
        s.state = FAST_RUN;
        this.setCourse(s, Math.floor(this.rand() / 0x1fff) + 0xf);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- magic

  /** FUN_80016bec: the casting side walks to a circle */
  /** @param {number} side */
  cast(side) {
    const sv = side === SIDE_PLAYER ? 0x5a : -0x5a;
    const list = this.sprites[side];
    let first = 0;
    while (first < this.cap[side] && (list[first].state === CORPSE || list[first].state === DYING))
      first++;
    if (first >= this.cap[side]) return;
    const lead = list[first];
    lead.tx = sv;
    lead.ty = 0x46;
    this.setCourse(lead, Math.floor(this.rand() / 0x1249) + 0xc);
    lead.state = WALKING;
    let k = 0;
    for (let i = first + 1; i < this.cap[side]; i++) {
      const sp = list[i];
      if (sp.state === CORPSE || sp.state === DYING) continue;
      const angle = Math.floor(0x1000 / (this.alive[side] - 1)) * k;
      const c = rcos(angle);
      const sn = rsin(angle);
      sp.tx = s16(sv + s16(((((c >> 4) * 0x28) >>> 0) >>> 8) | 0));
      sp.ty = s16(s16(((((sn >> 4) * 0x14) >>> 0) >>> 8) | 0) + 0x46);
      this.setCourse(sp, Math.floor(this.rand() / 0x1249) + 0xc);
      k++;
      sp.state = WALKING;
    }
  }

  /** FUN_80016fe4: every marked sprite dies at once, from the highest index down */
  killAllMarked() {
    for (const side of [SIDE_PLAYER, SIDE_ENEMY]) {
      for (let idx = this.cap[side] - 1; idx >= 0 && this.kill[side] !== 0; idx--) {
        const s = this.sprites[side][idx];
        if (s.state !== CORPSE && s.state !== DYING) {
          this.spawnSpark();
          this.die(s);
          this.kill[side]--;
          this.alive[side]--;
        }
      }
    }
  }

  // ---------------------------------------------------------------- battle start

  /** FUN_800188e0 + FUN_800176a8: the entrance positions (2 rand() per sprite), then the formation */
  init() {
    for (const side of [SIDE_PLAYER, SIDE_ENEMY]) {
      for (let i = 0; i < this.cap[side]; i++) {
        const s = new Sprite();
        let r = this.rand();
        const x = side === SIDE_PLAYER ? Math.floor(r / 537) + 0xb4 : -Math.floor(r / 537) - 0xb4;
        s.x = s16(x * 16);
        r = this.rand();
        s.y = s16((Math.floor(r / 0x333) + 0x46) * 16);
        s.timer = -1;
        this.sprites[side][i] = s;
      }
    }
    this.formUp();
    while (this.anyWalking()) this.updateSprites();
  }

  anyWalking() {
    return this.sprites.some((list) => list.some((s) => s.state === WALKING));
  }

  // ---------------------------------------------------------------- one round

  /**
   * Plays a Charge/Bow/Magic round's animation from the resolver to the end of the round: the
   * plan's setup, the kill counters, then every frame until the 13 frame wait after the animation.
   * @param {RoundPlan} plan
   * @param {number} newPlayer @param {number} newEnemy - the armies after the round's losses
   * @returns {number} the frames the round took
   */
  playRound(plan, newPlayer, newEnemy) {
    let timer = 0;
    let archersArmed = false;
    /** @type {5 | 6 | 7} */
    let next;
    if (plan.kind === 'charge') {
      this.drift = plan.drift;
      this.allCharge();
      timer = 0x3c;
      next = 5;
    } else if (plan.kind === 'bow') {
      for (const side of plan.sides) {
        for (const s of this.sprites[side]) {
          if (s.state !== CORPSE && s.state !== DYING) {
            s.timer = 0;
            s.state = ARCHER;
          }
        }
      }
      this.arrows = Array.from({ length: ARROW_POOL }, () => new Arrow());
      next = 6;
      timer = 0xf0;
      archersArmed = true;
    } else {
      if (plan.side !== null) this.cast(plan.side);
      next = 7;
    }
    this.setKills(newPlayer, newEnemy);
    if (plan.kind === 'magic' && plan.side !== null) this.rand(); // discarded roll
    this.stillToKill = 1;

    let stall = false;
    let magicPhase = 0;
    let magicValue = 0;
    let wait = 0;
    /** @type {'wait' | 5 | 6 | 7 | 'wait2'} */
    let state = 'wait';
    this.updateSprites();
    let frames = 1;
    for (let finished = false; !finished;) {
      frames++;
      if (state === 'wait') {
        if (++wait >= UI_WAIT) state = next;
      } else if (state === 5) {
        this.spawnRunner(SIDE_PLAYER);
        this.spawnRunner(SIDE_ENEMY);
        const fin = this.alive[0] === 0 || this.alive[1] === 0 ? 0 : this.stillToKill;
        if (fin === 0) {
          const old = timer;
          timer = s16(old - 1);
          if (old <= 0) {
            this.formUp();
            state = 'wait2';
            wait = 0;
          }
        }
      } else if (state === 6) {
        const fin = this.alive[0] === 0 || this.alive[1] === 0 ? 0 : this.stillToKill;
        let done = false;
        if (fin === 0) {
          const old = timer;
          timer = s16(old - 1);
          if (old <= 0) {
            if (archersArmed) {
              for (const list of this.sprites) {
                for (const s of list) {
                  if (s.state !== CORPSE && s.state !== DYING) {
                    s.timer = 0;
                    s.state = IDLE;
                  }
                }
              }
              archersArmed = false;
            }
            timer = 0;
            if (this.arrows.every((a) => a.state !== 1)) {
              this.formUp();
              state = 'wait2';
              wait = 0;
              done = true;
            }
          }
        }
        if (!done) this.updateArrows();
      } else if (state === 7) {
        if (stall) {
          stall = false;
        } else if (!this.anyWalking()) {
          let spellDone = false;
          if (magicPhase === 0) {
            magicValue += 4;
            if (magicValue > 100) {
              magicValue = 0;
              magicPhase = 1;
            }
          } else if (magicPhase === 1) {
            magicValue += 2;
            stall = true;
            if (magicValue > 0x96) {
              magicValue = 100;
              magicPhase = 2;
            }
          } else {
            magicValue -= 8;
            if (magicValue < 0) spellDone = true;
          }
          if (spellDone) {
            this.killAllMarked();
            state = 'wait2';
            wait = 0;
          }
        }
      } else if (++wait >= UI_WAIT) {
        finished = true;
      }
      this.updateSprites();
    }
    this.frames += frames;
    return frames;
  }

  /**
   * The frames of the results panel and the menu: sprites walk to their spots, sparks fade (no
   * rand()). The game starts the next round whenever the player confirms, so with a `gap` the
   * sprites still walking are re-aimed from where they are.
   */
  settle() {
    for (let n = 0; this.anyWalking() && (this.gap === null || n < this.gap); n++) {
      this.updateSprites();
    }
    while (this.fx.some((f) => f.state)) this.updateFx();
  }

  // ---------------------------------------------------------------- Merchants

  /**
   * The Merchants' transfer (FUN_80017c88, FUN_80017e0c): the enemy's last sprites fly to the
   * player's side and become corpses, then dead player sprites come back (3 rand() each).
   * @param {number} newPlayer @param {number} newEnemy
   */
  transfer(newPlayer, newEnemy) {
    this.setKills(newPlayer, newEnemy);
    let n = this.kill[SIDE_ENEMY];
    /** @type {number[]} */
    const flying = [];
    for (let idx = this.cap[SIDE_ENEMY] - 1; idx >= 0 && n >= 1; idx--) {
      const s = this.sprites[SIDE_ENEMY][idx];
      if (s.state !== CORPSE && s.state !== DYING) {
        flying.push(idx);
        n--;
      }
    }
    for (const idx of flying) {
      this.sprites[SIDE_ENEMY][idx].state = CORPSE;
      this.kill[SIDE_ENEMY]--;
      this.alive[SIDE_ENEMY]--;
    }
    for (let idx = this.cap[SIDE_PLAYER] - 1; idx >= 0; idx--) {
      if (this.kill[SIDE_PLAYER] > -1) break;
      const s = this.sprites[SIDE_PLAYER][idx];
      if (s.state === CORPSE || s.state === DYING) {
        s.state = IDLE;
        // the game only rewrites bits 4..15 of x and y: the old fraction nibble survives
        s.x = s16(s.x & 0xf);
        s.y = s16((0x3c << 4) | (s.y & 0xf));
        this.formUpOne(SIDE_PLAYER, idx, 50, 135);
        this.kill[SIDE_PLAYER]++;
        this.alive[SIDE_PLAYER]++;
      }
    }
    this.settle();
  }

  // ---------------------------------------------------------------- Dragon Knights

  /**
   * The Dragon Knights' animation (FUN_800191cc and the loop after it): 25 knights, 5 rand()
   * each, then every frame until none is left flying.
   * @param {boolean} countered - the enemy's action is a Bow attack: the knights are shot at
   * @param {number} damage - the enemy's loss (0 when countered)
   * @param {number} playerSoldiers @param {number} enemySoldiers
   */
  playDragonKnights(countered, damage, playerSoldiers, enemySoldiers) {
    const knights = [];
    for (let i = 0; i < 25; i++) {
      const r1 = this.rand();
      const r2 = this.rand();
      const r3 = this.rand();
      const r4 = this.rand();
      const r5 = this.rand();
      knights.push({
        state: 0x1e,
        x0: Math.floor(r1 / 0x194) + 0xa0,
        y0: Math.floor(r2 / 799) - 0x8c,
        tx: Math.floor(r3 / 0x194) - 0xf0,
        ty: Math.floor(r4 / 799) - 0x50,
        timer: Math.floor(r5 / 0x10e) + 0x14,
        y16: 0,
        vy: 0,
      });
    }
    if (countered) {
      for (const s of this.sprites[SIDE_ENEMY]) {
        if (s.state !== CORPSE && s.state !== DYING) {
          s.timer = 0;
          s.state = ARCHER;
        }
      }
      this.arrows = Array.from({ length: ARROW_POOL }, () => new Arrow());
      this.setKills(playerSoldiers, enemySoldiers);
    } else {
      this.setKills(playerSoldiers, enemySoldiers - damage);
    }
    // iteration 0 (the init above): only the soldier sprites update
    this.updateSprites();
    let frames = 1;
    for (let done = false; !done;) {
      frames++;
      for (const k of knights) {
        if (k.state === 0x1e) {
          const old = k.timer;
          k.timer = old - 1;
          if (old <= 0) {
            k.timer = 0;
            k.state = 0x1f;
          }
        } else if (k.state === 0x1f) {
          const t = k.timer;
          const x = k.x0 + cDiv((k.tx - k.x0) * t, 0xb4);
          const y =
            k.y0 + cDiv((k.ty - k.y0) * t, 0xb4) + (((rsin(cDiv(t << 11, 0xb4)) >> 4) * 100) >> 8);
          if (x < 0x50) {
            if (Math.floor(this.rand() / 0x421) === 0 && damage !== 0) {
              this.rand(); // sound pick
              this.spawnArc(x, y); // one rand() if a fx slot is free
            }
          }
          if (x < 0x50) {
            if (Math.floor(this.rand() / 0x421) === 0 && damage === 0) {
              k.state = 0x21;
              k.y16 = s16((y & 0xfff) << 4);
              k.vy = 0;
              this.spawnSpark();
            }
          }
          const old = k.timer;
          k.timer = old + 1;
          if (old > 0xb4) k.state = 7;
        } else if (k.state === 0x21) {
          // shot down: falls with gravity
          k.y16 = s16(k.y16 + k.vy);
          k.vy++;
          if (k.y16 >> 4 > 100) k.state = 7;
        }
      }
      if (countered) this.updateArrows();
      done = !knights.some((k) => k.state === 0x1e || k.state === 0x1f || k.state === 0x21);
      if (done && countered) {
        for (const s of this.sprites[SIDE_ENEMY]) {
          if (s.state !== CORPSE && s.state !== DYING) {
            s.timer = 0;
            s.state = IDLE;
          }
        }
      }
      this.updateSprites();
    }
    this.frames += frames;
    if (!countered) {
      this.killAllMarked();
      this.settle();
    } else {
      // wait for the arrows in flight, then the usual formation (3 rand() per living sprite)
      while (this.arrows.some((a) => a.state === 1)) {
        this.updateArrows();
        this.updateSprites();
      }
      this.formUp();
      this.settle();
    }
  }
}

export { SIDE_PLAYER, SIDE_ENEMY };
