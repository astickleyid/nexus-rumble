import { sfx } from "@/game/audio";
import { advantage, BEAST_MAP, type Beast, type BeastId, type Move } from "@/game/roster";

export const WORLD_W = 2700;
export const STAGE = { l: 320, r: 2380 };
export const PLATS = [
  { l: 500, r: 900, y: 155 },
  { l: 1800, r: 2200, y: 155 },
  { l: 960, r: 1280, y: 240 },
  { l: 1420, r: 1740, y: 240 },
  { l: 1140, r: 1560, y: 385 },
];
export const BLAST = { l: -560, r: 3260, b: -740, t: 1860 };
const SPAWN_X = [820, 1880] as const;
const GRAVITY = 2000;
const STOCKS = 3;

export type Action = "idle" | "walk" | "jump" | "light" | "heavy" | "special" | "block" | "hit" | "ko";
export type Phase = "intro" | "fight" | "resolve" | "match";

export type Pad = {
  left: boolean;
  right: boolean;
  jump: boolean;
  block: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
  burst: boolean;
};

export const EMPTY_PAD: Pad = {
  left: false,
  right: false,
  jump: false,
  block: false,
  light: false,
  heavy: false,
  special: false,
  burst: false,
};

type Buf = { light: number; heavy: number; special: number; burst: number; jump: number };

export type Fighter = {
  slot: 0 | 1;
  beast: Beast;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  dmg: number;
  stocks: number;
  meter: number;
  burst: number;
  action: Action;
  t: number;
  hit: boolean;
  shotOut: boolean;
  airUsed: boolean;
  armor: boolean;
  flash: number;
  hitstun: number;
  specialCd: number;
  invuln: number;
  anim: number;
  land: number;
  jumps: number;
  grounded: boolean;
  drop: boolean;
  respawn: number;
  dodgeCd: number;
  combo: number;
  comboTimer: number;
  buf: Buf;
  prev: Pad;
};

export type Shot = {
  owner: 0 | 1;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  damage: number;
  kb: number;
  life: number;
  max: number;
  alive: boolean;
};

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  text: string;
};

export type Impact = { x: number; y: number; t: number; life: number; scale: number };

export type Pickup = {
  x: number;
  y: number;
  vy: number;
  kind: "heal" | "meter" | "bomb";
  fuse: number;
  alive: boolean;
};

type Plat = { l: number; r: number; y: number; soft: boolean };

type PendingHit = {
  attacker: Fighter;
  target: Fighter;
  damage: number;
  kb: number;
  kind: "light" | "heavy" | "special";
  hx: number;
  hy: number;
  blocked: boolean;
  armored: boolean;
};

const emptyBuf = (): Buf => ({ light: 0, heavy: 0, special: 0, burst: 0, jump: 0 });

function plats(): Plat[] {
  return [{ l: STAGE.l, r: STAGE.r, y: 0, soft: false }, ...PLATS.map((p) => ({ l: p.l, r: p.r, y: p.y, soft: true }))];
}

function makeFighter(slot: 0 | 1, id: BeastId): Fighter {
  const beast = BEAST_MAP[id];
  return {
    slot,
    beast,
    x: SPAWN_X[slot],
    y: 0,
    vx: 0,
    vy: 0,
    facing: slot === 0 ? 1 : -1,
    dmg: 0,
    stocks: STOCKS,
    meter: 0,
    burst: 0,
    action: "idle",
    t: 0,
    hit: false,
    shotOut: false,
    airUsed: false,
    armor: false,
    flash: 0,
    hitstun: 0,
    specialCd: 0,
    invuln: 0,
    anim: slot * 0.4,
    land: 0,
    jumps: 2,
    grounded: true,
    drop: false,
    respawn: 0,
    dodgeCd: 0,
    combo: 0,
    comboTimer: 0,
    buf: emptyBuf(),
    prev: { ...EMPTY_PAD },
  };
}

function canAct(f: Fighter) {
  if (f.respawn > 0) return false;
  if (f.action === "hit" || f.action === "ko") return false;
  if (f.action === "light" || f.action === "heavy" || f.action === "special") return false;
  return true;
}

