import type { Art, Frame } from "@/game/art";
import type { Fighter } from "@/game/sim";
import { MatchSim, type Pickup } from "@/game/sim";
import { STAGE_MAP, stageSpan, type Stage } from "@/game/stages";

export type Camera = { x: number; y: number; viewW: number };

const BG = "#07091a";
const BG2 = "#10182e";
const CYAN = "#2ee6ff";
const EMBER = "#ff6a2a";
const BONE = "#e8f4ff";

let scratch: HTMLCanvasElement | null = null;
const motes = Array.from({ length: 28 }, () => ({
  x: Math.random() * 3200,
  y: 40 + Math.random() * 280,
  s: 1 + Math.random() * 2.2,
  v: 12 + Math.random() * 28,
}));

export function createCamera(): Camera {
  const span = stageSpan(STAGE_MAP.spire);
  return { x: (span.l + span.r) / 2, y: 200, viewW: 1680 };
}

export function updateCamera(cam: Camera, sim: MatchSim, cssW: number, cssH: number, dt: number) {
  const [a, b] = sim.p;
  const stage = sim.stage;
  const aspect = cssW / Math.max(1, cssH);
  const phone = aspect < 0.72;
  const padX = phone ? 280 : aspect < 1.05 ? 760 : 1040;
  const padY = phone ? 340 : aspect < 1.05 ? 540 : 620;
  const spanX = Math.abs(a.x - b.x) + padX;
  const spanY = Math.abs(a.y - b.y) + padY;
  let viewW = Math.max(spanX, spanY * aspect);
  const minW = phone ? 660 : aspect < 1.05 ? 1240 : 1720;
  const maxW = phone ? 840 : 3000;
  viewW = Math.min(maxW, Math.max(minW, viewW));
  let x = (a.x + b.x) / 2;
  let y = Math.max((a.y + b.y) / 2, 180);
  if (phone) y -= (viewW / aspect) * 0.13;
  x = Math.min(stage.worldW - 80, Math.max(80, x));
  y = Math.min(stage.blast.t - 220, Math.max(stage.blast.b + 240, y));
  const follow = 1 - Math.exp(-5.2 * dt);
  const zoom = 1 - Math.exp(-3.4 * dt);
  cam.x += (x - cam.x) * follow;
  cam.y += (y - cam.y) * follow;
  cam.viewW += (viewW - cam.viewW) * zoom;
}

