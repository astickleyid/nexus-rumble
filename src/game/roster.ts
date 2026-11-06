export type BeastId = "voltusk" | "pyrelon" | "aqualith" | "thornox" | "glimmoth" | "vespara" | "brinefin" | "mossgore";
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

export type MoveShape = "jab" | "upper" | "claw" | "nova" | "lance" | "sweep" | "guard" | "slam";
export type ShotForm = "bolt" | "lob" | "beam" | "ram";

export type Move = {
  name: string;
  tag: string;
  note: string;
  shape: MoveShape;
  angle: number;
  armor: boolean;
  burn: number;
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
  name: string;
  tag: string;
  note: string;
  form: ShotForm;
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

const light = (p: Partial<Move> & Pick<Move, "name" | "tag" | "note" | "shape">): Move => ({
  angle: 0.28,
  armor: false,
  burn: 0,
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

const heavy = (p: Partial<Move> & Pick<Move, "name" | "tag" | "note" | "shape">): Move => ({
  angle: 0.62,
  armor: false,
  burn: 0,
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
    body: 170,
    hurtW: 66,
    hurtH: 124,
    light: light({
      name: "Spark Jab",
      tag: "Jab",
      note: "Steps in. Stacks hits.",
      shape: "jab",
      angle: 0.16,
      startup: 0.045,
      damage: 5,
      kb: 80,
      reach: 68,
      slide: 120,
      stun: 0.22,
    }),
    heavy: heavy({
      name: "Volt Upper",
      tag: "Upper",
      note: "Launches straight up.",
      shape: "upper",
      angle: 1.2,
      startup: 0.12,
      damage: 12,
      kb: 460,
      reach: 72,
      height: 100,
      y: 36,
      slide: 20,
    }),
    shot: {
      name: "Arc Tusk",
      tag: "Arc",
      note: "Fast spark across the ring.",
      form: "bolt",
      damage: 9,
      kb: 240,
      stun: 0.28,
      speed: 1120,
      w: 56,
      h: 18,
      life: 0.5,
      meter: 10,
      cooldown: 0.42,
    },
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
    body: 164,
    hurtW: 64,
    hurtH: 122,
    light: light({
      name: "Cinder Claw",
      tag: "Claw",
      note: "Sets them on fire.",
      shape: "claw",
      angle: 0.34,
      burn: 1.6,
      damage: 7,
      reach: 84,
      kb: 110,
    }),
    heavy: heavy({
      name: "Ash Nova",
      tag: "Nova",
      note: "Blasts everything around you.",
      shape: "nova",
      angle: 0.95,
      startup: 0.2,
      damage: 13,
      kb: 340,
      reach: 148,
      slide: 0,
      recovery: 0.34,
    }),
    shot: {
      name: "Cinder Spit",
      tag: "Spit",
      note: "Lobs a coal that pops up.",
      form: "lob",
      damage: 15,
      kb: 400,
      stun: 0.36,
      speed: 460,
      w: 72,
      h: 48,
      life: 1.15,
      meter: 12,
      cooldown: 0.62,
    },
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
    body: 172,
    hurtW: 60,
    hurtH: 130,
    light: light({
      name: "Reef Poke",
      tag: "Poke",
      note: "Long spear. Barely moves them.",
      shape: "lance",
      angle: 0.1,
      startup: 0.08,
      damage: 6,
      kb: 70,
      reach: 156,
      height: 26,
      y: 74,
      slide: 24,
    }),
    heavy: heavy({
      name: "Riptide",
      tag: "Tide",
      note: "Sends them sideways off the ring.",
      shape: "sweep",
      angle: 0.22,
      startup: 0.15,
      damage: 12,
      kb: 560,
      reach: 132,
      height: 46,
      y: 28,
      slide: 80,
    }),
    shot: {
      name: "Tide Lance",
      tag: "Lance",
      note: "A beam that keeps traveling.",
      form: "beam",
      damage: 11,
      kb: 220,
      stun: 0.26,
      speed: 900,
      w: 128,
      h: 16,
      life: 0.72,
      meter: 10,
      cooldown: 0.55,
    },
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
    body: 196,
    hurtW: 96,
    hurtH: 140,
    light: light({
      name: "Bark Knuckle",
      tag: "Bark",
      note: "Armored punch.",
      shape: "guard",
      angle: 0.3,
      armor: true,
      startup: 0.1,
      damage: 9,
      kb: 150,
      reach: 80,
      stun: 0.32,
      slide: 36,
    }),
    heavy: heavy({
      name: "Canopy Slam",
      tag: "Slam",
      note: "Slow. Sends them a long way.",
      shape: "slam",
      angle: 0.7,
      armor: true,
      startup: 0.24,
      damage: 18,
      kb: 500,
      reach: 104,
      lift: 220,
      stun: 0.48,
      slide: 40,
    }),
    shot: {
      name: "Root Ram",
      tag: "Ram",
      note: "Charges through them.",
      form: "ram",
      damage: 16,
      kb: 440,
      stun: 0.4,
      speed: 920,
      w: 118,
      h: 70,
      life: 0.32,
      meter: 14,
      cooldown: 0.9,
    },
  },
  {
    id: "glimmoth",
    name: "Glimmoth",
    element: "spark",
    elementLabel: "Spark",
    blurb: "Lightest of the ring. Lives in the air.",
    special: "Glint",
    accent: "#9af6ff",
    hp: 86,
    speed: 640,
    jump: 1280,
    weight: 1.34,
    body: 158,
    hurtW: 48,
    hurtH: 118,
    light: light({
      name: "Wing Flick",
      tag: "Flick",
      note: "Tiny hits, very fast.",
      shape: "jab",
      angle: 0.12,
      startup: 0.04,
      active: 0.07,
      recovery: 0.12,
      damage: 4,
      kb: 60,
      reach: 62,
      slide: 150,
      stun: 0.18,
    }),
    heavy: heavy({
      name: "Static Rise",
      tag: "Rise",
      note: "Pops them off the floor.",
      shape: "upper",
      angle: 1.28,
      startup: 0.11,
      damage: 11,
      kb: 430,
      reach: 66,
      height: 108,
      y: 30,
      slide: 10,
    }),
    shot: {
      name: "Glint",
      tag: "Glint",
      note: "A needle of spark.",
      form: "bolt",
      damage: 7,
      kb: 180,
      stun: 0.22,
      speed: 1280,
      w: 40,
      h: 14,
      life: 0.42,
      meter: 8,
      cooldown: 0.34,
    },
  },
  {
    id: "vespara",
    name: "Vespara",
    element: "blaze",
    elementLabel: "Blaze",
    blurb: "The sting starts the fire. The tail ends it.",
    special: "Coal Egg",
    accent: "#ff7a2a",
    hp: 108,
    speed: 400,
    jump: 1040,
    weight: 0.92,
    body: 186,
    hurtW: 108,
    hurtH: 96,
    light: light({
      name: "Sting",
      tag: "Sting",
      note: "Long poke that burns.",
      shape: "lance",
      angle: 0.14,
      burn: 1.8,
      startup: 0.09,
      damage: 6,
      kb: 80,
      reach: 132,
      height: 24,
      y: 48,
      slide: 20,
    }),
    heavy: heavy({
      name: "Tail Nova",
      tag: "Tail",
      note: "The tail cracks the air around you.",
      shape: "nova",
      angle: 0.85,
      startup: 0.22,
      damage: 15,
      kb: 380,
      reach: 160,
      slide: 0,
      recovery: 0.36,
    }),
    shot: {
      name: "Coal Egg",
      tag: "Egg",
      note: "A heavy coal that pops up.",
      form: "lob",
      damage: 16,
      kb: 420,
      stun: 0.38,
      speed: 380,
      w: 84,
      h: 56,
      life: 1.25,
      meter: 13,
      cooldown: 0.7,
    },
  },
  {
    id: "brinefin",
    name: "Brinefin",
    element: "tide",
    elementLabel: "Tide",
    blurb: "Keeps you at the end of a fin.",
    special: "Pressure",
    accent: "#3ee0ff",
    hp: 102,
    speed: 430,
    jump: 1100,
    weight: 1.02,
    body: 176,
    hurtW: 58,
    hurtH: 132,
    light: light({
      name: "Fin Cut",
      tag: "Fin",
      note: "A low cut with almost no launch.",
      shape: "sweep",
      angle: 0.08,
      startup: 0.08,
      damage: 6,
      kb: 50,
      reach: 118,
      height: 30,
      y: 22,
      slide: 30,
    }),
    heavy: heavy({
      name: "Undertow",
      tag: "Tow",
      note: "Drags them sideways off the ring.",
      shape: "sweep",
      angle: 0.16,
      startup: 0.16,
      damage: 13,
      kb: 600,
      reach: 140,
      height: 40,
      y: 24,
      slide: 70,
    }),
    shot: {
      name: "Pressure",
      tag: "Press",
      note: "A beam that does not stop.",
      form: "beam",
      damage: 10,
      kb: 200,
      stun: 0.24,
      speed: 760,
      w: 150,
      h: 14,
      life: 0.85,
      meter: 11,
      cooldown: 0.58,
    },
  },
  {
    id: "mossgore",
    name: "Mossgore",
    element: "thorn",
    elementLabel: "Thorn",
    blurb: "Low, heavy, and rude about it.",
    special: "Gore",
    accent: "#c6e36a",
    hp: 134,
    speed: 300,
    jump: 960,
    weight: 0.72,
    body: 168,
    hurtW: 124,
    hurtH: 92,
    light: light({
      name: "Tusk",
      tag: "Tusk",
      note: "Short armored jab.",
      shape: "guard",
      angle: 0.22,
      armor: true,
      startup: 0.1,
      damage: 8,
      kb: 140,
      reach: 74,
      slide: 24,
    }),
    heavy: heavy({
      name: "Trample",
      tag: "Trample",
      note: "Slow. They leave the island.",
      shape: "slam",
      angle: 0.55,
      armor: true,
      startup: 0.26,
      damage: 18,
      kb: 540,
      reach: 112,
      stun: 0.5,
      slide: 80,
    }),
    shot: {
      name: "Gore",
      tag: "Gore",
      note: "A full charge through them.",
      form: "ram",
      damage: 15,
      kb: 480,
      stun: 0.42,
      speed: 1040,
      w: 130,
      h: 64,
      life: 0.3,
      meter: 14,
      cooldown: 0.95,
    },
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