function moveOf(f: Fighter): Move | null {
  if (f.action === "light") return f.beast.light;
  if (f.action === "heavy") return f.beast.heavy;
  return null;
}

export class MatchSim {
  p: [Fighter, Fighter];
  shots: Shot[] = [];
  sparks: Spark[] = [];
  impacts: Impact[] = [];
  items: Pickup[] = [];
  phase: Phase = "intro";
  phaseT = 0;
  time = 99;
  hitstop = 0;
  trauma = 0;
  banner = "";
  callout = "";
  calloutT = 0;
  winner: 0 | 1 | null = null;
  bannerT = 0;
  lastFall: { who: 0 | 1; dmg: number; x: number; y: number } | null = null;
  aiPad: Pad = { ...EMPTY_PAD };
  aiThink = 0;
  itemT = 2.5;
  youId: BeastId;
  rivalId: BeastId;

  constructor(you: BeastId, rival: BeastId) {
    this.youId = you;
    this.rivalId = rival;
    this.p = [makeFighter(0, you), makeFighter(1, rival)];
    this.beginIntro();
  }

  get score(): [number, number] {
    return [this.p[0].stocks, this.p[1].stocks];
  }

  beginIntro() {
    const [a, b] = this.p;
    for (const f of this.p) {
      f.dmg = 0;
      f.y = 0;
      f.vx = 0;
      f.vy = 0;
      f.action = "idle";
      f.t = 0;
      f.hit = false;
      f.shotOut = false;
      f.airUsed = false;
      f.armor = false;
      f.flash = 0;
      f.hitstun = 0;
      f.specialCd = 0;
      f.invuln = 0;
      f.jumps = 2;
      f.grounded = true;
      f.respawn = 0;
      f.combo = 0;
      f.comboTimer = 0;
      f.buf = emptyBuf();
      f.land = 0;
      f.meter = 0;
      f.burst = 0;
    }
    a.x = SPAWN_X[0];
    b.x = SPAWN_X[1];
    a.facing = 1;
    b.facing = -1;
    this.shots = [];
    this.items = [];
    this.phase = "intro";
    this.phaseT = 0;
    this.time = 99;
    this.hitstop = 0;
    this.bannerT = 0;
    this.winner = null;
    this.banner = `${a.beast.name}  VS  ${b.beast.name}`;
  }

  rematch() {
    this.p = [makeFighter(0, this.youId), makeFighter(1, this.rivalId)];
    this.sparks = [];
    this.impacts = [];
    this.beginIntro();
  }

  step(dt: number, pad: Pad) {
    this.tickFx(dt);
    if (this.phase === "fight") {
      this.readPad(this.p[0], pad, dt);
      this.thinkAI(dt);
      this.readPad(this.p[1], this.aiPad, dt);
    }
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }
    if (this.phase === "intro") {
      this.phaseT += dt;
      if (this.phaseT > 0.9 && this.banner.includes("VS")) this.banner = "GET READY";
      if (this.phaseT > 1.6) this.banner = "RUMBLE";
      if (this.phaseT > 2.15) {
        this.phase = "fight";
        this.banner = "";
        sfx.fight();
      }
      for (const f of this.p) f.anim += dt;
      return;
    }
    if (this.phase === "resolve") {
      this.phaseT += dt;
      this.ragdoll(dt);
      if (this.phaseT > 1.35) {
        this.phase = "match";
        this.banner = this.winner === 0 ? "YOU WIN" : "RIVAL WINS";
      }
      return;
    }
    if (this.phase === "match") {
      for (const f of this.p) f.anim += dt;
      return;
    }