export function render(
  ctx: CanvasRenderingContext2D,
  sim: MatchSim,
  art: Art,
  cam: Camera,
  w: number,
  h: number,
  compact: boolean,
  shake: boolean,
) {
  const mag = shake ? sim.trauma * sim.trauma : 0;
  const t = performance.now();
  const shx = Math.sin(t * 0.046) * 18 * mag;
  const shy = Math.cos(t * 0.063) * 10 * mag;
  const roll = Math.sin(t * 0.05) * 0.03 * mag;
  const scale = w / cam.viewW;
  const viewH = h / scale;
  const left = cam.x - cam.viewW / 2;
  const bottom = cam.y - viewH / 2;
  const sx = (x: number) => (x - left) * scale + shx;
  const sy = (y: number) => h - (y - bottom) * scale + shy;

  const stage = sim.stage;
  const span = stageSpan(stage);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (roll) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(roll);
    ctx.translate(-w / 2, -h / 2);
  }
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, stage.sky[0]);
  sky.addColorStop(0.55, stage.sky[1]);
  sky.addColorStop(1, stage.sky[0]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  for (const m of motes) {
    m.x += m.v * 0.016;
    if (m.x > stage.worldW) m.x = 0;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = stage.mote;
    ctx.fillRect(sx(m.x * 0.35 + 200), sy(m.y) - h * 0.2, m.s, m.s);
  }
  ctx.globalAlpha = 1;

  drawMonolith(ctx, sx(span.l - 220), sy(0), 70 * scale, 260 * scale, stage.mote);
  drawMonolith(ctx, sx(span.r + 220), sy(0), 80 * scale, 300 * scale, stage.mote);
  drawAbyss(ctx, sx, sy, scale, w, h, stage, span);
  drawIsland(ctx, sx, sy, scale, stage);
  for (const it of sim.items) drawItem(ctx, it, sx, sy, scale);

  const order = [...sim.p].sort((a, b) => (a.action === "hit" || a.action === "ko" ? -1 : 1) - (b.action === "hit" || b.action === "ko" ? -1 : 1));
  for (const f of order) drawFighter(ctx, f, art, sx, sy, scale, sim.phaseT);

  for (const shot of sim.shots) drawShot(ctx, shot, art, sim, sx, sy, scale);
  for (const im of sim.impacts) drawImpact(ctx, im, art, sx, sy, scale);
  for (const s of sim.sparks) {
    const alpha = Math.max(0, s.life / s.max);
    if (s.text) {
      const pop = 1 + Math.sin(Math.min(1, 1 - s.life / s.max) * Math.PI) * 0.18;
      const size = Math.round(22 * Math.min(scale, 1.5) * pop);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${size}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(4, 8, 18, 0.85)";
      ctx.strokeText(s.text, sx(s.x), sy(s.y));
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, sx(s.x), sy(s.y));
      ctx.globalAlpha = 1;
    } else {
      const x = sx(s.x);
      const y = sy(s.y);
      const px = sx(s.x - s.vx * 0.04);
      const py = sy(s.y - s.vy * 0.04);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = s.color;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, s.size * scale * 0.55);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, s.size * scale * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawAbyss(
  ctx: CanvasRenderingContext2D,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
  w: number,
  h: number,
  stage: Stage,
  span: { l: number; r: number },
) {
  const veil = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(sx(x0), 0, sx(x1), 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, stage.pit);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(sx(x0), sx(x1)), 0, Math.abs(sx(x1) - sx(x0)), h);
  };
  veil(span.l, stage.blast.l);
  veil(span.r, stage.blast.r);
  const pit = ctx.createLinearGradient(0, sy(40), 0, sy(stage.blast.b));
  pit.addColorStop(0, "rgba(0,0,0,0)");
  pit.addColorStop(1, stage.pit);
  ctx.fillStyle = pit;
  ctx.fillRect(0, sy(40), w, sy(stage.blast.b) - sy(40));
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = stage.lip;
  const tick = 18 * scale;
  for (const solid of stage.solids) {
    for (let x = solid.l; x <= solid.r; x += 90) {
      ctx.fillRect(sx(x) - 1, sy(0) - tick, 2, tick);
    }
  }
  ctx.globalAlpha = 1;
}

