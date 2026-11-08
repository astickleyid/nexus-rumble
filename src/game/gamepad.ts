import type { Pad } from "@/game/sim";

/**
 * DualShock 4, including the original 05c4 pads.
 *
 * Browsers that apply the standard map (`mapping === "standard"`) already
 * put Cross on button 0. Older pads, and browsers that leave the Sony report
 * alone, still use the raw layout Chromium's MapperDualshock4 expects:
 * button 0 is Square, Cross is button 1, L2/R2 are axes 3 and 4, and the
 * D-pad is a hat (axes 6/7, or axis 9 on Windows).
 */

const DEAD = 0.32;

type Btn = { pressed?: boolean; value?: number };

export type PadLike = {
  id?: string;
  mapping?: string;
  connected?: boolean;
  buttons?: ArrayLike<Btn>;
  axes?: ArrayLike<number>;
};

function blank(): Pad {
  return {
    left: false,
    right: false,
    jump: false,
    block: false,
    light: false,
    heavy: false,
    special: false,
    burst: false,
  };
}

function down(buttons: ArrayLike<Btn> | undefined, index: number) {
  const button = buttons?.[index];
  if (!button) return false;
  return !!button.pressed || (button.value ?? 0) > 0.45;
}

function stick(axes: ArrayLike<number> | undefined, index: number) {
  const value = axes?.[index] ?? 0;
  return Math.abs(value) < DEAD ? 0 : value;
}

/** Unmapped original DualShock (and any Sony pad the browser did not remap). */
export function isRawDualShock(pad: PadLike) {
  if (pad.mapping === "standard") return false;
  const id = (pad.id ?? "").toLowerCase();
  return (
    id.includes("054c") ||
    id.includes("05c4") ||
    id.includes("09cc") ||
    id.includes("0ba0") ||
    id.includes("wireless controller") ||
    id.includes("dualshock") ||
    id.includes("dual shock") ||
    id.includes("sony")
  );
}

/** Windows hat used by the original DualShock 4. 0 and values past 1 are neutral; -1 is up. */
export function hatDirections(dir: number | undefined) {
  const none = { up: false, down: false, left: false, right: false };
  if (dir === undefined || Number.isNaN(dir) || dir === 0 || dir > 1) return none;
  return {
    up: (dir >= -1 && dir < -0.7) || (dir >= 0.95 && dir <= 1),
    right: dir >= -0.75 && dir < -0.1,
    down: dir >= -0.2 && dir < 0.45,
    left: dir >= 0.4 && dir <= 1,
  };
}

function applyStandard(out: Pad, pad: PadLike) {
  const x = stick(pad.axes, 0);
  const y = stick(pad.axes, 1);
  out.left = out.left || x < 0 || down(pad.buttons, 14);
  out.right = out.right || x > 0 || down(pad.buttons, 15);
  out.jump = out.jump || y < 0 || down(pad.buttons, 12) || down(pad.buttons, 0);
  out.block = out.block || y > 0 || down(pad.buttons, 13) || down(pad.buttons, 4) || down(pad.buttons, 6);
  out.light = out.light || down(pad.buttons, 2);
  out.heavy = out.heavy || down(pad.buttons, 3);
  out.special = out.special || down(pad.buttons, 1) || down(pad.buttons, 7);
  out.burst = out.burst || down(pad.buttons, 5);
}

function applyRaw(out: Pad, pad: PadLike) {
  const x = stick(pad.axes, 0);
  const y = stick(pad.axes, 1);
  const hatX = pad.axes?.[6] ?? 0;
  const hatY = pad.axes?.[7] ?? 0;
  const hat = hatDirections(pad.axes?.[9]);
  const l2 = (pad.axes?.[3] ?? -1) > 0.15;
  const r2 = (pad.axes?.[4] ?? -1) > 0.15;
  out.left = out.left || x < 0 || hatX < -0.5 || down(pad.buttons, 14) || hat.left;
  out.right = out.right || x > 0 || hatX > 0.5 || down(pad.buttons, 15) || hat.right;
  out.jump = out.jump || y < 0 || hatY < -0.5 || down(pad.buttons, 1) || down(pad.buttons, 12) || hat.up;
  out.block = out.block || y > 0 || hatY > 0.5 || down(pad.buttons, 4) || down(pad.buttons, 13) || l2 || hat.down;
  out.light = out.light || down(pad.buttons, 0);
  out.heavy = out.heavy || down(pad.buttons, 3);
  out.special = out.special || down(pad.buttons, 2) || r2;
  out.burst = out.burst || down(pad.buttons, 5);
}

export function readFightPad(pads: ArrayLike<PadLike | null> | null | undefined): Pad {
  const out = blank();
  if (!pads) return out;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad || pad.connected === false) continue;
    if (isRawDualShock(pad)) applyRaw(out, pad);
    else applyStandard(out, pad);
    return out;
  }
  return out;
}

export function safeGamepads(): ArrayLike<PadLike | null> | null {
  try {
    return navigator.getGamepads?.() ?? null;
  } catch {
    return null;
  }
}

export function padActive(pad: Pad) {
  return pad.left || pad.right || pad.jump || pad.block || pad.light || pad.heavy || pad.special || pad.burst;
}