    this.time = Math.max(0, this.time - dt);
    if (this.bannerT > 0) {
      this.bannerT = Math.max(0, this.bannerT - dt);
      if (this.bannerT <= 0) this.banner = "";
    }
    this.itemT -= dt;
    if (this.itemT <= 0) {
      this.itemT = 7.5;
      this.spawnItem();
    }
    for (const f of this.p) this.drive(f, f.slot === 0 ? pad : this.aiPad, dt);
    this.physics(dt);
    this.separate();
    this.moveItems(dt);
    this.collide();
    if (this.time <= 0 && this.phase === "fight") this.timeout();
  }

  private tickFx(dt: number) {
    if (this.calloutT > 0) this.calloutT = Math.max(0, this.calloutT - dt);
    for (const f of this.p) {
      if (f.flash > 0 && this.hitstop <= 0) f.flash = Math.max(0, f.flash - dt * 6);
      if (f.land > 0) f.land = Math.max(0, f.land - dt * 4);
    }
    this.sparks = this.sparks.filter((s) => {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 900 * dt;
      return s.life > 0;
    });
    if (this.sparks.length > 90) this.sparks.splice(0, this.sparks.length - 90);
    for (const im of this.impacts) im.t += dt;
    this.impacts = this.impacts.filter((im) => im.t < im.life);
  }

  private readPad(f: Fighter, pad: Pad, dt: number) {
    for (const k of ["light", "heavy", "special", "burst", "jump"] as const) f.buf[k] = Math.max(0, f.buf[k] - dt);
    const rise = (k: keyof Pad) => pad[k] && !f.prev[k];
    if (rise("light")) f.buf.light = 0.22;
    if (rise("heavy")) f.buf.heavy = 0.22;
    if (rise("special")) f.buf.special = 0.22;
    if (rise("burst")) f.buf.burst = 0.28;
    if (rise("jump")) f.buf.jump = 0.16;
    f.prev = { ...pad };
    f.drop = pad.block && f.grounded;
  }

  private thinkAI(dt: number) {
    this.aiThink -= dt;
    if (this.aiThink > 0) return;
    this.aiThink = 0.12;
    const ai = this.p[1];
    const foe = this.p[0];
    const pad = this.aiPad;
    pad.left = pad.right = pad.jump = pad.block = pad.light = pad.heavy = pad.special = pad.burst = false;
    if (ai.respawn > 0 || this.phase !== "fight") return;
    const onStage = ai.x > STAGE.l - 10 && ai.x < STAGE.r + 10 && ai.y > -30;
    if (!onStage) {
      if (ai.x < (STAGE.l + STAGE.r) / 2) pad.right = true;
      else pad.left = true;
      if (ai.vy < 120 && ai.jumps > 0) pad.jump = true;
      return;
    }
    if (ai.action === "hit") {
      if (foe.x > ai.x) pad.left = true;
      else pad.right = true;
      return;
    }
    if (!canAct(ai)) return;
    const dist = foe.x - ai.x;
    const ad = Math.abs(dist);
    const roll = Math.random();
    if (ai.meter >= 100 && ai.grounded && (ai.dmg > 40 || foe.dmg > 70 || foe.burst > 0) && roll < 0.7) {
      pad.burst = true;
      return;
    }
    const bomb = this.items.find((it) => it.alive && it.kind === "bomb" && Math.abs(it.x - ai.x) < 90 && Math.abs(it.y - ai.y) < 80);
    if (bomb) {
      if (bomb.x > ai.x) pad.left = true;
      else pad.right = true;
      pad.jump = true;
      return;
    }
    if (foe.y > ai.y + 70 && ad < 280 && ai.grounded && roll < 0.65) {
      pad.jump = true;
      if (dist > 0) pad.right = true;
      else pad.left = true;
      return;
    }
    if (ad > 240) {
      if (dist > 0) pad.right = true;
      else pad.left = true;
      if (ai.specialCd <= 0 && roll < 0.4) pad.special = true;
      return;
    }
    if (ad > 90) {
      if (dist > 0) pad.right = true;
      else pad.left = true;
    }
    if (ad < 150) {
      if (foe.dmg > 78 && roll < 0.48) pad.heavy = true;
      else if (foe.dmg > 45 && roll < 0.18) pad.heavy = true;
      else if (ai.specialCd <= 0 && ad > 70 && roll > 0.78) pad.special = true;
      else pad.light = true;
    }
  }

  private drive(f: Fighter, pad: Pad, dt: number) {
    f.anim += dt;
    f.specialCd = Math.max(0, f.specialCd - dt);
    f.dodgeCd = Math.max(0, f.dodgeCd - dt);
    if (f.burst > 0) f.burst = Math.max(0, f.burst - dt);
    if (f.invuln > 0) f.invuln = Math.max(0, f.invuln - dt);
    if (f.comboTimer > 0) {
      f.comboTimer -= dt;
      if (f.comboTimer <= 0) f.combo = 0;
    }
    if (f.respawn > 0) return;
    if (f.action === "ko") return;

    const foe = this.p[f.slot ^ 1];
    const attacking = f.action === "light" || f.action === "heavy" || f.action === "special";
    if (!attacking && f.action !== "hit" && Math.abs(foe.x - f.x) > 8) {
      f.facing = foe.x < f.x ? -1 : 1;
    }

    if (f.action === "hit") {
      if (pad.left) f.vx -= 420 * dt;
      if (pad.right) f.vx += 420 * dt;
      return;
    }

    if (canAct(f)) {
      if (f.buf.burst > 0 && f.meter >= 100 && f.grounded) {
        f.buf.burst = 0;
        this.startBurst(f);
        return;
      }
      if (f.buf.special > 0 && f.specialCd <= 0) {
        f.buf.special = 0;
        this.startMove(f, "special");
        return;
      }
      if (f.buf.heavy > 0 && (f.grounded || !f.airUsed)) {
        f.buf.heavy = 0;
        this.startMove(f, "heavy");
        return;
      }
      if (f.buf.light > 0 && (f.grounded || !f.airUsed)) {
        f.buf.light = 0;
        this.startMove(f, "light");
        return;
      }
      if (f.buf.jump > 0 && (f.grounded || f.jumps > 0)) {
        f.buf.jump = 0;
        this.jump(f);
        return;
      }
      if (!f.grounded && pad.block && f.dodgeCd <= 0 && f.action !== "block") {
        this.airDodge(f, pad);
        return;
      }
    }

    if (attacking) return;

    const speed = f.beast.speed * (f.burst > 0 ? 1.18 : 1) * (f.grounded ? 1.12 : 0.92);
    if (pad.left !== pad.right) f.vx = (pad.right ? 1 : -1) * speed;
    else if (f.grounded) f.vx = 0;
    else f.vx *= Math.exp(-0.55 * dt);

    if (!f.grounded && pad.block && f.vy < 40 && f.dodgeCd > 0) f.vy = Math.min(f.vy, -980);

    if (f.grounded) {
      if (pad.block) {
        f.action = "block";
        f.vx = 0;
      } else f.action = pad.left !== pad.right ? "walk" : "idle";
    } else f.action = "jump";
  }

  private jump(f: Fighter) {
    const power = f.beast.jump * (f.burst > 0 ? 1.06 : 1);
    if (f.grounded) {
      f.vy = power;
      f.jumps = 1;
      f.grounded = false;
      f.y += 2;
    } else if (f.jumps > 0) {
      f.vy = power * 0.94;
      f.jumps -= 1;
      this.puff(f.x, f.y + 20, f.beast.accent, 6);
    }
    f.action = "jump";
    f.t = 0;
  }

  private airDodge(f: Fighter, pad: Pad) {
    f.dodgeCd = 0.85;
    f.invuln = 0.16;
    f.action = "jump";
    const dir = pad.right ? 1 : pad.left ? -1 : f.facing;
    f.vx = dir * 520;
    f.vy = 280;
    f.grounded = false;
  }

  private startBurst(f: Fighter) {
    f.meter = 0;
    f.burst = 7;
    f.invuln = 0.45;
    f.flash = 1;
    f.action = "idle";
    this.trauma = Math.min(1, this.trauma + 0.5);
    this.callout = `${f.beast.name.toUpperCase()} DIGIVOLVE`;
    this.calloutT = 1.1;
    sfx.burst();
    this.puff(f.x, f.y + 40, f.beast.accent, 16);
  }

  private startMove(f: Fighter, kind: "light" | "heavy" | "special") {
    if (!f.grounded) f.airUsed = true;
    f.action = kind;
    f.t = 0;
    f.hit = false;
    f.shotOut = false;
    f.armor = kind === "heavy" && f.beast.id === "thornox" && f.grounded;
    if (kind === "special") {
      f.specialCd = f.beast.shot.cooldown * (f.burst > 0 ? 0.55 : 1);
      sfx.shot();
    } else if (kind === "heavy") sfx.heavy();
    else sfx.swing();
  }

  private physics(dt: number) {
    for (const f of this.p) {
      if (f.respawn > 0) {
        f.respawn -= dt;
        f.vx = 0;
        f.vy = 0;
        if (f.respawn <= 0) this.place(f);
        continue;
      }
      const attacking = f.action === "light" || f.action === "heavy" || f.action === "special";
      if (attacking && f.grounded) {
        const mv = moveOf(f);
        const slide = f.action === "special" ? 40 : (mv?.slide ?? 0);
        const start = f.action === "special" ? 0.12 : (mv?.startup ?? 0.08);
        if (f.t < start) f.vx = -f.facing * 30;
        else f.vx = f.facing * slide;
      }

      if (!f.grounded) {
        const g = f.action === "hit" ? GRAVITY * 0.78 : GRAVITY;
        f.vy -= g * dt;
        if (f.vy < -1680) f.vy = -1680;
      }

      const prevY = f.y;
      const wasGrounded = f.grounded;
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      let landed = false;
      if (f.vy <= 0) {
        for (const p of plats()) {
          if (f.drop && p.soft) continue;
          const onX = f.x >= p.l && f.x <= p.r;
          if (!onX) continue;
          if (prevY >= p.y - 2 && f.y <= p.y) {
            if (prevY > p.y + 12) {
              f.land = 1;
              sfx.land();
            }
            f.y = p.y;
            f.vy = 0;
            f.jumps = 2;
            f.airUsed = false;
            landed = true;
            if (f.action === "jump") f.action = "idle";
            break;
          }
        }
      }
      f.grounded = landed;
      if (wasGrounded && !landed && f.action !== "jump" && f.jumps > 1) f.jumps = 1;

      if (attacking) {
        const prev = f.t;
        f.t += dt;
        if (f.action === "special" && !f.shotOut && prev < 0.14 && f.t >= 0.14) {
          f.shotOut = true;
          this.spawnShot(f);
        }
        const mv = moveOf(f);
        const total = f.action === "special" ? 0.4 : mv ? mv.startup + mv.active + mv.recovery : 0.3;
        if (f.armor && mv && f.t > mv.startup) f.armor = false;
        if (f.t >= total) {
          f.action = f.grounded ? "idle" : "jump";
          f.t = 0;
          f.armor = false;
          f.hit = false;
          if (f.grounded) f.vx = 0;
        }
      } else if (f.action === "hit") {
        f.t += dt;
        if (f.t >= f.hitstun) {
          f.action = f.grounded ? "idle" : "jump";
          f.t = 0;
          if (f.grounded) f.vx *= 0.4;
        }
      }

      if (f.y < BLAST.b || f.y > BLAST.t || f.x < BLAST.l || f.x > BLAST.r) this.ringOut(f);
    }

    for (const s of this.shots) {
      if (!s.alive) continue;
      s.x += s.vx * dt;
      s.y += Math.sin(s.life * 18) * 10 * dt;
      s.life -= dt;
      if (s.life <= 0 || s.x < BLAST.l || s.x > BLAST.r) s.alive = false;
    }
    this.shots = this.shots.filter((s) => s.alive);
  }

  private place(f: Fighter) {
    f.x = SPAWN_X[f.slot];
    f.y = 12;
    f.vx = 0;
    f.vy = 0;
    f.grounded = true;
    f.jumps = 2;
    f.airUsed = false;
    f.action = "idle";
    f.dmg = 0;
    f.invuln = 1.5;
    f.flash = 0.4;
    f.hit = false;
  }

  private ringOut(victim: Fighter) {
    if (victim.respawn > 0 || victim.stocks <= 0 || this.phase !== "fight") return;
    victim.stocks -= 1;
    this.lastFall = { who: victim.slot, dmg: Math.round(victim.dmg), x: Math.round(victim.x), y: Math.round(victim.y) };
    this.trauma = 0.85;
    this.hitstop = Math.max(this.hitstop, 0.12);
    sfx.ko();
    this.puff(victim.x, Math.max(victim.y, 40), "#ffffff", 18);
    const attacker = this.p[victim.slot ^ 1];
    if (victim.stocks <= 0) {
      victim.action = "ko";
      victim.respawn = 9;
      this.phase = "resolve";
      this.phaseT = 0;
      this.winner = attacker.slot;
      this.banner = "RING OUT";
      return;
    }
    victim.respawn = 0.85;
    victim.action = "ko";
    victim.x = victim.slot === 0 ? 640 : 1060;
    victim.y = 480;
    victim.vx = 0;
    victim.vy = 0;
    this.banner = "RING OUT";
    this.bannerT = 1.15;
    this.callout = `${victim.stocks} LEFT`;
    this.calloutT = 0.9;
  }

  private spawnShot(f: Fighter) {
    const spec = f.beast.shot;
    const boost = f.burst > 0 ? 1.25 : 1;
    this.shots.push({
      owner: f.slot,
      x: f.x + f.facing * 78,
      y: f.y + 96,
      vx: f.facing * spec.speed,
      w: spec.w,
      h: spec.h,
      damage: spec.damage * boost,
      kb: spec.kb,
      life: spec.life,
      max: spec.life,
      alive: true,
    });
  }

  private spawnItem() {
    const roll = Math.random();
    const kind: Pickup["kind"] = roll < 0.4 ? "heal" : roll < 0.7 ? "meter" : "bomb";
    this.items.push({
      x: STAGE.l + 120 + Math.random() * (STAGE.r - STAGE.l - 240),
      y: 560,
      vy: -40,
      kind,
      fuse: kind === "bomb" ? 2.2 : 12,
      alive: true,
    });
  }

  private moveItems(dt: number) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.vy -= GRAVITY * 0.35 * dt;
      it.y += it.vy * dt;
      const prev = it.y - it.vy * dt;
      if (it.vy < 0) {
        for (const p of plats()) {
          if (it.x < p.l || it.x > p.r) continue;
          if (prev >= p.y && it.y <= p.y) {
            it.y = p.y + 28;
            it.vy = 0;
            break;
          }
        }
      }
      it.fuse -= dt;
      if (it.kind === "bomb" && it.fuse <= 0) {
        it.alive = false;
        this.explode(it.x, it.y);
      }
      if (it.fuse < -6) it.alive = false;
      for (const f of this.p) {
        if (!it.alive || f.respawn > 0) continue;
        if (Math.abs(f.x - it.x) < 46 && f.y < it.y && f.y + f.beast.hurtH > it.y - 20) {
          it.alive = false;
          this.takeItem(f, it);
        }
      }
    }
    this.items = this.items.filter((it) => it.alive);
  }

  private takeItem(f: Fighter, it: Pickup) {
    if (it.kind === "heal") {
      f.dmg = Math.max(0, f.dmg - 36);
      this.floatText(f.x, f.y + 160, "-36%", "#9dffc4");
      sfx.land();
    } else if (it.kind === "meter") {
      f.meter = Math.min(100, f.meter + 45);
      this.floatText(f.x, f.y + 160, "METER", "#ffd56a");
      sfx.ui();
    } else {
      this.explode(it.x, it.y);
    }
  }

  private explode(x: number, y: number) {
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.impacts.push({ x, y, t: 0, life: 0.28, scale: 1.8 });
    sfx.crush();
    this.puff(x, y, "#ff6a2a", 16);
    for (const f of this.p) {
      if (f.respawn > 0 || f.invuln > 0) continue;
      const dx = f.x - x;
      const dy = f.y + 60 - y;
      const d = Math.hypot(dx, dy);
      if (d > 190) continue;
      f.dmg = Math.min(999, f.dmg + 16);
      const push = (1 - d / 190) * 820;
      f.vx = (dx === 0 ? 1 : Math.sign(dx)) * push;
      f.vy = 520 + push * 0.3;
      f.grounded = false;
      f.action = "hit";
      f.t = 0;
      f.hitstun = 0.35;
      f.flash = 1;
    }
  }

  private separate() {
    const [a, b] = this.p;
    if (!a.grounded || !b.grounded || Math.abs(a.y - b.y) > 24) return;
    const min = (a.beast.hurtW + b.beast.hurtW) * 0.48;
    const dx = b.x - a.x;
    const ad = Math.abs(dx) || 0.001;
    if (ad >= min) return;
    const overlap = min - ad;
    const dir = Math.sign(dx) || 1;
    const wa = a.beast.weight;
    const wb = b.beast.weight;
    const sum = wa + wb;
    a.x -= dir * overlap * (wa / sum);
    b.x += dir * overlap * (wb / sum);
  }

  private collide() {
    const hits: PendingHit[] = [];
    for (const f of this.p) {
      const mv = moveOf(f);
      if (!mv || f.hit || f.respawn > 0) continue;
      if (f.t < mv.startup || f.t > mv.startup + mv.active) continue;
      const target = this.p[f.slot ^ 1];
      if (target.respawn > 0) continue;
      if (!this.overlaps(f, target, mv)) continue;
      f.hit = true;
      hits.push({
        attacker: f,
        target,
        damage: mv.damage,
        kb: mv.kb,
        kind: f.action === "heavy" ? "heavy" : "light",
        hx: (f.x + target.x) / 2 + f.facing * 16,
        hy: f.y + mv.y + mv.height * 0.4,
        blocked: target.grounded && target.action === "block",
        armored: target.armor,
      });
    }
    for (const s of this.shots) {
      if (!s.alive) continue;
      const target = this.p[s.owner ^ 1];
      if (target.respawn > 0 || target.invuln > 0) continue;
      const boxY = target.y + 8;
      if (s.x + s.w / 2 < target.x - target.beast.hurtW / 2) continue;
      if (s.x - s.w / 2 > target.x + target.beast.hurtW / 2) continue;
      if (s.y + s.h < boxY || s.y > boxY + target.beast.hurtH) continue;
      s.alive = false;
      const attacker = this.p[s.owner];
      hits.push({
        attacker,
        target,
        damage: s.damage,
        kb: s.kb,
        kind: "special",
        hx: s.x,
        hy: s.y,
        blocked: target.grounded && target.action === "block",
        armored: false,
      });
    }
    for (const h of hits) this.applyHit(h);
  }

  private overlaps(f: Fighter, target: Fighter, mv: Move) {
    const x1 = f.x + f.facing * 24;
    const x2 = f.x + f.facing * (24 + mv.reach);
    const left = Math.min(x1, x2);
    const y = f.y + mv.y;
    const tx = target.x - target.beast.hurtW / 2;
    const ty = target.y + 8;
    return left < tx + target.beast.hurtW && left + Math.abs(x2 - x1) > tx && y < ty + target.beast.hurtH && y + mv.height > ty;
  }

  private applyHit(h: PendingHit) {
    const { attacker, target } = h;
    if (target.invuln > 0 || target.respawn > 0) return;
    const edge = advantage(attacker.beast.element, target.beast.element);
    let dmg = h.damage * (attacker.burst > 0 ? 1.28 : 1);
    if (edge > 0) dmg *= 1.2;
    if (edge < 0) dmg *= 0.9;
    if (h.blocked) dmg *= 0.35;
    if (h.armored) dmg *= 0.7;
    dmg = Math.max(1, Math.round(dmg));
    target.dmg = Math.min(999, target.dmg + dmg);
    attacker.meter = Math.min(100, attacker.meter + (h.kind === "heavy" ? 18 : h.kind === "special" ? 16 : 11));
    target.meter = Math.min(100, target.meter + 8);
    target.flash = 1;
    this.impacts.push({ x: h.hx, y: h.hy, t: 0, life: 0.2, scale: h.kind === "heavy" ? 1.4 : 1 });

    if (h.armored && !h.blocked) {
      this.hitstop = Math.max(this.hitstop, 0.04);
      this.callout = "ARMOR";
      this.calloutT = 0.5;
      sfx.block();
      this.floatText(h.hx, h.hy + 24, `${dmg}`, "#d7ff9a");
      return;
    }

    const comboIndex = attacker.comboTimer > 0 ? attacker.combo + 1 : 1;
    attacker.combo = comboIndex;
    attacker.comboTimer = 0.85;
    const base = h.kind === "heavy" ? 170 : h.kind === "special" ? 190 : 80;
    const growth = h.kind === "heavy" ? 7.4 : h.kind === "special" ? 6 : 2.4;
    const kbScale = h.kind === "light" ? 0.9 + h.kb / 700 : h.kb / 420;
    let power = (base + target.dmg * growth) * target.beast.weight * kbScale;
    if (attacker.burst > 0) power *= 1.3;
    if (edge > 0) power *= 1.18;
    if (h.blocked) power *= 0.22;
    const angle = h.kind === "heavy" ? 0.6 : h.kind === "special" ? 0.48 : 0.3;
    const dir = attacker.facing;
    target.vx = Math.cos(angle) * power * dir;
    target.vy = h.blocked ? 0 : Math.sin(angle) * power;
    if (h.blocked) {
      target.grounded = true;
      target.action = "block";
      target.hitstun = 0.18;
    } else {
      if (target.grounded) target.jumps = 1;
      target.grounded = false;
      target.action = "hit";
      target.hitstun = Math.min(0.58, 0.14 + power / 3000);
    }
    target.t = 0;
    target.armor = false;
    this.hitstop = Math.max(this.hitstop, h.kind === "heavy" ? 0.08 : 0.045);
    this.trauma = Math.min(1, this.trauma + (h.kind === "heavy" ? 0.45 : 0.2));
    this.puff(h.hx, h.hy, attacker.beast.accent, h.kind === "heavy" ? 14 : 8);
    this.floatText(h.hx, h.hy + 30, `${dmg}%`, edge > 0 ? "#ffd56a" : "#ffffff");
    if (h.kind === "heavy") sfx.crush();
    else if (h.blocked) sfx.block();
    else sfx.hit();
    if (edge > 0 && comboIndex === 1 && !h.blocked) {
      this.callout = "SUPER EFFECTIVE";
      this.calloutT = 0.7;
    } else if (!h.blocked && power > 1500) {
      this.callout = "LAUNCH";
      this.calloutT = 0.55;
    } else if (comboIndex >= 3 && !h.blocked) {
      this.callout = `${comboIndex} HITS`;
      this.calloutT = 0.6;
    }
  }

  private timeout() {
    const [a, b] = this.p;
    let winner: 0 | 1 = 0;
    if (b.stocks > a.stocks) winner = 1;
    else if (a.stocks > b.stocks) winner = 0;
    else if (b.dmg < a.dmg) winner = 1;
    else winner = 0;
    this.winner = winner;
    this.phase = "resolve";
    this.phaseT = 0;
    this.banner = "TIME";
  }

  private ragdoll(dt: number) {
    for (const f of this.p) {
      f.anim += dt;
      if (f.action !== "ko" && f.action !== "hit") continue;
      f.vy -= GRAVITY * dt;
      f.y += f.vy * dt;
      f.x += f.vx * dt;
    }
  }

  private puff(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 280;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.6 + 80,
        life: 0.25 + Math.random() * 0.28,
        max: 0.5,
        size: 2 + Math.random() * 3.5,
        color,
        text: "",
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    this.sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: 110,
      life: 0.7,
      max: 0.7,
      size: 0,
      color,
      text,
    });
  }
}
