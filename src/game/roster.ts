export type BeastId = "voltusk" | "pyrelon" | "aqualith" | "thornox";
export type Element = "spark" | "blaze" | "tide" | "thorn";

export type Beast = {
  id: BeastId;
  name: string;
  element: Element;
  elementLabel: string;
  blurb: string;
  special: string;
  accent: string;
  hp: number;
  speed: number;
  jump: number;
  weight: number;
  body: number;
  hurtW: number;
  hurtH: number;
  light: Move;
  heavy: Move;
  shot: ShotDef;
};

export type Move = {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  kb: number;
  lift: number;
  stun: number;
  blockStun: number;
  reach: number;
  height: number;
  y: number;
  meter: number;
  slide: number;
};

export type ShotDef = {
  damage: number;
  kb: number;
  stun: number;
  speed: number;
  w: number;
  h: number;
  life: number;
  meter: number;
  cooldown: number;
};

const light = (p: Partial<Move>): Move => ({
  startup: 0.07,
  active: 0.09,
  recovery: 0.16,
  damage: 7,
  kb: 140,
  lift: 0,
  stun: 0.3,
  blockStun: 0.16,
  reach: 78,
  height: 52,
  y: 62,
  meter: 9,
  slide: 70,
  ...p,
});

const heavy = (p: Partial<Move>): Move => ({
  startup: 0.16,
  active: 0.1,
  recovery: 0.3,
  damage: 14,
  kb: 420,
  lift: 340,
  stun: 0.42,
  blockStun: 0.24,
  reach: 96,
  height: 78,
  y: 48,
  meter: 15,
  slide: 160,
  ...p,
});

export const BEASTS: Beast[] = [
  {
    id: "voltusk",
    name: "Voltusk",
    element: "spark",
    elementLabel: "Spark",
    blurb: "Fast fists. Gets in, stays in.",
    special: "Arc Tusk",
    accent: "#7af0ff",
    hp: 94,
    speed: 560,
    jump: 1180,
    weight: 1.16,
    body: 214,
    hurtW: 84,
    hurtH: 156,
    light: light({ startup: 0.05, damage: 6, reach: 72, stun: 0.28, slide: 90 }),
    heavy: heavy({ startup: 0.13, damage: 13, reach: 88, slide: 210 }),
    shot: { damage: 11, kb: 300, stun: 0.32, speed: 980, w: 70, h: 32, life: 0.62, meter: 10, cooldown: 0.48 },
  },
  {
    id: "pyrelon",
    name: "Pyrelon",
    element: "blaze",
    elementLabel: "Blaze",
    blurb: "Midrange fire. Burst punishes whiffs.",
    special: "Cinder Spit",
    accent: "#ff8a3d",
    hp: 100,
    speed: 470,
    jump: 1120,
    weight: 1.04,
    body: 206,
    hurtW: 80,
    hurtH: 154,
    light: light({ damage: 7, reach: 80 }),
    heavy: heavy({ damage: 15, reach: 94 }),
    shot: { damage: 14, kb: 340, stun: 0.36, speed: 700, w: 78, h: 44, life: 0.9, meter: 12, cooldown: 0.55 },
  },
  {
    id: "aqualith",
    name: "Aqualith",
    element: "tide",
    elementLabel: "Tide",
    blurb: "Long reach. Controls the space between.",
    special: "Tide Lance",
    accent: "#5dffe8",
    hp: 100,
    speed: 450,
    jump: 1080,
    weight: 1,
    body: 216,
    hurtW: 76,
    hurtH: 164,
    light: light({ damage: 7, reach: 108, startup: 0.08, kb: 160 }),
    heavy: heavy({ damage: 14, reach: 124, startup: 0.17 }),
    shot: { damage: 12, kb: 280, stun: 0.3, speed: 880, w: 96, h: 26, life: 0.7, meter: 10, cooldown: 0.5 },
  },
  {
    id: "thornox",
    name: "Thornox",
    element: "thorn",
    elementLabel: "Thorn",
    blurb: "Slow tank. Heavy fists ignore a hit.",
    special: "Root Ram",
    accent: "#b6f25c",
    hp: 126,
    speed: 340,
    jump: 1040,
    weight: 0.8,
    body: 246,
    hurtW: 120,
    hurtH: 176,
    light: light({ startup: 0.11, damage: 9, reach: 86, stun: 0.34, kb: 170, slide: 40 }),
    heavy: heavy({ startup: 0.22, damage: 19, reach: 108, kb: 480, lift: 260, stun: 0.48, slide: 90 }),
    shot: { damage: 17, kb: 400, stun: 0.4, speed: 520, w: 84, h: 52, life: 1.05, meter: 14, cooldown: 0.7 },
  },
];

export const BEAST_MAP: Record<BeastId, Beast> = Object.fromEntries(BEASTS.map((b) => [b.id, b])) as Record<BeastId, Beast>;

const BEATS: Record<Element, Element> = {
  spark: "tide",
  tide: "blaze",
  blaze: "thorn",
  thorn: "spark",
};

export function advantage(a: Element, b: Element): number {
  if (BEATS[a] === b) return 1;
  if (BEATS[b] === a) return -1;
  return 0;
}

export function matchupLine(a: BeastId, b: BeastId): string {
  const A = BEAST_MAP[a];
  const B = BEAST_MAP[b];
  const edge = advantage(A.element, B.element);
  if (edge > 0) return `${A.elementLabel} launches ${B.elementLabel} harder.`;
  if (edge < 0) return `${B.elementLabel} launches you farther.`;
  return "Even elements. First one off the ring loses a stock.";
}

export function counterTo(id: BeastId): BeastId {
  const el = BEAST_MAP[id].element;
  const foe = BEASTS.find((b) => BEATS[b.element] === el);
  return foe?.id ?? "thornox";
}