function drawIsland(
  ctx: CanvasRenderingContext2D,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
  stage: Stage,
) {
  const slab = (l: number, r: number, y: number, thick: number, main: boolean) => {
    const x0 = sx(l);
    const x1 = sx(r);
    const top = sy(y);
    const bot = sy(y - thick);
    ctx.fillStyle = main ? stage.slab : "#10182c";
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.lineTo(x1 - (main ? 22 : 10) * scale, bot);
    ctx.lineTo(x0 + (main ? 22 : 10) * scale, bot);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stage.lip;
    ctx.globalAlpha = main ? 0.9 : 0.55;
    ctx.lineWidth = main ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = stage.mote;
    ctx.lineWidth = 1;
    for (let x = l; x < r; x += 70) {
      ctx.beginPath();
      ctx.moveTo(sx(x), top);
      ctx.lineTo(sx(x), bot);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  for (const solid of stage.solids) slab(solid.l, solid.r, 0, 78, true);
  const span = stageSpan(stage);
  const mid = sx((span.l + span.r) / 2);
  const top = sy(0);
  ctx.save();
  ctx.translate(mid, top);
  ctx.fillStyle = stage.slab;
  ctx.beginPath();
  ctx.moveTo(0, -16 * scale);
  ctx.lineTo(18 * scale, 0);
  ctx.lineTo(0, 16 * scale);
  ctx.lineTo(-18 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stage.lip;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.restore();
  for (const p of stage.plats) slab(p.l, p.r, p.y, 22, false);
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  it: Pickup,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
) {
  const color = it.kind === "heal" ? "#8dffc0" : it.kind === "meter" ? "#ffd56a" : "#ff6a2a";
  const r = (it.kind === "bomb" ? 16 : 13) * Math.min(scale, 1.6);
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(sx(it.x), sy(it.y), r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMonolith(ctx: CanvasRenderingContext2D, x: number, floor: number, w: number, h: number, color: string) {
  ctx.fillStyle = "#12182c";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, floor);
  ctx.lineTo(x - w * 0.28, floor - h);
  ctx.lineTo(x + w * 0.28, floor - h);
  ctx.lineTo(x + w * 0.4, floor);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, floor - h * 0.72, 4, h * 0.4);
  ctx.globalAlpha = 1;
}

function pickFrame(f: Fighter, n: number) {
  if (f.beast.id === "pyrelon") {
    if (f.action === "light" || f.action === "heavy") return Math.min(3, n - 1);
    if (f.action === "special") return Math.min(1, n - 1);
    const seq = [0, 0, 1, 2];
    const rate = f.action === "walk" ? 8 : 3;
    return seq[Math.floor(f.anim * rate) % seq.length]! % n;
  }
  if (f.action === "light" || f.action === "heavy" || f.action === "hit") return 0;
  const rate = f.action === "walk" ? 8 : 3.2;
  return Math.floor(f.anim * rate) % n;
}

function lungeOf(f: Fighter) {
  if (f.action === "light" || f.action === "heavy") {
    const mv = f.beast[f.action];
    if (f.t < mv.startup) return -16 * (f.t / Math.max(0.01, mv.startup));
    if (f.t < mv.startup + mv.active) return 34;
    const rec = (f.t - mv.startup - mv.active) / mv.recovery;
    return 34 * (1 - Math.min(1, rec));
  }
  if (f.action === "block") return -12;
  if (f.action === "hit") return -8;
  return 0;
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  art: Art,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
  phaseT: number,
) {
  if (f.respawn > 0) return;
  const frames = art.beasts[f.beast.id];
  const fr = frames[pickFrame(f, frames.length)] ?? frames[0];
  if (!fr) return;
  const feetX = sx(f.x + f.facing * lungeOf(f));
  const feetY = sy(f.y);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(feetX, feetY, 36 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (f.burst > 0) {
    ctx.save();
    ctx.strokeStyle = f.beast.accent;
    ctx.shadowColor = f.beast.accent;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.55 + Math.sin(performance.now() * 0.012) * 0.2;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(feetX, feetY - 78 * scale, 54 * scale, 86 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (f.action === "block") {
    ctx.save();
    ctx.translate(feetX + f.facing * 28 * scale, feetY - 78 * scale);
    ctx.strokeStyle = CYAN;
    ctx.fillStyle = "rgba(46, 230, 255, 0.16)";
    ctx.lineWidth = 3;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * scale, 58 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (f.burn > 0) {
    ctx.save();
    ctx.fillStyle = EMBER;
    ctx.shadowColor = EMBER;
    ctx.shadowBlur = 10;
    const flicker = Math.sin(performance.now() * 0.03);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.55 + i * 0.15;
      ctx.beginPath();
      ctx.arc(feetX + flicker * 6 + (i - 1) * 8 * scale, feetY - (70 + i * 16) * scale, (8 - i) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const contentH = Math.max(1, fr.maxY - fr.minY);
  const body = f.beast.body * (f.burst > 0 ? 1.16 : 1);
  const stretch = 1 + Math.max(-0.12, Math.min(0.16, -f.vy / 5200));
  const squash = (1 / stretch) * (1 - f.land * 0.14);
  const drawH = body * (fr.img.height / contentH) * stretch * scale;
  const drawW = drawH * (fr.img.width / fr.img.height) * squash;
  const footPad = (fr.img.height - 1 - fr.maxY) * (drawH / fr.img.height);
  const dy = feetY - drawH + footPad;
  const spd = Math.hypot(f.vx, f.vy);

  if (f.action === "hit" && spd > 420) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, spd / 2400);
    ctx.strokeStyle = BONE;
    ctx.lineCap = "round";
    const len = Math.min(110, spd * 0.05) * scale;
    const ang = Math.atan2(-f.vy, f.vx);
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 3 - i * 0.4;
      const oy = (36 + i * 22) * scale;
      ctx.beginPath();
      ctx.moveTo(feetX, feetY - oy);
      ctx.lineTo(feetX - Math.cos(ang) * len, feetY - oy + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  const paintBody = (ox: number, alpha: number) => {
    ctx.save();
    ctx.translate(ox, 0);
    if (f.action === "ko") {
      ctx.translate(feetX, feetY);
      ctx.rotate(Math.min(1.15, phaseT * 2) * 0.9 * (f.facing > 0 ? 1 : -1));
      ctx.translate(-feetX, -feetY);
    }
    if (f.facing < 0) {
      ctx.translate(feetX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-feetX, 0);
    }
    ctx.globalAlpha = alpha * (f.invuln > 0 ? 0.55 + Math.sin(performance.now() / 55) * 0.3 : 1);
    if (f.flash > 0.35 && ox === 0) ctx.filter = "brightness(3) saturate(0.15)";
    if (f.burst > 0 && ox === 0) blitTint(ctx, fr, feetX - drawW / 2, dy, drawW, drawH, "#ffe7a3", 0.28);
    else ctx.drawImage(fr.img, feetX - drawW / 2, dy, drawW, drawH);
    ctx.restore();
  };

  const swinging = f.action === "light" || f.action === "heavy" || (f.action === "special" && f.beast.shot.form === "ram");
  if (swinging) {
    paintBody(-f.facing * 22 * scale, 0.22);
    paintBody(-f.facing * 10 * scale, 0.4);
  } else if (f.action === "hit" && spd > 700) {
    paintBody(-f.vx * 0.012 * scale, 0.28);
  }
  paintBody(0, 1);

  if (f.action === "light" || f.action === "heavy") {
    const mv = f.beast[f.action];
    const start = mv.startup;
    const end = mv.startup + mv.active;
    if (f.t >= start * 0.65 && f.t <= end + 0.08) {
      const span = Math.max(0.05, end - start);
      const progress = Math.max(0, Math.min(1, (f.t - start) / span));
      drawSlash(ctx, feetX, feetY, scale, f.facing, f.beast.accent, mv.shape, progress, f.action === "heavy");
    }
  }
  if (f.action === "special" && f.beast.shot.form === "ram" && f.t < 0.42) {
    const p = Math.min(1, f.t / 0.32);
    ctx.save();
    ctx.globalAlpha = 0.35 + (1 - p) * 0.4;
    const grad = ctx.createLinearGradient(feetX - f.facing * 90 * scale, feetY, feetX + f.facing * 20 * scale, feetY);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, f.beast.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(feetX - f.facing * 100 * scale, feetY - 96 * scale, f.facing * 110 * scale, 78 * scale);
    ctx.restore();
  }

  if (f.flash > 0.45 && f.action === "hit") {
    const a = Math.min(1, (f.flash - 0.45) * 1.6);
    ctx.save();
    ctx.translate(feetX, feetY - 70 * scale);
    ctx.strokeStyle = "#fff";
    ctx.globalAlpha = a;
    ctx.lineWidth = 3;
    const radius = (18 + (1 - f.flash) * 70) * scale;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = f.beast.accent === CYAN ? EMBER : f.beast.accent;
    ctx.globalAlpha = a * 0.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + f.flash;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * radius * 0.35, Math.sin(ang) * radius * 0.35);
      ctx.lineTo(Math.cos(ang) * radius, Math.sin(ang) * radius);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  color: string,
  shape: string,
  progress: number,
  heavy: boolean,
) {
  const grow = 0.55 + progress * 0.55;
  ctx.save();
  ctx.translate(x, y - 78 * scale);
  ctx.scale(facing, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = (width: number, alpha: number, style: string, blur: number) => {
    ctx.save();
    ctx.strokeStyle = style;
    ctx.globalAlpha = alpha * (1 - progress * 0.25);
    ctx.lineWidth = width * scale * (heavy ? 1.25 : 1);
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.stroke();
    ctx.restore();
  };
  ctx.beginPath();
  if (shape === "upper") {
    ctx.arc(-8 * scale, 8 * scale, 62 * scale * grow, 0.2, 2.5);
  } else if (shape === "lance") {
    ctx.moveTo(8 * scale, 4 * scale);
    ctx.lineTo((40 + 110 * grow) * scale, 2 * scale);
  } else if (shape === "nova") {
    ctx.arc(0, 16 * scale, (36 + 58 * grow) * scale, 0, Math.PI * 2);
  } else if (shape === "sweep") {
    ctx.arc(10 * scale, 30 * scale, 92 * scale * grow, -0.55, 0.85);
  } else if (shape === "slam") {
    ctx.arc(6 * scale, -16 * scale, 64 * scale * grow, 0.05, 2.4);
  } else if (shape === "claw") {
    ctx.moveTo(12 * scale, -22 * scale);
    ctx.quadraticCurveTo(40 * scale, -4 * scale, (36 + 48 * grow) * scale, 8 * scale);
    ctx.moveTo(18 * scale, 2 * scale);
    ctx.quadraticCurveTo(48 * scale, 16 * scale, (40 + 46 * grow) * scale, 34 * scale);
    ctx.moveTo(22 * scale, 22 * scale);
    ctx.quadraticCurveTo(50 * scale, 34 * scale, (34 + 40 * grow) * scale, 52 * scale);
  } else if (shape === "guard") {
    ctx.arc(20 * scale, 6 * scale, 34 * scale * grow, -1.2, 1.2);
  } else {
    ctx.arc(12 * scale, 4 * scale, (28 + 28 * grow) * scale, -1.05, 1.05);
  }
  stroke(heavy ? 16 : 12, 0.28, color, 18);
  stroke(heavy ? 7 : 5, 0.95, color, 8);
  stroke(2.2, 0.95, "#f4fbff", 0);
  ctx.restore();
}

function blitTint(ctx: CanvasRenderingContext2D, fr: Frame, dx: number, dy: number, dw: number, dh: number, color: string, alpha: number) {
  if (!scratch) scratch = document.createElement("canvas");
  const sw = Math.max(1, Math.ceil(dw));
  const sh = Math.max(1, Math.ceil(dh));
  if (scratch.width < sw) scratch.width = sw;
  if (scratch.height < sh) scratch.height = sh;
  const g = scratch.getContext("2d");
  if (!g) {
    ctx.drawImage(fr.img, dx, dy, dw, dh);
    return;
  }
  g.clearRect(0, 0, sw, sh);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.drawImage(fr.img, 0, 0, dw, dh);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.fillRect(0, 0, sw, sh);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  ctx.drawImage(scratch, 0, 0, sw, sh, dx, dy, dw, dh);
}

function drawShot(
  ctx: CanvasRenderingContext2D,
  shot: import("@/game/sim").Shot,
  art: Art,
  sim: MatchSim,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
) {
  const owner = sim.p[shot.owner];
  const color = owner?.beast.accent ?? CYAN;
  const x = sx(shot.x);
  const y = sy(shot.y + shot.h * 0.3);
  ctx.save();
  if (shot.form === "lob") {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(x, y, shot.w * scale * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6d8";
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, shot.w * scale * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (shot.form === "beam") {
    const len = shot.w * scale;
    const left = shot.vx < 0 ? x - len : x;
    const grad = ctx.createLinearGradient(left, y, left + len, y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(left, y - 7 * scale, len, 14 * scale);
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(left, y - 2 * scale, len, 4 * scale);
    ctx.restore();
    return;
  }
  const tx = sx(shot.x - shot.vx * 0.05);
  const ty = sy(shot.y + shot.h * 0.3 - shot.vy * 0.05);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = shot.w * scale * 0.35;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const frames = art.bolt;
  const idx = Math.floor((1 - shot.life / shot.max) * frames.length) % frames.length;
  const fr = frames[idx] ?? frames[0];
  if (!fr) {
    ctx.restore();
    return;
  }
  const dw = shot.w * scale * 1.4;
  const dh = dw * (fr.img.height / fr.img.width);
  if (shot.vx < 0) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  blitTint(ctx, fr, x - dw / 2, y - dh / 2, dw, dh, color, 0.45);
  ctx.restore();
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  im: import("@/game/sim").Impact,
  art: Art,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
) {
  const frames = art.impact;
  const idx = Math.min(frames.length - 1, Math.floor((im.t / im.life) * frames.length));
  const fr = frames[idx];
  const cx = sx(im.x);
  const cy = sy(im.y);
  const fade = 1 - im.t / im.life;
  ctx.save();
  ctx.globalAlpha = fade * 0.85;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, (16 + im.t * 220) * scale * im.scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (!fr) return;
  const size = 110 * scale * im.scale * (0.8 + im.t / im.life);
  ctx.globalAlpha = fade;
  ctx.drawImage(fr.img, cx - size / 2, cy - size / 2, size, size);
  ctx.globalAlpha = 1;
}
