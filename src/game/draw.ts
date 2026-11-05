import type { Art, Frame } from "@/game/art";
import type { Fighter } from "@/game/sim";
import { BLAST, MatchSim, PLATS, STAGE, WORLD_W, type Pickup } from "@/game/sim";

export type Camera = { x: number; y: number; viewW: number };

const BG = "#07091a";
const BG2 = "#10182e";
const CYAN = "#2ee6ff";
const EMBER = "#ff6a2a";
const BONE = "#e8f4ff";

let scratch: HTMLCanvasElement | null = null;
const motes = Array.from({ length: 28 }, () => ({
  x: Math.random() * WORLD_W,
  y: 40 + Math.random() * 280,
  s: 1 + Math.random() * 2.2,
  v: 12 + Math.random() * 28,
}));

export function createCamera(): Camera {
  return { x: 850, y: 180, viewW: 980 };
}

export function updateCamera(cam: Camera, sim: MatchSim, cssW: number, cssH: number, dt: number) {
  const [a, b] = sim.p;
  const aspect = cssW / Math.max(1, cssH);
  const padX = aspect < 0.75 ? 200 : aspect < 0.9 ? 300 : 500;
  const padY = aspect < 0.75 ? 280 : aspect < 0.9 ? 340 : 420;
  const spanX = Math.abs(a.x - b.x) + padX;
  const spanY = Math.abs(a.y - b.y) + padY;
  let viewW = Math.max(spanX, spanY * aspect);
  const minW = Math.max(440, Math.min(900, 600 * aspect));
  viewW = Math.min(1720, Math.max(minW, viewW));
  let x = (a.x + b.x) / 2;
  let y = Math.max((a.y + b.y) / 2, 140);
  const half = viewW / 2;
  x = Math.min(WORLD_W - 40, Math.max(40, x));
  y = Math.min(BLAST.t - 160, Math.max(BLAST.b + 160, y));
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
  const shx = Math.sin(t * 0.046) * 16 * mag;
  const shy = Math.cos(t * 0.063) * 9 * mag;
  const scale = w / cam.viewW;
  const viewH = h / scale;
  const left = cam.x - cam.viewW / 2;
  const bottom = cam.y - viewH / 2;
  const sx = (x: number) => (x - left) * scale + shx;
  const sy = (y: number) => h - (y - bottom) * scale + shy;

  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#050712");
  sky.addColorStop(0.55, BG);
  sky.addColorStop(1, BG2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  for (const m of motes) {
    m.x += m.v * 0.016;
    if (m.x > WORLD_W) m.x = 0;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = CYAN;
    ctx.fillRect(sx(m.x * 0.35 + 200), sy(m.y) - h * 0.2, m.s, m.s);
  }
  ctx.globalAlpha = 1;

  drawMonolith(ctx, sx(180), sy(0), 70 * scale, 260 * scale, 0.28);
  drawMonolith(ctx, sx(1500), sy(0), 80 * scale, 300 * scale, 0.22);
  drawAbyss(ctx, sx, sy, scale, w, h);

  drawIsland(ctx, sx, sy, scale);
  for (const it of sim.items) drawItem(ctx, it, sx, sy, scale);

  const order = [...sim.p].sort((a, b) => (a.action === "hit" || a.action === "ko" ? -1 : 1) - (b.action === "hit" || b.action === "ko" ? -1 : 1));
  for (const f of order) drawFighter(ctx, f, art, sx, sy, scale, sim.phaseT);

  for (const shot of sim.shots) drawShot(ctx, shot, art, sim, sx, sy, scale);
  for (const im of sim.impacts) drawImpact(ctx, im, art, sx, sy, scale);
  for (const s of sim.sparks) {
    if (s.text) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.font = `${Math.round(18 * Math.min(scale, 1.4))}px "Chakra Petch", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(s.text, sx(s.x), sy(s.y));
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx(s.x), sy(s.y), s.size * scale * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawAbyss(
  ctx: CanvasRenderingContext2D,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
  w: number,
  h: number,
) {
  const veil = (x0: number, x1: number, color: string) => {
    const g = ctx.createLinearGradient(sx(x0), 0, sx(x1), 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(sx(x0), sx(x1)), 0, Math.abs(sx(x1) - sx(x0)), h);
  };
  veil(STAGE.l, BLAST.l, "rgba(255,60,40,0.3)");
  veil(STAGE.r, BLAST.r, "rgba(255,60,40,0.3)");
  const pit = ctx.createLinearGradient(0, sy(40), 0, sy(BLAST.b));
  pit.addColorStop(0, "rgba(255,80,40,0)");
  pit.addColorStop(1, "rgba(255,50,20,0.22)");
  ctx.fillStyle = pit;
  ctx.fillRect(0, sy(40), w, sy(BLAST.b) - sy(40));
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = EMBER;
  const tick = 18 * scale;
  for (let x = STAGE.l; x <= STAGE.r; x += 90) {
    ctx.fillRect(sx(x) - 1, sy(0) - tick, 2, tick);
  }
  ctx.globalAlpha = 1;
}

function drawIsland(
  ctx: CanvasRenderingContext2D,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scale: number,
) {
  const slab = (l: number, r: number, y: number, thick: number, main: boolean) => {
    const x0 = sx(l);
    const x1 = sx(r);
    const top = sy(y);
    const bot = sy(y - thick);
    ctx.fillStyle = main ? "#141c34" : "#10182c";
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.lineTo(x1 - (main ? 22 : 10) * scale, bot);
    ctx.lineTo(x0 + (main ? 22 : 10) * scale, bot);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = main ? EMBER : CYAN;
    ctx.globalAlpha = main ? 0.9 : 0.55;
    ctx.lineWidth = main ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1;
    const step = 70;
    for (let x = l; x < r; x += step) {
      ctx.beginPath();
      ctx.moveTo(sx(x), top);
      ctx.lineTo(sx(x), bot);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  slab(STAGE.l, STAGE.r, 0, 78, true);
  const mid = sx((STAGE.l + STAGE.r) / 2);
  const top = sy(0);
  ctx.save();
  ctx.translate(mid, top);
  ctx.fillStyle = "#1a2748";
  ctx.beginPath();
  ctx.moveTo(0, -16 * scale);
  ctx.lineTo(18 * scale, 0);
  ctx.lineTo(0, 16 * scale);
  ctx.lineTo(-18 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.restore();
  for (const p of PLATS) slab(p.l, p.r, p.y, 22, false);
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

function drawMonolith(ctx: CanvasRenderingContext2D, x: number, floor: number, w: number, h: number, glow: number) {
  ctx.fillStyle = "#12182c";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, floor);
  ctx.lineTo(x - w * 0.28, floor - h);
  ctx.lineTo(x + w * 0.28, floor - h);
  ctx.lineTo(x + w * 0.4, floor);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(46,230,255,${glow})`;
  ctx.stroke();
  ctx.fillStyle = `rgba(46,230,255,${glow})`;
  ctx.fillRect(x - 2, floor - h * 0.72, 4, h * 0.4);
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
    ctx.globalAlpha = 0.45 + Math.sin(performance.now() * 0.01) * 0.2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(feetX, feetY - 70 * scale, 48 * scale, 78 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (f.action === "block") {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = CYAN;
    ctx.fillRect(feetX + f.facing * 10 * scale, feetY - 130 * scale, f.facing * 16 * scale, 100 * scale);
    ctx.restore();
  }

  if (f.action === "light" || f.action === "heavy") {
    const mv = f.beast[f.action];
    const active = f.t >= mv.startup && f.t <= mv.startup + mv.active + 0.05;
    if (active) drawSlash(ctx, feetX, feetY, scale, f.facing, f.beast.accent, f.action === "heavy" ? 1.25 : 1);
  }

  if (!fr) return;
  const contentH = Math.max(1, fr.maxY - fr.minY);
  const body = f.beast.body * (f.burst > 0 ? 1.16 : 1);
  const stretch = 1 + Math.max(-0.12, Math.min(0.16, -f.vy / 5200));
  const squash = (1 / stretch) * (1 - f.land * 0.14);
  const drawH = body * (fr.img.height / contentH) * stretch * scale;
  const drawW = drawH * (fr.img.width / fr.img.height) * squash;
  const footPad = (fr.img.height - 1 - fr.maxY) * (drawH / fr.img.height);
  const dy = feetY - drawH + footPad;

  const spd = Math.hypot(f.vx, f.vy);
  if (f.action === "hit" && spd > 680) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, spd / 2800);
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 2;
    const len = Math.min(78, spd * 0.035) * scale;
    const ang = Math.atan2(-f.vy, f.vx);
    for (let i = 0; i < 3; i++) {
      const oy = (50 + i * 18) * scale;
      ctx.beginPath();
      ctx.moveTo(feetX, feetY - oy);
      ctx.lineTo(feetX - Math.cos(ang) * len, feetY - oy + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
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
  const dx = feetX - drawW / 2;
  if (f.invuln > 0) ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 55) * 0.3;
  if (f.flash > 0.35) ctx.filter = "brightness(2.6) saturate(0.2)";
  if (f.burst > 0) blitTint(ctx, fr, dx, dy, drawW, drawH, "#ffe7a3", 0.28);
  else ctx.drawImage(fr.img, dx, dy, drawW, drawH);
  ctx.filter = "none";
  ctx.restore();
}

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, facing: number, color: string, size: number) {
  ctx.save();
  ctx.translate(x, y - 78 * scale);
  ctx.scale(facing, 1);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 7 * scale * size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(20 * scale, 0, 54 * scale * size, -1.1, 1.15);
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
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
  const frames = art.bolt;
  const idx = Math.floor((1 - shot.life / shot.max) * frames.length) % frames.length;
  const fr = frames[idx] ?? frames[0];
  if (!fr) return;
  const owner = sim.p[shot.owner];
  const dw = shot.w * scale * 1.4;
  const dh = dw * (fr.img.height / fr.img.width);
  const x = sx(shot.x);
  const y = sy(shot.y + shot.h * 0.3);
  ctx.save();
  if (shot.vx < 0) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  blitTint(ctx, fr, x - dw / 2, y - dh / 2, dw, dh, owner?.beast.accent ?? CYAN, 0.45);
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
  if (!fr) return;
  const size = 90 * scale * im.scale;
  ctx.globalAlpha = 1 - im.t / im.life;
  ctx.drawImage(fr.img, sx(im.x) - size / 2, sy(im.y) - size / 2, size, size);
  ctx.globalAlpha = 1;
}
